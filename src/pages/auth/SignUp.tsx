import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { bootstrapClinic } from '@/lib/clinic';
import { Activity, Loader2, MailCheck } from 'lucide-react';

const BOOTSTRAP_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setLoading(true);
    try {
      const result = await signUp(email, password);

      if (result.needsEmailConfirmation) {
        // Email confirmation is required — store clinic name for later bootstrap
        localStorage.setItem('pending_clinic_name', clinicName);
        setNeedsConfirmation(true);
        return;
      }

      // Session established immediately — bootstrap the clinic now
      // Store clinic name as pending BEFORE bootstrap, so it can be retried
      // on next sign-in if this attempt fails or times out
      localStorage.setItem('pending_clinic_name', clinicName);
      const result = await withTimeout(
  bootstrapClinic(clinicName),
  BOOTSTRAP_TIMEOUT_MS,
  'Clinic setup',
);

localStorage.setItem('clinic_id', result.clinicId);

navigate('/app');
      localStorage.removeItem('pending_clinic_name');
      navigate('/app');
    } catch (err) {
      // If signup itself failed, clear pending. If bootstrap failed, keep
      // pending so it retries on next sign-in.
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      if (msg.includes('Sign up') || msg.includes('timed out after') && !msg.includes('Clinic')) {
        localStorage.removeItem('pending_clinic_name');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-neutral-900">
            ToothRevenue
          </span>
        </div>

        <div className="card card-pad animate-fade-in">
          <h1 className="text-xl font-semibold text-neutral-900 mb-1">Create your workspace</h1>
          <p className="text-sm text-neutral-500 mb-6">Set up your clinic and start managing revenue</p>

          {needsConfirmation ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-success-50 border border-success-200 px-4 py-3">
                <MailCheck className="h-5 w-5 text-success-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-success-800">Check your email</p>
                  <p className="text-sm text-success-700 mt-1">
                    We sent a confirmation link to <span className="font-medium">{email}</span>.
                    Click the link to verify your account, then sign in to complete your clinic setup.
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-neutral-500">
                Already confirmed?{' '}
                <Link to="/signin" className="font-medium text-primary-600 hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="clinicName">Clinic name</label>
                <input
                  id="clinicName"
                  type="text"
                  className="input"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Bright Smile Dental"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create workspace'}
              </button>
            </form>
          )}

          {!needsConfirmation && (
            <p className="mt-6 text-center text-sm text-neutral-500">
              Already have an account?{' '}
              <Link to="/signin" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
