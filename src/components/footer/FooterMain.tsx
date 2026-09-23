import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
// lucide, not bootstrap-icons: the footer renders on every prerendered
// marketing page, and the bootstrap-icons font/stylesheet is now confined to
// the authenticated lazy chunks (src/lazyIcons.ts). These seven glyphs are
// tree-shaken out of lucide, so they cost bytes instead of a webfont.
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Mail,
  MapPin,
} from "lucide-react";
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
                <Instagram size={18} aria-hidden="true" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter size={18} aria-hidden="true" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={18} aria-hidden="true" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={18} aria-hidden="true" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube size={18} aria-hidden="true" />
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
                <li><Link to="/meet">{t("footer.links.meet") || "Meet people"}</Link></li>
                <li><Link to="/learn-korean">{t("footer.links.learnKorean") || "Learn Korean"}</Link></li>
                <li><Link to="/download">{t("footer.links.download") || "Download the app"}</Link></li>
                <li><Link to="/support">{t("footer.links.contact")}</Link></li>
              </ul>
            </div>

            <div className="footer-link-group">
              <h4 className="footer-link-title">{t("footer.contactInfo")}</h4>
              <ul className="footer-contact">
                <li>
                  <Mail size={16} aria-hidden="true" />
                  <span>bananatalkmain@gmail.com</span>
                </li>
                <li>
                  <MapPin size={16} aria-hidden="true" />
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
