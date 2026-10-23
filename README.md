# Finance Control — Sistema de Controle Financeiro Pessoal

Aplicação Full Stack para controle de finanças pessoais: cadastro/login, dashboard com saldo e gráficos, e CRUD completo de receitas, despesas e categorias.

Este projeto foi construído como um exemplo de **arquitetura e boas práticas de Engenharia de Software**, não como um sistema complexo. Veja [`ARCHITECTURE.md`](./ARCHITECTURE.md) para a explicação detalhada das decisões técnicas e [`API.md`](./API.md) para a documentação completa das rotas.

## Backend Python em desenvolvimento

A migração paralela para FastAPI está em [`backend-python`](./backend-python/README.md),
com instruções locais, endpoints, testes e diferenças documentadas. O backend Node.js
e a configuração publicada continuam preservados.

## Stack

**Backend:** Python 3.12+ · FastAPI · SQLAlchemy 2 · Pydantic · PostgreSQL · JWT

**Frontend:** React · TypeScript · Vite · TailwindCSS · React Router · Axios · React Hook Form · Zod · Recharts

## Estrutura

```
finance-control/
├── backend-python/   # Nova API REST (FastAPI), configuração e testes
├── scripts/          # Iniciar/parar o ambiente local no Windows
├── docs/LOCAL-FASTAPI.md # Guia do ambiente local React + FastAPI
├── backend/          # API REST
│   └── src/
│       ├── controllers/   # Traduz HTTP <-> Service
│       ├── services/      # Regras de negócio
│       ├── repositories/  # Acesso a dados (Prisma)
│       ├── routes/        # Definição de endpoints
│       ├── middlewares/   # Auth, validação, tratamento de erros
│       ├── dto/           # Validação e tipos (Zod)
│       ├── interfaces/    # Contratos de repositório
│       ├── prisma/        # Schema e seed do banco
│       └── ...
├── frontend/         # SPA React
│   └── src/
│       ├── pages/          # Telas
│       ├── components/     # UI reutilizável
│       ├── hooks/          # Lógica de estado/dados reutilizável
│       ├── services/       # Chamadas HTTP
│       ├── contexts/       # Estado global (auth, toast)
│       ├── layouts/        # Navbar/Sidebar, layout de auth
│       └── routes/         # Rotas e guarda de autenticação
├── ARCHITECTURE.md
└── API.md
```

## Pré-requisitos

- Node.js 18+
- Python 3.12+ para o novo backend
- PostgreSQL 14+ (local ou em container)

## Como rodar o novo backend (FastAPI)

### Ambiente Windows já preparado

Na raiz do repositório, execute no PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Local.ps1
```

O script inicia PostgreSQL, FastAPI e React, provisiona as tabelas no banco local
`127.0.0.1:55432/finance_dev` e salva os logs em `.tools/`.
Ele requer o Python com dependências já preparado em `.tools/python`, as
dependências do frontend instaladas (`npm.cmd ci` dentro de `frontend`) e
PostgreSQL 18 em `C:\Program Files\PostgreSQL\18\bin`. Para outro caminho,
acrescente `-PgBin 'C:\caminho\PostgreSQL\bin'` ao comando.
Esse atalho depende do ambiente preparado neste computador; para configurar o
Python em uma instalação nova, siga os passos manuais abaixo.

Para parar os serviços, preservando os dados locais:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Stop-Local.ps1
```

Consulte o [guia local](./docs/LOCAL-FASTAPI.md) para detalhes do PostgreSQL
isolado, conta de homologação e configuração do ambiente.

### Execução manual

A `.venv` local ja esta preparada. No PowerShell:

```powershell
cd backend-python
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 3333
```

Se o PowerShell bloquear a ativacao, execute
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` e tente novamente.
Isso vale apenas no terminal atual. Para sair da venv, use `deactivate`.
O PostgreSQL precisa estar ativo e provisionado.

Para uma instalacao nova, siga os passos abaixo.

Na raiz do repositório, com Python 3.12+ instalado:

```powershell
cd backend-python
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[test]" -c requirements.lock
# Copie apenas na primeira configuração, preservando um .env existente:
Copy-Item .env.example .env
```

No Linux/macOS, use `python3.12 -m venv .venv`, `.venv/bin/python` e
`cp .env.example .env` nos comandos equivalentes.

Edite `backend-python/.env` com os dados do seu PostgreSQL de desenvolvimento:

```dotenv
DATABASE_URL=postgresql://finance:finance@localhost:5432/finance_dev
JWT_SECRET=substitua-por-um-segredo-longo-aleatorio-local
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
PORT=3333
```

`DATABASE_URL` e `JWT_SECRET` são obrigatórios. Ajuste usuário, senha, porta e
nome do banco. A URL não deve conter o parâmetro `schema` usado pelo Prisma.
O banco precisa estar ativo **com as tabelas já provisionadas**: a API Python
não cria tabelas, executa migrações ou popula dados ao iniciar. O histórico do
esquema está em `backend/prisma/migrations`. Para provisionar o banco isolado
na porta 55432, use o script e o [guia local](./docs/LOCAL-FASTAPI.md).
Veja também as [orientações de banco](./backend-python/README.md#banco-e-configuração).

Dentro de `backend-python`, inicie a API:

```powershell
.venv\Scripts\python.exe -m app
```

Para recarga automática durante o desenvolvimento:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 3333
```

Em outro terminal, a partir da raiz, inicie o frontend:

```powershell
cd frontend
# Copie apenas se o arquivo ainda não existir:
Copy-Item .env.example .env.development.local
npm.cmd install
npm.cmd run dev
```

Confira `VITE_API_URL=http://localhost:3333/api` em
`frontend/.env.development.local`. Abra o frontend por `localhost`, conforme
a origem configurada em `FRONTEND_URL`.

| Serviço | Endereço |
|---|---|
| Frontend React | http://localhost:5173 |
| API FastAPI | http://localhost:3333/api |
| Documentação interativa (Swagger) | http://localhost:3333/docs |
| Verificação de saúde | http://localhost:3333/health |

Para executar Node e Python simultaneamente, use outra porta para um deles e
ajuste `VITE_API_URL` no frontend local correspondente.

### Testes do backend Python

Dentro de `backend-python`, com o ambiente virtual instalado:

```powershell
.venv\Scripts\python.exe -m pytest -q
```

Os testes PostgreSQL exigem configuração adicional. Consulte a
[documentação do backend Python](./backend-python/README.md) para instruções,
endpoints e diferenças em relação ao Node.

## Como rodar o backend anterior (Node.js)

### 1. Banco de dados

Crie um banco PostgreSQL vazio, por exemplo:
```bash
psql -U postgres -c "CREATE DATABASE finance_control;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edite .env se necessário (DATABASE_URL, JWT_SECRET, etc.)

npm install
npm run prisma:migrate     # cria as tabelas
npm run prisma:seed        # popula com usuário demo, categorias e transações de exemplo
npm run dev                # sobe a API em http://localhost:3333
```

**Login de demonstração criado pelo seed:**
- E-mail: `demo@financecontrol.com`
- Senha: `123456`

### 3. Frontend

Em outro terminal:
```bash
cd frontend
cp .env.example .env
# VITE_API_URL já aponta para http://localhost:3333/api por padrão

npm install
npm run dev                # sobe o frontend em http://localhost:5173
```

Acesse `http://localhost:5173` no navegador.

## Scripts úteis (backend anterior — Node.js)

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe a API com hot-reload |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run prisma:migrate` | Cria/atualiza tabelas a partir do schema |
| `npm run prisma:seed` | Popula o banco com dados de exemplo |
| `npm run prisma:studio` | Abre uma interface visual para o banco |

## Scripts úteis (frontend)

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento (Vite) |
| `npm run build` | Gera a build de produção em `dist/` |
| `npm run preview` | Serve a build de produção localmente |

## Funcionalidades implementadas

- ✅ Cadastro, login e logout (JWT)
- ✅ Dashboard: saldo atual, receitas/despesas do mês, total do mês, últimas movimentações e gráfico
- ✅ CRUD completo de Receitas e Despesas, com busca e filtro por categoria
- ✅ CRUD completo de Categorias, com bloqueio de exclusão quando há transações vinculadas
- ✅ Edição de perfil (nome, e-mail) e alteração de senha
- ✅ Página 404, formulários validados (Zod + React Hook Form), toasts de feedback, loading states
- ✅ Interface responsiva (mobile, tablet, desktop)

## Sugestões de melhorias futuras

Veja a seção final de [`ARCHITECTURE.md`](./ARCHITECTURE.md#sugestões-de-evolução-futura).
