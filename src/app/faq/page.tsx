import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ | Lights of Elm Ridge",
  description:
    "Frequently asked questions about xLights sequences, licensing, compatibility, and the Lights of Elm Ridge display.",
};

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: "Licensing & Terms",
    icon: "📜",
    items: [
      {
        question: "Can I share sequences I purchase with others?",
        answer:
          "No. Sequences are provided for your personal use only. You may use them for your own displays and projects but are not authorized to share, resell, or redistribute them in any form.",
      },
      {
        question: "Can I resell or distribute sequences?",
        answer:
          "No. You agree not to resell, trade, or distribute sequences to any third party. You also may not upload sequences to any other website, file-sharing service, or public platform without prior written consent.",
      },
      {
        question: "Can I modify sequences for my display?",
        answer:
          "Yes! You may modify sequences for personal use to fit your display setup. However, you may not share or sell modified versions.",
      },
      {
        question: "What about the music in the sequences?",
        answer:
          "You are responsible for purchasing and downloading any copyrighted music included in sequence packages. We provide the sequence files, but you must obtain the audio tracks legally through services like iTunes, Amazon Music, or other licensed providers.",
      },
      {
        question: "What happens if I violate the terms?",
        answer:
          "Unauthorized reproduction or distribution of sequences is a violation of copyright law and may result in legal action. By purchasing or downloading sequences, you agree to abide by these terms and respect the copyright of the creator.",
      },
    ],
  },
  {
    title: "Compatibility & Requirements",
    icon: "🔧",
    items: [
      {
        question: "What software do I need to use these sequences?",
        answer:
          "All sequences are created in xLights and require xLights version 2024.20 or newer. xLights is free, open-source software available at xlights.org.",
      },
      {
        question: "Will sequences work with my display?",
        answer:
          "Sequences are designed for our specific prop layout but can be remapped to fit your display. Each sequence page lists the props/models used. Basic xLights knowledge is helpful for remapping.",
      },
      {
        question: "What props are typically used in sequences?",
        answer:
          "Most sequences include: Matrix (70x100), Singing Pumpkin, Arches (8), Pixel Poles, House Outlines, Floods, Spinners, and various Halloween/Christmas props. Check each sequence page for specific prop lists.",
      },
      {
        question: "Do I need a matrix display?",
        answer:
          "Many sequences feature matrix effects, but you can disable or remap the matrix portion if you don't have one. The sequences will still work with your other props.",
      },
      {
        question: "What file formats are included?",
        answer:
          "Sequences typically include xLights (.xsq) files and FSEQ files. Some may include additional formats. Check each sequence page for specific file format details.",
      },
    ],
  },
  {
    title: "Purchasing & Downloads",
    icon: "🛒",
    items: [
      {
        question: "Where do I purchase sequences?",
        answer:
          "Currently, sequences are available on xlightsseq.com. Click any sequence to view details and purchase. We're working on our own store - coming soon!",
      },
      {
        question: "How do I download after purchasing?",
        answer:
          "After purchase on xlightsseq.com, you'll receive a download link. Downloads are typically available immediately. Check your email for the download link and instructions.",
      },
      {
        question: "Is there a refund policy?",
        answer:
          "Due to the digital nature of sequences, refunds are handled on a case-by-case basis. If you experience technical issues, contact us and we'll work to resolve them. We want you to be happy with your purchase!",
      },
      {
        question: "Do you offer bundles or discounts?",
        answer:
          "Yes! We occasionally offer bundle deals and seasonal discounts. Follow us on social media or check the sequences page for current offers.",
      },
    ],
  },
  {
    title: "Technical Support",
    icon: "💡",
    items: [
      {
        question: "How do I import a sequence into xLights?",
        answer:
          "Open xLights, go to File > Open Sequence, and select the .xsq file. You may need to remap models to match your layout. xLights has excellent documentation and YouTube tutorials for this process.",
      },
      {
        question: "The sequence doesn't match my props. What do I do?",
        answer:
          "You'll need to remap the sequence to your layout. In xLights, use the Model Mapping feature to assign effects from our models to yours. This is a standard process for any purchased sequence.",
      },
      {
        question: "Can I get help with remapping?",
        answer:
          "While we can't provide one-on-one remapping support, there are excellent resources available: the xLights manual, Facebook groups (xLights Support Group), and YouTube tutorials covering sequence remapping.",
      },
      {
        question: "What show player do you recommend?",
        answer:
          "We use xSchedule (part of xLights) for show playback. It handles playlists, scheduling, and integrates with Remote Falcon for viewer song requests. FPP (Falcon Player) is another popular option.",
      },
    ],
  },
  {
    title: "About the Display",
    icon: "🏠",
    items: [
      {
        question: "Where is Lights of Elm Ridge located?",
        answer:
          'We\'re a residential holiday light display. Check our "The Show" page for location details and show times during the season.',
      },
      {
        question: "How big is your display?",
        answer:
          "Our display features 35,000+ pixels across 80+ props, controlled by 3 controllers over 190 E1.31 universes. Check the Display page for full specs.",
      },
      {
        question: "Can I request a song during the show?",
        answer:
          "Yes! We use Remote Falcon to allow viewers to request songs. During show hours, scan the QR code at the display or visit our Remote Falcon page to add songs to the queue.",
      },
      {
        question: "Do you do Halloween and Christmas?",
        answer:
          "Yes! We run Halloween displays in October and Christmas displays from late November through early January. Our playlist includes songs for both seasons.",
      },
    ],
  },
];

function FAQAccordion({ section }: { section: FAQSection }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <span className="text-2xl sm:text-3xl">{section.icon}</span>
        <h2 className="text-xl sm:text-2xl font-bold">{section.title}</h2>
      </div>

      <div className="space-y-3">
        {section.items.map((item, index) => (
          <details
            key={index}
            className="group bg-surface rounded-xl border border-border overflow-hidden"
          >
            <summary className="flex items-center justify-between p-3 sm:p-4 min-h-[48px] cursor-pointer hover:bg-surface-light transition-colors">
              <span className="font-medium pr-4 text-sm sm:text-base">
                {item.question}
              </span>
              <svg
                className="w-5 h-5 text-foreground/50 group-open:rotate-180 transition-transform flex-shrink-0"
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
            </summary>
            <div className="px-4 pb-4 text-foreground/70">
              <div className="pt-2 border-t border-border/50">
                {typeof item.answer === "string" ? (
                  <p className="mb-0">{item.answer}</p>
                ) : (
                  item.answer
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Frequently Asked Questions</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Everything you need to know about our sequences, licensing, and
            display.
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-surface rounded-xl p-4 mb-8 border border-border">
          <p className="text-sm text-foreground/60 mb-3">Jump to section:</p>
          <div className="flex flex-wrap gap-2">
            {faqSections.map((section) => (
              <a
                key={section.title}
                href={`#${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-1.5 bg-surface-light rounded-lg text-sm hover:bg-surface-hover transition-colors"
              >
                {section.icon} {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        {faqSections.map((section) => (
          <section
            key={section.title}
            id={section.title.toLowerCase().replace(/\s+/g, "-")}
            className="scroll-mt-24"
          >
            <FAQAccordion section={section} />
          </section>
        ))}

        {/* Terms Summary */}
        <section className="mt-12 mb-8">
          <div className="bg-surface/50 rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>⚖️</span> Terms of Use Summary
            </h2>
            <div className="text-foreground/70 space-y-3 text-sm">
              <p>
                <strong>Personal Use Only:</strong> Sequences are for your
                personal displays and projects.
              </p>
              <p>
                <strong>No Resale:</strong> Do not resell, trade, or
                redistribute sequences.
              </p>
              <p>
                <strong>No Public Sharing:</strong> Do not upload to websites or
                file-sharing services.
              </p>
              <p>
                <strong>Modifications OK:</strong> You may modify for personal
                use, but not share modified versions.
              </p>
              <p>
                <strong>Music Responsibility:</strong> You must legally obtain
                any copyrighted music.
              </p>
              <p className="pt-2 border-t border-border/50 text-foreground/50">
                By purchasing or downloading sequences, you agree to these
                terms.
              </p>
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-8 border border-border">
            <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-foreground/60 mb-6 max-w-lg mx-auto">
              Can&apos;t find what you&apos;re looking for? Check out our other
              pages or reach out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sequences"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-lg transition-colors"
              >
                Browse Sequences
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-lg transition-colors"
              >
                About Us
              </Link>
            </div>
          </div>
        </section>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
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
