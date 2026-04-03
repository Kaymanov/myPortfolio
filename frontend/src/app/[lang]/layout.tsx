import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { FooterTerminal } from "@/components/FooterTerminal";
import { Header } from "@/components/Header";
import { getDictionary, Locale } from "@/i18n/dictionaries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dictionary = await getDictionary(lang as Locale);
  return {
    title: {
      default: `IAMROOT | ${dictionary.seo.title}`,
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
      locale: lang === 'ru' ? 'ru_RU' : 'en_US',
      url: "https://iamroot.pro",
      title: `IAMROOT | ${dictionary.seo.title}`,
      description: "Надежные IT-решения: от разработки сложных сайтов до интеграции ИИ и обслуживания серверов.",
      siteName: "IAMROOT.PRO",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  return (
    <html lang={lang} className="scroll-smooth">
      <body className="antialiased min-h-screen pb-48 md:pb-56 relative bg-terminal-bg text-terminal-green overflow-x-hidden w-full">
        <Header />
        {children}
        <FooterTerminal />
      </body>
    </html>
  );
}
