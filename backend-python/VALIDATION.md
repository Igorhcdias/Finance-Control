# Validação da migração

Executada em 22/10/2026, exclusivamente na branch `Igor`.

## Arquitetura e plano executado

O fluxo anterior era Express → middlewares JWT/Zod → controllers → services
→ repositories Prisma → PostgreSQL. O frontend React usa Axios, Bearer JWT
em localStorage e contratos camelCase sob `/api`. Há quatro entidades:
User (1:N categorias, lançamentos, reservas); Category (1:N lançamentos),
Transaction (receita/despesa) e Investment (reserva independente).

Foi implementado um backend paralelo com routers FastAPI, entradas Pydantic,
serviços, modelos/relacionamentos SQLAlchemy e sessões por requisição. O plano
preservou as tabelas físicas e os contratos, migrou autenticação e regras,
validou com dados isolados e manteve o Node disponível para comparação.
Nenhuma migração de esquema foi necessária.

## Arquivos

- Criado `backend-python/app/`: configuração, conexão, modelos, schemas,
  segurança, serviços, dashboard, serialização, erros, routers e inicialização.
- Criado `backend-python/tests/`: fixtures isoladas, testes HTTP e comparação
  real com o backend Express.
- Criados `pyproject.toml`, `requirements.lock`, `.env.example`, `.gitignore`,
  `README.md` e este relatório no novo backend.
- Alterado o README raiz para apontar para a implementação paralela.
- Criado `.gitignore` raiz para excluir o runtime e PostgreSQL auxiliares
  em `.tools/`. Esses binários e dados de teste não fazem parte da entrega.
- Backend Node, código React e configurações de deploy preservados.

## Resultados

| Verificação | Resultado |
|---|---|
| Pytest Python 3.12.10 | 27 aprovados, 1 pulado |
| Banco dos testes PostgreSQL | PostgreSQL 18 local, porta 55432, `finance_test` |
| Estrutura PostgreSQL | Provisionada pelos SQLs originais do Prisma em esquemas aleatórios |
| Comparação real HTTP Node/Python | 9 consultas iguais com dados compartilhados de teste |
| bcrypt / JWT | Login e tokens testados nos dois sentidos entre Node e Python |
| Backend Node / Vitest | 48 aprovados em 4 arquivos |
| Frontend | `npm run build` aprovado; sem mudanças de código |
| Compilação Python | `compileall` aprovado |
| Git | Branch `Igor`; sem push, merge, rebase ou commit |
| Produção / Neon | Nenhum acesso ou alteração |

O único teste pulado é a comparação Node na variante SQLite: a mesma comparação
foi executada e aprovada na variante PostgreSQL. Há aviso de depreciação de
httpx no TestClient da versão instalada de Starlette; não impede os testes.
Vite emite aviso de bundle acima de 500 kB, já existente no frontend.

Testes cobrem autenticação, senha, perfil, categorias, restrições de exclusão,
CRUD de lançamentos e reservas, isolamento entre usuários, filtros, paginação,
orçamentos e limites, cálculo decimal, saldos, meios de pagamento, gráficos,
comparação mensal, datas, erros JSON, CORS e falha de consulta de aviso após
salvar. A comparação real cobre perfil, categorias, reservas, duas consultas
de lançamentos, resumo, dois gráficos e comparação mensal.

## Limites da validação

Atualização: a rodada posterior de execução local validou no Chrome os fluxos
básicos de login, criação/listagem de categorias, receitas, despesas, reservas
e totais do dashboard com PostgreSQL de desenvolvimento. O escopo exato,
comandos e limitações estão no [guia local](../docs/LOCAL-FASTAPI.md).

Foram usados dados sintéticos isolados; a produção não foi consultada.
Na rodada inicial descrita acima não foi feita homologação visual navegando nas telas React com a nova API.
A equivalência foi testada nos cenários descritos, não em todas as entradas
possíveis. As diferenças de arredondamento decimal, emails e datas estão
descritas no [README](README.md), junto aos 21 endpoints e instruções de
execução e substituição futura. A aprovação da troca de produção permanece
com o proprietário do projeto.
