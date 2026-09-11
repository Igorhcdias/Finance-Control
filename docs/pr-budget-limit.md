# Corrige migração ausente de categories.budget_limit (P2022)

A API consulta categories.budget_limit, mas nenhuma migração anterior criava essa coluna. Adiciona uma migração nullable numeric(12,2) que preserva colunas e valores existentes e rejeita definições incompatíveis, sem apagar dados. Mantém a migração investments e seus checksums.

Inclui verificação PostgreSQL local em transações desfeitas, inspeção de destino sem credenciais (offline por padrão) e roteiro de produção com revisão do histórico e autorização antes de acesso e escrita.

Validação: Prisma validate e build aprovados; 39 testes passaram; integração PostgreSQL cobriu coluna ausente, existente com valores, repetição e definição incompatível, além da estrutura de investments. Produção não foi acessada.

## Fluxo do PR

Branch: fix/categories-budget-limit-migration.
Base proposta: Igor, de onde a correção foi criada. A main local está oito commits atrás de Igor; um PR direto para main incluiria também essas mudanças anteriores. Confirmar a branch remota de destino antes da publicação e a branch que dispara auto-deploy no Render.

Após revisão, os comandos de publicação (não executados) são:

```sh
git push -u origin fix/categories-budget-limit-migration
gh pr create --draft --base Igor --head fix/categories-budget-limit-migration --title "Corrige migração ausente de categories.budget_limit" --body-file docs/pr-budget-limit.md
```

Não fazer push direto na main. Se a correção precisar ir isoladamente para main, criar outra branch a partir da base remota atualizada e transportar apenas o commit desta correção, conferindo as dependências e o schema dessa base. Nenhum merge ou deploy está incluído nesta preparação.

Aplicação no Render: seguir [roteiro de migração](render-budget-limit-migration.md). O conjunto exato de pendências de produção depende da inspeção ainda não autorizada.
