from decimal import Decimal, ROUND_HALF_UP


def money(value):
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def data_dict(data):
    values = data.model_dump(exclude_unset=True)
    if "categoryId" in values:
        values["categoryId"] = str(values["categoryId"])
    for key in ("amount", "budgetLimit"):
        if values.get(key) is not None:
            values[key] = money(values[key])
    return values
