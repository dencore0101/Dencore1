import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { bootstrapClinic } from '@/lib/clinic';
import { Activity, Loader2, MailCheck } from 'lucide-react';

const BOOTSTRAP_TIMEOUT_MS = 30_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms,
      ),
    ),
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

    if (loading) return;

    setError(null);
    setNeedsConfirmation(false);
    setLoading(true);

    try {
      // Validate before making the Supabase request
      const trimmedClinicName = clinicName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedClinicName) {
        throw new Error('Please enter your clinic name.');
      }

      if (!trimmedEmail) {
        throw new Error('Please enter your email address.');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      console.log('[SIGNUP] Starting signup:', trimmedEmail);

      const result = await withTimeout(
        signUp(trimmedEmail, password),
        15_000,
        'Sign up',
      );

      console.log('[SIGNUP] Signup completed:', result);

      /*
       * IMPORTANT:
       * Save the clinic name immediately.
       *
       * If email confirmation is enabled, the user will confirm
       * the email later and the clinic can be bootstrapped after
       * signing in.
       *
       * If bootstrap fails for any other reason, we can retry it.
       */
      localStorage.setItem(
        'pending_clinic_name',
        trimmedClinicName,
      );

      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true);
        return;
      }

      /*
       * Email confirmation is disabled and Supabase returned
       * an active session. Create the clinic immediately.
       */
      console.log('[SIGNUP] Creating clinic...');

      const clinic = await withTimeout(
        bootstrapClinic(trimmedClinicName),
        BOOTSTRAP_TIMEOUT_MS,
        'Clinic setup',
      );

      console.log('[SIGNUP] Clinic created:', clinic);

      // Clinic was successfully created.
      localStorage.setItem('clinic_id', clinic.clinicId);
      localStorage.removeItem('pending_clinic_name');

      navigate('/app', { replace: true });
    } catch (err) {
      console.error('[SIGNUP] Error:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Sign up failed. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Activity className="h-5 w-5" />
          </div>

          <span className="text-xl font-semibold tracking-tight text-neutral-900">
            ToothRevenue
          </span>
        </div>

        {/* Card */}
        <div className="card card-pad animate-fade-in">

          <h1 className="text-xl font-semibold text-neutral-900 mb-1">
            Create your workspace
          </h1>

          <p className="text-sm text-neutral-500 mb-6">
            Set up your clinic and start managing revenue
          </p>

          {needsConfirmation ? (
            <div className="space-y-4">

              <div className="flex items-start gap-3 rounded-lg bg-success-50 border border-success-200 px-4 py-3">
                <MailCheck className="h-5 w-5 text-success-600 shrink-0 mt-0.5" />

                <div>
                  <p className="text-sm font-medium text-success-800">
                    Check your email
                  </p>

                  <p className="text-sm text-success-700 mt-1">
                    We sent a confirmation link to{' '}
                    <span className="font-medium">
                      {email}
                    </span>
                    . Click the link to verify your account,
                    then sign in to complete your clinic setup.
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-neutral-500">
                Already confirmed?{' '}

                <Link
                  to="/signin"
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  Sign in
                </Link>
              </p>

            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Clinic name */}
              <div>
                <label
                  className="label"
                  htmlFor="clinicName"
                >
                  Clinic name
                </label>

                <input
                  id="clinicName"
                  type="text"
                  className="input"
                  value={clinicName}
                  onChange={(e) =>
                    setClinicName(e.target.value)
                  }
                  placeholder="Vishnu Dental Clinic"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className="label"
                  htmlFor="email"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@clinic.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="label"
                  htmlFor="password"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating workspace...
                  </>
                ) : (
                  'Create workspace'
                )}
              </button>

            </form>
          )}

          {!needsConfirmation && (
            <p className="mt-6 text-center text-sm text-neutral-500">
              Already have an account?{' '}

              <Link
                to="/signin"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign in
              </Link>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}