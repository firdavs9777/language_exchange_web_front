import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { detectPlatform } from "../../utils/platform";
import StoreLink, { storeHref } from "../growth/StoreLink";
import "./DownloadApp.scss";

const DownloadApp: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    const platform = detectPlatform(navigator.userAgent);
    // The automatic hop is a store tap too, so it carries the same campaign
    // as the badges below it.
    if (platform === "ios") {
      window.location.href = storeHref("ios", "download-page");
    } else if (platform === "android") {
      window.location.href = storeHref("android", "download-page");
    }
  }, []);

  return (
    <div className="download-page">
      <div className="download-page-inner">
        <div className="download-page-icon">B</div>
        <h1 className="download-page-title">BananaTalk</h1>
        <p className="download-page-desc">
          {t("home.download.description")}
        </p>

        <div className="download-page-buttons">
          <StoreLink store="ios" placement="download-page" variant="badge" className="download-page-btn apple" />
          <StoreLink store="android" placement="download-page" variant="badge" className="download-page-btn google" />
        </div>

        <p className="download-page-hint">
          On mobile? You'll be redirected automatically.
        </p>
      </div>
    </div>
  );
};

export default DownloadApp;
