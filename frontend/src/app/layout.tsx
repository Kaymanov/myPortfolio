import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FooterTerminal } from "@/components/FooterTerminal";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IAMROOT | Разработка сайтов и IT инфраструктура",
    template: "%s | IAMROOT",
  },
  description: "Профессиональная разработка сайтов, интеграция ИИ агентов, автоматизация бизнес-процессов и администрирование корпоративной IT инфраструктуры.",
  keywords: [
    "Разработка сайтов",
    "Администрирование IT инфраструктуры",
    "Обслуживание серверов",
    "Интеграция ИИ агентов",
    "Автоматизация бизнес процессов",
    "DevOps",
    "Full-Stack разработка",
  ],
  authors: [{ name: "Andrey Kaymanov", url: "https://iamroot.pro" }],
  creator: "Andrey Kaymanov",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://iamroot.pro",
    title: "IAMROOT | Разработка сайтов и IT инфраструктура",
    description: "Надежные IT-решения: от разработки сложных сайтов до интеграции ИИ и обслуживания серверов.",
    siteName: "IAMROOT.PRO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body className="antialiased min-h-screen pb-48 md:pb-56 relative bg-terminal-bg text-terminal-green overflow-x-hidden w-full">
        <Header />
        {children}
        <FooterTerminal />
      </body>
    </html>
  );
}
