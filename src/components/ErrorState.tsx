import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900">Something went wrong</h3>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}
