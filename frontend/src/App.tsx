import { useSelector } from 'react-redux';
import LandingPage from './patient/pages/LandingPage';
import BookAppointmentPage from './patient/pages/BookAppointmentPage';
import DoctorSearchPage from './patient/pages/DoctorSearchPage';
import DashboardPage from './patient/pages/DashboardPage';
import type { RootState } from './patient/store';
import './App.css';

function App() {
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);

  if (currentPage === 'book-appointment') {
    return <BookAppointmentPage />;
  }

  if (currentPage === 'doctors') {
    return <DoctorSearchPage />;
  }

  if (currentPage === 'dashboard') {
    return <DashboardPage />;
  }

  return <LandingPage />;
}

export default App;
