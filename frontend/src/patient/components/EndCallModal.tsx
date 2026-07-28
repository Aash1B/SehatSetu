import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '../store/uiSlice';

interface EndCallModalProps {
  isOpen: boolean;
  callDuration: number; // in seconds
  doctorName?: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
  onClose?: () => void;
}

const EndCallModal: React.FC<EndCallModalProps> = ({
  isOpen,
  callDuration,
  doctorName = 'Dr. Ananya Sharma',
  doctorSpecialty = 'Senior Dermatologist',
  doctorAvatar = 'https://images.unsplash.com/photo-1594824813566-88855ce78906?auto=format&fit=crop&q=80&w=300',
}) => {
  const dispatch = useDispatch();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleDownloadPrescription = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert('Digital Prescription (PDF) downloaded successfully!');
    }, 1200);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedFeedback(true);
  };

  return (
    <div className="sehat-call-modal-overlay">
      <div className="sehat-call-modal-card">
        {/* Header Badge & Title */}
        <div className="modal-success-badge-container">
          <div className="modal-check-circle">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="call-completed-title">Consultation Completed</h2>
        <p className="call-completed-subtitle">
          Thank you for choosing SehatSetu. Your video session with {doctorName} has concluded safely.
        </p>

        {/* Call Summary Card */}
        <div className="call-summary-info-box">
          <div className="summary-doctor-cell">
            <img src={doctorAvatar} alt={doctorName} className="summary-doc-img" />
            <div className="summary-doc-meta">
              <h4 className="summary-doc-name">{doctorName}</h4>
              <span className="summary-doc-spec">{doctorSpecialty}</span>
            </div>
          </div>

          <div className="summary-metrics-grid">
            <div className="summary-metric-item">
              <span className="metric-lbl">Duration</span>
              <span className="metric-val">{formatDuration(callDuration)}</span>
            </div>
            <div className="summary-metric-item">
              <span className="metric-lbl">Consultation ID</span>
              <span className="metric-val">#CONS-88912</span>
            </div>
            <div className="summary-metric-item">
              <span className="metric-lbl">Security</span>
              <span className="metric-val badge-encrypted">🔒 HIPAA 256-bit</span>
            </div>
          </div>
        </div>

        {/* Rating & Feedback Section */}
        {!submittedFeedback ? (
          <form className="feedback-section-form" onSubmit={handleFeedbackSubmit}>
            <h3 className="feedback-heading">How was your video consultation experience?</h3>
            
            <div className="star-rating-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-btn ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              className="feedback-textarea"
              placeholder="Write a brief review for Dr. Ananya Sharma (Optional)..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />

            <button type="submit" className="btn-submit-rating">
              Submit Doctor Rating
            </button>
          </form>
        ) : (
          <div className="feedback-thankyou-msg">
            <span>✨ Thank you! Your feedback has been recorded.</span>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-download-rx-pdf"
            onClick={handleDownloadPrescription}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <span>Downloading PDF...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Prescription PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-return-dashboard"
            onClick={() => dispatch(setCurrentPage('dashboard'))}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndCallModal;
