import React from "react";
import { Container, Row, Col, Form, Button, InputGroup } from "react-bootstrap";
import "./FooterMain.scss";

const FooterMain: React.FC = () => {
  const appStoreUrl = "https://apps.apple.com/kr/app/bananatalk-language-exchange/id6755862146?l=en-GB";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(appStoreUrl)}`;

  return (
    <footer className="footer-main py-5 py-md-5">
      <Container fluid="lg">
        <Row className="gy-4">
          {/* About Section */}
          <Col xs={12} sm={6} lg={3}>
            <h5 className="footer-heading mb-3">About Us</h5>
            <p className="about-text small">
              BananaTalk is dedicated to helping you master new languages and
              connect with native speakers from around the world.
            </p>
          </Col>

          {/* Quick Links */}
          <Col xs={6} sm={6} lg={2}>
            <h5 className="footer-heading mb-3">Quick Links</h5>
            <ul className="list-unstyled footer-links small">
              <li className="mb-2">
                <a href="/" className="text-decoration-none footer-link">Home</a>
              </li>
              <li className="mb-2">
                <a href="/about" className="text-decoration-none footer-link">About</a>
              </li>
              <li className="mb-2">
                <a href="/services" className="text-decoration-none footer-link">Services</a>
              </li>
              <li className="mb-2">
                <a href="/pricing" className="text-decoration-none footer-link">Pricing</a>
              </li>
              <li className="mb-2">
                <a href="/contact" className="text-decoration-none footer-link">Contact</a>
              </li>
            </ul>
          </Col>

          {/* Contact Info */}
          <Col xs={12} sm={6} lg={2}>
            <h5 className="footer-heading mb-3">Contact Info</h5>
            <div className="contact-info-box">
              <ul className="list-unstyled contact-info small">
                <li className="mb-2">
                  <i className="bi bi-envelope me-2"></i>
                  <a href="mailto:bananatalkmain@gmail.com" className="text-decoration-none contact-link">
                    bananatalkmain@gmail.com
                  </a>
                </li>
                <li className="mb-2">
                  <i className="bi bi-telephone me-2"></i>
                  <a href="tel:+821082773725" className="text-decoration-none contact-link">
                    +821082773725
                  </a>
                </li>
                <li className="mb-2">
                  <i className="bi bi-geo-alt me-2"></i>
                  <span className="contact-text">Seoul, South Korea, Gangnam-gu</span>
                </li>
              </ul>
            </div>
          </Col>

          {/* Social Media Links */}
          <Col xs={6} sm={6} lg={2}>
            <h5 className="footer-heading mb-3">Follow Us</h5>
            <div className="social-links d-flex flex-column small">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 text-decoration-none social-link"
              >
                <i className="bi bi-facebook me-2"></i>Facebook
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 text-decoration-none social-link"
              >
                <i className="bi bi-twitter me-2"></i>Twitter
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 text-decoration-none social-link"
              >
                <i className="bi bi-instagram me-2"></i>Instagram
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 text-decoration-none social-link"
              >
                <i className="bi bi-linkedin me-2"></i>LinkedIn
              </a>
            </div>
          </Col>

          {/* Download App Section */}
          <Col xs={12} sm={12} lg={3}>
            <h5 className="footer-heading mb-3">Download App</h5>
            <div className="app-download-section">
              <div className="qr-code-container mb-3">
                <img
                  src={qrCodeUrl}
                  alt="BananaTalk App Store QR Code"
                  className="qr-code-image"
                />
              </div>
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-store-link text-decoration-none d-inline-flex align-items-center"
              >
                <i className="bi bi-apple me-2"></i>
                <span>Download on App Store</span>
              </a>
              <p className="app-download-text small mt-2 mb-0">
                Scan QR code or click to download
              </p>
            </div>
          </Col>
        </Row>

        {/* Newsletter Section - Full Width */}
        <Row className="mt-4">
          <Col xs={12}>
            <div className="newsletter-section">
              <Row className="align-items-center">
                <Col md={4}>
                  <h5 className="footer-heading mb-2 mb-md-0">Newsletter</h5>
                  <p className="newsletter-text small mb-0">
                    Subscribe to our newsletter for updates and offers.
                  </p>
                </Col>
                <Col md={8}>
                  <Form className="newsletter-form">
                    <InputGroup size="sm">
                      <Form.Control
                        type="email"
                        placeholder="Your email address"
                        required
                        className="border-end-0"
                      />
                      <Button type="submit" variant="outline-light">
                        <i className="bi bi-send me-1"></i>
                        Subscribe
                      </Button>
                    </InputGroup>
                  </Form>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
      
      <div className="footer-bottom text-center mt-4 pt-3 border-top border-secondary border-opacity-25">
        <p className="mb-0 footer-copyright small">
          &copy; {new Date().getFullYear()} BananaTalk. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default FooterMain;