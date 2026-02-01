import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Meet Joe Hannon, the person behind Lights of Elm Ridge. Learn about the journey from childhood memories to 35,000+ pixels.',
};

const timeline = [
  {
    year: "2014-2020",
    title: "The Typical Suburban Years",
    description: "Mini lights and LED C9s wherever they'd fit—nothing out of the ordinary, but the dream was quietly building.",
  },
  {
    year: "2021",
    title: "The New Canvas",
    description: "Moved into our new house—with a front yard large enough to handle as many lights as I want to throw at it.",
  },
  {
    year: "2022",
    title: "The Spark",
    description: "One mega-tree with 1,200 pixels. The moment that first pixel responded to my computer, it was over—I was hooked.",
  },
  {
    year: "2023",
    title: "Growing Pains",
    description: "Added yard props, a singing pumpkin, AC controller for the roof, and an FM transmitter (87.9 FM!). Four whole songs programmed.",
  },
  {
    year: "2024",
    title: "Full Production",
    description: "Spinners, roofline pixels, window frames, arches—the works. Doubled the mega-tree to 3,000 pixels. Discovered HinksPix Pro and ethernet receivers.",
  },
  {
    year: "2025",
    title: "The Big Leap",
    description: "Pixel poles, high-density spinner, fireworks, two pixel forests, and a 7,000-pixel matrix. A dozen receivers and thousands of feet of cord.",
  },
  {
    year: "2026",
    title: "What's Next",
    description: "Already planned—upgrading to a P5 panel matrix and taking full advantage of the 260-foot wide front yard. Mockup coming soon.",
  },
];

const services = [
  {
    title: "Custom Sequencing",
    description: "Got a song stuck in your head? We'll bring it to life with a sequence built specifically for your display.",
    price: "Starting at $150",
    icon: "🎵",
  },
  {
    title: "Sequence Mapping",
    description: "Already bought a sequence that doesn't quite fit? We'll map it to your specific layout.",
    price: "Starting at $50",
    icon: "🗺️",
  },
  {
    title: "Display Consultation",
    description: "Planning your first display or upgrading? Let's chat about what'll work best for your space and budget.",
    price: "$50/hour",
    icon: "💡",
  },
  {
    title: "xLights Training",
    description: "One-on-one sessions to get you comfortable with xLights. No question is too basic.",
    price: "$40/hour",
    icon: "📚",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">About Lights of Elm Ridge</span>
          </h1>
          <p className="text-xl text-foreground/60">
            What started as childhood wonder has turned into a full-blown obsession<br className="hidden md:inline" />
            that my family tolerates with varying degrees of enthusiasm.
          </p>
        </div>

        {/* Story Section */}
        <section className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-border">
            <h2 className="text-2xl font-bold mb-6">The Origin Story</h2>

            {/* Photo and intro */}
            <div className="flex flex-col md:flex-row gap-8 mb-6">
              <div className="md:w-1/3 flex-shrink-0">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/family.jpg"
                    alt="The Hannon Family"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="text-center text-foreground/50 text-sm mt-2">The Hannon Family</p>
              </div>
              <div className="md:w-2/3 space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  Hi, I&apos;m Joe Hannon—the person behind Lights of Elm Ridge.
                </p>
                <p>
                  When I was a kid, our next door neighbor (I say &quot;next door,&quot; but really our
                  driveways were 300 yards apart with thick woods between) had one of the biggest
                  light displays in the area. We saw it almost every night, and I could always catch
                  the glow through the trees when the leaves fell.
                </p>
                <p>
                  I wouldn&apos;t say I was obsessed—but I was definitely enamored and intrigued.
                  Thinking about how to wire all of that up and get it to actually work was
                  genuinely exciting. My brother and I would draw her house on a school-sized
                  chalkboard in our playroom. Those were the days of old school blow molds,
                  C9 AC lights, and everything else that existed in outdoor lighting before
                  pixels and controllers and the internet took over the hobby. She was a true pioneer.
                </p>
                <p>
                  I suppose I kept those memories stored away for 30 years. But for some unknown
                  reason, a part of me who saw those lights in the &apos;80s and &apos;90s wanted to give
                  it a go—but in the modern world. It&apos;s equal parts self-satisfaction (proving
                  I could actually do it) and watching the next generation adore the glow and
                  allure of the dancing lights. It brought me so much joy in my youth; I figured
                  it was time to pay it forward.
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-surface-light rounded-lg border border-border">
              <p className="text-foreground/50 text-sm italic">
                &quot;I just wanted to put up some lights. Now I have a budget, spreadsheets, and
                a full project management tool to keep me on track all year long.&quot;
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">The Journey</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border transform md:-translate-x-1/2"></div>

            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-accent rounded-full transform -translate-x-1/2 z-10"></div>

                  {/* Content */}
                  <div className={`flex-1 ml-12 md:ml-0 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <div className="bg-surface rounded-xl p-6 border border-border card-hover">
                      <span className="text-accent font-bold">{item.year}</span>
                      <h3 className="font-semibold mt-1">{item.title}</h3>
                      <p className="text-sm text-foreground/60 mt-2">{item.description}</p>
                    </div>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-8">Services</h2>
          <p className="text-foreground/60 mb-8">
            Beyond the sequences and videos, I offer some hands-on help if you need it.
            No job too small, no question too basic.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-surface rounded-xl p-6 border border-border card-hover"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                <p className="text-foreground/60 text-sm mb-4">{service.description}</p>
                <p className="text-accent font-semibold">{service.price}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-surface-light rounded-xl p-6 border border-border">
            <h3 className="font-semibold mb-2">How It Works</h3>
            <ol className="list-decimal list-inside space-y-2 text-foreground/60 text-sm">
              <li>Reach out via email with what you need</li>
              <li>We&apos;ll chat about scope, timeline, and pricing</li>
              <li>50% deposit to get started (for custom work)</li>
              <li>We do the thing, with check-ins along the way</li>
              <li>Final delivery and remaining payment</li>
            </ol>
            <p className="mt-4 text-foreground/50 text-sm">
              Fair warning: I have a day job, so turnaround times can vary. Complex custom
              sequences during October/November are basically impossible—plan ahead!
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">What I Believe In</h2>
          <div className="grid gap-6">
            <div className="flex gap-4 items-start">
              <div className="text-2xl">🤝</div>
              <div>
                <h3 className="font-semibold">Community Over Competition</h3>
                <p className="text-foreground/60 text-sm">
                  There&apos;s room for everyone in this hobby. I share what I know because
                  others did the same for me.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-2xl">💯</div>
              <div>
                <h3 className="font-semibold">Quality Matters</h3>
                <p className="text-foreground/60 text-sm">
                  I won&apos;t sell something I wouldn&apos;t use in my own show.
                  Every sequence gets the same attention to detail.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-2xl">😊</div>
              <div>
                <h3 className="font-semibold">Keep It Fun</h3>
                <p className="text-foreground/60 text-sm">
                  This is supposed to be enjoyable. If we can&apos;t laugh at our mistakes
                  and celebrate our wins, what&apos;s the point?
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-2xl">📖</div>
              <div>
                <h3 className="font-semibold">Honest Advice</h3>
                <p className="text-foreground/60 text-sm">
                  I&apos;ll tell you what I actually think, not just what you want to hear.
                  Sometimes that means &quot;you don&apos;t need that&quot; or &quot;start smaller.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-8 border border-border text-center">
            <h2 className="text-2xl font-bold mb-4">Get In Touch</h2>
            <p className="text-foreground/60 mb-6 max-w-lg mx-auto">
              Questions? Ideas? Just want to chat about lights?
              I read every message, though response times vary based on season
              (October-December is... busy).
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@lightsofelmridge.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Me
              </a>
              <a
                href="https://www.youtube.com/channel/UCKvEDoz59mtUv2UCuJq6vuA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
              <a
                href="https://www.instagram.com/lights_of_elm_ridge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold mb-8">Quick FAQs</h2>
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-accent">Where is Elm Ridge?</h3>
              <p className="text-foreground/60 mt-2 text-sm">
                Elm Ridge is the street where I live! The display address is shared closer to
                show season for those who want to visit in person.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-accent">Do you do commercial displays?</h3>
              <p className="text-foreground/60 mt-2 text-sm">
                I have in the past! Reach out with details and we can discuss. Fair warning:
                commercial work takes priority booking and has different pricing.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-accent">What software/hardware do you use?</h3>
              <p className="text-foreground/60 mt-2 text-sm">
                xLights for sequencing, HinksPix controllers and Falcon receivers for pixel pushing,
                and a whole lot of spreadsheets for planning. Details in the Behind the Scenes content!
              </p>
            </div>
          </div>
        </section>

        {/* Back to Home */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
