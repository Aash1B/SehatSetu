import React from 'react';
import { useTranslation } from 'react-i18next';

const DoctorDashboard: React.FC = () => {
  const { t } = useTranslation(['doctor']);
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Queue Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('dashboard.patientQueue')}</h2>
          <p className="text-gray-500 mb-4">{t('dashboard.patientQueueDesc')}</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            {t('dashboard.viewQueue')}
          </button>
        </div>

        {/* Prescription Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('dashboard.prescriptions')}</h2>
          <p className="text-gray-500 mb-4">{t('dashboard.prescriptionsDesc')}</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            {t('dashboard.newPrescription')}
          </button>
        </div>

        {/* Availability Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('dashboard.availability')}</h2>
          <p className="text-gray-500 mb-4">{t('dashboard.availabilityDesc')}</p>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            {t('dashboard.manageSchedule')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
