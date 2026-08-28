import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import PlaceholderPage from '@/components/PlaceholderPage';
import { CalendarCheck, Megaphone, Printer, Loader2 } from 'lucide-react';

const SignIn = lazy(() => import('@/pages/auth/SignIn'));
const SignUp = lazy(() => import('@/pages/auth/SignUp'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PatientList = lazy(() => import('@/features/patients/PatientList'));
const PatientProfile = lazy(() => import('@/features/patients/PatientProfile'));
const TreatmentsPage = lazy(() => import('@/features/treatments/TreatmentsPage'));
const ClinicalNotesPage = lazy(() => import('@/features/clinical-notes/ClinicalNotesPage'));
const FollowUpsPage = lazy(() => import('@/features/follow-ups/FollowUpsPage'));
const ScalingBonusPage = lazy(() => import('@/features/scaling-bonus/ScalingBonusPage'));
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'));
const PrescriptionsPage = lazy(() => import('@/features/prescriptions/PrescriptionsPage'));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'));
const LabWorkPage = lazy(() => import('@/features/lab-work/LabWorkPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const PortalPage = lazy(() => import('@/features/portal/PortalPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ErrorLogsPage = lazy(() => import('@/features/error-logs/ErrorLogsPage'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />

              <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/app/patients" element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
              <Route path="/app/patients/:id" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
              <Route path="/app/daily-summary" element={<ProtectedRoute><PlaceholderPage title="Daily Summary" description="Daily practice summary with collections, appointments, and activity feed." icon={<CalendarCheck className="h-7 w-7" />} /></ProtectedRoute>} />
              <Route path="/app/treatments" element={<ProtectedRoute><TreatmentsPage /></ProtectedRoute>} />
              <Route path="/app/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
              <Route path="/app/follow-ups" element={<ProtectedRoute><FollowUpsPage /></ProtectedRoute>} />
              <Route path="/app/scaling-bonus" element={<ProtectedRoute><ScalingBonusPage /></ProtectedRoute>} />
              <Route path="/app/clinical-notes" element={<ProtectedRoute><ClinicalNotesPage /></ProtectedRoute>} />
              <Route path="/app/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
              <Route path="/app/prescriptions" element={<ProtectedRoute><PrescriptionsPage /></ProtectedRoute>} />
              <Route path="/app/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/app/lab-work" element={<ProtectedRoute><LabWorkPage /></ProtectedRoute>} />
              <Route path="/app/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
              <Route path="/app/marketing" element={<ProtectedRoute><PlaceholderPage title="Marketing" description="Campaign tracking, spend, and ROAS attribution." icon={<Megaphone className="h-7 w-7" />} /></ProtectedRoute>} />
              <Route path="/app/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/app/portal" element={<ProtectedRoute><PortalPage /></ProtectedRoute>} />
              <Route path="/app/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/app/print" element={<ProtectedRoute><PlaceholderPage title="Print Center" description="Branded print layouts for prescriptions, receipts, and invoices." icon={<Printer className="h-7 w-7" />} /></ProtectedRoute>} />
              <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/app/error-logs" element={<ProtectedRoute><ErrorLogsPage /></ProtectedRoute>} />

              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
