import { Loader2 } from 'lucide-react';

export default function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      <p className="text-sm text-neutral-500 mt-3">{label}</p>
    </div>
  );
}
