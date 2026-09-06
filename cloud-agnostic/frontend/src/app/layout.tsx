import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Our Favs — cloud-agnostic",
  description: "Frontend for the demonstration architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#121212",
          color: "#f2f2f2",
          margin: 0,
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>{children}</div>
      </body>
    </html>
  );
}
