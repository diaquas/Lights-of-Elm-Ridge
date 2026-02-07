import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Joe Hannon, the person behind Lights of Elm Ridge. Learn about the journey from childhood memories to 35,000+ pixels.",
};

const timeline = [
  {
    year: "2014",
    title: "The Typical Suburban Years",
    description:
      "Mini lights and LED C9s wherever they'd fit — nothing out of the ordinary, but the dream was quietly building.",
  },
  {
    year: "2021",
    title: "The New Canvas",
    description:
      "Moved into our new house — with a front yard large enough to handle as many lights as I want to throw at it.",
  },
  {
    year: "2022",
    title: "The Spark",
    description:
      "One mega-tree with 1,200 pixels. The moment that first pixel responded to my computer, it was over — I was hooked.",
  },
  {
    year: "2023",
    title: "Growing Pains",
    description:
      "Added yard props, a singing pumpkin, AC controller for the roof, and an FM transmitter (87.9 FM!). Four whole songs programmed.",
  },
  {
    year: "2024",
    title: "Full Production",
    description:
      "Spinners, roofline pixels, window frames, arches — the works. Doubled the mega-tree to 3,000 pixels. Discovered HinksPix Pro and ethernet receivers.",
  },
  {
    year: "2025",
    title: "The Big Leap",
    description:
      "Pixel poles, high-density spinner, fireworks, two pixel forests, and a 7,000-pixel matrix. A dozen receivers and thousands of feet of cord.",
  },
  {
    year: "2026",
    title: "What's Next",
    description:
      "Upgrading to a P5 panel matrix and taking full advantage of the 260-foot wide front yard. Mockup coming soon.",
    current: true,
  },
];

const services = [
  {
    title: "Custom Sequencing",
    description:
      "Got a song stuck in your head? I'll bring it to life with a sequence built specifically for your display.",
    price: "Starting at $150",
    icon: "🎵",
  },
  {
    title: "Sequence Mapping",
    description:
      "Already bought a sequence that doesn't quite fit? I'll map it to your specific layout.",
    price: "Starting at $50",
    icon: "🗺️",
  },
  {
    title: "Display Consultation",
    description:
      "Planning your first display or upgrading? Let's chat about what'll work best for your space and budget.",
    price: "$50/hour",
    icon: "💡",
  },
  {
    title: "xLights Training",
    description:
      "One-on-one sessions to get you comfortable with xLights. No question is too basic.",
    price: "$40/hour",
    icon: "📚",
  },
];

const howItWorks = [
  "Reach out via email with what you need",
  "We chat scope, timeline, and pricing",
  "50% deposit to get started",
  "I do the thing, with check-ins along the way",
  "Final delivery + remaining payment",
];

const values = [
  {
    icon: "🤝",
    title: "Community Over Competition",
    description:
      "There's room for everyone. I share what I know because others did the same for me.",
  },
  {
    icon: "💯",
    title: "Quality Matters",
    description: "I won't sell something I wouldn't use in my own show.",
  },
  {
    icon: "😊",
    title: "Keep It Fun",
    description:
      "If we can't laugh at our mistakes and celebrate our wins, what's the point?",
  },
  {
    icon: "📖",
    title: "Honest Advice",
    description:
      'Sometimes that means "you don\'t need that" or "start smaller."',
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-wrap">
        {/* Page Header */}
        <header className="about-header">
          <h1 className="about-title font-display">
            <span className="accent-text">About</span> Lights of Elm Ridge
          </h1>
          <p className="about-subtitle">
            What started as childhood wonder has turned into a full-blown
            obsession that my family tolerates with varying degrees of
            enthusiasm.
          </p>
        </header>

        {/* Origin Story - Hero Section */}
        <section className="origin-section">
          <div className="origin-photo">
            <div className="origin-photo-img">
              <Image
                src="/family.jpg"
                alt="The Hannon Family"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="origin-photo-caption">The Hannon Family</div>
          </div>
          <div className="origin-text">
            <p className="origin-lead">
              Hi, I&apos;m Joe Hannon — the person behind Lights of Elm Ridge.
            </p>

            <p>
              When I was a kid, our next door neighbor (I say &quot;next
              door,&quot; but really our driveways were 300 yards apart with
              thick woods between) had one of the biggest light displays in the
              area. We saw it almost every night, and I could always catch the
              glow through the trees when the leaves fell.
            </p>

            <p>
              I wouldn&apos;t say I was obsessed — but I was definitely enamored
              and intrigued. Thinking about how to wire all of that up and get
              it to actually work was genuinely exciting. My brother and I would
              draw her house on a school-sized chalkboard in our playroom. Those
              were the days of old school blow molds, C9 AC lights, and
              everything else that existed in outdoor lighting before pixels and
              controllers and the internet took over the hobby. She was a true
              pioneer.
            </p>

            <p>
              I suppose I kept those memories stored away for 30 years. But for
              some unknown reason, a part of me who saw those lights in the
              &apos;80s and &apos;90s wanted to give it a go — but in the modern
              world. It&apos;s equal parts self-satisfaction (proving I could
              actually do it) and watching the next generation adore the glow
              and allure of the dancing lights. It brought me so much joy in my
              youth; I figured it was time to pay it forward.
            </p>
          </div>
        </section>

        {/* Timeline - Compact Vertical */}
        <section className="timeline-section">
          <h2 className="section-title font-display">The Journey</h2>

          <div className="timeline">
            {timeline.map((item) => (
              <div
                key={item.year}
                className={`tl-item ${item.current ? "current" : ""}`}
              >
                <span className="tl-year">{item.year}</span>
                <span className="tl-dot"></span>
                <div className="tl-content">
                  <div className="tl-title">{item.title}</div>
                  <div className="tl-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services - 2x2 Grid */}
        <section className="services-section" id="services">
          <h2 className="section-title font-display">Services</h2>
          <p className="services-intro">
            Beyond the sequences and videos, I offer some hands-on help if you
            need it. No job too small, no question too basic.
          </p>

          <div className="services-grid">
            {services.map((service) => (
              <div key={service.title} className="service-card">
                <div className="service-icon">{service.icon}</div>
                <div className="service-title">{service.title}</div>
                <div className="service-desc">{service.description}</div>
                <div className="service-price">{service.price}</div>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="how-it-works">
            <div className="how-title font-display">How It Works</div>
            <div className="how-steps">
              {howItWorks.map((step, index) => (
                <div key={index} className="how-step">
                  <div className="how-step-num">{index + 1}</div>
                  <div className="how-step-text">{step}</div>
                </div>
              ))}
            </div>
            <p className="how-caveat">
              Fair warning: I have a day job, so turnaround times can vary.
              Complex custom sequences during Oct/Nov are basically impossible —
              plan ahead!
            </p>
          </div>
        </section>

        {/* Values - Compact Row */}
        <section className="values-section">
          <h2 className="section-title font-display">What I Believe In</h2>
          <div className="values-row">
            {values.map((value) => (
              <div key={value.title} className="value-item">
                <div className="value-icon">{value.icon}</div>
                <div className="value-title">{value.title}</div>
                <div className="value-desc">{value.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact + FAQ Side by Side */}
        <section className="contact-faq-section">
          {/* Contact Card */}
          <div className="contact-card">
            <h2 className="card-title font-display">Get In Touch</h2>
            <p className="card-desc">
              Questions? Ideas? Just want to chat about lights? I read every
              message, though response times vary based on season.
            </p>
            <div className="contact-links">
              <a
                href="mailto:joe@lightsofelmridge.com"
                className="contact-link"
              >
                <span className="contact-link-icon">✉️</span>
                joe@lightsofelmridge.com
                <span className="contact-link-label">Email</span>
              </a>
              <a
                href="https://www.youtube.com/channel/UCKvEDoz59mtUv2UCuJq6vuA"
                className="contact-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-link-icon">▶️</span>
                Lights of Elm Ridge
                <span className="contact-link-label">YouTube</span>
              </a>
              <a
                href="https://www.instagram.com/lights_of_elm_ridge"
                className="contact-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-link-icon">📷</span>
                @lights_of_elm_ridge
                <span className="contact-link-label">Instagram</span>
              </a>
            </div>
          </div>

          {/* FAQ Card */}
          <div className="faq-card">
            <h2 className="card-title font-display">Quick FAQs</h2>

            <div className="faq-item">
              <div className="faq-q">Where is Elm Ridge?</div>
              <div className="faq-a">
                Elm Ridge is the street where I live! The display address is
                shared closer to show season for those who want to visit in
                person.
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-q">Do you do commercial displays?</div>
              <div className="faq-a">
                Not yet — but I&apos;d love to try! If you have a commercial
                project in mind,{" "}
                <a href="mailto:joe@lightsofelmridge.com">reach out</a> and
                let&apos;s talk about it.
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-q">What software/hardware do you use?</div>
              <div className="faq-a">
                xLights for sequencing, HinksPix controllers and Falcon
                receivers for pixel pushing, and a whole lot of spreadsheets.
                Full details on{" "}
                <Link href="/the-show#display">The Display</Link> tab.
              </div>
            </div>
          </div>
        </section>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#ef4444] hover:text-[#ef4444]/80 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
