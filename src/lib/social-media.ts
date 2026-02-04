// Social Media Marketing Agent — Data, Types & Helpers
// All data persists in localStorage. No server calls needed.

// --- Types ---

export type Pillar =
  | "show-off"
  | "behind-scenes"
  | "knowledge"
  | "community"
  | "product";

export type Platform = "facebook" | "youtube" | "instagram";

export interface PostEntry {
  id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  pillar: Pillar;
  title: string;
}

export interface LaunchEntry {
  id: string;
  sequenceName: string;
  createdAt: string;
  steps: Record<string, boolean>;
}

export interface PlatformMetrics {
  facebook: { followers: number };
  youtube: { subscribers: number; topViews: number };
  instagram: { followers: number; topReelViews: number };
  lastUpdated: string;
}

export interface SocialMediaStore {
  posts: PostEntry[];
  launches: LaunchEntry[];
  metrics: PlatformMetrics;
}

// --- Season Logic ---

export interface SeasonInfo {
  name: string;
  postsMin: number;
  postsMax: number;
  focus: string;
}

export function getCurrentSeason(month: number): SeasonInfo {
  if (month <= 2)
    return {
      name: "Off-Season",
      postsMin: 1,
      postsMax: 2,
      focus: "Planning and knowledge sharing",
    };
  if (month <= 5)
    return {
      name: "Build Season",
      postsMin: 2,
      postsMax: 3,
      focus: "Construction and sequencing progress",
    };
  if (month <= 8)
    return {
      name: "Peak Sequencing",
      postsMin: 3,
      postsMax: 4,
      focus: "Heavy behind-the-scenes content",
    };
  if (month === 9)
    return {
      name: "Halloween Shows",
      postsMin: 4,
      postsMax: 5,
      focus: "Performance footage and reactions",
    };
  if (month === 10)
    return {
      name: "Transition",
      postsMin: 3,
      postsMax: 4,
      focus: "Halloween-to-Christmas changeover",
    };
  return {
    name: "Christmas Shows",
    postsMin: 4,
    postsMax: 5,
    focus: "Performance footage and reactions",
  };
}

// --- Content Pillars ---

export interface PillarInfo {
  key: Pillar;
  name: string;
  target: number;
  color: string;
  description: string;
  ideas: string[];
}

export const PILLARS: PillarInfo[] = [
  {
    key: "show-off",
    name: "Show Off",
    target: 30,
    color: "#dc2626",
    description: "Display footage, drone shots, viewer reactions",
    ideas: [
      "Full show recording (drone or ground level)",
      "Single-song highlight clip",
      "Audience reaction compilation",
      "Time-lapse of the show running",
      "Side-by-side: xLights preview vs real display",
      "Slow-motion prop close-ups",
    ],
  },
  {
    key: "behind-scenes",
    name: "Behind the Scenes",
    target: 25,
    color: "#f97316",
    description: "Sequencing work, setup progress, problem-solving",
    ideas: [
      "Screen recording of sequencing in xLights",
      "New prop unboxing or assembly",
      "Troubleshooting a problem (with solution)",
      "Setup day time-lapse",
      "Cable management or wiring close-up",
      "Testing new effects at night",
    ],
  },
  {
    key: "knowledge",
    name: "Knowledge Share",
    target: 20,
    color: "#3b82f6",
    description: "Tips, reviews, effect breakdowns, lessons learned",
    ideas: [
      "Quick tip: a sequencing technique",
      "Hardware review (controller, prop, etc.)",
      "Effect breakdown: how I created this effect",
      "What I learned after a season",
      "Comparison: two approaches to the same effect",
      "Beginner guide to getting started",
    ],
  },
  {
    key: "community",
    name: "Community",
    target: 10,
    color: "#22c55e",
    description: "Reposts, challenges, holiday themes",
    ideas: [
      "Share or react to another display's video",
      "Holiday countdown or themed post",
      "Ask followers: what songs to sequence next?",
      "Feature a viewer photo or video at your show",
      "Respond to a community discussion topic",
      "Shout out a fellow display creator",
    ],
  },
  {
    key: "product",
    name: "Product",
    target: 15,
    color: "#a855f7",
    description: "Sequence launches, previews, sales events",
    ideas: [
      "Sequence preview clip (teaser)",
      "Full launch announcement with link",
      "Behind-the-scenes of creating a sequence",
      "Customer showcase of their display",
      "Bundle or seasonal sale announcement",
      "Free sequence giveaway",
    ],
  },
];

// --- Platform Guides ---

export interface PlatformGuide {
  key: Platform;
  name: string;
  tips: string[];
}

export const PLATFORM_GUIDES: PlatformGuide[] = [
  {
    key: "facebook",
    name: "Facebook",
    tips: [
      "Upload videos natively \u2014 never post YouTube links",
      "Respond to comments within 24 hours",
      "Use conversational captions (talk TO people)",
      "Pin an introductory post about the display",
      "Best times: 7\u20139 PM weekdays, 10 AM\u2013noon weekends (CT)",
    ],
  },
  {
    key: "youtube",
    name: "YouTube",
    tips: [
      'Title: "[Song] by [Artist] | xLights Pixel Light Show [Year]"',
      "Create playlists by season and content type",
      "Use YouTube Shorts to repurpose best clips",
      "Include keywords + website link in descriptions",
      "Strong opening hook in first 3 seconds",
    ],
  },
  {
    key: "instagram",
    name: "Instagram",
    tips: [
      "Prioritize Reels (30\u201360 sec with strong hook)",
      "Use Stories during show season for daily updates",
      "Limit hashtags to 3\u20135 targeted tags",
      "Link in bio to sequences catalog",
      "Dark background aesthetic matches the brand",
    ],
  },
];

// --- Launch Workflow ---

export interface LaunchStep {
  key: string;
  label: string;
  timing: string;
}

export const LAUNCH_STEPS: LaunchStep[] = [
  {
    key: "teaser",
    label: "Post teaser clip (10 sec, no song reveal)",
    timing: "3\u20135 days before",
  },
  {
    key: "youtube",
    label: "Upload full preview to YouTube",
    timing: "Launch day",
  },
  {
    key: "facebookNative",
    label: "Upload native video to Facebook",
    timing: "Launch day",
  },
  {
    key: "instagramReel",
    label: "Post Instagram Reel (30\u201360 sec)",
    timing: "Launch day",
  },
  {
    key: "youtubeShort",
    label: "Upload YouTube Short",
    timing: "Launch day",
  },
  {
    key: "instagramStory",
    label: "Post Instagram Story teaser",
    timing: "Launch day",
  },
  {
    key: "facebookStory",
    label: "Post Facebook Story teaser",
    timing: "Launch day",
  },
  {
    key: "followUp",
    label: "Follow-up post about sequencing process",
    timing: "2\u20133 days after",
  },
];

// --- Content Multiplication ---

export const MULTIPLY_STEPS = [
  "Full YouTube upload",
  "Instagram Reel (30\u201360 sec)",
  "Facebook native video",
  "Instagram Story teaser",
  "Facebook Story teaser",
  "YouTube Short",
];

// --- Community Engagement Phases ---

export const COMMUNITY_PHASES = [
  {
    phase: 1,
    name: "Lurk & Learn",
    weeks: "Weeks 1\u20132",
    description:
      "Join groups, read posts, understand the culture. Do not post or promote.",
  },
  {
    phase: 2,
    name: "Be Helpful",
    weeks: "Weeks 3\u20136",
    description:
      "Answer questions genuinely. Share knowledge without links. Build reputation.",
  },
  {
    phase: 3,
    name: "Promote Naturally",
    weeks: "Week 7+",
    description:
      "Share your work when organically relevant. Never mass-post promotional links.",
  },
];

// --- Year-One Benchmarks ---

export const BENCHMARKS: Record<string, { label: string; target: string }> = {
  facebookFollowers: { label: "Facebook Followers", target: "200\u2013500" },
  youtubeSubscribers: {
    label: "YouTube Subscribers",
    target: "100\u2013300",
  },
  youtubeTopViews: {
    label: "YouTube Best Video Views",
    target: "1,000+",
  },
  instagramFollowers: {
    label: "Instagram Followers",
    target: "300\u2013800",
  },
  instagramTopReelViews: {
    label: "Instagram Top Reel Views",
    target: "5,000+",
  },
};

// --- 80/20 Rule ---

export function getValueVsPromoRatio(posts: PostEntry[]): {
  value: number;
  promo: number;
} {
  const promo = posts.filter((p) => p.pillar === "product").length;
  return { value: posts.length - promo, promo };
}

// --- localStorage ---

const STORAGE_KEY = "loer-social-media";

function getDefaultStore(): SocialMediaStore {
  return {
    posts: [],
    launches: [],
    metrics: {
      facebook: { followers: 0 },
      youtube: { subscribers: 0, topViews: 0 },
      instagram: { followers: 0, topReelViews: 0 },
      lastUpdated: "",
    },
  };
}

export function loadStore(): SocialMediaStore {
  if (typeof window === "undefined") return getDefaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStore();
    return { ...getDefaultStore(), ...JSON.parse(raw) };
  } catch {
    return getDefaultStore();
  }
}

export function saveStore(store: SocialMediaStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// --- Utilities ---

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getWeekBounds(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function getWeekPosts(posts: PostEntry[]): PostEntry[] {
  const { start, end } = getWeekBounds();
  return posts.filter((p) => p.date >= start && p.date < end);
}

export function getAllTimePosts(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPillarCounts(posts: PostEntry[]): Record<Pillar, number> {
  const counts: Record<Pillar, number> = {
    "show-off": 0,
    "behind-scenes": 0,
    knowledge: 0,
    community: 0,
    product: 0,
  };
  for (const p of posts) counts[p.pillar]++;
  return counts;
}

export function getSuggestion(posts: PostEntry[]): string {
  if (posts.length === 0) {
    return "Start your week with a Show Off post \u2014 display footage always performs well.";
  }

  const counts = getPillarCounts(posts);
  const total = posts.length;

  let maxGap = -Infinity;
  let suggestedPillar: PillarInfo = PILLARS[0];

  for (const p of PILLARS) {
    const actual = (counts[p.key] / total) * 100;
    const gap = p.target - actual;
    if (gap > maxGap) {
      maxGap = gap;
      suggestedPillar = p;
    }
  }

  if (maxGap <= 5) {
    return "Your content mix is well balanced this week. Keep it up!";
  }

  const idea =
    suggestedPillar.ideas[
      Math.floor(Math.random() * suggestedPillar.ideas.length)
    ];
  return `Your "${suggestedPillar.name}" pillar needs attention. Try: ${idea}`;
}

export function getPostingTimeHint(): string {
  const day = new Date().getDay();
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday
    ? "Best posting window today: 7\u20139 PM Central"
    : "Best posting window today: 10 AM\u201312 PM Central";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
