import Link from 'next/link';
import type { Metadata } from 'next';
import NewsletterForm from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Behind the Scenes | Light of Elm Ridge',
  description: 'Learn how we build our light show. Tutorials, deep dives, and honest stories about what works (and what spectacularly doesn\'t).',
};

// Placeholder content data
const contentSeries = [
  {
    id: 1,
    title: "xLights Masterclass",
    description: "From zero to hero. Learn xLights the way we wish someone had taught us.",
    episodeCount: 0,
    status: "Coming Soon",
    color: "accent",
  },
  {
    id: 2,
    title: "Hardware Deep Dives",
    description: "Controllers, pixels, power supplies, and why we have a complicated relationship with all of them.",
    episodeCount: 0,
    status: "Coming Soon",
    color: "accent-secondary",
  },
  {
    id: 3,
    title: "Build Logs",
    description: "Watch us build props, make mistakes, and occasionally nail it on the first try (rare).",
    episodeCount: 0,
    status: "Coming Soon",
    color: "accent-warm",
  },
  {
    id: 4,
    title: "Disaster Diaries",
    description: "The failures that made us better. Spoiler: there are many.",
    episodeCount: 0,
    status: "Coming Soon",
    color: "accent-pink",
  },
];

const upcomingTopics = [
  "Getting Started with xLights - The Right Way",
  "Understanding Props, Models, and Groups",
  "Sequencing 101: Timing, Effects, and Flow",
  "Power Injection: Don't Let Your Pixels Go Hungry",
  "Controller Setup: Falcon vs. Wired vs. Your Sanity",
  "Mega Trees: Building Your First WOW Piece",
  "The FM Transmitter Setup Nobody Explains Well",
  "Weatherproofing: Because Mother Nature is Undefeated",
  "Show Night Checklist (Learn from Our Mistakes)",
  "Budgeting Your First Display (It's Always More)",
];

const faqItems = [
  {
    question: "When will the Behind the Scenes content be available?",
    answer: "We're working on it! Recording quality educational content takes time, and we want to do it right. Sign up for our newsletter to be the first to know when new content drops.",
  },
  {
    question: "Will this content be free?",
    answer: "Much of it, yes! We believe in giving back to the community that helped us get started. Some premium deep-dives might be behind a small paywall to support the time invested, but core tutorials will always be accessible.",
  },
  {
    question: "Can I request specific topics?",
    answer: "Absolutely! We're building this for the community. Drop us a message with what you're struggling with or curious about, and we'll prioritize accordingly.",
  },
  {
    question: "Do I need prior xLights experience?",
    answer: "Nope! We're starting from the absolute basics. If you can download software and have enthusiasm, you're qualified. Prior experience just means some episodes will be review for you.",
  },
];

export default function BehindTheScenesPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Behind the Scenes</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            The masterclass nobody asked for but everyone needs.
            Learn from our wins, our losses, and everything in between.
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-accent/20 via-accent-secondary/20 to-accent-pink/20 rounded-xl p-8 mb-16 border border-border text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold mb-3">Content Coming Soon!</h2>
          <p className="text-foreground/60 max-w-2xl mx-auto mb-6">
            We&apos;re in the process of creating comprehensive tutorials and behind-the-scenes
            content. Good things take time, and we&apos;d rather do it right than rush out something half-baked.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-border">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-foreground/70">Currently in production</span>
          </div>
        </div>

        {/* Content Series */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Planned Series</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {contentSeries.map((series) => (
              <div
                key={series.id}
                className="bg-surface rounded-xl p-6 border border-border card-hover"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`text-xl font-bold text-${series.color}`}>
                    {series.title}
                  </h3>
                  <span className="px-3 py-1 bg-accent-warm/20 text-accent-warm text-xs font-medium rounded-full">
                    {series.status}
                  </span>
                </div>
                <p className="text-foreground/60 mb-4">{series.description}</p>
                <div className="flex items-center gap-2 text-sm text-foreground/40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  <span>{series.episodeCount} episodes</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming Topics */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Topics We&apos;re Planning to Cover</h2>
          <div className="bg-surface rounded-xl p-8 border border-border">
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingTopics.map((topic, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-light transition-colors"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-accent/20 text-accent text-xs font-bold rounded">
                    {index + 1}
                  </span>
                  <span className="text-foreground/80">{topic}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-foreground/50 text-sm">
              Have a topic you&apos;d like us to cover? Let us know!
            </p>
          </div>
        </section>

        {/* What to Expect */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">What to Expect</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-surface rounded-xl p-6 border border-border text-center">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="font-bold mb-2">Real Education</h3>
              <p className="text-sm text-foreground/60">
                Not just &quot;watch me do this&quot; but actual explanations of WHY things work.
                Theory meets practice.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border text-center">
              <div className="text-4xl mb-4">😅</div>
              <h3 className="font-bold mb-2">Honest Failures</h3>
              <p className="text-sm text-foreground/60">
                We&apos;ll show you what went wrong, not just the highlight reel.
                Learn from our expensive mistakes.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold mb-2">Practical Focus</h3>
              <p className="text-sm text-foreground/60">
                Stuff you can actually use. No fluff, no filler, just actionable knowledge.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="bg-surface rounded-xl p-6 border border-border"
              >
                <h3 className="font-semibold mb-2 text-accent">{item.question}</h3>
                <p className="text-foreground/60">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-8 border border-border text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold mb-3">Get Notified When We Launch</h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Be the first to know when new tutorials drop. No spam, just lights.
            We promise to only email you when it&apos;s actually worth your time.
          </p>
          <NewsletterForm />
          <p className="mt-4 text-foreground/40 text-xs">
            We respect your inbox. Unsubscribe anytime.
          </p>
        </section>

        {/* Can't Wait CTA */}
        <div className="mt-12 text-center">
          <p className="text-foreground/60 mb-4">
            Can&apos;t wait for the tutorials? Our sequences come with support!
          </p>
          <Link
            href="/sequences"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
          >
            Browse Sequences
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
