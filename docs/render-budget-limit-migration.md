# Correção de P2022: categories.budget_limit

## Diagnóstico e escopo

O schema possui budgetLimit Decimal? @map("budget_limit") @db.Decimal(12, 2), mas a migração inicial não cria a coluna. A única outra migração anterior cria investments. Gerar o Prisma Client não altera o banco.

Nova migração: `20260911180000_add_category_budget_limit`.
Ela adiciona a coluna nullable numeric(12,2), sem default e sem atualizar ou apagar linhas. Se ela já existir, preserva valores e verifica sua definição. Uma definição incompatível interrompe a migração atomicamente. Há limite de 5 segundos para espera por locks; ALTER TABLE exige lock e deve ser aplicado em uma janela apropriada.

As duas migrações anteriores não foram modificadas. A migração de investments cria os campos do schema, chave primária, FK para users com cascade, índice (user_id,date) e CHECK amount > 0. UUID e updatedAt são preenchidos pelo Prisma, não por defaults SQL.

## Destinos e autorização

- Validado localmente: host localhost, porta 5432, banco finance_control, schema public.
- Produção: **host, porta, banco, schema e serviço Render ainda não confirmados**.
- Nenhum acesso a servidor ou banco de produção foi realizado.
- Não executar os comandos abaixo em produção sem autorização explícita. Uma autorização de inspeção não autoriza migrate deploy, migrate resolve, mudanças no serviço ou deploy da aplicação.
- Não copiar URLs completas, senhas, tokens ou arquivos .env para logs, PRs ou mensagens.

## 1. Identificar o destino, sem conexão ao banco

Na cópia do backend correspondente ao commit aprovado, com as dependências instaladas e DATABASE_URL fornecida de forma privada pelo ambiente:

```sh
node scripts/inspect-migration-target.cjs
```

Esse comando é offline e exibe apenas host, porta, nome do banco, schema e hashes dos arquivos de migração. Não exibe usuário, senha ou parâmetros de conexão. Executá-lo em um shell do Render já constitui acesso ao servidor e requer autorização.

Compare esses campos com o PostgreSQL vinculado ao serviço backend no Render e com a conexão do pgAdmin. URLs internas e externas podem ter hosts diferentes: confirme que ambas pertencem ao mesmo recurso Render. Uma coluna vista em outro banco não confirma a situação da produção.

## 2. Inspecionar produção somente após autorizar leitura

Todos os comandos deste documento partem de backend (ou da raiz de serviço Render configurada como backend):

```sh
node scripts/inspect-migration-target.cjs --connect
npx --no-install prisma migrate status
```

A inspeção usa uma transação read-only e mostra identidade do banco, histórico sem mensagens de erro potencialmente sensíveis, checksums, colunas, índices e constraints. Conferir:

- Identidade corresponde ao destino aprovado; schema não foi confundido com outro.
- Migração inicial finalizada, sem rollback, com checksum correspondente ao arquivo.
- Não há migração falhada (finished_at nulo e rolled_back_at nulo), arquivos aplicados modificados ou histórico desconhecido.
- budget_limit é ausente ou nullable numeric(12,2), sem default.
- Estado físico de investments corresponde ao histórico.

migrate status pode retornar código 1 quando há pendências; isso não autoriza aplicação. migrate deploy não detecta todo drift, portanto a inspeção física é necessária.

| Histórico/estrutura de investments | Ação |
| --- | --- |
| Migração aplicada e estrutura correta | Preservar; aplicar só a nova pendência |
| Migração pendente e tabela ausente | Planejar investments antes de budget_limit |
| Migração pendente, mas tabela já existe | Parar: CREATE TABLE falharia; comparar integralmente campos, tipos, nulabilidade, defaults, PK, FK, CHECK e índice |
| Migração aplicada, mas tabela ausente ou divergente | Parar: preparar correção específica; deploy não reaplica migrações concluídas |
| Histórico inexistente, falhado ou divergente | Parar e preparar reconciliação específica; não resetar nem marcar tudo como aplicado |

Se investments já existir com definição **integralmente equivalente** e a migração não estiver registrada, um plano separado, explicitamente aprovado, poderá usar:

```sh
npx --no-install prisma migrate resolve --applied 20260911000000_add_investments
```

Esse comando altera o histórico; não cria nem corrige a tabela. Não executar apenas porque o nome da tabela existe. Para falhas parciais, inspecionar e preparar plano próprio antes de qualquer resolve.

## 3. Apresentar o plano final antes de qualquer escrita

Preencher e apresentar ao responsável, sem credenciais:

- Serviço Render e commit da aplicação/migrações.
- Host, porta, banco e schema confirmados.
- Resultado do histórico e comparação dos checksums.
- Lista **exata** das migrações pendentes que serão executadas.
- Backup/snapshot recuperável confirmado e janela de aplicação.
- Comandos exatos abaixo, ou plano de reconciliação separado se necessário.

Possíveis pendências neste repositório, em ordem:
1. `20260911000000_add_investments` — somente se ainda não aplicada e tabela ausente.
2. `20260911180000_add_category_budget_limit` — correção da coluna.

A migração inicial `20260803175917_npm_run_prisma_seed` já deve estar aplicada no banco existente. Se aparecer pendente, **não prosseguir automaticamente**.

## 4. Aplicar somente após aprovação do destino e da lista

Com DATABASE_URL já configurada privadamente para o destino aprovado e o mesmo commit inspecionado:

```sh
npx --no-install prisma migrate deploy
npx --no-install prisma migrate status
node scripts/inspect-migration-target.cjs --connect
```

migrate deploy executa **todas** as migrações pendentes, não apenas a correção. Se o commit, destino ou histórico mudar após a revisão, refazer a inspeção antes de aplicar.

Confirmar ausência de pendências, migração concluída, coluna correta e tabela investments coerente. Após o deploy autorizado da API, verificar listagem de categorias e dashboard com uma conta existente e ausência de P2022 nos logs. Não publicar dados de usuários ou credenciais.

Se houver timeout de lock ou falha de definição, parar e investigar. A migração é atômica, mas Prisma pode registrar a tentativa falhada. Uma eventual marcação como rolled-back e nova tentativa exige revisão do histórico e autorização específica. Não apagar a coluna como rollback: preservar os dados e corrigir adiante.

## 5. Configuração futura do Render (proposta, não aplicada)

Com Root Directory = backend:

- Build Command: `npm ci && npx --no-install prisma generate && npm run build`
- Pre-Deploy Command: `npx --no-install prisma migrate deploy`
- Start Command: `npm start`

Confirmar disponibilidade do pre-deploy no plano Render e da CLI Prisma durante essa fase. Não habilitar até reconciliar o estado atual. Em plano sem pre-deploy, usar uma execução controlada e autorizada antes do deploy da API; não inserir migrações no start sem avaliar múltiplas instâncias.

Fontes oficiais: [Render e Prisma](https://render.com/docs/deploy-prisma-orm), [fases e disponibilidade do pre-deploy](https://render.com/docs/deploys), [Prisma CLI](https://www.prisma.io/docs/orm/v6/reference/prisma-cli-reference). O projeto usa Prisma 5.22 localmente; os comandos acima foram verificados com essa instalação.

## Validação local

```sh
node scripts/verify-budget-migration.cjs
npx --no-install prisma validate
npm run build
npm test
```

O verificador recusa hosts que não sejam loopback, cria fixtures em schemas isolados dentro de transações e sempre as desfaz. Testa as migrações iniciais e investments, coluna ausente, preservação de 123.45 numa coluna preexistente, repetição da correção e rejeição de definição incompatível. Não usa reset, db push ou shadow database destrutivo.
