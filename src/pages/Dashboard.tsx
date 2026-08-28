import { useState, useEffect } from 'react';
import { TrendingUp, Users, CalendarClock, AlertCircle, Wallet, Receipt, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { fetchDashboardStats, fetchMonthlyTrend, fetchRecentActivity, type RecentActivity } from '@/services/dashboard.service';
import type { DashboardStats, RevenueExpensePoint } from '@/services/dashboard.service';
import { formatCurrency } from '@/constants/inventory';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<RevenueExpensePoint[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, a] = await Promise.all([fetchDashboardStats(), fetchMonthlyTrend(), fetchRecentActivity()]);
        setStats(s);
        setTrend(t);
        setActivity(a);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxTrendValue = Math.max(...trend.flatMap((t) => [t.revenue, t.expenses]), 1);

  const statCards = [
    { label: "Today's Revenue", value: formatCurrency(stats?.todayRevenue ?? 0), icon: TrendingUp, color: 'primary' },
    { label: 'Active Patients', value: String(stats?.activePatients ?? 0), icon: Users, color: 'secondary' },
    { label: "Today's Appointments", value: String(stats?.todayAppointments ?? 0), icon: CalendarClock, color: 'accent' },
    { label: 'Outstanding A/R', value: formatCurrency(stats?.outstandingBalance ?? 0), icon: AlertCircle, color: 'error' },
  ];

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Welcome to {profile?.clinic?.name ?? 'your clinic'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-neutral-400">Loading dashboard...</div>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map((stat, i) => (
                <div key={stat.label} className="card card-pad animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
                      <p className="text-2xl font-semibold text-neutral-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue vs Expenses trend */}
            <div className="card mb-6">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Revenue vs Expenses</h2>
                    <p className="text-sm text-neutral-500">Last 6 months trend</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-end justify-between gap-3 h-48">
                  {trend.map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-1 h-40">
                        <div
                          className="w-1/2 max-w-[24px] bg-primary-500 rounded-t-md transition-all duration-700 hover:bg-primary-600"
                          style={{ height: `${(point.revenue / maxTrendValue) * 100}%` }}
                          title={`Revenue: ${formatCurrency(point.revenue)}`}
                        />
                        <div
                          className="w-1/2 max-w-[24px] bg-error-400 rounded-t-md transition-all duration-700 hover:bg-error-500"
                          style={{ height: `${(point.expenses / maxTrendValue) * 100}%` }}
                          title={`Expenses: ${formatCurrency(point.expenses)}`}
                        />
                      </div>
                      <span className="text-xs text-neutral-400">{point.date}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-primary-500" /><span className="text-xs text-neutral-500">Revenue</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-error-400" /><span className="text-xs text-neutral-500">Expenses</span></div>
                </div>
              </div>
            </div>

            {/* Financial summary + Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial summary */}
              <div className="card">
                <div className="p-4 border-b border-neutral-200">
                  <h2 className="text-base font-semibold text-neutral-900">This Month</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600"><ArrowUpRight className="h-4 w-4" /></div>
                      <span className="text-sm text-neutral-600">Revenue</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">{formatCurrency(stats?.monthRevenue ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-50 text-error-600"><ArrowDownRight className="h-4 w-4" /></div>
                      <span className="text-sm text-neutral-600">Expenses</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">{formatCurrency(stats?.monthExpenses ?? 0)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Wallet className="h-4 w-4" /></div>
                      <span className="text-sm font-medium text-neutral-900">Net Profit</span>
                    </div>
                    <span className={`text-sm font-bold ${(stats?.netProfit ?? 0) >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(stats?.netProfit ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600"><Receipt className="h-4 w-4" /></div>
                      <span className="text-sm text-neutral-600">Pending Invoices</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">{stats?.pendingInvoices ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="card">
                <div className="p-4 border-b border-neutral-200">
                  <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
                </div>
                {activity.length === 0 ? (
                  <div className="p-8 text-center text-sm text-neutral-400">No recent activity</div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {activity.map((item) => (
                      <div key={item.id + item.type} className="p-3 flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                          item.type === 'payment' ? 'bg-success-50 text-success-600' :
                          item.type === 'invoice' ? 'bg-primary-50 text-primary-600' :
                          item.type === 'appointment' ? 'bg-accent-50 text-accent-600' :
                          'bg-neutral-100 text-neutral-500'
                        }`}>
                          {item.type === 'payment' ? <Wallet className="h-4 w-4" /> :
                           item.type === 'invoice' ? <Receipt className="h-4 w-4" /> :
                           item.type === 'appointment' ? <CalendarClock className="h-4 w-4" /> :
                           <Users className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-700 truncate">{item.description}</p>
                          <p className="text-xs text-neutral-400">{new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {item.amount !== undefined && (
                          <span className="text-sm font-medium text-neutral-900 flex-shrink-0">{formatCurrency(item.amount)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
