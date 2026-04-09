import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Takealot Repricing Platform",
  description: "Monitor competitor prices and apply repricing rules."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
