# Documentação da API

Base URL local: `http://localhost:3333/api`

Todas as rotas (exceto `/auth/*`) exigem o header:
```
Authorization: Bearer <token>
```

---

## Autenticação

### `POST /auth/register`
Cadastra um novo usuário.

**Request:**
```json
{ "name": "Maria Silva", "email": "maria@email.com", "password": "123456" }
```

**Response `201 Created`:**
```json
{ "token": "eyJhbGciOi...", "user": { "id": "uuid", "name": "Maria Silva", "email": "maria@email.com" } }
```

**Erros:** `409` e-mail já cadastrado · `422` dados inválidos

---

### `POST /auth/login`
Autentica um usuário existente.

**Request:**
```json
{ "email": "maria@email.com", "password": "123456" }
```

**Response `200 OK`:** igual ao register.

**Erros:** `401` credenciais inválidas

---

## Categorias

### `POST /categories`
**Request:** `{ "name": "Alimentação", "color": "#3B82F6", "budgetLimit"?: 800.00 }`
**Response `201`:** objeto da categoria criada
**Erros:** `409` nome duplicado · `422` dados inválidos

### `GET /categories`
**Response `200`:** array de categorias do usuário autenticado

### `PUT /categories/:id`
**Request:** `{ "name"?: string, "color"?: string, "budgetLimit"?: 800.00 | null }`
**Response `200`:** categoria atualizada
**Erros:** `404` não encontrada · `409` nome duplicado

### `DELETE /categories/:id`
**Response `204 No Content`**
**Erros:** `404` não encontrada · `409` categoria possui transações vinculadas

---

## Transações (Receitas e Despesas)

### `POST /transactions`
**Request:**
```json
{
  "description": "Salário",
  "amount": 5500,
  "type": "INCOME",
  "date": "2026-08-05",
  "categoryId": "uuid-da-categoria"
}
```
**Response `201`:** transação criada (com categoria populada)
**Erros:** `422` categoria inexistente ou dados inválidos

### `GET /transactions`
**Query params (todos opcionais):** `type` (`INCOME`|`EXPENSE`), `categoryId`, `search`, `startDate`, `endDate`, `page` (default 1), `pageSize` (default 20, máx 100)

**Response `200`:**
```json
{
  "items": [ { "id": "uuid", "description": "...", "amount": 100.5, "type": "EXPENSE", "category": { "...": "..." } } ],
  "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```

### `PUT /transactions/:id`
**Request:** qualquer subconjunto dos campos de criação
**Response `200`:** transação atualizada
**Erros:** `404` não encontrada · `422` categoria inválida

### `DELETE /transactions/:id`
**Response `204 No Content`**
**Erros:** `404` não encontrada

---

## Dashboard

### `GET /dashboard/summary`
**Response `200`:**
```json
{
  "balance": 4200.5,
  "periodIncome": 5500,
  "periodExpense": 2526.4,
  "periodTotal": 2973.6,
  "recentTransactions": [ /* últimas 5 transações */ ],
  "expensesByCategory": [
    {
      "categoryId": "uuid",
      "categoryName": "Alimentação",
      "categoryColor": "#ef4444",
      "amount": 450.0,
      "percentage": 17.8
    }
  ],
  "budgetProgress": [
    {
      "categoryId": "uuid",
      "categoryName": "Alimentação",
      "categoryColor": "#ef4444",
      "budgetLimit": 500.0,
      "amountSpent": 450.0,
      "spentPercentage": 90.0,
      "status": "warning"
    }
  ]
}
```

### `GET /dashboard/chart`
**Query params:** `months` (default 6)
**Response `200`:**
```json
[ { "month": "mar. 26", "income": 5000, "expense": 3200 }, "..." ]
```

### `GET /dashboard/monthly-comparison`
Compara despesas entre dois meses específicos.
**Query params (opcionais):** `month1` (`YYYY-MM`), `month2` (`YYYY-MM`). Se omitidos, compara mês atual vs mês anterior.
**Response `200`:**
```json
{
  "month1": { "yearMonth": "2026-08", "label": "Agosto de 2026", "totalExpense": 2500.0 },
  "month2": { "yearMonth": "2026-07", "label": "Julho de 2026", "totalExpense": 2800.0 },
  "difference": -300.0,
  "percentageChange": -10.7,
  "categories": [
    {
      "categoryId": "uuid",
      "categoryName": "Alimentação",
      "categoryColor": "#ef4444",
      "month1Amount": 600.0,
      "month2Amount": 750.0,
      "difference": -150.0,
      "percentageChange": -20.0
    }
  ]
}
```

---

## Perfil do Usuário

### `GET /users/me`
**Response `200`:** `{ "id": "uuid", "name": "...", "email": "..." }`

### `PUT /users/me`
**Request:** `{ "name"?: string, "email"?: string }`
**Response `200`:** perfil atualizado
**Erros:** `409` e-mail já em uso

### `PUT /users/me/password`
**Request:** `{ "currentPassword": "...", "newPassword": "..." }`
**Response `204 No Content`**
**Erros:** `401` senha atual incorreta

---

## Códigos HTTP usados no projeto

| Código | Significado no contexto da API |
|---|---|
| 200 | Sucesso (GET, PUT) |
| 201 | Recurso criado (POST) |
| 204 | Sucesso sem corpo de resposta (DELETE, alteração de senha) |
| 401 | Não autenticado / credenciais inválidas / token expirado |
| 404 | Recurso não encontrado ou não pertence ao usuário |
| 409 | Conflito (e-mail duplicado, nome de categoria duplicado, exclusão bloqueada) |
| 422 | Dados de entrada inválidos (falha de validação Zod) |
| 500 | Erro interno não tratado |
