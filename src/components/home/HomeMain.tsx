import React from "react";
import { useNavigate } from "react-router-dom";
import homeImg from "../../assets/3.png";
import "./HomeMain.scss";
import FooterMain from "../footer/FooterMain";
import { Container, Row, Col, Button } from "react-bootstrap";
import { 
  FaUsers, 
  FaComment, 
  FaGlobe, 
  FaCamera,
  FaArrowRight,
  FaLanguage,
  FaHeart,
  FaComments
} from "react-icons/fa";

const HomeMain: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaUsers className="feature-icon" />,
      title: "Language Communities",
      description: "Join vibrant language learning communities and connect with native speakers from around the world.",
      link: "/communities",
      color: "blue"
    },
    {
      icon: <FaComment className="feature-icon" />,
      title: "Real-time Chat",
      description: "Practice your language skills through real-time conversations with language partners.",
      link: "/chat",
      color: "green"
    },
    {
      icon: <FaGlobe className="feature-icon" />,
      title: "Share Moments",
      description: "Share your language learning journey and discover inspiring moments from other learners.",
      link: "/moments",
      color: "purple"
    },
    {
      icon: <FaCamera className="feature-icon" />,
      title: "Stories",
      description: "Create and view engaging stories to practice and showcase your language progress.",
      link: "/stories",
      color: "orange"
    }
  ];

  return (
    <section className="home-main-section">
      {/* Hero Section */}
      <div className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="hero-content">
              <div className="hero-badge">
                <span className="badge-text">100% Free Language Exchange</span>
              </div>
              <h1 className="hero-title">
                Connect, Learn, and <span className="highlight">Grow</span> Together
              </h1>
              <p className="hero-description">
                Join thousands of language learners worldwide. Practice with native speakers, 
                share your journey, and build meaningful connections—all for free.
              </p>
              <div className="hero-buttons">
                <Button 
                  className="btn-primary-custom"
                  onClick={() => navigate("/register")}
                >
                  Get Started Free
                  <FaArrowRight className="ms-2" />
                </Button>
                <Button 
                  className="btn-outline-custom"
                  onClick={() => navigate("/communities")}
                >
                  Explore Communities
                </Button>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Free</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">1000+</div>
                  <div className="stat-label">Active Users</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">Languages</div>
                </div>
              </div>
            </Col>
            <Col lg={6} className="hero-image-col">
              <div className="hero-image-wrapper">
                <img
                  src={homeImg}
                  alt="Language Learning"
                  className="hero-image"
                />
                <div className="floating-card card-1">
                  <FaLanguage className="card-icon" />
                  <div className="card-text">Learn Languages</div>
                </div>
                <div className="floating-card card-2">
                  <FaHeart className="card-icon" />
                  <div className="card-text">Connect Globally</div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <Container>
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Learn Languages</h2>
            <p className="section-subtitle">
              All features are completely free. Start your language learning journey today!
            </p>
          </div>
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col md={6} lg={3} key={index}>
                <div 
                  className={`feature-card feature-${feature.color}`}
                  onClick={() => navigate(feature.link)}
                >
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-link">
                    Explore <FaArrowRight className="ms-1" />
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Why Choose Section */}
      <div className="why-choose-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="why-choose-content">
              <h2 className="section-title">Why Choose BananaTalk?</h2>
              <div className="benefits-list">
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <FaUsers />
                  </div>
                  <div className="benefit-content">
                    <h4>Connect with Native Speakers</h4>
                    <p>Practice with real native speakers and improve your pronunciation naturally.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <FaGlobe />
                  </div>
                  <div className="benefit-content">
                    <h4>Share Your Journey</h4>
                    <p>Document your learning progress and get inspired by others' language journeys.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <FaComments />
                  </div>
                  <div className="benefit-content">
                    <h4>Real-time Practice</h4>
                    <p>Chat with language partners in real-time and practice whenever you want.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <FaLanguage />
                  </div>
                  <div className="benefit-content">
                    <h4>50+ Languages</h4>
                    <p>Learn any language you want with our diverse community of learners.</p>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6} className="why-choose-image">
              <div className="image-placeholder">
                <div className="placeholder-content">
                  <FaUsers className="placeholder-icon" />
                  <p>Join Our Community</p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <Container>
          <div className="cta-content">
            <h2 className="cta-title">Ready to Start Learning?</h2>
            <p className="cta-description">
              Join thousands of language learners and start your free journey today. 
              No credit card required, no hidden fees.
            </p>
            <Button 
              className="btn-cta"
              onClick={() => navigate("/register")}
            >
              Get Started for Free
              <FaArrowRight className="ms-2" />
            </Button>
          </div>
        </Container>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <Container>
          <div className="contact-content">
            <h2 className="section-title">Get in Touch</h2>
            <p className="contact-description">
              Have questions or need help? We're here to assist you on your language learning journey.
            </p>
            <Button 
              className="btn-contact"
              onClick={() => navigate("/support")}
            >
              Contact Support
            </Button>
          </div>
        </Container>
      </div>

      {/* Footer */}
      <FooterMain />
    </section>
  );
};

export default HomeMain;
