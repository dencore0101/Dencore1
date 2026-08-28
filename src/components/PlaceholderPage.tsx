import { ReactNode } from 'react';
import { Construction } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title={title} />
        <div className="card card-pad">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-4">
              {icon ?? <Construction className="h-7 w-7" />}
            </div>
            <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">{description}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
