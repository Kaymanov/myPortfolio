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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dictionary = await getDictionary(lang as Locale);

  // Верификация владения сайтом в Google Search Console и Яндекс.Вебмастер
  // через meta-теги (R14.5). Значения берутся из окружения и могут быть не
  // заданы (например в dev) — в этом случае соответствующий meta-тег
  // опускается, а не рендерится пустым.
  //
  // Альтернатива (HTML-файлы верификации) поддерживается через `public/`:
  // положите `google<token>.html` и `yandex_<token>.html` в `frontend/public/`,
  // и Next.js будет отдавать их по требуемым корневым путям с HTTP 200.
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const yandexVerification = process.env.YANDEX_VERIFICATION?.trim();
  const verification =
    googleVerification || yandexVerification
      ? {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(yandexVerification ? { yandex: yandexVerification } : {}),
        }
      : undefined;

  return {
    title: {
      default: `IAMROOT | ${dictionary.seo.title}`,
      template: "%s | IAMROOT",
    },
    verification,
    description:
      "Профессиональная разработка сайтов, интеграция ИИ агентов, автоматизация бизнес-процессов и администрирование корпоративной IT инфраструктуры.",
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
      locale: lang === "ru" ? "ru_RU" : "en_US",
      url: "https://iamroot.pro",
      title: `IAMROOT | ${dictionary.seo.title}`,
      description:
        "Надежные IT-решения: от разработки сложных сайтов до интеграции ИИ и обслуживания серверов.",
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
      <body className="antialiased min-h-screen pb-40 md:pb-48 relative bg-terminal-bg text-terminal-green overflow-x-hidden w-full">
        <Header />
        {children}
        <FooterTerminal />
      </body>
    </html>
  );
}
