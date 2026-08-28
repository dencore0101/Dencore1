import type { PrescriptionStatus, ConsentType, ConsentStatus } from '@/types/prescription';

export const PRESCRIPTION_STATUS_OPTIONS: { value: PrescriptionStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'completed', label: 'Completed', color: 'neutral' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

export const CONSENT_TYPE_OPTIONS: { value: ConsentType; label: string }[] = [
  { value: 'general', label: 'General Treatment' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'rct', label: 'Root Canal Treatment' },
  { value: 'surgery', label: 'Oral Surgery' },
  { value: 'implant', label: 'Implant Placement' },
  { value: 'anesthesia', label: 'Anesthesia' },
  { value: 'custom', label: 'Custom' },
];

export const CONSENT_STATUS_OPTIONS: { value: ConsentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'signed', label: 'Signed', color: 'success' },
  { value: 'declined', label: 'Declined', color: 'error' },
];

export const FREQUENCY_OPTIONS = [
  'Once a day', 'Twice a day', 'Thrice a day', 'Four times a day',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'As needed',
  'Before meals', 'After meals', 'At bedtime',
];

export const DURATION_OPTIONS = [
  '1 day', '3 days', '5 days', '7 days', '10 days', '14 days',
  '1 month', 'Until completed', 'As needed',
];

export const COMMON_DRUGS = [
  'Amoxicillin 500mg', 'Amoxicillin 250mg', 'Metronidazole 400mg',
  'Ibuprofen 400mg', 'Ibuprofen 600mg', 'Diclofenac 50mg',
  'Paracetamol 500mg', 'Paracetamol 650mg', 'Ketorolac 10mg',
  'Azithromycin 500mg', 'Clindamycin 300mg', 'Ciprofloxacin 500mg',
  'Prednisolone 5mg', 'Dexamethasone 0.5mg',
  'Chlorhexidine Mouthwash', 'Benzocaine Gel', 'Lignocaine Gel',
  'Pantoprazole 40mg', 'Ranitidine 150mg', 'Ondansetron 4mg',
  'Vitamin C', 'Vitamin B Complex', 'Calcium + Vitamin D3',
];

export const CONSENT_TEMPLATES: Record<string, { title: string; content: string }> = {
  general: {
    title: 'General Dental Treatment Consent',
    content: `I, ____________________, hereby give consent to undergo dental treatment as recommended by the dentist at this clinic.

I understand that:
1. The proposed treatment has been explained to me, including its purpose, benefits, and alternatives.
2. I have been informed of the potential risks and complications associated with the treatment.
3. I have had the opportunity to ask questions and have received satisfactory answers.
4. I understand that no guarantee can be given regarding the outcome of the treatment.
5. I consent to the use of local anesthesia or other medications as deemed necessary.
6. I agree to follow post-treatment instructions as directed.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
  extraction: {
    title: 'Tooth Extraction Consent',
    content: `I, ____________________, hereby give consent for the extraction of tooth/teeth as explained to me.

I understand that:
1. The reason for extraction has been explained to me.
2. Possible complications include but are not limited to: pain, swelling, infection, bleeding, dry socket, damage to adjacent teeth, jaw fracture, nerve damage, and sinus complications.
3. I have been advised to follow post-operative instructions carefully.
4. Replacement options for the extracted tooth have been discussed.
5. I have disclosed my complete medical history including medications and allergies.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
  rct: {
    title: 'Root Canal Treatment Consent',
    content: `I, ____________________, hereby give consent for root canal treatment on the specified tooth.

I understand that:
1. The procedure involves removing the infected pulp, cleaning and shaping the root canals, and sealing them.
2. Multiple visits may be required to complete the treatment.
3. A crown is usually recommended after RCT to protect the tooth.
4. Possible complications include: pain, swelling, infection, instrument separation, canal calcification, perforation, and treatment failure.
5. In case of treatment failure, retreatment or extraction may be necessary.
6. I have disclosed my complete medical history.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
  surgery: {
    title: 'Oral Surgery Consent',
    content: `I, ____________________, hereby give consent for the oral surgical procedure as explained to me.

I understand that:
1. The nature of the surgical procedure has been explained in detail.
2. Possible risks and complications include: pain, swelling, bleeding, infection, nerve damage, jaw fracture, damage to adjacent structures, and adverse reactions to medications.
3. Post-surgical care instructions have been provided and I agree to follow them.
4. I have been advised about the expected recovery period.
5. I have disclosed my complete medical history including all medications and allergies.
6. I understand that I should not drive or operate machinery for 24 hours after sedation.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
  implant: {
    title: 'Dental Implant Consent',
    content: `I, ____________________, hereby give consent for dental implant placement.

I understand that:
1. The implant procedure involves surgically placing a titanium fixture into the jawbone.
2. The treatment may span several months including healing and crown placement.
3. Possible complications include: infection, implant failure, nerve damage, sinus complications, bone loss, and damage to adjacent structures.
4. Smoking and certain medical conditions may affect implant success.
5. Proper maintenance and regular check-ups are essential for long-term success.
6. I have disclosed my complete medical history.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
  anesthesia: {
    title: 'Anesthesia Consent',
    content: `I, ____________________, hereby give consent for the administration of anesthesia as deemed necessary by the dentist.

I understand that:
1. The type of anesthesia (local/sedation/general) has been explained to me.
2. Possible risks include: allergic reactions, nerve damage, prolonged numbness, and in rare cases, systemic complications.
3. I have disclosed all medications I am currently taking and any known allergies.
4. I have not eaten or drunk anything for the required period before the procedure (if applicable).
5. I should not drive or operate machinery after receiving sedation.

Patient Signature: ____________________  Date: __________

Dentist Signature: ____________________  Date: __________`,
  },
};
