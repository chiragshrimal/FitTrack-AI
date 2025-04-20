import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import emailjs from "emailjs-com";
import './ContactUs.css';

const googleMapLink = import.meta.env.VITE_GOOGLE_MAP_LINK;
const SERVICE_ID = import.meta.env.VITE_EMAIL_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAIL_PUBLIC_KEY;

const ContactUs = () => {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: ''
  });

  const [formStatus, setFormStatus] = useState({
    submitted: false,
    submitting: false,
    error: null
  });

  const [touched, setTouched] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus({ ...formStatus, submitting: true });

    emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message
      },
      PUBLIC_KEY
    )
    .then(() => {
      setFormStatus({
        submitted: true,
        submitting: false,
        error: null
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormStatus({
          submitted: false,
          submitting: false,
          error: null
        });
        setFormData({
          email: '',
          subject: '',
          message: ''
        });
        setTouched({});
      }, 3000);
    })
    .catch((error) => {
      console.error('Email sending error:', error);
      setFormStatus({
        submitted: false,
        submitting: false,
        error: 'Failed to send message. Please try again later.'
      });
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBlur = (e) => {
    setTouched({
      ...touched,
      [e.target.name]: true
    });
  };

  return (
    <div className="contact-container">
      <div className="contact-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Get in Touch</h1>
          <p>We're here to help and answer any questions you might have</p>
        </div>
      </div>

      <div className="contact-content">
        <div className="contact-layout">
          <div className="form-section">
            <div className="section-header">
              <h2>Send us a Message</h2>
              <p>Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>

            {formStatus.submitted ? (
              <div className="form-success">
                <div className="success-icon">
                  <Check size={40} />
                </div>
                <h3>Thank You!</h3>
                <p>Your message has been sent successfully. We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    placeholder="your.email@example.com"
                    className={touched.email && !formData.email ? 'error' : ''}
                  />
                  {touched.email && !formData.email && (
                    <div className="error-message">Please enter a valid email</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    placeholder="What is this regarding?"
                    className={touched.subject && !formData.subject ? 'error' : ''}
                  />
                  {touched.subject && !formData.subject && (
                    <div className="error-message">Please enter a subject</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    rows={6}
                    placeholder="Tell us how we can help you..."
                    className={touched.message && !formData.message ? 'error' : ''}
                  />
                  {touched.message && !formData.message && (
                    <div className="error-message">Please enter your message</div>
                  )}
                </div>

                <button
                  type="submit"
                  className={`btn-submit ${formStatus.submitting ? 'submitting' : ''}`}
                  disabled={formStatus.submitting}
                >
                  {formStatus.submitting ? 'Sending...' : 'Send Message'}
                  {!formStatus.submitting && <Send size={18} />}
                </button>

                {formStatus.error && (
                  <p className="error-message">{formStatus.error}</p>
                )}
              </form>
            )}
          </div>

          <div className="info-section">
            <div className="section-card">
              <h3>Contact Information</h3>
              <p className="contact-intro">
                Have questions or need assistance? Reach out to us through any of the channels below.
              </p>

              <div className="info-card">
                <div className="info-icon">
                  <Mail size={24} />
                </div>
                <div className="info-content">
                  <h4>Email Us</h4>
                  <a href="mailto:dipanshu.rai22b@iiitg.ac.in">dipanshu.rai22b@iiitg.ac.in</a>
                  <p>We'll respond within 24 hours</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <Phone size={24} />
                </div>
                <div className="info-content">
                  <h4>Call Us</h4>
                  <a href="tel:+911234567890">+91 1234567890</a>
                  <p>Mon-Fri, 9:00 AM - 6:00 PM</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <MapPin size={24} />
                </div>
                <div className="info-content">
                  <h4>Visit Us</h4>
                  <address>
                    <a href={googleMapLink} target="_blank">
                      Indian Institute of Information Technology Guwahati (IIITG)
                    </a>
                    Near IT Park, Bongora<br />
                    Guwahati, Assam
                  </address>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
