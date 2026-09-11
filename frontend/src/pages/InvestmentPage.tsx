import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { investmentService, Investment } from '../services/investment.service';
import { getApiErrorMessage } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loading } from '../components/Loading';
import { formatCurrency, formatDate } from '../utils/format';

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function InvestmentPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today().slice(0, 7));

  async function reload() {
    setLoading(true);
    setError('');
    try { setItems(await investmentService.list()); }
    catch (err) { setError(getApiErrorMessage(err, 'Não foi possível carregar as reservas.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);
  function showForm(item: Investment | null) {
    setEditing(item);
    setDescription(item?.description ?? '');
    setAmount(item ? String(item.amount) : '');
    setDate(item?.date.slice(0, 10) ?? today());
    setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!description.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      showToast('Informe uma descrição e um valor maior que zero.', 'error');
      return;
    }
    setBusy(true);
    try {
      const input = { description: description.trim(), amount: Number(amount), date };
      if (editing) await investmentService.update(editing.id, input);
      else await investmentService.create(input);
      setOpen(false);
      showToast('Reserva salva com sucesso.', 'success');
      await reload();
    } catch (err) { showToast(getApiErrorMessage(err, 'Erro ao salvar reserva.'), 'error'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await investmentService.delete(deleting.id);
      setDeleting(null);
      showToast('Reserva excluída.', 'success');
      await reload();
    } catch (err) { showToast(getApiErrorMessage(err, 'Erro ao excluir reserva.'), 'error'); }
    finally { setBusy(false); }
  }
  const filtered = items.filter(item => !month || item.date.startsWith(month));
  const sum = (rows: Investment[]) => rows.reduce((total, item) => total + Math.round(Number(item.amount) * 100), 0) / 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Investimento</h1>
          <p className="text-sm text-gray-500">Planeje o dinheiro que você vai separar para investir.</p>
        </div>
        <button className="btn-primary" onClick={() => showForm(null)}><Plus size={18} /> Nova reserva</button>
      </div>
      {loading ? <Loading /> : error ? (
        <div className="card" role="alert"><p className="mb-3 text-sm text-red-600">{error}</p><button className="btn-secondary" onClick={() => void reload()}>Tentar novamente</button></div>
      ) : <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card"><p className="text-sm text-gray-500">Total reservado • todos os períodos</p><p className="mt-2 text-2xl font-semibold text-primary-700">{formatCurrency(sum(items))}</p></div>
          <div className="card"><p className="text-sm text-gray-500">{month ? 'Reservado no mês selecionado' : 'Reservado em todos os períodos'}</p><p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(sum(filtered))}</p></div>
        </div>
        <div className="card">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">Histórico de reservas</h2>
            <div><label className="label-field" htmlFor="investment-month">Mês</label><div className="flex gap-2"><input id="investment-month" className="input-field" type="month" value={month} onChange={e => setMonth(e.target.value)} /><button className="btn-secondary" onClick={() => setMonth('')}>Todos</button></div></div>
          </div>
          {filtered.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">Nenhuma reserva neste período. Use “Nova reserva” para começar.</p> :
            <ul className="divide-y divide-gray-100">{filtered.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1"><p className="break-words font-medium">{item.description}</p><p className="text-sm text-gray-500">{formatDate(item.date)}</p></div>
                <span className="font-semibold text-primary-700">{formatCurrency(Number(item.amount))}</span>
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={`Editar ${item.description}`} onClick={() => showForm(item)}><Pencil size={17} /></button>
                  <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Excluir ${item.description}`} onClick={() => setDeleting(item)}><Trash2 size={17} /></button>
                </div>
              </li>
            ))}</ul>}
        </div>
      </>}
      <Modal isOpen={open} title={editing ? 'Editar reserva' : 'Nova reserva'} onClose={() => { if (!busy) setOpen(false); }}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div><label htmlFor="investment-description" className="label-field">Descrição</label><input autoFocus id="investment-description" className="input-field" maxLength={255} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Reserva para renda fixa" /></div>
          <div><label htmlFor="investment-amount" className="label-field">Valor a separar (R$)</label><input id="investment-amount" className="input-field" type="number" min="0.01" max="9999999999.99" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><label htmlFor="investment-date" className="label-field">Data da reserva</label><input id="investment-date" className="input-field" type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="btn-primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar reserva'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleting} title="Excluir reserva" description={`Deseja excluir a reserva "${deleting?.description}"? O total reservado será atualizado.`} isLoading={busy} onCancel={() => { if (!busy) setDeleting(null); }} onConfirm={() => void remove()} />
    </div>
  );
}
