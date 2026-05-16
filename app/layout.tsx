import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAM | Semester Activity Manager",
  description:
    "Collaborative semester planner for shared activities, inboxing ideas, and participation tracking.",
};

//Note: suppressHydrationWarning only tells React to ignore attribute mismatches
// on that exact HTML tag, not its children.
// It is the official, standard Next.js way to handle extension-injected attributes
// on the <body> or <html> tags without hiding actual bugs
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme: read localStorage before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('sam-theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t);}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
