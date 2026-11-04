import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quản lý thiện pháp",
  description: "Phân loại sao kê VIB theo thiện pháp.",
  applicationName: "Parami",
  appleWebApp: { capable: true, title: "Parami", statusBarStyle: "default" },
  icons: { apple: "/icons/icon-180.png" },
};

export const viewport: Viewport = { themeColor: "#92400e" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="/transaction-devas-bg-v2.jpg"
          as="image"
          type="image/jpeg"
        />
        <link rel="preload" href="/parami-logo.png" as="image" type="image/png" />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#fffaf0" }}>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
