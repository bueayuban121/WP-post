import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Post Content",
  description: "Content workflow for keyword ideation, research, briefs, and publishing"
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
