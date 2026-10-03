import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { brand } from "@/config/brand";
import { locale } from "@/config/locale";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={locale.language} dir={locale.direction} className={vazirmatn.variable}>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
