import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { MobileFrame } from "@/components/mobile-frame";
import { brand } from "@/config/brand";
import { localeMeta } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { I18nProvider } from "@/i18n/i18n-provider";
import { getRequestLocale } from "@/i18n/server";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { RegisterServiceWorker } from "@/features/pwa/register-service-worker";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.brandName,
    description: dictionary.brandDescription,
    applicationName: dictionary.brandName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: dictionary.brandName,
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: brand.color,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const meta = localeMeta[locale];

  return (
    <html lang={locale} dir={meta.direction} className={vazirmatn.variable}>
      <body>
        <AppThemeProvider direction={meta.direction}>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <MobileFrame>
              {children}
              <RegisterServiceWorker />
              <InstallPrompt />
            </MobileFrame>
          </I18nProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
