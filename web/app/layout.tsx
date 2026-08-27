import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Santa-Ana-Inspector",
  description: "Monitor de rastreo y control horario de inspectores Santa Ana"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
