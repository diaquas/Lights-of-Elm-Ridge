import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Light of Elm Ridge',
  description: 'Meet the person behind the pixels. Learn about our journey, services, and why we do what we do.',
};

const timeline = [
  {
    year: "2019",
    title: "The Beginning",
    description: "Started with a single string of LEDs and a dream. Also a lot of YouTube tutorials.",
  },
  {
    year: "2020",
    title: "First Real Display",
    description: "Upgraded to pixels. Neighbors started asking questions. Some were even positive.",
  },
  {
    year: "2021",
    title: "Going Big",
    description: "Hit 5,000 pixels. Learned what 'power injection' means the hard way.",
  },
  {
    year: "2022",
    title: "The Expansion",
    description: "Added mega tree, arches, and moving heads. Electricity bill entered the chat.",
  },
  {
    year: "2023",
    title: "Community Recognition",
    description: "Featured in local news. Started getting requests to share sequences.",
  },
  {
    year: "2024",
    title: "Light of Elm Ridge",
    description: "Launched this site to share what we've learned. You're here now!",
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
            <span className="gradient-text">About Light of Elm Ridge</span>
          </h1>
          <p className="text-xl text-foreground/60">
            Just a regular person with an irregular obsession with blinking lights.
          </p>
        </div>

        {/* Story Section */}
        <section className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-border">
            <h2 className="text-2xl font-bold mb-6">The Short Version</h2>
            <div className="space-y-4 text-foreground/70 leading-relaxed">
              <p>
                Hi! I&apos;m the person behind Light of Elm Ridge. What started as
                &quot;I bet I could do that&quot; after watching a neighbor&apos;s light show has turned
                into a full-blown obsession that my family tolerates with varying degrees of enthusiasm.
              </p>
              <p>
                I&apos;ve made every mistake in the book—fried controllers, tripped breakers on
                opening night, spent way too much money on things I didn&apos;t need, and not enough
                on things I did. Through it all, I&apos;ve learned a ton, and now I want to help
                others skip some of those painful (and expensive) lessons.
              </p>
              <p>
                This site exists because the light show community helped me when I was starting out,
                and I want to pay that forward. Whether you&apos;re grabbing a free sequence, buying
                something to support the work, or just here to watch videos—welcome!
              </p>
            </div>
            <div className="mt-8 p-4 bg-surface-light rounded-lg border border-border">
              <p className="text-foreground/50 text-sm italic">
                &quot;I just wanted to put up some lights. Now I have spreadsheets for my spreadsheets
                and strong opinions about pixel spacing.&quot; — Me, probably
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
                xLights for sequencing, Falcon controllers for pixel pushing, and a whole lot
                of spreadsheets for planning. Details in the Behind the Scenes content!
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
