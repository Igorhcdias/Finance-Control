import { TransactionsPage } from '../components/TransactionsPage';

export function ExpensesPage() {
  return (
    <TransactionsPage
      type="EXPENSE"
      title="Despesas"
      subtitle="Gerencie seus gastos"
    />
  );
}
