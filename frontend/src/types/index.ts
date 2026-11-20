export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'DEBIT' | 'CREDIT';

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
  budgetWarning?: string;
  paymentMethod?: PaymentMethod | null;
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
  reserves?: { totalAmount: number; count: number };
  budgetPeriod?: { startDate: string; endDate: string };
  expensesByPaymentMethod: {
    debit: number;
    credit: number;
    unspecified: number;
  };
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

export interface CategoryComparisonItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month1Amount: number;
  month2Amount: number;
  difference: number;
  percentageChange: number | null;
}

export interface MonthlyComparisonData {
  month1: {
    yearMonth: string;
    label: string;
    totalExpense: number;
  };
  month2: {
    yearMonth: string;
    label: string;
    totalExpense: number;
  };
  difference: number;
  percentageChange: number | null;
  categories: CategoryComparisonItem[];
}

export type CsvSourceType = 'STATEMENT' | 'INVOICE';

export interface CsvColumnMapping {
  date: string | null;
  description: string | null;
  amount: string | null;
  incomeAmount: string | null;
  expenseAmount: string | null;
  type: string | null;
  category: string | null;
  paymentMethod: string | null;
}

export interface CsvPreviewRow {
  lineNumber: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod | null;
  suggestedCategoryName: string | null;
  categoryId: string | null;
  isDuplicate: boolean;
}

export interface CsvPreviewError {
  lineNumber: number;
  rawText: string;
  reason: string;
}

export interface CsvPreviewSummary {
  totalRows: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  duplicateCount: number;
  errorCount: number;
}

export interface CsvPreviewResponse {
  sourceType: CsvSourceType;
  detectedDelimiter: string;
  headers: string[];
  detectedMapping: CsvColumnMapping;
  rows: CsvPreviewRow[];
  errors: CsvPreviewError[];
  summary: CsvPreviewSummary;
}

export interface CsvPreviewRequest {
  csvContent: string;
  sourceType: CsvSourceType;
  columnMapping?: Partial<CsvColumnMapping>;
}

export interface CsvImportResponse {
  importedCount: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  budgetWarnings: string[];
}
