import type {
  TreatmentStatus, TreatmentItemStatus, TreatmentItemPriority,
  SittingStatus, VisitType, FollowUpStatus, FollowUpPriority, ChartStatus,
} from '@/types/clinical';

export const TREATMENT_STATUS_OPTIONS: { value: TreatmentStatus; label: string; color: string }[] = [
  { value: 'proposed', label: 'Proposed', color: 'neutral' },
  { value: 'accepted', label: 'Accepted', color: 'primary' },
  { value: 'ongoing', label: 'Ongoing', color: 'warning' },
  { value: 'paused', label: 'Paused', color: 'neutral' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

export const TREATMENT_ITEM_STATUS_OPTIONS: { value: TreatmentItemStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PRIORITY_OPTIONS: { value: TreatmentItemPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export const SITTING_STATUS_OPTIONS: { value: SittingStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'primary' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

export const VISIT_TYPE_OPTIONS: { value: VisitType; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'general', label: 'General Visit' },
  { value: 'emergency', label: 'Emergency' },
];

export const FOLLOW_UP_STATUS_OPTIONS: { value: FollowUpStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'contacted', label: 'Contacted', color: 'primary' },
  { value: 'scheduled', label: 'Scheduled', color: 'primary' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'unable_to_reach', label: 'Unable to Reach', color: 'error' },
  { value: 'cancelled', label: 'Cancelled', color: 'neutral' },
];

export const FOLLOW_UP_PRIORITY_OPTIONS: { value: FollowUpPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export const ADULT_TEETH_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const ADULT_TEETH_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
export const ADULT_TEETH_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
export const ADULT_TEETH_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

export const TOOTH_CONDITIONS: { value: string; label: string; color: string }[] = [
  { value: 'present', label: 'Present', color: 'success' },
  { value: 'missing', label: 'Missing', color: 'neutral' },
  { value: 'unerupted', label: 'Unerupted', color: 'neutral' },
  { value: 'impacted', label: 'Impacted', color: 'neutral' },
  { value: 'caries', label: 'Caries', color: 'error' },
  { value: 'recurrent_caries', label: 'Recurrent Caries', color: 'error' },
  { value: 'composite', label: 'Composite', color: 'primary' },
  { value: 'gic', label: 'GIC', color: 'primary' },
  { value: 'amalgam', label: 'Amalgam', color: 'neutral' },
  { value: 'temporary_restoration', label: 'Temporary Restoration', color: 'warning' },
  { value: 'crown', label: 'Crown', color: 'secondary' },
  { value: 'bridge_abutment', label: 'Bridge Abutment', color: 'secondary' },
  { value: 'bridge_pontic', label: 'Bridge Pontic', color: 'secondary' },
  { value: 'veneer', label: 'Veneer', color: 'secondary' },
  { value: 'implant', label: 'Implant', color: 'accent' },
  { value: 'rct_planned', label: 'RCT Planned', color: 'warning' },
  { value: 'rct_completed', label: 'RCT Completed', color: 'success' },
  { value: 'periapical_lesion', label: 'Periapical Lesion', color: 'error' },
  { value: 'fracture', label: 'Fracture', color: 'error' },
  { value: 'extraction_planned', label: 'Extraction Planned', color: 'warning' },
  { value: 'extraction_completed', label: 'Extraction Completed', color: 'neutral' },
  { value: 'treatment_planned', label: 'Treatment Planned', color: 'warning' },
  { value: 'treatment_completed', label: 'Treatment Completed', color: 'success' },
];

export const CHART_STATUS_OPTIONS: { value: ChartStatus; label: string }[] = [
  { value: 'present', label: 'Existing' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
];
