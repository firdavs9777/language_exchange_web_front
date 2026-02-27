import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Globe2, MessageCircle, Users, BookOpen, Mic, Video,
  ChevronRight, Star, Check, ArrowRight, Sparkles
} from "lucide-react";
import "./HomeMain.scss";

const HomeMain: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      titleKey: "home.features.chat.title",
      descKey: "home.features.chat.description"
    },
    {
      icon: <Video className="w-6 h-6" />,
      titleKey: "home.features.video.title",
      descKey: "home.features.video.description"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      titleKey: "home.features.lessons.title",
      descKey: "home.features.lessons.description"
    },
    {
      icon: <Mic className="w-6 h-6" />,
      titleKey: "home.features.voice.title",
      descKey: "home.features.voice.description"
    },
    {
      icon: <Users className="w-6 h-6" />,
      titleKey: "home.features.community.title",
      descKey: "home.features.community.description"
    },
    {
      icon: <Globe2 className="w-6 h-6" />,
      titleKey: "home.features.languages.title",
      descKey: "home.features.languages.description"
    }
  ];

  const steps = [
    {
      number: "01",
      titleKey: "home.steps.profile.title",
      descKey: "home.steps.profile.description"
    },
    {
      number: "02",
      titleKey: "home.steps.partners.title",
      descKey: "home.steps.partners.description"
    },
    {
      number: "03",
      titleKey: "home.steps.learn.title",
      descKey: "home.steps.learn.description"
    }
  ];

  const plans = [
    {
      nameKey: "home.pricing.free.name",
      price: "$0",
      periodKey: "home.pricing.free.period",
      featuresKeys: [
        "home.pricing.free.features.messaging",
        "home.pricing.free.features.connections",
        "home.pricing.free.features.community",
        "home.pricing.free.features.lessons"
      ],
      popular: false
    },
    {
      nameKey: "home.pricing.premium.name",
      price: "$9.99",
      periodKey: "home.pricing.premium.period",
      featuresKeys: [
        "home.pricing.premium.features.messaging",
        "home.pricing.premium.features.connections",
        "home.pricing.premium.features.video",
        "home.pricing.premium.features.lessons",
        "home.pricing.premium.features.noAds",
        "home.pricing.premium.features.translation"
      ],
      popular: true
    },
    {
      nameKey: "home.pricing.lifetime.name",
      price: "$99",
      periodKey: "home.pricing.lifetime.period",
      featuresKeys: [
        "home.pricing.lifetime.features.everything",
        "home.pricing.lifetime.features.forever",
        "home.pricing.lifetime.features.support",
        "home.pricing.lifetime.features.early",
        "home.pricing.lifetime.features.badges"
      ],
      popular: false
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles className="w-4 h-4" />
            <span>{t("home.hero.badge")}</span>
          </div>

          <h1 className="hero-title">
            {t("home.hero.titlePart1")}
            <span className="gradient-text"> {t("home.hero.titleHighlight")}</span>
            <br />
            {t("home.hero.titlePart2")}
          </h1>

          <p className="hero-description">
            {t("home.hero.description")}
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">5M+</span>
              <span className="stat-label">{t("home.hero.stats.users")}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">50+</span>
              <span className="stat-label">{t("home.hero.stats.languages")}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">180+</span>
              <span className="stat-label">{t("home.hero.stats.countries")}</span>
            </div>
          </div>

          <div className="hero-cta">
            <Link to="/register" className="btn-primary">
              {t("home.hero.getStarted")}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/communities" className="btn-secondary">
              {t("home.hero.browseCommunity")}
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-avatars">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="trust-avatar" style={{ zIndex: 6 - i }}>
                  <img src={`https://i.pravatar.cc/40?img=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="trust-text">
              <div className="trust-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span>{t("home.hero.lovedBy")}</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="chat-preview">
                <div className="chat-message received">
                  <span>{t("home.hero.chatPreview.message1")}</span>
                </div>
                <div className="chat-message sent">
                  <span>{t("home.hero.chatPreview.message2")}</span>
                </div>
                <div className="chat-message received">
                  <span>{t("home.hero.chatPreview.message3")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">{t("home.sections.features")}</span>
            <h2 className="section-title">{t("home.features.title")}</h2>
            <p className="section-description">
              {t("home.features.subtitle")}
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{t(feature.titleKey)}</h3>
                <p className="feature-description">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">{t("home.sections.howItWorks")}</span>
            <h2 className="section-title">{t("home.howItWorks.title")}</h2>
            <p className="section-description">
              {t("home.howItWorks.subtitle")}
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{t(step.titleKey)}</h3>
                <p className="step-description">{t(step.descKey)}</p>
                {index < steps.length - 1 && (
                  <ChevronRight className="step-arrow" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">{t("home.sections.pricing")}</span>
            <h2 className="section-title">{t("home.pricing.title")}</h2>
            <p className="section-description">
              {t("home.pricing.subtitle")}
            </p>
          </div>

          <div className="pricing-grid">
            {plans.map((plan, index) => (
              <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">{t("home.pricing.mostPopular")}</div>}
                <h3 className="plan-name">{t(plan.nameKey)}</h3>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{t(plan.periodKey)}</span>
                </div>
                <ul className="plan-features">
                  {plan.featuresKeys.map((featureKey, i) => (
                    <li key={i}>
                      <Check className="w-5 h-5 text-teal-500" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`plan-button ${plan.popular ? 'primary' : 'secondary'}`}
                >
                  {t("home.pricing.getStarted")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2 className="cta-title">{t("home.cta.title")}</h2>
            <p className="cta-description">
              {t("home.cta.description")}
            </p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-primary large">
                {t("home.cta.button")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeMain;
