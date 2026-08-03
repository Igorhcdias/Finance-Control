import { TransactionsPage } from '../components/TransactionsPage';

export function IncomesPage() {
  return (
    <TransactionsPage
      type="INCOME"
      title="Receitas"
      subtitle="Gerencie suas fontes de entrada de dinheiro"
    />
  );
}
