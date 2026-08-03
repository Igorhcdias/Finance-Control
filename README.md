# Finance Control — Sistema de Controle Financeiro Pessoal

Aplicação Full Stack para controle de finanças pessoais: cadastro/login, dashboard com saldo e gráficos, e CRUD completo de receitas, despesas e categorias.

> **Nota de transparência:** a estrutura, arquitetura e código deste projeto foram gerados com o auxílio de Inteligência Artificial (Claude, da Anthropic), a partir de requisitos e decisões definidos por mim. O código foi revisado, testado e ajustado antes de ser publicado.

Este projeto foi construído como um exemplo de **arquitetura e boas práticas de Engenharia de Software**, não como um sistema complexo. Veja [`ARCHITECTURE.md`](./ARCHITECTURE.md) para a explicação detalhada das decisões técnicas e [`API.md`](./API.md) para a documentação completa das rotas.

## Stack

**Backend:** Node.js · Express · TypeScript · Prisma · PostgreSQL · JWT · Zod
**Frontend:** React · TypeScript · Vite · TailwindCSS · React Router · Axios · React Hook Form · Zod · Recharts

## Estrutura

```
finance-control/
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
- PostgreSQL 14+ (local ou em container)

## Como rodar localmente

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

## Scripts úteis (backend)

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
