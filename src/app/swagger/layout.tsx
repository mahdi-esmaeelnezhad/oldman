"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { defaultLocale, localeMeta } from "@/i18n/config";

export default function SwaggerLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const previousDir = html.getAttribute("dir");
    const previousLang = html.getAttribute("lang");
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", "en");
    return () => {
      if (previousDir) {
        html.setAttribute("dir", previousDir);
      } else {
        html.setAttribute("dir", localeMeta[defaultLocale].direction);
      }
      if (previousLang) {
        html.setAttribute("lang", previousLang);
      } else {
        html.setAttribute("lang", defaultLocale);
      }
    };
  }, []);

  return (
    <div dir="ltr" lang="en" style={{ direction: "ltr", textAlign: "left" }}>
      {children}
    </div>
  );
}
