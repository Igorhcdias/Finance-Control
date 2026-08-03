# Arquitetura do Sistema

Este documento explica as decisões arquiteturais do projeto — o "porquê" por trás de cada camada e padrão utilizado.

## Visão Geral

```
Requisição HTTP
     │
     ▼
 Middlewares (CORS, JSON parsing, auth, validação)
     │
     ▼
 Routes ──────► Controllers ──────► Services ──────► Repositories ──────► Prisma ──────► PostgreSQL
                (HTTP <-> domínio)  (regras de       (acesso a dados)
                                     negócio)
```

Cada seta representa uma dependência em **uma única direção**: uma camada superior conhece a camada abaixo dela através de uma interface, nunca o contrário. Isso é a base de uma **arquitetura em camadas (Layered Architecture)**.

## Por que separar em camadas?

| Camada | Responsabilidade | O que ela NÃO faz |
|---|---|---|
| **Routes** | Mapear método HTTP + URL para um controller, aplicar middlewares | Não valida regra de negócio, não acessa banco |
| **Controllers** | Traduzir `req`/`res` para chamadas de Service | Não contém `if` de regra de negócio |
| **Services** | Implementar regras de negócio (RN01–RN10) | Não sabe o que é `req.body` ou Prisma |
| **Repositories** | Executar queries no banco via Prisma | Não decide se uma operação é permitida |
| **DTOs** | Validar e tipar dados de entrada (Zod) | Não processa lógica |

Essa separação segue diretamente o **Single Responsibility Principle (SOLID - S)**: cada arquivo tem um, e apenas um, motivo para mudar. Se a regra "categoria com transações não pode ser excluída" mudar amanhã, a alteração acontece **apenas** em `category.service.ts` — controllers e rotas continuam intactos.

## Repository Pattern + Dependency Inversion

Os services (`AuthService`, `CategoryService`, etc.) nunca importam o Prisma diretamente. Eles recebem uma **interface** de repositório no construtor:

```typescript
export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}
}
```

Isso é o **Dependency Inversion Principle (SOLID - D)**: módulos de alto nível (regras de negócio) não dependem de módulos de baixo nível (Prisma) — ambos dependem de uma abstração (`ICategoryRepository`). Na prática, isso significa:

- Trocar o Prisma por outro ORM no futuro exigiria reescrever apenas a classe `CategoryRepository`, sem tocar em nenhuma regra de negócio.
- Em testes unitários, é possível passar um repositório *fake* (in-memory) no lugar do real, testando a regra de negócio isoladamente, sem precisar de um banco de dados rodando.

## DTOs com Zod

Cada DTO (`register.dto.ts`, `category.dto.ts`, etc.) define, em um único lugar, **tanto** a validação em runtime **quanto** o tipo estático do TypeScript:

```typescript
export const createCategorySchema = z.object({
  name: z.string().min(2).max(50),
  color: z.string().regex(hexColorRegex),
});
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
```

Isso evita a duplicação clássica de "escrever a interface" e "escrever a validação" separadamente — uma fonte única de verdade (DRY).

## Tratamento de Erros Centralizado

Services lançam `AppError` (erros de negócio, com status HTTP definido) ou deixam erros inesperados subirem. Um único middleware (`error.middleware.ts`), registrado por último no `app.ts`, decide como cada tipo de erro vira uma resposta HTTP. Nenhum controller precisa de `try/catch` manual — o `asyncHandler` encaminha qualquer rejeição de Promise para esse middleware.

## Autenticação (JWT)

O `auth.middleware.ts` intercepta rotas protegidas, valida o token e anexa `req.user`. Todas as rotas de categoria, transação, dashboard e perfil chamam `router.use(authMiddleware)` uma única vez no topo do arquivo de rotas — não é preciso repetir a checagem em cada endpoint (RF13).

## Frontend: Organização por Responsabilidade

| Pasta | Responsabilidade |
|---|---|
| `pages/` | Composição de tela; delega dados a hooks e UI a componentes |
| `hooks/` | Lógica de estado e chamadas assíncronas reutilizáveis (`useCategories`, `useTransactions`) |
| `services/` | Chamadas HTTP à API (Axios) |
| `contexts/` | Estado global (autenticação, toasts) |
| `components/` | UI reutilizável e "burra" (recebe dados via props) |
| `layouts/` | Estrutura visual compartilhada (Navbar/Sidebar, tela de auth) |
| `routes/` | Definição de rotas e guarda de autenticação |

### Componente compartilhado: `TransactionsPage`

Receitas e Despesas têm exatamente a mesma estrutura de tela — lista, busca, filtro por categoria, formulário, exclusão. Em vez de duplicar essa tela duas vezes (`IncomesPage` e `ExpensesPage` idênticas), existe **um único** componente `TransactionsPage` parametrizado por `type: 'INCOME' | 'EXPENSE'`. As páginas de Receitas e Despesas são apenas *wrappers* finos que passam esse parâmetro. Isso é DRY aplicado diretamente: uma mudança de comportamento (ex: adicionar paginação) é escrita uma única vez e vale para as duas telas.

### Formulários: React Hook Form + Zod

Todo formulário usa o mesmo padrão: um schema Zod define validação e tipo, `zodResolver` conecta esse schema ao React Hook Form. Isso reaproveita, no frontend, a mesma filosofia de DTOs do backend — validação e tipagem nascem de uma única definição.

## Decisões conscientes de simplicidade

Este é um projeto de porte pequeno/médio, então algumas escolhas mantêm o código enxuto **de propósito**, sem abrir mão de organização:

- **Instanciação manual de dependências** (`new CategoryService(new CategoryRepository())`) em vez de um container de Injeção de Dependência (ex: InversifyJS, tsyringe). Um container de DI adicionaria uma camada de complexidade desproporcional ao tamanho do projeto; a inversão de dependência via interfaces já é obtida sem ele.
- **Toasts e Modal implementados manualmente** em vez de bibliotecas externas (ex: react-hot-toast, react-modal), evitando dependências extras para um comportamento simples de implementar e manter.
- **Uma única tabela `Transaction`** para receita e despesa (ver `schema.prisma`), evitando duplicar estrutura e queries entre duas tabelas quase idênticas.

## Sugestões de Evolução Futura

- Testes automatizados (unitários para services com repositórios *fake*; integração com supertest para rotas)
- Paginação também nas categorias, se a lista crescer muito
- Exportação de relatórios (CSV/PDF)
- Metas de gastos por categoria e alertas de orçamento
- Múltiplas moedas
- Refresh token / renovação de sessão
- Internacionalização (i18n)
- Containerização com Docker Compose (API + PostgreSQL + frontend)
