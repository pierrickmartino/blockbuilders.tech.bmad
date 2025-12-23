import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { DisplayProvider } from "@/context/display";

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
        <AuthProvider>
          <DisplayProvider>{children}</DisplayProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
