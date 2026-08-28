export type InventoryCategory = 'consumable' | 'medication' | 'instrument' | 'implant' | 'other';
export type InventoryTxnType = 'purchase' | 'usage' | 'adjustment' | 'return';
export type LabWorkType = 'crown' | 'bridge' | 'denture' | 'implant' | 'orthodontic' | 'veneer' | 'other';
export type LabStage = 'sent' | 'in_progress' | 'received' | 'delivered' | 'cancelled';

export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  current_stock: number;
  reorder_level: number;
  cost_per_unit: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  clinic_id: string;
  item_id: string;
  type: InventoryTxnType;
  quantity: number;
  unit_cost: number;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item?: { id: string; name: string; unit: string } | null;
}

export interface LabCase {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  case_number: string;
  lab_name: string;
  work_type: LabWorkType;
  stage: LabStage;
  sent_date: string;
  due_date: string | null;
  received_date: string | null;
  cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string } | null;
}
