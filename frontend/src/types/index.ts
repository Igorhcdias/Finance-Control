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
  budgetLimit?: number | null;
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

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetLimit: number;
  amountSpent: number;
  spentPercentage: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface DashboardSummary {
  balance: number;
  periodIncome: number;
  periodExpense: number;
  periodTotal: number;
  recentTransactions: Transaction[];
  expensesByCategory: CategoryExpense[];
  budgetProgress: CategoryBudgetProgress[];
}

export interface ChartPoint {
  label: string;
  income: number;
  expense: number;
}

export interface ApiErrorResponse {
  message: string;
}
