import React from "react";
import { useTranslation } from "react-i18next";

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation("home");

  const testimonialsData = t("testimonials", { returnObjects: true }) as Array<{
    id: number;
    quote: string;
    name: string;
    subText: string;
    avatar: string;
  }>;

  return (
    <section id="testimonials" className="testimonials-section">
      <div className="testimonials-container">
        <div className="section-header-left">
          <span className="section-subtag"> </span>
          <h2 className="testimonials-title">{t("testimonialsTitle")}</h2>
        </div>

        <div className="testimonials-grid">
          {testimonialsData.map((item, index) => (
            <div key={index} className="testimonial-card">
              <div className="quote-mark">"</div>
              <p className="testimonial-text">{item.quote}</p>

              <div className="testimonial-author-row">
                <div className="author-avatar">{item.avatar}</div>
                <div className="author-info">
                  <h4 className="author-name">{item.name}</h4>
                  <p className="author-subtext">{item.subText}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
