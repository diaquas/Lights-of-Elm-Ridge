import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://lightsofelmridge.com"),
  title: {
    default: "Lights of Elm Ridge | xLights Sequences & Light Show Magic",
    template: "%s | Lights of Elm Ridge",
  },
  description:
    "Professional xLights sequences for Halloween and Christmas displays. Real show footage, behind-the-scenes content, and custom sequencing services.",
  keywords: [
    "xLights",
    "RGB sequences",
    "Christmas lights",
    "light show",
    "pixel sequences",
    "Halloween lights",
    "xLights sequences",
    "pixel display",
    "holiday lights",
  ],
  authors: [{ name: "Lights of Elm Ridge" }],
  creator: "Lights of Elm Ridge",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lights of Elm Ridge",
    title: "Lights of Elm Ridge | xLights Sequences & Light Show Magic",
    description:
      "Professional xLights sequences for Halloween and Christmas displays. Real show footage, behind-the-scenes content, and custom sequencing services.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lights of Elm Ridge — Professional xLights Sequences",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lights of Elm Ridge | xLights Sequences",
    description:
      "Professional xLights sequences for Halloween and Christmas displays.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "hoYoS-Nqt57Jk0Cp46tfqagYiQDZMiYiwU0kwetQM68",
  },
};

// Organization structured data for SEO
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Lights of Elm Ridge",
  url: "https://lightsofelmridge.com",
  logo: "https://lightsofelmridge.com/og-image.png",
  description:
    "Professional xLights sequences for Halloween and Christmas displays.",
  sameAs: ["https://www.youtube.com/@LightsofElmRidge"],
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "0",
    highPrice: "25",
    offerCount: "35",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts - Syne (display) + DM Sans (body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <Navigation />
          <main id="main-content" className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
