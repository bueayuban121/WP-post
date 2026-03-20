import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Pipeline Studio",
  description: "SEO content workflow for keyword ideation, research, briefs, and publishing"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
