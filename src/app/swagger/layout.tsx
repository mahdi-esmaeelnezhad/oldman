"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { locale } from "@/config/locale";

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
        html.setAttribute("dir", locale.direction);
      }
      if (previousLang) {
        html.setAttribute("lang", previousLang);
      } else {
        html.setAttribute("lang", locale.language);
      }
    };
  }, []);

  return (
    <div dir="ltr" lang="en" style={{ direction: "ltr", textAlign: "left" }}>
      {children}
    </div>
  );
}
