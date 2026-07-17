import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NeueMontrealRegular = localFont({
  src: "../public/fonts/PPNeueMontreal-Regular.ttf",
  variable: "--font-montreal-regular",
});

const NeueMontrealMedium = localFont({
  src: "../public/fonts/PPNeueMontreal-Medium.ttf",
  variable: "--font-montreal-medium",
});

const NeueMontrealSemiBold = localFont({
  src: "../public/fonts/PPNeueMontreal-SemiBold.ttf",
  variable: "--font-montreal-semibold",
});

const NeueMontrealMono = localFont({
  src: "../public/fonts/PPNeueMontreal-Mono.ttf",
  variable: "--font-montreal-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Harbor",
    template: "%s | Harbor",
  },
  description:
    "Internal project management and collaboration platform.",
  keywords: [
    "Harbor",
    "Project Management",
    "Task Tracker",
    "Team Collaboration",
  ],
  authors: [{ name: "Harbor" }],
  icons: ["/logo.svg"],
  openGraph: {
    type: "website",
    title: "Harbor",
    description: "Internal project management and collaboration platform",
    siteName: "Harbor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${NeueMontrealRegular.variable} ${NeueMontrealMedium.variable} ${NeueMontrealSemiBold.variable} ${NeueMontrealMono.variable} antialiased font-montreal-regular`}
      >
        <ThemeProvider attribute="class" defaultTheme="light">
          <main>{children}</main>
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                borderRadius: "0px",
                fontFamily: "var(--font-montreal-mono)",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--destructive)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
