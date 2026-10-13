import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWebAnnouncements } from "./useWebAnnouncements";
import AnnouncementModal from "./AnnouncementModal";
import AnnouncementBanner from "./AnnouncementBanner";
import { openSurface, closeSurface } from "../growth/surfaceRegistry";

// Module-level: the pop-up is a once-per-visit ask (one page load), not per route.
let popupShownThisLoad = false;
export function _resetPopupForTests() { popupShownThisLoad = false; }

const AnnouncementSurfaces: React.FC = () => {
  const { pathname } = useLocation();
  const { popup, banner, dismiss } = useWebAnnouncements();
  const [popupOpen, setPopupOpen] = useState(false);
  const onAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (onAdmin || !popup || popupShownThisLoad) return;
    popupShownThisLoad = true;
    setPopupOpen(true);
  }, [popup, onAdmin]);

  const showPopup = popupOpen && !!popup && !onAdmin;
  const showBanner = !!banner && !onAdmin;

  useEffect(() => {
    if (!showPopup) return;
    openSurface("announcement-popup");
    return () => closeSurface("announcement-popup");
  }, [showPopup]);

  useEffect(() => {
    if (!showBanner) return;
    openSurface("announcement-banner");
    return () => closeSurface("announcement-banner");
  }, [showBanner]);

  // Stable callbacks: the modal's focus/Escape effect depends on onClose, so an
  // inline one would re-run it (and move focus) on every parent re-render.
  const latest = useRef({ popup, banner, dismiss });
  latest.current = { popup, banner, dismiss };
  const closePopup = useCallback((remember: boolean) => {
    const { popup: p, dismiss: d } = latest.current;
    if (remember && p) d(p.id);
    setPopupOpen(false);
  }, []);
  const closeBanner = useCallback(() => {
    const { banner: b, dismiss: d } = latest.current;
    if (b) d(b.id);
  }, []);

  return (
    <>
      {showBanner ? <AnnouncementBanner announcement={banner!} onClose={closeBanner} /> : null}
      {showPopup ? <AnnouncementModal announcement={popup!} onClose={closePopup} /> : null}
    </>
  );
};

export default AnnouncementSurfaces;
