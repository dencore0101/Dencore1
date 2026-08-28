import type { InventoryCategory, InventoryTxnType, LabWorkType, LabStage } from '@/types/inventory';

export const INVENTORY_CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: 'consumable', label: 'Consumable' },
  { value: 'medication', label: 'Medication' },
  { value: 'instrument', label: 'Instrument' },
  { value: 'implant', label: 'Implant' },
  { value: 'other', label: 'Other' },
];

export const INVENTORY_TXN_TYPE_OPTIONS: { value: InventoryTxnType; label: string; color: string }[] = [
  { value: 'purchase', label: 'Purchase', color: 'success' },
  { value: 'usage', label: 'Usage', color: 'warning' },
  { value: 'adjustment', label: 'Adjustment', color: 'neutral' },
  { value: 'return', label: 'Return', color: 'primary' },
];

export const LAB_WORK_TYPE_OPTIONS: { value: LabWorkType; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'denture', label: 'Denture' },
  { value: 'implant', label: 'Implant' },
  { value: 'orthodontic', label: 'Orthodontic' },
  { value: 'veneer', label: 'Veneer' },
  { value: 'other', label: 'Other' },
];

export const LAB_STAGE_OPTIONS: { value: LabStage; label: string; color: string }[] = [
  { value: 'sent', label: 'Sent', color: 'primary' },
  { value: 'in_progress', label: 'In Progress', color: 'warning' },
  { value: 'received', label: 'Received', color: 'success' },
  { value: 'delivered', label: 'Delivered', color: 'neutral' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
