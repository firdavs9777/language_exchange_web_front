import React from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import "./FooterMain.scss";

const FooterMain: React.FC = () => {
  return (
    <footer className="footer-main">
      <Container>
        <Row className="py-5">
          {/* About Section */}
          <Col md={3} className="mb-4">
            <h3>About Us</h3>
            <p>
              BananaTalk is dedicated to helping you master new languages and
              connect with native speakers from around the world.
            </p>
          </Col>

          {/* Quick Links */}
          <Col md={3} className="mb-4">
            <h3>Quick Links</h3>
            <ul className="list-unstyled">
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/services">Services</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </Col>

          {/* Contact Info */}
          <Col md={3} className="mb-4">
            <h3>Contact Info</h3>
            <p>Email: bananatalkmain@gmail.com</p>
            <p>Phone: +821082773725</p>
            <p>Address: Seoul, South Korea, Gangnam-gu</p>
          </Col>

          {/* Social Media Links */}
          <Col md={3} className="mb-4">
            <h3>Follow Us</h3>
            <div className="social-media-links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </Col>

          {/* Newsletter Sign-Up */}
          <Col md={12} className="text-center">
            <h3>Newsletter</h3>
            <p>
              Subscribe to our newsletter for the latest updates and offers.
            </p>
            <Form className="newsletter-form">
              <Form.Control
                type="email"
                placeholder="Your email address"
                required
              />
              <Button type="submit" variant="primary" className="mt-2">
                Subscribe
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
      <div className="footer-bottom text-center py-3">
        <p>
          &copy; {new Date().getFullYear()} BananaTalk. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default FooterMain;
