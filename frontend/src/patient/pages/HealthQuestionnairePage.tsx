import React from 'react';
import { useTranslation } from 'react-i18next';

const HealthQuestionnairePage: React.FC = () => {
  const { t } = useTranslation('patient');

  return (
    <div>
      <h1>{t('healthQuestionnaireTitle')}</h1>
      {/* Pre-appointment health form */}
    </div>
  );
};

export default HealthQuestionnairePage;
