# Backend Python — migração na branch Igor

Implementação paralela em Python 3.12+, FastAPI, SQLAlchemy 2 e Pydantic.
O backend Node em `../backend` continua intacto. Nenhuma configuração de
hospedagem, frontend ou banco de produção foi substituída.

## Executar localmente

Para o ambiente React + FastAPI já preparado neste computador, consulte o
[guia local](../docs/LOCAL-FASTAPI.md), incluindo comando único de início,
PostgreSQL isolado, conta de homologação e validação no navegador.

Na raiz deste diretório, com Python 3.12+ instalado:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[test]" -c requirements.lock
Copy-Item .env.example .env
# Edite .env com um banco de desenvolvimento isolado e segredo local.
.venv\Scripts\python.exe -m app
```

Linux/macOS: use `python3.12 -m venv .venv` e `.venv/bin/python`.
O lock registra as versões verificadas com Python 3.12 no Windows.
O runtime auxiliar desta sessão também permite executar
`..\.tools\python\python.exe -m app` a partir de `backend-python`.

Para recarga automática: `python -m uvicorn app.main:app --reload --port 3333`.
Documentação interativa: `http://localhost:3333/docs`; saúde: `/health`.
O React já usa `http://localhost:3333/api`. Para executar Node e Python juntos,
use Python na porta 3334 e `VITE_API_URL=http://localhost:3334/api` em um frontend
local separado. Não altere as variáveis do frontend publicado.

## Banco e configuração

`DATABASE_URL`, `JWT_SECRET` são obrigatórios. `JWT_EXPIRES_IN=1d`,
`FRONTEND_URL=http://localhost:5173` e `PORT=3333` têm valores padrão.
`NODE_ENV` não é necessário. URLs `postgresql://` são adaptadas ao psycopg 3;
parâmetros Neon, como `sslmode=require`, são preservados. Não copie o parâmetro
Prisma `schema` para uma URL psycopg: use o esquema padrão `public`.

As tabelas existentes devem estar provisionadas. A aplicação **não** executa
`create_all`, seeds, migrações ou conexões no startup. Os nomes físicos são os
mesmos do Prisma; IDs são TEXT com UUID gerado na aplicação, datas são DATE,
timestamps são sem fuso, valores são NUMERIC(12,2), e os enums PostgreSQL
continuam `TransactionType` e `PaymentMethod`. Alembic não é necessário para
esta troca, pois não há alteração de esquema. O histórico Prisma permanece
como referência. Introduza Alembic futuramente somente após conferir o esquema
e definir uma baseline revisada, sem recriar tabelas existentes.

## Estrutura

- `app/routers.py`: contratos HTTP e dependências por requisição.
- `app/schemas.py`: validação Pydantic, limites e campos opcionais.
- `app/models.py`: quatro entidades e relacionamentos SQLAlchemy.
- `app/services.py`: autenticação, propriedade dos registros e CRUD.
- `app/dashboard.py`: agregações Decimal, períodos, gráficos e comparação.
- `app/security.py`: bcrypt, JWT HS256 e proteção Bearer.
- `app/serialization.py`: datas e valores compatíveis com Prisma.
- `app/config.py`, `database.py`, `errors.py`, `main.py`: infraestrutura.
- `tests/`: testes de API, PostgreSQL e comparação real com Express.

## Endpoints preservados

Todos os caminhos abaixo, exceto saúde, têm prefixo `/api`.
Somente cadastro, login e saúde são públicos.

| Método | Caminho | Resposta de sucesso |
|---|---|---|
| GET | `/health` (sem prefixo) | 200 |
| POST | `/auth/register` | 201, token e usuário |
| POST | `/auth/login` | 200, token e usuário |
| GET / PUT | `/users/me` | 200, perfil |
| PUT | `/users/me/password` | 204 |
| GET / POST | `/categories` | 200 / 201 |
| PUT / DELETE | `/categories/{id}` | 200 / 204 |
| GET / POST | `/transactions` | 200 paginado / 201 |
| PUT / DELETE | `/transactions/{id}` | 200 / 204 |
| GET / POST | `/investments` | 200 / 201 |
| PUT / DELETE | `/investments/{id}` | 204 / 204 |
| GET | `/dashboard/summary` | 200 |
| GET | `/dashboard/chart` | 200 |
| GET | `/dashboard/monthly-comparison` | 200 |

São 21 operações HTTP. Filtros de lançamentos: `type`, `categoryId`, `search`,
`startDate`, `endDate`, `page`, `pageSize` (máximo 100). Dashboard aceita
`startDate` e `endDate`; comparação aceita `month1` e `month2` em AAAA-MM.
Erros retornam `{ "message": "..." }`. Barras finais são aceitas sem redirect.

## Regras preservadas e diferenças conhecidas

Cada operação é limitada ao usuário do JWT. Categorias têm nome único por
usuário e não podem ser excluídas com lançamentos. Receitas limpam o meio de
pagamento; despesas aceitam débito, crédito ou ausência. Orçamentos alertam a
80%, exibem excedido a 100% e retornam aviso no salvamento somente acima de
100%. Falha ao consultar o aviso não desfaz um lançamento salvo.

Saldo = receitas históricas − despesas históricas − todas as reservas,
inclusive futuras. A faixa histórica 2000-01-01 a 2100-01-01 foi mantida do
Node. Totais do período usam limites inclusivos; recentes são cinco registros
sem filtro de período. Gráficos preenchem lacunas, usam dias até 31 dias de
diferença e meses para intervalos maiores; sem filtro mostram seis meses.

Hashes bcrypt existentes continuam válidos, inclusive a truncagem UTF-8 de
72 bytes do bcryptjs. JWTs HS256 existentes continuam válidos com o mesmo
`JWT_SECRET`. O prazo padrão é um dia; strings numéricas de prazo representam
milissegundos, como no jsonwebtoken/ms. Não renove contas nem hashes em massa.

Diferenças deliberadas e limites de validação:

- Cálculos usam Decimal e arredondamento half-up. Ex.: 85,35/100 passa a
  exibir 85,4%, enquanto `Number.toFixed` do Node pode exibir 85,3%.
  Totais não reproduzem resíduos de ponto flutuante, como 0,1 + 0,2.
- Valores de lançamentos e orçamentos acima do NUMERIC(12,2) retornam 422;
  casas extras são arredondadas como no PostgreSQL. Reservas exigem duas
  casas, como antes. `NaN` e infinito são rejeitados.
- Datas inválidas do dashboard retornam 422 com mensagem em vez de um erro
  interno do Prisma. Mensagens detalhadas de validação diferem de Zod.
- Pydantic EmailStr normaliza o domínio do email em novas entradas.
- Calendários usam UTC de forma consistente. O gráfico sem filtro do Node
  dependia do fuso do servidor; a comparação automatizada executa Node em UTC.
- Nenhum teste foi executado contra Neon/produção. Os fluxos básicos do React
  foram validados no Chrome local, conforme o [guia local](../docs/LOCAL-FASTAPI.md).
  A homologação humana completa continua necessária antes da troca de produção.

## Testes

```powershell
.venv\Scripts\python.exe -m pytest -q
# Para incluir PostgreSQL e comparação HTTP com Node:
$env:TEST_DATABASE_URL='postgresql://finance:finance@127.0.0.1:5432/finance_test'
.venv\Scripts\python.exe -m pytest -q
```

O banco PostgreSQL de testes precisa ser **local**, terminar em `_test` e
permitir criar esquemas. Cada teste cria um esquema aleatório, aplica os SQLs
originais do Prisma e remove apenas esse esquema no encerramento. A variável
`DATABASE_URL` real nunca é usada pelos testes. SQLite em memória roda em
paralelo como opção rápida; testes PostgreSQL são pulados se a URL não existir.
O comparativo real requer Node e as dependências já instaladas em `../backend`.
Ele compara nove consultas e verifica bcrypt e JWT nos dois sentidos.

## Substituição futura

1. Homologar em ambiente isolado com cópia autorizada dos dados, validar
   telas React, datas, limites, buscas, autenticação e totais conhecidos.
2. Revisar as diferenças acima e conferir o esquema real com o Prisma,
   sem executar alteração automática. Fazer backup antes da troca.
3. Somente após autorização, configurar o serviço Python com URL Neon,
   mesmo JWT_SECRET, prazo JWT e origem CORS exata; manter TLS do Neon.
4. Usar `python -m uvicorn app.main:app --host 0.0.0.0 --port <porta-do-host>`.
   Verificar `/health` e fluxos autenticados antes de apontar o frontend.
5. Trocar a URL/roteamento do backend e monitorar falhas. Manter a versão Node
   pronta para reversão da URL, já que o esquema é compartilhado e compatível.
6. Remover Node apenas depois da validação final e autorização separada.

Não foram feitos commit, push, merge, rebase, deploy ou alterações no Neon.
