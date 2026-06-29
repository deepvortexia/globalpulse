"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";

// Gates Vercel Analytics behind cookie consent. Renders nothing until the user
// has explicitly accepted via the CookieBanner. Consent is read once on mount,
// so analytics begins on the next page load after acceptance.
export function AnalyticsWrapper() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setConsent(localStorage.getItem("gv-cookie-consent") === "accepted");
  }, []);

  if (!consent) return null;
  return <Analytics />;
}
