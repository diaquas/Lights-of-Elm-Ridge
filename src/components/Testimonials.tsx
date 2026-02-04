import Image from "next/image";

interface Testimonial {
  id: number;
  name: string;
  location: string;
  avatar?: string;
  rating: number;
  text: string;
  displaySize?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Mike R.",
    location: "Texas",
    rating: 5,
    text: "These sequences are incredibly well-crafted. The timing is spot-on and the effects really pop on my display. My neighborhood looks forward to my show every year now!",
    displaySize: "15,000 pixels",
  },
  {
    id: 2,
    name: "Sarah T.",
    location: "Ohio",
    rating: 5,
    text: "Finally found sequences that work great with my layout without tons of remapping. The Halloween pack was a huge hit with the trick-or-treaters. Already planning for Christmas!",
    displaySize: "8,000 pixels",
  },
  {
    id: 3,
    name: "David K.",
    location: "Florida",
    rating: 5,
    text: "As a beginner, I was worried about getting sequences to work. These dropped right into my xLights setup with minimal tweaking. The video previews helped me pick exactly what I wanted.",
    displaySize: "5,000 pixels",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-amber-400" : "text-foreground/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="max-w-[1100px] mx-auto px-8 pt-11">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="text-lg">💬</span>
        <h2 className="text-[22px] font-bold tracking-tight">
          What Customers Are Saying
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="bg-surface border border-border rounded-[10px] p-5 flex flex-col"
          >
            {/* Header: Avatar + Name + Rating */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-foreground/50">
                    {testimonial.location}
                  </div>
                </div>
              </div>
              <StarRating rating={testimonial.rating} />
            </div>

            {/* Testimonial Text */}
            <p className="text-[13.5px] text-foreground/70 leading-relaxed flex-1">
              &ldquo;{testimonial.text}&rdquo;
            </p>

            {/* Display Size Badge */}
            {testimonial.displaySize && (
              <div className="mt-4 pt-3 border-t border-border">
                <span className="text-[11px] uppercase tracking-wide text-foreground/40 font-medium">
                  Display Size:{" "}
                  <span className="text-foreground/60">{testimonial.displaySize}</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Social Proof Stats */}
      <div className="flex flex-wrap justify-center gap-6 mt-8 py-5 px-6 bg-surface/50 border border-border rounded-[10px]">
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">35+</div>
          <div className="text-xs text-foreground/50">Sequences Available</div>
        </div>
        <div className="hidden sm:block w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">35,000+</div>
          <div className="text-xs text-foreground/50">Pixels in Our Display</div>
        </div>
        <div className="hidden sm:block w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">100%</div>
          <div className="text-xs text-foreground/50">Video Previews</div>
        </div>
        <div className="hidden sm:block w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">5.0</div>
          <div className="text-xs text-foreground/50">Average Rating</div>
        </div>
      </div>
    </section>
  );
}
