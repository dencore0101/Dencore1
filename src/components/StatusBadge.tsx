type BadgeColor = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';

const colorClasses: Record<BadgeColor, string> = {
  primary: 'bg-primary-50 text-primary-700',
  secondary: 'bg-secondary-50 text-secondary-700',
  accent: 'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  neutral: 'bg-neutral-100 text-neutral-600',
};

export default function StatusBadge({
  color = 'neutral',
  children,
}: {
  color?: BadgeColor;
  children: React.ReactNode;
}) {
  return <span className={`badge ${colorClasses[color]}`}>{children}</span>;
}
