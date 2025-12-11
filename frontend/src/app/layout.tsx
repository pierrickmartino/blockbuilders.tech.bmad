import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth";

export const metadata: Metadata = {
  title: "Blockbuilders",
  description: "No-code crypto strategy builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
