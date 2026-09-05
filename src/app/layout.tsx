import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Header } from "@/components/ui/Header";
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
  title: "Learn My Favs",
  description: "Discover which of your favourite Spotify songs are easy to play on your instrument",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <AuthProvider>
          <ThemeProvider>
            <Header />
            <main className="flex-1">{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
