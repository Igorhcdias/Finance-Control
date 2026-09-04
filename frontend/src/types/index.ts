export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  userId: string;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  balance: number;
  periodIncome: number;
  periodExpense: number;
  periodTotal: number;
  recentTransactions: Transaction[];
}

export interface ChartPoint {
  label: string;
  income: number;
  expense: number;
}

export interface ApiErrorResponse {
  message: string;
}
