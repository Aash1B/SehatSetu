import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, Component, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from './patient/store';
import { useTranslation } from 'react-i18next';
import './Patient.css';
import ChatProvider from './chatbot/ChatProvider';
import './chatbot/chatbot.css';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('SehatSetu ChunkErrorBoundary caught an unhandled render error:', error, errorInfo);
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('import');

    if (isChunkError && typeof window !== 'undefined') {
      const chunkRetry = sessionStorage.getItem('sehatsetu_chunk_retry');
      if (!chunkRetry) {
        sessionStorage.setItem('sehatsetu_chunk_retry', 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Connecting to SehatSetu...</h2>
            <p className="text-sm text-slate-600 mb-6">Updating application to the latest version. Please tap below to continue.</p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('sehatsetu_chunk_retry');
                  window.location.reload();
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auth Pages (new)
const PatientLogin = lazy(() => import('./auth/pages/PatientLogin'));
const PatientSignup = lazy(() => import('./auth/pages/PatientSignup'));
const DoctorLogin = lazy(() => import('./auth/pages/DoctorLogin'));
const DoctorSignup = lazy(() => import('./auth/pages/DoctorSignup'));
const VerifyOtp = lazy(() => import('./auth/pages/VerifyOtp'));
const ForgotPassword = lazy(() => import('./auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./auth/pages/ResetPassword'));
import { getToken, getUser } from './auth/authStorage';


import PaymentTestPage from './payments/PaymentTestPage';

const PatientLayout = () => (
  <div className="patient-portal min-h-screen">
    <Outlet />
  </div>
);

const RoleProtectedRoute = ({ role }: { role: 'PATIENT' | 'DOCTOR' }) => {
  const user = getUser();
  const location = useLocation();
  return getToken() && user?.role === role
    ? <Outlet />
    : <Navigate
        to={role === 'DOCTOR' ? '/doctor/login' : '/patient/login'}
        replace
        state={{ from: location.pathname }}
      />;
};

// Doctor Pages
const DoctorDashboard = lazy(() => import('./doctor/pages/Dashboard'));
const ConsultationsList = lazy(() => import('./doctor/pages/ConsultationsList'));
const PatientDetails = lazy(() => import('./doctor/pages/PatientDetails'));
const DoctorPrescription = lazy(() => import('./doctor/pages/DoctorPrescription'));
const VideoConsultation = lazy(() => import('./doctor/pages/VideoConsultation'));
const DoctorProfile = lazy(() => import('./doctor/pages/DoctorProfile'));
const DoctorAvailability = lazy(() => import('./doctor/pages/DoctorAvailability'));
const DoctorOnboarding = lazy(() => import('./doctor/pages/DoctorOnboarding'));
const EhrDrafts = lazy(() => import('./doctor/pages/EhrDrafts'));
const EhrDraftDetail = lazy(() => import('./doctor/pages/EhrDraftDetail'));

// Landing Page
const LandingPage = lazy(() => import('./patient/pages/LandingPage'));

// Public standalone pages
const AboutPage = lazy(() => import('./pages/About'));

// Patient Pages

const DashboardPage = lazy(() => import('./patient/pages/DashboardPage'));
const DoctorSearchPage = lazy(() => import('./patient/pages/DoctorSearchPage'));
const BookAppointmentPage = lazy(() => import('./patient/pages/BookAppointmentPage'));
const HealthQuestionnairePage = lazy(() => import('./patient/pages/HealthQuestionnairePage'));
const AppointmentsPage = lazy(() => import('./patient/pages/AppointmentsPage'));
const VideoConsultationPage = lazy(() => import('./patient/pages/VideoConsultationPage'));
const MCHPage = lazy(() => import('./patient/pages/MCHPage'));
const MedicalPage = lazy(() => import('./patient/pages/MedicalPage'));
const VitalsPage = lazy(() => import('./patient/pages/VitalsPage'));

import OfflineStatusIndicator from './common/components/OfflineStatusIndicator';
import PWAUpdatePrompt from './common/components/PWAUpdatePrompt';
import PWAInstallPrompt from './common/components/PWAInstallPrompt';

function App() {
  const { t } = useTranslation('common');
  return (
    <Provider store={store}>
      <Router>
        <OfflineStatusIndicator />
        <PWAUpdatePrompt />
        <PWAInstallPrompt />
        <ChatProvider />
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]"></div>}>
            <Routes>

              {/* Auth Routes (new) */}
               <Route path="/patient/login" element={<PatientLogin />} />
               <Route path="/patient/signup" element={<PatientSignup />} />
               <Route path="/doctor/login" element={<DoctorLogin />} />
               <Route path="/doctor/signup" element={<DoctorSignup />} />
               <Route path="/verify-otp" element={<VerifyOtp />} />
               <Route path="/forgot-password" element={<ForgotPassword />} />
               <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/payment-test" element={<PaymentTestPage />} />

               {/* About Page (public standalone) */}
              <Route path="/about" element={<AboutPage />} />

               {/* Patient Portal Layout */}
              <Route element={<PatientLayout />}>
                {/* Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Patient Routes */}
               
                <Route element={<RoleProtectedRoute role="PATIENT" />}>
                  <Route path="/patient/search" element={<DoctorSearchPage />} />
                  <Route path="/patient/dashboard" element={<DashboardPage />} />
                  <Route path="/patient/book/:id" element={<BookAppointmentPage />} />
                  <Route path="/patient/questionnaire/:id" element={<HealthQuestionnairePage />} />
                  <Route path="/patient/appointments" element={<AppointmentsPage />} />
                  <Route path="/patient/consultation/:id" element={<VideoConsultationPage />} />
                  <Route path="/patient/mch" element={<MCHPage />} />
                  <Route path="/patient/medical" element={<MedicalPage />} />
                  <Route path="/patient/vitals" element={<VitalsPage />} />
                </Route>
              </Route>

              {/* Doctor Routes */}
              
              <Route element={<RoleProtectedRoute role="DOCTOR" />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/consultations" element={<ConsultationsList />} />
                <Route path="/doctor/patient/:id" element={<PatientDetails />} />
                <Route path="/doctor/prescription/:id" element={<DoctorPrescription />} />
                <Route path="/doctor/consultation/:id" element={<VideoConsultation />} />
                <Route path="/doctor/profile" element={<DoctorProfile />} />
                <Route path="/doctor/availability" element={<DoctorAvailability />} />
                <Route path="/doctor/onboarding" element={<DoctorOnboarding />} />
                <Route path="/doctor/setup-profile" element={<DoctorOnboarding />} />
                <Route path="/doctor/ehr-drafts" element={<EhrDrafts />} />
                <Route path="/doctor/ehr-drafts/:id" element={<EhrDraftDetail />} />
              </Route>
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </Router>
    </Provider>
  );
}

export default App;
