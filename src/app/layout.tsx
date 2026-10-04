import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { brand } from "@/config/brand";
import { locale } from "@/config/locale";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { RegisterServiceWorker } from "@/features/pwa/register-service-worker";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.name,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: brand.color,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={locale.language} dir={locale.direction} className={vazirmatn.variable}>
      <body>
        <AppThemeProvider>
          {children}
          <RegisterServiceWorker />
          <InstallPrompt />
        </AppThemeProvider>
      </body>
    </html>
  );
}
