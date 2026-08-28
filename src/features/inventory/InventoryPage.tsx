import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Loader2, Trash2, AlertTriangle, ArrowUpDown, History } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import {
  fetchInventoryItems, createInventoryItem, deleteInventoryItem, addTransaction, fetchTransactions,
} from '@/services/inventory.service';
import type { InventoryItem, InventoryTransaction, InventoryCategory, InventoryTxnType } from '@/types/inventory';
import { INVENTORY_CATEGORY_OPTIONS, INVENTORY_TXN_TYPE_OPTIONS, formatCurrency } from '@/constants/inventory';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'alerts'>('stock');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invItems, txns] = await Promise.all([
        fetchInventoryItems(categoryFilter ? { category: categoryFilter } : undefined),
        fetchTransactions(),
      ]);
      setItems(invItems);
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const lowStockItems = items.filter((i) => i.current_stock <= i.reorder_level && i.reorder_level > 0);
  const totalValue = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Inventory"
          subtitle="Stock management with transactions and alerts"
          actions={
            <div className="flex gap-2">
              <button onClick={() => { setShowHistory(true); }} className="btn-secondary">
                <History className="h-4 w-4" />
                History
              </button>
              <button onClick={() => setShowTxnForm(true)} className="btn-secondary">
                <ArrowUpDown className="h-4 w-4" />
                Transaction
              </button>
              <button onClick={() => setShowItemForm(true)} className="btn-primary">
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Items</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{items.length}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Stock Value</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{formatCurrency(totalValue)}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Low Stock Alerts</p>
            <p className={`text-2xl font-semibold mt-1 ${lowStockItems.length > 0 ? 'text-error-600' : 'text-neutral-900'}`}>{lowStockItems.length}</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 mb-4 w-fit">
          <button onClick={() => setActiveTab('stock')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'stock' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>All Items</button>
          <button onClick={() => setActiveTab('alerts')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'alerts' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
            Low Stock {lowStockItems.length > 0 && `(${lowStockItems.length})`}
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <select className="input max-w-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {INVENTORY_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {loading ? (
              <LoadingState label="Loading inventory..." />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : items.length === 0 ? (
              <EmptyState icon={<Package className="h-7 w-7" />} title="No items found" description="Add inventory items to get started." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Category</th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Stock</th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Reorder At</th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Unit Cost</th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Value</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => {
                      const isLow = item.reorder_level > 0 && item.current_stock <= item.reorder_level;
                      const catOpt = INVENTORY_CATEGORY_OPTIONS.find((c) => c.value === item.category);
                      return (
                        <tr key={item.id} className={`hover:bg-neutral-50 transition-colors ${isLow ? 'bg-error-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                            {item.supplier && <p className="text-xs text-neutral-400">{item.supplier}</p>}
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-neutral-600">{catOpt?.label ?? item.category}</span></td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-medium ${isLow ? 'text-error-600' : 'text-neutral-900'}`}>{item.current_stock}</span>
                            <span className="text-xs text-neutral-400 ml-1">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-neutral-500">{item.reorder_level} {item.unit}</td>
                          <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatCurrency(Number(item.cost_per_unit))}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900">{formatCurrency(Number(item.current_stock) * Number(item.cost_per_unit))}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => { setSelectedItem(item); setShowTxnForm(true); }} className="text-xs text-primary-600 hover:text-primary-700">Adjust</button>
                            <button onClick={() => deleteInventoryItem(item.id).then(load)} className="ml-2 text-neutral-300 hover:text-error-600"><Trash2 className="h-4 w-4 inline" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="card">
            {lowStockItems.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="h-7 w-7" />} title="No low stock alerts" description="All items are above their reorder levels." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-error-500" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-400">Reorder at {item.reorder_level} {item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-error-600">{item.current_stock} {item.unit}</p>
                      <button onClick={() => { setSelectedItem(item); setShowTxnForm(true); }} className="text-xs text-primary-600 hover:text-primary-700">Restock</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item form modal */}
      {showItemForm && (
        <ItemFormModal onClose={() => setShowItemForm(false)} onSaved={() => { setShowItemForm(false); load(); }} />
      )}

      {/* Transaction form modal */}
      {showTxnForm && (
        <TxnFormModal
          items={items}
          defaultItemId={selectedItem?.id}
          onClose={() => { setShowTxnForm(false); setSelectedItem(null); }}
          onSaved={() => { setShowTxnForm(false); setSelectedItem(null); load(); }}
        />
      )}

      {/* History modal */}
      {showHistory && (
        <Modal open={true} onClose={() => setShowHistory(false)} title="Transaction History" size="xl"
          footer={<button onClick={() => setShowHistory(false)} className="btn-secondary">Close</button>}
        >
          {transactions.length === 0 ? (
            <EmptyState icon={<History className="h-7 w-7" />} title="No transactions" description="Stock movements will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-3 py-2">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-3 py-2">Item</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-3 py-2">Type</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-3 py-2">Qty</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-3 py-2">Reference</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {transactions.map((txn) => {
                    const typeOpt = INVENTORY_TXN_TYPE_OPTIONS.find((t) => t.value === txn.type);
                    return (
                      <tr key={txn.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 text-sm text-neutral-500">{new Date(txn.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-3 py-2 text-sm font-medium text-neutral-900">{txn.item?.name ?? '—'}</td>
                        <td className="px-3 py-2">{typeOpt && <StatusBadge color={typeOpt.color as 'primary'}>{typeOpt.label}</StatusBadge>}</td>
                        <td className={`px-3 py-2 text-right text-sm font-medium ${Number(txn.quantity) >= 0 ? 'text-success-600' : 'text-error-600'}`}>{Number(txn.quantity) >= 0 ? '+' : ''}{txn.quantity} {txn.item?.unit ?? ''}</td>
                        <td className="px-3 py-2 text-sm text-neutral-500">{txn.reference ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </AppShell>
  );
}

// ── Item Form Modal ──────────────────────────────────────────
function ItemFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', category: 'consumable' as InventoryCategory, unit: 'piece',
    current_stock: 0, reorder_level: 0, cost_per_unit: 0, supplier: '', notes: '',
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      await createInventoryItem({
        name: form.name.trim(), category: form.category, unit: form.unit,
        current_stock: form.current_stock, reorder_level: form.reorder_level,
        cost_per_unit: form.cost_per_unit, supplier: form.supplier || null, notes: form.notes || null,
      });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Inventory Item"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div><label className="label">Name <span className="text-error-500">*</span></label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as InventoryCategory }))}>{INVENTORY_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="piece, box, vial..." /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label">Opening Stock</label><input type="number" min={0} className="input" value={form.current_stock} onChange={(e) => setForm((f) => ({ ...f, current_stock: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label className="label">Reorder Level</label><input type="number" min={0} className="input" value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label className="label">Cost/Unit (₹)</label><input type="number" min={0} step="0.01" className="input" value={form.cost_per_unit} onChange={(e) => setForm((f) => ({ ...f, cost_per_unit: parseFloat(e.target.value) || 0 }))} /></div>
        </div>
        <div><label className="label">Supplier</label><input className="input" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}

// ── Transaction Form Modal ───────────────────────────────────
function TxnFormModal({ items, defaultItemId, onClose, onSaved }: { items: InventoryItem[]; defaultItemId?: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_id: defaultItemId ?? '', type: 'purchase' as InventoryTxnType,
    quantity: 1, unit_cost: 0, reference: '', notes: '',
  });

  const handleSubmit = async () => {
    if (!form.item_id || form.quantity <= 0) { setError('Item and quantity are required'); return; }
    setSaving(true); setError(null);
    try {
      await addTransaction({
        item_id: form.item_id, type: form.type, quantity: form.quantity,
        unit_cost: form.unit_cost, reference: form.reference || null, notes: form.notes || null,
      });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Stock Transaction"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.item_id || form.quantity <= 0} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div><label className="label">Item <span className="text-error-500">*</span></label>
          <select className="input" value={form.item_id} onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}>
            <option value="">Select item...</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as InventoryTxnType }))}>{INVENTORY_TXN_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="label">Quantity <span className="text-error-500">*</span></label><input type="number" min={0.01} step="0.01" className="input" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} autoFocus /></div>
        </div>
        <div><label className="label">Unit Cost (₹)</label><input type="number" min={0} step="0.01" className="input" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} /></div>
        <div><label className="label">Reference</label><input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="PO number, patient name..." /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
