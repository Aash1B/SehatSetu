import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './patient/store';
import './Patient.css';
// Auth Pages (new)
import PatientLogin from './auth/pages/PatientLogin';
import PatientSignup from './auth/pages/PatientSignup';
import DoctorLogin from './auth/pages/DoctorLogin';
import DoctorSignup from './auth/pages/DoctorSignup';
import VerifyOtp from './auth/pages/VerifyOtp';
import ForgotPassword from './auth/pages/ForgotPassword';
import ResetPassword from './auth/pages/ResetPassword';

const PatientLayout = () => (
  <div className="patient-portal min-h-screen">
    <Outlet />
  </div>
);

// Doctor Pages
import DoctorDashboard from './doctor/pages/Dashboard';
import ConsultationsList from './doctor/pages/ConsultationsList';
import PatientDetails from './doctor/pages/PatientDetails';
import DoctorPrescription from './doctor/pages/DoctorPrescription';
import VideoConsultation from './doctor/pages/VideoConsultation';

// Landing Page
import LandingPage from './patient/pages/LandingPage';

// Patient Pages

import DashboardPage from './patient/pages/DashboardPage';
import DoctorSearchPage from './patient/pages/DoctorSearchPage';
import BookAppointmentPage from './patient/pages/BookAppointmentPage';
import HealthQuestionnairePage from './patient/pages/HealthQuestionnairePage';
import AppointmentsPage from './patient/pages/AppointmentsPage';
import VideoConsultationPage from './patient/pages/VideoConsultationPage';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>

          {/* Auth Routes (new) */}
           <Route path="/patient/login" element={<PatientLogin />} />
           <Route path="/patient/signup" element={<PatientSignup />} />
           <Route path="/doctor/login" element={<DoctorLogin />} />
           <Route path="/doctor/signup" element={<DoctorSignup />} />
           <Route path="/verify-otp" element={<VerifyOtp />} />
           <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/reset-password" element={<ResetPassword />} />
          {/* Patient Portal Layout */}
          <Route element={<PatientLayout />}>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Patient Routes */}
           
            <Route path="/patient/dashboard" element={<DashboardPage />} />
            <Route path="/patient/search" element={<DoctorSearchPage />} />
            <Route path="/patient/book/:id" element={<BookAppointmentPage />} />
            <Route path="/patient/questionnaire/:id" element={<HealthQuestionnairePage />} />
            <Route path="/patient/appointments" element={<AppointmentsPage />} />
            <Route path="/patient/consultation/:id" element={<VideoConsultationPage />} />
          </Route>

          {/* Doctor Routes */}
          
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/consultations" element={<ConsultationsList />} />
          <Route path="/doctor/patient/:id" element={<PatientDetails />} />
          <Route path="/doctor/prescription/:id" element={<DoctorPrescription />} />
          <Route path="/doctor/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
