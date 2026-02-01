import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://lightsofelmridge.com"),
  title: {
    default: "Lights of Elm Ridge | xLights Sequences & Light Show Magic",
    template: "%s | Lights of Elm Ridge",
  },
  description: "Professional xLights sequences for Halloween and Christmas displays. Real show footage, behind-the-scenes content, and custom sequencing services.",
  keywords: ["xLights", "RGB sequences", "Christmas lights", "light show", "pixel sequences", "Halloween lights", "xLights sequences", "pixel display", "holiday lights"],
  authors: [{ name: "Lights of Elm Ridge" }],
  creator: "Lights of Elm Ridge",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lights of Elm Ridge",
    title: "Lights of Elm Ridge | xLights Sequences & Light Show Magic",
    description: "Professional xLights sequences for Halloween and Christmas displays. Real show footage, behind-the-scenes content, and custom sequencing services.",
    images: [
      {
        url: "/logo.jpg",
        width: 512,
        height: 512,
        alt: "Lights of Elm Ridge Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Lights of Elm Ridge | xLights Sequences",
    description: "Professional xLights sequences for Halloween and Christmas displays.",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "hoYoS-Nqt57Jk0Cp46tfqagYiQDZMiYiwU0kwetQM68",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
