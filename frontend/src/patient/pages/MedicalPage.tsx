import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadMedicalReport } from '../services/medicalReportsApi';
import { useTranslation } from 'react-i18next';

type DocumentCategory = 
  | 'PREVIOUS_PRESCRIPTION'
  | 'TEST_REPORTS'
  | 'X_RAY'
  | 'MRI'
  | 'CT_SCAN'
  | 'ECG'
  | 'DISCHARGE_SUMMARY'
  | 'OTHER';

const MedicalPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['patient', 'common']);
  
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('OTHER');
  const reportInputRef = useRef<HTMLInputElement>(null);

  const categoryLabels: Record<DocumentCategory, string> = {
    PREVIOUS_PRESCRIPTION: 'Previous Prescription',
    TEST_REPORTS: 'Test Reports',
    X_RAY: 'X-Ray',
    MRI: 'MRI',
    CT_SCAN: 'CT Scan',
    ECG: 'ECG',
    DISCHARGE_SUMMARY: 'Discharge Summary',
    OTHER: 'Other Past Records',
  };

  const handleReportSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadState('uploading');
    setUploadMessage(`🔍 Uploading ${file.name}...`);
    
    try {
      const result = await uploadMedicalReport(file, selectedCategory);
      setUploadState('success');
      setUploadMessage(`✨ Successfully uploaded ${file.name}`);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadState('idle');
        setUploadMessage('');
      }, 3000);
    } catch (error) {
      setUploadState('error');
      setUploadMessage(
        error instanceof Error ? error.message : 'Report upload failed.'
      );
    }
  };

  const handleUploadClick = () => {
    reportInputRef.current?.click();
  };

  return (
    <div className="sehat-dashboard-root">
      {/* Sidebar */}
      <aside className="sehat-dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316" />
                <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="sidebar-brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
              <span className="sidebar-portal-badge">Patient Portal</span>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-group">
            <span className="sidebar-group-title">Main Navigation</span>
            <nav className="sidebar-menu">
              <button
                type="button"
                className="sidebar-item"
                onClick={() => navigate('/')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Home
              </button>

              <button
                type="button"
                className="sidebar-item"
                onClick={() => navigate('/patient/dashboard')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
                Dashboard
              </button>

              <button
                type="button"
                className="sidebar-item active"
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Medical Records
              </button>

              <button
                type="button"
                className="sidebar-item"
                onClick={() => navigate('/patient/vitals')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                Vitals
              </button>
            </nav>
          </div>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-item sidebar-logout"
            onClick={() => navigate('/')}
          >
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Back to Home</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sehat-dashboard-main">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Medical Records</h1>
              <p className="dashboard-subtitle">Upload and manage your medical documents</p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
            <div className="dashboard-card">
              <div className="card-header">
                <h3 className="card-title">
                  <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload Health Documents
                </h3>
              </div>

              <div className="card-content">
                {/* Category Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Document Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                    className="form-select"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUploadClick}
                  disabled={uploadState === 'uploading'}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: uploadState === 'uploading' ? '#cbd5e0' : '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: uploadState === 'uploading' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {uploadState === 'uploading' ? 'Uploading...' : 'Select File to Upload'}
                </button>

                {/* Hidden file input */}
                <input
                  ref={reportInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleReportSelected}
                  accept=".pdf,.jpeg,.jpg,.png,.webp"
                  style={{ display: 'none' }}
                />

                {/* Status Message */}
                {uploadMessage && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      backgroundColor: uploadState === 'success' ? '#d1fae5' : uploadState === 'error' ? '#fee2e2' : '#e0e7ff',
                      color: uploadState === 'success' ? '#065f46' : uploadState === 'error' ? '#991b1b' : '#3730a3',
                      fontSize: '0.875rem',
                    }}
                  >
                    {uploadMessage}
                  </div>
                )}

                {/* File Requirements */}
                <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>File Requirements:</p>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    <li>Accepted formats: PDF, JPEG, PNG, WebP</li>
                    <li>Maximum file size: 20 MB</li>
                    <li>Documents will be processed via OCR</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MedicalPage;
