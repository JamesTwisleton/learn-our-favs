import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn Our Favs",
  description: "Form bands around the songs you already love.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
