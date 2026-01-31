import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.jpg"
                alt="Lights of Elm Ridge"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-bold text-lg gradient-text">
                Lights of Elm Ridge
              </span>
            </Link>
            <p className="text-foreground/60 text-sm max-w-md">
              Crafting pixel-perfect light show sequences with a side of dad jokes.
              Professional quality, questionable puns included at no extra charge.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground/90">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/sequences" className="text-foreground/60 hover:text-accent transition-colors">
                  Sequences
                </Link>
              </li>
              <li>
                <Link href="/the-show" className="text-foreground/60 hover:text-accent transition-colors">
                  The Show
                </Link>
              </li>
              <li>
                <Link href="/behind-the-scenes" className="text-foreground/60 hover:text-accent transition-colors">
                  Behind the Scenes
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-foreground/60 hover:text-accent transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground/90">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-foreground/60 hover:text-accent transition-colors">
                  YouTube
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-accent transition-colors">
                  Facebook
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-accent transition-colors">
                  Instagram
                </a>
              </li>
              <li>
                <a href="mailto:hello@lightofelm ridge.com" className="text-foreground/60 hover:text-accent transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-foreground/40 text-sm">
            © {new Date().getFullYear()} Light of Elm Ridge. All rights reserved.
            <span className="ml-2 text-foreground/30">No pixels were harmed in the making of this site.</span>
          </p>
          <p className="text-foreground/40 text-xs">
            Made with xLights, caffeine, and an unreasonable number of extension cords.
          </p>
        </div>
      </div>
    </footer>
  );
}
