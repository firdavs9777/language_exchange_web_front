import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import StoreLink from "../growth/StoreLink";
import "./FooterMain.scss";

const FooterMain: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer-modern">
      <div className="footer-container">
        {/* Top Section */}
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-icon">B</span>
              <span className="footer-logo-text">BananaTalk</span>
            </Link>
            <p className="footer-tagline">
              {t("footer.aboutDescription")}
            </p>
            <div className="footer-social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="bi bi-twitter-x"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <i className="bi bi-youtube"></i>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="footer-links-grid">
            <div className="footer-link-group">
              <h4 className="footer-link-title">{t("footer.quickLinks")}</h4>
              <ul>
                <li><Link to="/">{t("footer.links.home")}</Link></li>
                <li><Link to="/communities">{t("footer.links.communities") || "Communities"}</Link></li>
                <li><Link to="/#pricing">{t("footer.links.pricing")}</Link></li>
                <li><Link to="/download">{t("footer.links.download") || "Download the app"}</Link></li>
                <li><Link to="/support">{t("footer.links.contact")}</Link></li>
              </ul>
            </div>

            <div className="footer-link-group">
              <h4 className="footer-link-title">{t("footer.contactInfo")}</h4>
              <ul className="footer-contact">
                <li>
                  <i className="bi bi-envelope"></i>
                  <span>bananatalkmain@gmail.com</span>
                </li>
                <li>
                  <i className="bi bi-geo-alt"></i>
                  <span>{t("footer.address")}</span>
                </li>
              </ul>
            </div>

            <div className="footer-link-group">
              <h4 className="footer-link-title">{t("home.download.badge")}</h4>
              <div className="footer-app-links">
                <StoreLink store="ios" placement="footer" variant="badge" className="footer-store-btn" />
                <StoreLink store="android" placement="footer" variant="badge" className="footer-store-btn" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} BananaTalk. {t("footer.allRightsReserved")}
          </p>
          <div className="footer-legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-use">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterMain;
