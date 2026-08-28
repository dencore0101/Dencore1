import { supabase } from '@/lib/supabase';

const BOOTSTRAP_TIMEOUT_MS = 30_000;

export function getClinicId(): string {
  const stored = localStorage.getItem('clinic_id');
  if (!stored) throw new Error('No active clinic');
  return stored;
}

export async function bootstrapClinic(clinicName: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Not authenticated');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clinic-bootstrap`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clinicName }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    const result = await response.json();

if (!result.clinicId) {
  throw new Error('Invalid response from bootstrap');
}

// IMPORTANT: save the active clinic locally
localStorage.setItem('clinic_id', result.clinicId);

return result as {
  clinicId: string;
  clinicName: string;
  slug: string;
};
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Clinic setup timed out — please try again');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
