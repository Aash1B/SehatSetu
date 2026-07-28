import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './patient/store';

// Doctor Pages
import DoctorLogin from './doctor/pages/DoctorLogin';
import DoctorDashboard from './doctor/pages/Dashboard';
import ConsultationsList from './doctor/pages/ConsultationsList';
import PatientDetails from './doctor/pages/PatientDetails';
import DoctorPrescription from './doctor/pages/DoctorPrescription';
import VideoConsultation from './doctor/pages/VideoConsultation';

// Landing Page
import LandingPage from './LandingPage';

// Patient Pages
import LoginPage from './patient/pages/LoginPage';
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
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Patient Routes */}
          <Route path="/patient/login" element={<LoginPage />} />
          <Route path="/patient/dashboard" element={<DashboardPage />} />
          <Route path="/patient/search" element={<DoctorSearchPage />} />
          <Route path="/patient/book/:id" element={<BookAppointmentPage />} />
          <Route path="/patient/questionnaire/:id" element={<HealthQuestionnairePage />} />
          <Route path="/patient/appointments" element={<AppointmentsPage />} />
          <Route path="/patient/consultation/:id" element={<VideoConsultationPage />} />

          {/* Doctor Routes */}
          <Route path="/doctor/login" element={<DoctorLogin />} />
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
