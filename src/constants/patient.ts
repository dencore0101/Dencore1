export const MEDICAL_CONDITIONS = [
  'diabetes',
  'hypertension',
  'heart_disease',
  'pacemaker',
  'pregnancy',
  'drug_allergy',
  'other_allergy',
  'bleeding_disorder',
  'anticoagulant',
  'asthma',
  'thyroid',
  'kidney_disease',
  'liver_disease',
  'hepatitis',
  'hiv',
  'seizure_disorder',
  'smoking',
  'tobacco',
  'alcohol',
] as const;

export const MEDICAL_CONDITION_LABELS: Record<string, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  heart_disease: 'Heart Disease',
  pacemaker: 'Pacemaker',
  pregnancy: 'Pregnancy',
  drug_allergy: 'Drug Allergy',
  other_allergy: 'Other Allergy',
  bleeding_disorder: 'Bleeding Disorder',
  anticoagulant: 'Anticoagulant/Antiplatelet',
  asthma: 'Asthma',
  thyroid: 'Thyroid',
  kidney_disease: 'Kidney Disease',
  liver_disease: 'Liver Disease',
  hepatitis: 'Hepatitis',
  hiv: 'HIV',
  seizure_disorder: 'Seizure Disorder',
  smoking: 'Smoking',
  tobacco: 'Tobacco',
  alcohol: 'Alcohol',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const DEFAULT_REFERRAL_SOURCES = [
  'Walk-in',
  'Google',
  'Instagram',
  'Facebook',
  'Referral',
  'Justdial',
  'Practo',
  'Camp',
];

export const PAGE_SIZE = 20;
