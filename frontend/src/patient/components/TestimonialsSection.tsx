import React from 'react';

const testimonials = [
  {
    id: 1,
    quote: '“SehatSetu changed the way I manage my health. Booking was effortless!”',
    name: 'Anika R.',
    subText: 'Patient since 2022',
    avatar: 'AR',
    rating: 5,
  },
  {
    id: 2,
    quote: '“I found a cardiologist within minutes. The experience was seamless.”',
    name: 'Vikram S.',
    subText: 'Patient since 2023',
    avatar: 'VS',
    rating: 5,
  },
  {
    id: 3,
    quote: '“The doctors are incredibly professional and caring. Highly recommended!”',
    name: 'Sana K.',
    subText: 'Patient since 2021',
    avatar: 'SK',
    rating: 5,
  },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="testimonials-section">
      <div className="testimonials-container">
        <div className="section-header-left">
          <span className="section-subtag">STORIES FROM OUR COMMUNITY</span>
          <h2 className="testimonials-title">What Our Patients Say</h2>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.id} className="testimonial-card">
              <div className="quote-mark">“</div>
              <p className="testimonial-text">{t.quote}</p>

              <div className="testimonial-author-row">
                <div className="author-avatar">{t.avatar}</div>
                <div className="author-info">
                  <h4 className="author-name">{t.name}</h4>
                  <p className="author-subtext">{t.subText}</p>
                </div>
                <div className="star-rating">
                  {'★'.repeat(t.rating)}
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
