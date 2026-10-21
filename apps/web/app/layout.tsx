import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dependency Time Machine",
  description: "Safely upgrade allowlisted Next.js projects to Next.js 16.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
