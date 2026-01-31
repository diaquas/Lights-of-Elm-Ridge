import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Light of Elm Ridge | xLights Sequences & Light Show Magic",
  description: "Professional xLights sequences, real show footage, and behind-the-scenes content. Crafted with care, delivered with a wink.",
  keywords: ["xLights", "RGB sequences", "Christmas lights", "light show", "pixel sequences", "Halloween lights"],
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
