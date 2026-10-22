# Executar e testar React + FastAPI localmente

Ambiente preparado em 22/10/2026 na branch `Igor`. Não houve commit, push,
merge, deploy ou acesso ao Neon. As configurações publicadas foram preservadas.

## Iniciar e parar

Na raiz do repositório, execute no PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Local.ps1
```

O script usa o Python 3.12.10 já preparado em `.tools/python`, Node instalado,
as dependências existentes do frontend e PostgreSQL 18 em
`C:\Program Files\PostgreSQL\18\bin`. Se o PostgreSQL estiver em outro caminho,
passe `-PgBin 'C:\caminho\bin'`. Não altera a política permanente do PowerShell.
Os processos iniciam ocultos e os logs ficam em `.tools/`.

O script pode ser executado novamente: reconhece os processos que iniciou,
recusa portas ocupadas por outros processos e aplica cada SQL Prisma uma só
vez no banco local. A aplicação FastAPI continua sem DDL no startup; o
provisionamento do ambiente é uma etapa explícita separada.

Para parar os serviços criados pelo script, preservando os dados locais:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Stop-Local.ps1
```

| Serviço | Endereço |
|---|---|
| Aplicação React | http://localhost:5173 |
| Swagger | http://localhost:3333/docs |
| OpenAPI | http://localhost:3333/openapi.json |
| Saúde | http://localhost:3333/health |
| API | http://localhost:3333/api |
| PostgreSQL dev | `127.0.0.1:55432/finance_dev`, usuário `finance` |

Abra o frontend com **localhost**, que é a origem configurada no CORS. As
verificações internas do script usam `127.0.0.1` para evitar a tentativa IPv6
do Windows PowerShell. O cluster auxiliar escuta somente em loopback e usa
autenticação trust; a credencial JWT é exclusiva deste ambiente descartável.

## Variáveis locais

Foram criados dois arquivos ignorados pelo Git:

- `backend-python/.env`: `DATABASE_URL` aponta exclusivamente para
  `postgresql://finance@127.0.0.1:55432/finance_dev`; CORS usa
  `FRONTEND_URL=http://localhost:5173`; `PORT=3333`; segredo JWT local.
- `frontend/.env.development.local`:
  `VITE_API_URL=http://localhost:3333/api`. Vite carrega esse arquivo somente
  em desenvolvimento; ele não muda a configuração do build de produção.

O script também define essas variáveis apenas no processo local para evitar
herdar acidentalmente uma URL de produção. O provisionador
`backend-python/scripts/setup_local_db.py` usa um endereço loopback fixo,
ignora `DATABASE_URL`, cria `finance_dev` e `finance_test` se necessário e
aplica os SQLs originais do Prisma apenas em `finance_dev`.

Para iniciar manualmente, depois que o PostgreSQL estiver ativo e preparado:

```powershell
# Terminal 1, na raiz:
Set-Location backend-python
..\.tools\python\python.exe -m app

# Terminal 2, na raiz:
Set-Location frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

## Conta sintética para testes

- E-mail: `homologacao@example.com`
- Senha: `TesteLocal2026!`

Essa conta existe somente no banco local. Os registros de demonstração foram
mantidos para que você possa continuar os testes: categoria “Homologação
local” com orçamento de R$ 100,00, receita de R$ 1.000,00, despesa no crédito
de R$ 120,35 e reserva de R$ 200,00, todos em 22/10/2026.

## Validação realizada

Foi utilizado Chrome real pela skill
[Computer Use](C:/Users/igorj/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/skills/computer-use/SKILL.md).

| Fluxo no navegador | Verificação efetivamente realizada |
|---|---|
| Login | Entrada pela tela React com conta sintética, redirecionamento ao dashboard |
| Categorias | Criação e listagem com orçamento mensal de R$ 100,00 |
| Receitas | Criação e listagem de R$ 1.000,00, data e categoria corretas |
| Despesas | Criação/listagem de R$ 120,35 no crédito; aviso de orçamento excedido |
| Reservas | Criação/listagem de R$ 200,00 e totais da tela Investimento |
| Dashboard | Receita R$ 1.000,00, despesa R$ 120,35, período R$ 879,65, saldo R$ 679,65; gráficos e orçamento carregados |
| Persistência | Recarga da página manteve sessão e totais |
| Swagger | `/docs` renderizado com as operações; `/openapi.json` e `/health` disponíveis |

Foram observados os estados reais da interface após as ações e inspecionada
a captura do dashboard. Não se trata de aprovação de todos os cenários
visuais: edição/exclusão pela interface, cadastro pela tela, perfil,
responsividade e navegadores adicionais não foram testados nesta rodada.
O cadastro da conta sintética foi feito pela API local.

## Testes automatizados e limitações

- Pytest: **27 aprovados, 1 pulado**, com SQLite e PostgreSQL local
  `finance_test`, incluindo comparação HTTP com Node. O caso pulado é a
  variante SQLite da comparação exclusiva PostgreSQL.
- Vitest do backend Node: **48 aprovados**.
- Build React: **aprovado**, com aviso de bundle maior que 500 kB.
- `npm.cmd run lint`: **não executou o lint**, pois `eslint` não está
  instalado nem declarado nas dependências do frontend. Essa limitação
  anterior à migração não foi corrigida para evitar ampliar o escopo.
- Console do navegador: nenhum erro observado; avisos de futura migração
  do React Router v7. Pytest emite depreciação de httpx no TestClient.
- Diferenças numéricas da migração continuam documentadas no
  [README Python](../backend-python/README.md).

Foram corrigidas apenas questões do ambiente de migração: leitura de `.env`
com BOM UTF-8 criado pelo PowerShell e sondas IPv4 nos scripts locais.
Nenhuma incompatibilidade funcional adicional foi observada nos fluxos acima.

Para repetir a suíte Python, com o ambiente local iniciado:

```powershell
Set-Location backend-python
$env:TEST_DATABASE_URL='postgresql://finance@127.0.0.1:55432/finance_test'
..\.tools\python\python.exe -m pytest -q -p no:cacheprovider
```

Os testes usam esquemas aleatórios dentro de `finance_test`; não apagam
os registros de homologação de `finance_dev`.
