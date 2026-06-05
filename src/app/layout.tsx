import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Artists Voting",
  description: "Children's art competition voting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
