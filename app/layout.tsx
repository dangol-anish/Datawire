import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Datawire",
  description: "Visual data pipeline editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas text-white font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
