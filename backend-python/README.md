# Backend Python

Backend ativo em Python 3.12+, FastAPI, SQLAlchemy 2 e Pydantic.
A organização abaixo não muda a configuração de hospedagem, o banco ou os
comandos de inicialização. As referências ao Node documentam a migração original.

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

```text
app/
  auth/           # Cadastro e login; consulta contas via users/repository.py
  users/          # Perfil, senha e consultas de contas
  categories/     # Categorias e restrições de exclusão
  transactions/   # Lançamentos, filtros, paginação e aviso de orçamento
  investments/    # Reservas
  dashboard/      # Resumo, gráficos, orçamento e comparação mensal
  common/
    dependencies.py # Db e Owner para injeção no FastAPI
    schemas.py      # Tipos e validadores compartilhados
    values.py       # Conversão de entradas e arredondamento monetário
    persistence.py # Salvamento, busca por proprietário e exclusão
  routers.py      # Registro dos seis routers com prefixo /api
  models.py       # Mapeamento único das quatro entidades SQLAlchemy
  database.py     # Engine e sessão por requisição
  config.py       # Variáveis de ambiente
  security.py     # bcrypt, JWT HS256 e proteção Bearer
  serialization.py # Datas e valores compatíveis com o contrato existente
  errors.py       # Erro de aplicação
  main.py         # Factory, middlewares e tratamento HTTP de erros
  __main__.py     # Entrada de python -m app
tests/
```

Cada funcionalidade tem `router.py` (HTTP) e `service.py` (regras e coordenação).
`schemas.py` mantém as entradas Pydantic junto da funcionalidade; dashboard usa
somente os tipos compartilhados de datas e parâmetros simples, sem criar um
arquivo vazio. `repository.py` contém consultas SQLAlchemy. Auth reutiliza o
repositório de usuários, em vez de duplicar consultas de contas.

Fluxo: **router → service → repository / common.persistence → sessão SQLAlchemy**.
Os routers não fazem consultas SQL. Os services definem quando salvar ou excluir;
os helpers compartilhados preservam os limites de commit já existentes e as
buscas por ID e proprietário. Não há classes base de repositório nem uma camada
de controllers que apenas repita chamadas. Os modelos permanecem juntos porque
são quatro entidades relacionadas e compartilham a mesma metadata.

As consultas agregadas do dashboard estão em `dashboard/repository.py`; períodos,
percentuais, preenchimento dos gráficos e formatação continuam em `service.py`.
Transações consultam esse serviço para o aviso de orçamento após salvar, mantendo
a regra de que uma falha no aviso não desfaz o lançamento.

### Como estender

1. Adicione ou ajuste o schema de entrada na funcionalidade correspondente.
2. Escreva consultas no repositório, sempre restringindo dados ao usuário quando
   aplicável. Para registros existentes, use a busca por proprietário de
   `common.persistence`, preservando o comportamento de 404.
3. Implemente a regra no service, incluindo validações de vínculo e os limites
   de persistência. Não mova decisões de negócio para o router.
4. Exponha a operação no router usando `Db` e, para rotas protegidas, `Owner`.
   Um novo módulo deve ser registrado em `app/routers.py`; não repita `/api`.
5. Cubra comportamento, autorização e contrato JSON em `tests/`. Use SQLite em
   memória ou PostgreSQL local isolado; nunca o banco publicado.

Os antigos módulos concentradores `app/services.py`, `app/schemas.py` e
`app/dashboard.py` foram substituídos pelos módulos acima. Imports internos de
scripts ou testes novos devem usar, por exemplo, `app.transactions.service`.
`app.main:app` e `python -m app` continuam sendo as entradas da aplicação.

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
Node. Totais do período usam limites inclusivos; recentes são até cinco registros
do mesmo período, ordenados por data, criação e ID decrescentes, com categoria
carregada na mesma consulta. Gráficos agregam no SQL e preenchem lacunas, usam
dias até 31 dias de diferença e meses para intervalos maiores; sem filtro mostram
seis meses. O frontend envia datas civis explícitas para o período selecionado.

O resumo mantém seus campos anteriores e acrescenta:

- `reserves: { totalAmount: number, count: number }`: soma e quantidade de todas
  as reservas do usuário, independentemente do filtro. Não carrega a lista de reservas.
- `budgetPeriod: { startDate: "AAAA-MM-DD", endDate: "AAAA-MM-DD" }`: mês civil
  completo da data final do período. `budgetProgress` usa esse mês, inclusive em
  filtros parciais ou de vários meses, para comparar despesas com o limite mensal
  existente. A interface identifica explicitamente esse intervalo distinto.

Essas mudanças corrigem recentes fora do filtro e a comparação de despesas de
vários meses com um único limite mensal. Não alteram os limites, os alertas, o
cálculo de saldo nem o esquema do banco. Quando o período é um mês completo,
categorias e orçamento reutilizam a mesma agregação de despesas.

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
- Datas inválidas ou intervalo com início posterior ao fim no dashboard retornam
  422 com mensagem em vez de um erro
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
