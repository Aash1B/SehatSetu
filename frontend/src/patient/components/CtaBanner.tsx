import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const CtaBanner: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <section className="cta-banner-section">
      <div className="cta-banner-card">
        <div className="cta-banner-content">
          <span className="cta-subtag">YOUR HEALTHIER FUTURE STARTS NOW</span>
          <h2 className="cta-title">Ready to Take Control of Your Health?</h2>
          <p className="cta-desc">
            Join over 50,000 patients who trust SehatSetu for their healthcare needs.
          </p>
        </div>

        <button 
          type="button" 
          className="btn-cta-orange"
          onClick={() => navigate('/patient/book/new')}
        >
          Get Started Today →
        </button>
      </div>
    </section>
  );
};

export default CtaBanner;
