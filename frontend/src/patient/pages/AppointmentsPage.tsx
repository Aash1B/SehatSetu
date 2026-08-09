import React from 'react';
import { useTranslation } from 'react-i18next';

const AppointmentsPage: React.FC = () => {
  const { t } = useTranslation(['patient', 'appointment']);
  return (
    <div>
      <h1>{t('patient.appointmentsPage.title')}</h1>
      {/* List of upcoming and past appointments */}
    </div>
  );
};

export default AppointmentsPage;
