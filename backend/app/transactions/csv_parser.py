from __future__ import annotations

from collections import Counter
import csv
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import io
import re
from typing import Literal
import unicodedata

from ..errors import AppError

MAX_CSV_CHARS = 2_000_000
MAX_IMPORT_ROWS = 1000
MAX_MONEY = Decimal("9999999999.99")

MAPPING_FIELDS = (
    "date",
    "description",
    "amount",
    "incomeAmount",
    "expenseAmount",
    "type",
    "category",
    "paymentMethod",
)

DATE_HEADERS = {
    "data",
    "date",
    "data lancamento",
    "data do lancamento",
    "data da compra",
    "data compra",
    "data transacao",
    "data da transacao",
    "data movimentacao",
    "data mov",
    "dt",
    "dt lancamento",
    "dt mov",
    "vencimento",
    "data vencimento",
    "data operacao",
    "data efetivacao",
}
DATE_EXCLUDED_HEADERS = {
    "data atual",
    "data exportacao",
    "data de exportacao",
    "data geracao",
    "data de geracao",
    "data emissao",
    "data de emissao",
}

PRIMARY_DESCRIPTION_HEADERS = {
    "descricao",
    "description",
    "estabelecimento",
    "title",
    "titulo",
    "favorecido",
    "nome estabelecimento",
    "descricao lancamento",
    "origem destino",
    "razao social",
}
SECONDARY_DESCRIPTION_HEADERS = {
    "historico",
    "lancamento",
    "memo",
    "nome",
    "detalhes",
    "detalhe",
    "identificacao",
}
DESCRIPTION_HEADERS = PRIMARY_DESCRIPTION_HEADERS | SECONDARY_DESCRIPTION_HEADERS

AMOUNT_HEADERS = {
    "valor",
    "amount",
    "valor r",
    "valor rs",
    "quantia",
    "value",
    "total",
    "valor total",
    "valor lancamento",
    "valor transacao",
    "valor compra",
    "valor em r",
    "valor brl",
    "montante",
    "preco",
}
AMOUNT_EXCLUDED_TOKENS = ("saldo", "balance", "cotacao")

INCOME_AMOUNT_HEADERS = {
    "entrada",
    "entradas",
    "credito",
    "creditos",
    "receita",
    "receitas",
    "valor entrada",
    "valor credito",
    "credit",
    "income",
    "deposito",
    "depositos",
}
EXPENSE_AMOUNT_HEADERS = {
    "saida",
    "saidas",
    "debito",
    "debitos",
    "despesa",
    "despesas",
    "valor saida",
    "valor debito",
    "debit",
    "expense",
    "retirada",
    "gasto",
    "gastos",
}
TYPE_HEADERS = {
    "tipo",
    "type",
    "natureza",
    "d/c",
    "dc",
    "c/d",
    "cd",
    "operacao",
    "movimento",
    "sinal",
    "tipo lancamento",
    "tipo transacao",
    "tipo operacao",
}
CATEGORY_HEADERS = {"categoria", "category", "grupo", "classificacao"}
PAYMENT_METHOD_HEADERS = {
    "forma de pagamento",
    "forma pagamento",
    "pagamento",
    "meio de pagamento",
    "meio pagamento",
    "payment method",
    "paymentmethod",
    "modalidade",
}

IGNORED_DESCRIPTIONS = {
    "saldo anterior",
    "saldo do dia",
    "saldo final",
    "saldo atual",
    "saldo",
    "s a l d o",
    "saldo bloqueado",
    "saldo disponivel",
    "total",
    "subtotal",
}
IGNORED_PREFIXES = (
    "saldo anterior",
    "saldo do dia",
    "saldo final",
    "saldo atual",
    "saldo bloqueado",
    "saldo disponivel",
    "saldo total",
)

INCOME_TYPE_TOKENS = {
    "entrada",
    "entradas",
    "credito",
    "creditos",
    "receita",
    "receitas",
    "c",
    "cr",
    "cred",
    "income",
    "in",
    "deposito",
    "depositos",
    "+",
}
EXPENSE_TYPE_TOKENS = {
    "saida",
    "saidas",
    "debito",
    "debitos",
    "despesa",
    "despesas",
    "d",
    "db",
    "deb",
    "expense",
    "out",
    "retirada",
    "gasto",
    "gastos",
    "-",
}

DEBIT_PAYMENT_TOKENS = ("debito", "debit", "pix", "dinheiro", "boleto", "ted", "doc", "transferencia")
CREDIT_PAYMENT_TOKENS = ("credito", "credit")


def normalize_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.strip().lower())
    without_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    replaced = re.sub(r"[_\-.]+", " ", without_accents)
    return re.sub(r"\s+", " ", replaced).strip()


def _normalize_header(value: str) -> str:
    norm = normalize_text(value)
    cleaned = re.sub(r"[()$]+", " ", norm)
    return re.sub(r"\s+", " ", cleaned).strip()


def _strip_bom(text: str) -> str:
    return text.lstrip("\ufeff")


def _sample_rows(text: str, delimiter: str, limit: int = 40) -> list[list[str]]:
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows: list[list[str]] = []
    for row in reader:
        if any(cell.strip() for cell in row):
            rows.append(row)
            if len(rows) >= limit:
                break
    return rows


def detect_delimiter(text: str) -> str:
    cleaned = _strip_bom(text)
    best_delimiter = ";"
    best_score = (-1, -1, -1, -1)

    # Tie-break order: ';' > ',' > '\t'
    for priority, delimiter in ((3, ";"), (2, ","), (1, "\t")):
        rows = _sample_rows(cleaned, delimiter, limit=40)
        if not rows:
            continue
        ge_3_counts = Counter(len(r) for r in rows if len(r) >= 3)
        ge_2_counts = Counter(len(r) for r in rows if len(r) >= 2)
        modal_ge_3 = max(ge_3_counts.values(), default=0)
        total_ge_3 = sum(ge_3_counts.values())
        modal_ge_2 = max(ge_2_counts.values(), default=0)
        score = (modal_ge_3, total_ge_3, modal_ge_2, priority)
        if score > best_score:
            best_score = score
            best_delimiter = delimiter

    return best_delimiter


def _match_header_role(cell: str) -> str | None:
    norm = _normalize_header(cell)
    if not norm:
        return None
    if norm in DATE_EXCLUDED_HEADERS:
        return None
    if norm in DATE_HEADERS or norm.startswith("data ") or norm.startswith("dt "):
        return "date"
    if norm in CATEGORY_HEADERS:
        return "category"
    if norm in PAYMENT_METHOD_HEADERS:
        return "paymentMethod"
    if norm in TYPE_HEADERS:
        return "type"
    if norm in INCOME_AMOUNT_HEADERS:
        return "incomeAmount"
    if norm in EXPENSE_AMOUNT_HEADERS:
        return "expenseAmount"
    if any(excluded in norm for excluded in AMOUNT_EXCLUDED_TOKENS):
        return None
    if norm in AMOUNT_HEADERS:
        return "amount"
    if norm in PRIMARY_DESCRIPTION_HEADERS:
        return "description_primary"
    if norm in SECONDARY_DESCRIPTION_HEADERS:
        return "description_secondary"
    return None


def _disambiguate_headers(raw_headers: list[str], rows: list[list[str]]) -> list[str]:
    width = max([len(raw_headers), *(len(r) for r in rows)], default=0)
    padded = [cell.strip() for cell in raw_headers] + [""] * (width - len(raw_headers))

    # Drop trailing empty columns when every row is empty in that trailing position.
    while width > 0 and padded[width - 1] == "" and all(len(r) < width or r[width - 1].strip() == "" for r in rows):
        width -= 1
    padded = padded[:width]

    counts: dict[str, int] = {}
    result: list[str] = []
    for index, name in enumerate(padded):
        base = name or f"Coluna {index + 1}"
        counts[base] = counts.get(base, 0) + 1
        result.append(base if counts[base] == 1 else f"{base} ({counts[base]})")
    return result


def parse_date(raw: str) -> date | None:
    text = raw.strip()
    if not text:
        return None
    if "T" in text:
        text = text.split("T", 1)[0].strip()
    elif " " in text:
        text = text.split()[0].strip()

    year = month = day = 0
    if re.fullmatch(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", text):
        parts = re.split(r"[-/]", text)
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    elif re.fullmatch(r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}", text):
        parts = re.split(r"[/\-.]", text)
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
    elif re.fullmatch(r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2}", text):
        parts = re.split(r"[/\-.]", text)
        day, month, yy = int(parts[0]), int(parts[1]), int(parts[2])
        year = 2000 + yy if yy <= 69 else 1900 + yy
    else:
        return None

    if not (1900 <= year <= 2100):
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_decimal_signed(raw: str) -> tuple[Decimal | None, Literal["INCOME", "EXPENSE"] | None]:
    text = unicodedata.normalize("NFC", raw.replace("\xa0", " ").strip())
    if not text:
        return None, None

    is_negative = False
    if text.startswith("(") and text.endswith(")"):
        is_negative = True
        text = text[1:-1].strip()

    # Strip common currency markers before checking D/C suffix and numeric formatting.
    text = re.sub(r"(?i)(?:r\$|us\$|brl|usd|\$)", "", text).strip()

    hint: Literal["INCOME", "EXPENSE"] | None = None
    suffix_match = re.search(
        r"(?i)(?:^|[\s0-9.,])(cr[eé]dito|credito|cred|d[eé]bito|debito|deb|c|d)\.?$",
        text,
    )
    if suffix_match:
        raw_suffix = normalize_text(suffix_match.group(1).rstrip("."))
        if raw_suffix in ("c", "cred", "credito"):
            hint = "INCOME"
        elif raw_suffix in ("d", "deb", "debito"):
            hint = "EXPENSE"
        text = text[: suffix_match.start(1)].strip()

    if text.startswith("-"):
        is_negative = True
        text = text[1:].strip()
    elif text.startswith("+"):
        text = text[1:].strip()
    elif text.endswith("-"):
        is_negative = True
        text = text[:-1].strip()

    text = re.sub(r"\s+", "", text)
    if not text or not re.fullmatch(r"[0-9][0-9.,]*", text):
        return None, hint

    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            normalized = text.replace(".", "")
            if normalized.count(",") != 1:
                return None, hint
            normalized = normalized.replace(",", ".")
        else:
            normalized = text.replace(",", "")
            if normalized.count(".") != 1:
                return None, hint
    elif "," in text:
        if text.count(",") == 1:
            normalized = text.replace(",", ".")
        else:
            normalized = text.replace(",", "")
    elif "." in text:
        if text.count(".") > 1:
            normalized = text.replace(".", "")
        else:
            int_part, frac_part = text.split(".")
            if len(frac_part) == 3 and int_part != "0" and 1 <= len(int_part) <= 3:
                normalized = int_part + frac_part
            else:
                normalized = text
    else:
        normalized = text

    try:
        value = Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None, hint

    if is_negative and value != 0:
        value = -value
    return value, hint


def parse_money_signed(raw: str) -> tuple[Decimal | None, Literal["INCOME", "EXPENSE"] | None]:
    value, hint = _parse_decimal_signed(raw)
    if value is None or value == 0 or abs(value) > MAX_MONEY:
        return None, hint
    return value, hint


def _empty_mapping() -> dict[str, str | None]:
    return {field: None for field in MAPPING_FIELDS}


def _infer_headerless_mapping(
    headers: list[str],
    sample_rows: list[list[str]],
) -> dict[str, str | None]:
    mapping = _empty_mapping()
    width = len(headers)
    if width == 0 or not sample_rows:
        return mapping

    date_scores = [0] * width
    money_scores = [0] * width
    text_lengths = [0] * width

    for row in sample_rows[:10]:
        for idx in range(min(width, len(row))):
            cell = row[idx].strip()
            if not cell:
                continue
            if parse_date(cell) is not None:
                date_scores[idx] += 1
            elif _parse_decimal_signed(cell)[0] is not None:
                money_scores[idx] += 1
            else:
                text_lengths[idx] += len(cell)

    best_date = max(range(width), key=lambda i: date_scores[i])
    if date_scores[best_date] > 0:
        mapping["date"] = headers[best_date]

    money_candidates = [i for i in range(width) if money_scores[i] > 0 and i != best_date]
    if money_candidates:
        mapping["amount"] = headers[money_candidates[0]]

    text_candidates = [
        i for i in range(width)
        if text_lengths[i] > 0 and headers[i] != mapping["date"] and headers[i] != mapping["amount"]
    ]
    if text_candidates:
        best_desc = max(text_candidates, key=lambda i: text_lengths[i])
        mapping["description"] = headers[best_desc]

    return mapping


def detect_header_and_mapping(
    parsed_rows: list[tuple[int, list[str]]],
    explicit_mapping: dict[str, str | None] | None = None,
) -> tuple[list[str], list[tuple[int, list[str]]], dict[str, str | None], str | None]:
    if not parsed_rows:
        return [], [], _empty_mapping(), None

    header_pos: int | None = None
    best_match_count = 0
    best_roles: list[str | None] = []

    for pos, (_, row) in enumerate(parsed_rows[:25]):
        roles = [_match_header_role(cell) for cell in row]
        matched_groups: set[str] = set()
        for role in roles:
            if role == "date":
                matched_groups.add("date")
            elif role in ("description_primary", "description_secondary"):
                matched_groups.add("description")
            elif role in ("amount", "incomeAmount", "expenseAmount"):
                matched_groups.add("amount")
        if len(matched_groups) >= 2 and len(matched_groups) > best_match_count:
            header_pos = pos
            best_match_count = len(matched_groups)
            best_roles = roles
            if len(matched_groups) == 3:
                break

    secondary_desc_col: str | None = None
    if header_pos is not None:
        raw_headers = parsed_rows[header_pos][1]
        data_rows = parsed_rows[header_pos + 1 :]
        headers = _disambiguate_headers(raw_headers, [r for _, r in data_rows])
        auto_mapping = _empty_mapping()
        primary_desc: str | None = None
        secondary_desc: str | None = None

        for idx, role in enumerate(best_roles):
            if idx >= len(headers) or role is None:
                continue
            header_name = headers[idx]
            if role == "description_primary":
                if primary_desc is None:
                    primary_desc = header_name
            elif role == "description_secondary":
                if secondary_desc is None:
                    secondary_desc = header_name
            elif auto_mapping.get(role) is None:
                auto_mapping[role] = header_name

        if primary_desc is not None:
            auto_mapping["description"] = primary_desc
            secondary_desc_col = secondary_desc
        elif secondary_desc is not None:
            auto_mapping["description"] = secondary_desc

        if auto_mapping["amount"] and bool(auto_mapping["incomeAmount"]) != bool(auto_mapping["expenseAmount"]):
            auto_mapping["incomeAmount"] = None
            auto_mapping["expenseAmount"] = None
    else:
        first_row = parsed_rows[0][1]
        max_width = max(len(r) for _, r in parsed_rows)
        synthetic_raw = [f"Coluna {i + 1}" for i in range(max_width)]
        headers = _disambiguate_headers(synthetic_raw, [r for _, r in parsed_rows])
        has_date = any(parse_date(c) is not None for c in first_row)
        has_money = any(_parse_decimal_signed(c)[0] is not None for c in first_row)
        if has_date and has_money:
            data_rows = parsed_rows
            auto_mapping = _infer_headerless_mapping(headers, [r for _, r in data_rows])
        else:
            # Fallback to first row as header when it is neither clearly a header nor a data row.
            headers = _disambiguate_headers(first_row, [r for _, r in parsed_rows[1:]])
            data_rows = parsed_rows[1:]
            auto_mapping = _empty_mapping()

    if explicit_mapping is not None:
        mapping = _empty_mapping()
        for field in MAPPING_FIELDS:
            col = explicit_mapping.get(field)
            if col is not None and col != "":
                if col not in headers:
                    raise AppError(f"Coluna mapeada não encontrada no arquivo CSV: {col}", 422)
                mapping[field] = col
        secondary_desc_col = None
    else:
        mapping = auto_mapping

    return headers, data_rows, mapping, secondary_desc_col


def _classify_explicit_type(raw: str) -> Literal["INCOME", "EXPENSE"] | None:
    norm = normalize_text(raw)
    if not norm:
        return None
    if norm in INCOME_TYPE_TOKENS or norm.startswith(("entrada", "receita", "credit")):
        return "INCOME"
    if norm in EXPENSE_TYPE_TOKENS or norm.startswith(("saida", "despesa", "debit")):
        return "EXPENSE"
    return None


def _resolve_payment_method(
    tx_type: Literal["INCOME", "EXPENSE"],
    raw_payment: str,
    source_type: Literal["STATEMENT", "INVOICE"],
) -> Literal["DEBIT", "CREDIT"] | None:
    if tx_type == "INCOME":
        return None
    norm = normalize_text(raw_payment)
    if norm:
        if any(token in norm for token in CREDIT_PAYMENT_TOKENS):
            return "CREDIT"
        if any(token in norm for token in DEBIT_PAYMENT_TOKENS):
            return "DEBIT"
    return "CREDIT" if source_type == "INVOICE" else "DEBIT"


def _is_ignored_description(desc: str) -> bool:
    norm = normalize_text(desc)
    if not norm:
        return False
    return norm in IGNORED_DESCRIPTIONS or norm.startswith(IGNORED_PREFIXES)


def _cell(row: list[str], index: int | None) -> str:
    if index is None or index < 0 or index >= len(row):
        return ""
    return row[index].strip()


def parse_csv_transactions(
    csv_content: str,
    source_type: Literal["STATEMENT", "INVOICE"] = "STATEMENT",
    column_mapping: dict[str, str | None] | None = None,
) -> dict:
    if not csv_content or not csv_content.strip():
        raise AppError("O arquivo CSV está vazio", 422)
    if len(csv_content) > MAX_CSV_CHARS:
        raise AppError("O arquivo CSV excede o tamanho máximo permitido", 422)

    cleaned = _strip_bom(csv_content)
    delimiter = detect_delimiter(cleaned)

    reader = csv.reader(io.StringIO(cleaned), delimiter=delimiter)
    parsed_rows: list[tuple[int, list[str]]] = []
    prev_line = 0
    for row in reader:
        start_line = prev_line + 1
        prev_line = reader.line_num
        if any(cell.strip() for cell in row):
            parsed_rows.append((start_line, row))

    if not parsed_rows:
        raise AppError("Nenhuma linha com conteúdo encontrada no arquivo CSV", 422)

    headers, data_rows, mapping, secondary_desc_col = detect_header_and_mapping(
        parsed_rows,
        column_mapping,
    )

    has_amount_mapping = bool(
        mapping.get("amount") or mapping.get("incomeAmount") or mapping.get("expenseAmount")
    )
    if not mapping.get("date") or not mapping.get("description") or not has_amount_mapping:
        return {
            "detectedDelimiter": delimiter,
            "headers": headers,
            "detectedMapping": mapping,
            "rows": [],
            "errors": [],
        }

    header_index = {name: idx for idx, name in enumerate(headers)}
    date_idx = header_index[mapping["date"]]
    desc_idx = header_index[mapping["description"]]
    secondary_desc_idx = header_index.get(secondary_desc_col) if secondary_desc_col else None
    amount_idx = header_index.get(mapping["amount"]) if mapping.get("amount") else None
    income_idx = header_index.get(mapping["incomeAmount"]) if mapping.get("incomeAmount") else None
    expense_idx = header_index.get(mapping["expenseAmount"]) if mapping.get("expenseAmount") else None
    type_idx = header_index.get(mapping["type"]) if mapping.get("type") else None
    category_idx = header_index.get(mapping["category"]) if mapping.get("category") else None
    payment_idx = header_index.get(mapping["paymentMethod"]) if mapping.get("paymentMethod") else None

    valid_rows: list[dict] = []
    errors: list[dict] = []

    for line_number, row in data_rows:
        raw_text = delimiter.join(cell.strip() for cell in row if cell.strip())
        raw_desc = _cell(row, desc_idx)
        collapsed_desc = re.sub(r"\s+", " ", raw_desc).strip()

        if len(collapsed_desc) < 2 and secondary_desc_idx is not None:
            fallback_desc = re.sub(r"\s+", " ", _cell(row, secondary_desc_idx)).strip()
            if len(fallback_desc) >= 2:
                collapsed_desc = fallback_desc

        if _is_ignored_description(collapsed_desc):
            errors.append(
                {
                    "lineNumber": line_number,
                    "rawText": raw_text[:200],
                    "reason": "Linha de saldo ou total ignorada automaticamente",
                }
            )
            continue

        parsed_date = parse_date(_cell(row, date_idx))
        if parsed_date is None:
            errors.append(
                {
                    "lineNumber": line_number,
                    "rawText": raw_text[:200],
                    "reason": "Data inválida ou ausente",
                }
            )
            continue

        if len(collapsed_desc) < 2:
            errors.append(
                {
                    "lineNumber": line_number,
                    "rawText": raw_text[:200],
                    "reason": "Descrição deve ter no mínimo 2 caracteres",
                }
            )
            continue
        description = collapsed_desc[:255]

        tx_type: Literal["INCOME", "EXPENSE"]
        amount: Decimal

        if income_idx is not None or expense_idx is not None:
            raw_inc = _cell(row, income_idx)
            raw_exp = _cell(row, expense_idx)
            inc_val, _ = _parse_decimal_signed(raw_inc) if raw_inc else (None, None)
            exp_val, _ = _parse_decimal_signed(raw_exp) if raw_exp else (None, None)

            if (raw_inc and inc_val is None) or (raw_exp and exp_val is None):
                errors.append(
                    {
                        "lineNumber": line_number,
                        "rawText": raw_text[:200],
                        "reason": "Valor inválido nas colunas de entrada/saída",
                    }
                )
                continue

            inc_abs = abs(inc_val) if inc_val is not None else Decimal("0.00")
            exp_abs = abs(exp_val) if exp_val is not None else Decimal("0.00")

            if inc_abs > MAX_MONEY or exp_abs > MAX_MONEY:
                errors.append(
                    {
                        "lineNumber": line_number,
                        "rawText": raw_text[:200],
                        "reason": "Valor excede o limite máximo permitido",
                    }
                )
                continue

            if inc_abs > 0 and exp_abs > 0:
                errors.append(
                    {
                        "lineNumber": line_number,
                        "rawText": raw_text[:200],
                        "reason": "Linha possui valores positivos tanto em Entrada quanto em Saída",
                    }
                )
                continue

            if inc_abs > 0:
                tx_type = "INCOME"
                amount = inc_abs
            elif exp_abs > 0:
                tx_type = "EXPENSE"
                amount = exp_abs
            else:
                errors.append(
                    {
                        "lineNumber": line_number,
                        "rawText": raw_text[:200],
                        "reason": "Valor ausente ou igual a zero",
                    }
                )
                continue
        else:
            raw_amount = _cell(row, amount_idx)
            signed_val, dc_hint = parse_money_signed(raw_amount)
            if signed_val is None:
                errors.append(
                    {
                        "lineNumber": line_number,
                        "rawText": raw_text[:200],
                        "reason": "Valor inválido ou igual a zero",
                    }
                )
                continue

            explicit_type = _classify_explicit_type(_cell(row, type_idx))
            if explicit_type is not None:
                tx_type = explicit_type
            elif dc_hint is not None:
                tx_type = dc_hint
            elif source_type == "INVOICE":
                tx_type = "EXPENSE" if signed_val > 0 else "INCOME"
            else:
                tx_type = "INCOME" if signed_val > 0 else "EXPENSE"
            amount = abs(signed_val)

        payment_method = _resolve_payment_method(tx_type, _cell(row, payment_idx), source_type)
        suggested_category = _cell(row, category_idx) or None

        valid_rows.append(
            {
                "lineNumber": line_number,
                "date": parsed_date,
                "description": description,
                "amount": amount,
                "type": tx_type,
                "paymentMethod": payment_method,
                "suggestedCategoryName": suggested_category,
            }
        )

    if len(valid_rows) > MAX_IMPORT_ROWS:
        raise AppError(
            f"O arquivo excede o limite de {MAX_IMPORT_ROWS} lançamentos por importação",
            422,
        )

    return {
        "detectedDelimiter": delimiter,
        "headers": headers,
        "detectedMapping": mapping,
        "rows": valid_rows,
        "errors": errors,
    }
