import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { DisplayProvider } from "@/context/display";
import { PostHogBootstrap } from "@/components/PostHogBootstrap";
import { ConsentBanner } from "@/components/ConsentBanner";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('bb.display.theme');
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AuthProvider>
          <DisplayProvider>{children}</DisplayProvider>
        </AuthProvider>
        <PostHogBootstrap />
        <ConsentBanner />
      </body>
    </html>
  );
}
