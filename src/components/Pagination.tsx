import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-neutral-500">
        {total} record{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost p-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-neutral-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost p-1.5 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function getPageInfo(total: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return { totalPages, from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) };
}

export function PaginationInfo({ total, page, pageSize }: { total: number; page: number; pageSize: number }) {
  const { from, to } = getPageInfo(total, page, pageSize);
  return (
    <p className="text-sm text-neutral-500">
      Showing {from}–{to} of {total}
    </p>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="p-6 max-w-7xl mx-auto">{children}</div>;
}
