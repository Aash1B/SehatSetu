import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { store } from './patient/store';
import { useTranslation } from 'react-i18next';
import './Patient.css';
import ChatProvider from './chatbot/ChatProvider';
import './chatbot/chatbot.css';
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
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">{t('loading')}</div>}>
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
          </Route>
        </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;
