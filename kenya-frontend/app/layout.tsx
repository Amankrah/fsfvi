import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FSFVI Kenya - Food System Financial Vulnerability Index",
  description: "Evidence-based analysis and optimization platform for Kenya's food system investment and vulnerability assessment",
  keywords: "food security, Kenya, FSFVI, vulnerability assessment, food system, investment optimization",
  authors: [{ name: "FSFVI Team" }],
  openGraph: {
    title: "FSFVI Kenya - Food System Financial Vulnerability Index",
    description: "Evidence-based analysis and optimization platform for Kenya's food system",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://kenya.fsfvi.ai",
    siteName: "FSFVI Kenya",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
