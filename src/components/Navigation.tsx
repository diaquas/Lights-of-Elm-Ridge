"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/contexts/CartContext";
import CartDropdown from "@/components/CartDropdown";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/sequences", label: "Sequences" },
  { href: "/the-show", label: "The Show" },
  { href: "/about", label: "About" },
];

const toolsLinks = [
  { href: "/trkiq", label: "TRK:IQ", badge: "NEW" },
  { href: "/modiq", label: "ModIQ" },
  { href: "/build-your-show", label: "Shop Wizard" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const supabase = createClient();
  const { itemCount } = useCart();

  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const closeAllDropdowns = useCallback(() => {
    setToolsMenuOpen(false);
    setUserMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolsMenuOpen &&
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node)
      ) {
        setToolsMenuOpen(false);
      }
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [toolsMenuOpen, userMenuOpen]);

  // Close dropdowns on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAllDropdowns();
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen, closeAllDropdowns]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="site-logo">
              <span className="site-logo-top">LIGHTS</span>
              <span className="site-logo-bottom">
                <span className="site-logo-of">of</span>
                <span className="site-logo-place">Elm Ridge</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? "bg-accent/20 text-accent"
                      : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Tools Dropdown */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolsLinks.some((l) => pathname === l.href)
                      ? "bg-accent/20 text-accent"
                      : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                  }`}
                  aria-expanded={toolsMenuOpen}
                  aria-haspopup="true"
                >
                  Tools
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${toolsMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {toolsMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-32px)] bg-surface rounded-lg border border-border shadow-lg py-1">
                    {toolsLinks.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setToolsMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 text-sm transition-all ${
                          pathname === tool.href
                            ? "text-accent bg-accent/10"
                            : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                        }`}
                      >
                        <span className="font-medium">{tool.label}</span>
                        {"badge" in tool && tool.badge && (
                          <span className="text-[10px] font-bold tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                            {tool.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Dropdown */}
              <CartDropdown />

              {/* Auth Button */}
              {user ? (
                <div className="relative ml-2" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-surface-light transition-all"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <svg
                      className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-32px)] bg-surface rounded-lg border border-border shadow-lg py-1">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-xs text-foreground/60">
                          Signed in as
                        </p>
                        <p className="text-sm font-medium truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-foreground/70 hover:text-foreground hover:bg-surface-light"
                      >
                        My Account
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-3 text-sm text-foreground/70 hover:text-foreground hover:bg-surface-light"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-11 w-11 flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              className="md:hidden py-4 border-t border-border"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? "bg-accent/20 text-accent"
                      : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Tools */}
              <div className="px-4 py-2 mt-2">
                <p className="text-xs text-foreground/40 uppercase tracking-wider font-medium">
                  Tools
                </p>
              </div>
              {toolsLinks.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    pathname === tool.href
                      ? "bg-accent/20 text-accent"
                      : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                  }`}
                >
                  <span>{tool.label}</span>
                  {"badge" in tool && tool.badge && (
                    <span className="text-[10px] font-bold tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                      {tool.badge}
                    </span>
                  )}
                </Link>
              ))}

              {/* Mobile Cart */}
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/cart"
                    ? "bg-accent/20 text-accent"
                    : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Cart
                </span>
                {itemCount > 0 && (
                  <span className="bg-accent text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Auth */}
              <div className="mt-4 pt-4 border-t border-border">
                {user ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <p className="text-xs text-foreground/60">Signed in as</p>
                      <p className="text-sm font-medium truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-surface-light"
                    >
                      My Account
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-surface-light"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block mx-4 py-3 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors text-center"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
