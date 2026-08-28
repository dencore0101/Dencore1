import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Activity, LayoutDashboard, CalendarCheck, Users, Stethoscope,
  CalendarDays, PhoneCall, FileText, CreditCard, Package,
  FlaskConical, Receipt, Megaphone, BarChart3, Globe, Printer, Settings, Bell,
  LogOut, ChevronLeft, Menu, X, Sparkles, ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/daily-summary', label: 'Daily Summary', icon: CalendarCheck },
  { to: '/app/patients', label: 'Patients', icon: Users },
  { to: '/app/treatments', label: 'Treatments', icon: Stethoscope },
  { to: '/app/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/app/follow-ups', label: 'Follow-ups', icon: PhoneCall },
  { to: '/app/scaling-bonus', label: 'Scaling Bonus', icon: Sparkles },
  { to: '/app/clinical-notes', label: 'Clinical Notes', icon: FileText },
  { to: '/app/payments', label: 'Payments', icon: CreditCard },
  { to: '/app/inventory', label: 'Inventory', icon: Package },
  { to: '/app/lab-work', label: 'Lab Work', icon: FlaskConical },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/portal', label: 'Patient Portal', icon: Globe },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/print', label: 'Print Center', icon: Printer },
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/error-logs', label: 'Error Logs', icon: ShieldAlert },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-neutral-200 shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Activity className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            ToothRevenue
          </span>
        )}
      </div>

      {/* Clinic name */}
      {!collapsed && profile && (
        <div className="px-4 py-3 border-b border-neutral-200 shrink-0">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Clinic</p>
          <p className="text-sm font-medium text-neutral-900 truncate">{profile.clinic.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${
                collapsed ? 'justify-center' : ''
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-2 space-y-0.5 shrink-0">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="sidebar-link w-full hidden md:flex"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronLeft
            className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-error-600 hover:bg-error-50 hover:text-error-700"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-neutral-200 shadow-sm"
      >
        <Menu className="h-5 w-5 text-neutral-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-white flex flex-col animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } hidden md:flex shrink-0 border-r border-neutral-200 bg-white flex-col h-screen transition-all duration-200`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
