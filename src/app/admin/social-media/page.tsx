"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  type Pillar,
  type Platform,
  type SocialMediaStore,
  PILLARS,
  PLATFORM_GUIDES,
  LAUNCH_STEPS,
  MULTIPLY_STEPS,
  COMMUNITY_PHASES,
  BENCHMARKS,
  getCurrentSeason,
  loadStore,
  saveStore,
  generateId,
  getWeekPosts,
  getPillarCounts,
  getSuggestion,
  getPostingTimeHint,
  getValueVsPromoRatio,
  getAllTimePosts,
  formatDate,
  todayStr,
} from "@/lib/social-media";

/* ------------------------------------------------------------------ */
/*  Collapsible Section                                                */
/* ------------------------------------------------------------------ */

function Section({
  title,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">{title}</h2>
          {badge && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`}
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
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4">{children}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pillar badge                                                       */
/* ------------------------------------------------------------------ */

function PillarBadge({ pillar }: { pillar: Pillar }) {
  const info = PILLARS.find((p) => p.key === pillar);
  if (!info) return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: info.color + "22",
        color: info.color,
      }}
    >
      {info.name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform badge                                                     */
/* ------------------------------------------------------------------ */

function PlatformBadge({ platform }: { platform: Platform }) {
  const labels: Record<Platform, string> = {
    facebook: "FB",
    youtube: "YT",
    instagram: "IG",
  };
  return (
    <span className="text-xs bg-surface-light text-foreground/60 px-2 py-0.5 rounded font-mono">
      {labels[platform]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function SocialMediaDashboard() {
  // --- State ---
  const [store, setStore] = useState<SocialMediaStore | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showPostForm, setShowPostForm] = useState(false);
  const [showLaunchForm, setShowLaunchForm] = useState(false);

  // Post form
  const [postTitle, setPostTitle] = useState("");
  const [postPlatform, setPostPlatform] = useState<Platform>("facebook");
  const [postPillar, setPostPillar] = useState<Pillar>("show-off");
  const [postDate, setPostDate] = useState(todayStr());

  // Launch form
  const [launchName, setLaunchName] = useState("");

  // Metrics form
  const [editingMetrics, setEditingMetrics] = useState(false);

  // --- Load from localStorage after hydration ---
  useEffect(() => {
    async function hydrate() {
      setStore(loadStore());
    }
    hydrate();
  }, []);

  // --- Persist helper ---
  const updateStore = useCallback(
    (updater: (prev: SocialMediaStore) => SocialMediaStore) => {
      setStore((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveStore(next);
        return next;
      });
    },
    [],
  );

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- Handlers ---

  function addPost() {
    if (!postTitle.trim()) return;
    updateStore((s) => ({
      ...s,
      posts: [
        ...s.posts,
        {
          id: generateId(),
          date: postDate,
          platform: postPlatform,
          pillar: postPillar,
          title: postTitle.trim(),
        },
      ],
    }));
    setPostTitle("");
    setShowPostForm(false);
  }

  function deletePost(id: string) {
    updateStore((s) => ({
      ...s,
      posts: s.posts.filter((p) => p.id !== id),
    }));
  }

  function startLaunch() {
    if (!launchName.trim()) return;
    const steps: Record<string, boolean> = {};
    for (const step of LAUNCH_STEPS) steps[step.key] = false;
    updateStore((s) => ({
      ...s,
      launches: [
        ...s.launches,
        {
          id: generateId(),
          sequenceName: launchName.trim(),
          createdAt: todayStr(),
          steps,
        },
      ],
    }));
    setLaunchName("");
    setShowLaunchForm(false);
    setExpanded((prev) => ({ ...prev, launches: true }));
  }

  function toggleLaunchStep(launchId: string, stepKey: string) {
    updateStore((s) => ({
      ...s,
      launches: s.launches.map((l) =>
        l.id === launchId
          ? { ...l, steps: { ...l.steps, [stepKey]: !l.steps[stepKey] } }
          : l,
      ),
    }));
  }

  function deleteLaunch(id: string) {
    updateStore((s) => ({
      ...s,
      launches: s.launches.filter((l) => l.id !== id),
    }));
  }

  function updateMetric(path: string, value: number) {
    updateStore((s) => {
      const metrics = { ...s.metrics };
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = metrics;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      metrics.lastUpdated = todayStr();
      return { ...s, metrics };
    });
  }

  // --- Loading state ---
  if (!store) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  // --- Computed ---
  const now = new Date();
  const season = getCurrentSeason(now.getMonth());
  const weekPosts = getWeekPosts(store.posts);
  const pillarCounts = getPillarCounts(weekPosts);
  const totalWeek = weekPosts.length;
  const suggestion = getSuggestion(weekPosts);
  const { value, promo } = getValueVsPromoRatio(weekPosts);
  const timeHint = getPostingTimeHint();
  const allPosts = getAllTimePosts(store.posts);
  const activeLaunches = store.launches;
  const progressPct = Math.min(100, (totalWeek / season.postsMax) * 100);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDay = dayNames[now.getDay()];
  const todayFormatted = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // --- Render ---
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-accent transition-colors mb-4"
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
            Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-1">
            Social Media Command Center
          </h1>
          <p className="text-foreground/50">
            {todayDay}, {todayFormatted}
          </p>
        </div>

        {/* Season Banner */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Current Season
                </span>
                <span className="text-xs bg-accent/20 text-accent px-2.5 py-0.5 rounded-full font-bold">
                  {season.name}
                </span>
              </div>
              <p className="text-foreground/70 text-sm">
                Focus: {season.focus}
              </p>
              <p className="text-foreground/50 text-sm mt-1">{timeHint}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {season.postsMin}&ndash;{season.postsMax}
              </div>
              <div className="text-xs text-foreground/40">posts / week</div>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">This Week</h2>
            <span className="text-sm text-foreground/50">
              {totalWeek} / {season.postsMax} posts
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-light rounded-full h-3 mb-4">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                backgroundColor:
                  totalWeek >= season.postsMin ? "#22c55e" : "#f59e0b",
              }}
            />
          </div>

          {/* Pillar distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {PILLARS.map((p) => {
              const count = pillarCounts[p.key];
              const pct =
                totalWeek > 0 ? Math.round((count / totalWeek) * 100) : 0;
              return (
                <div
                  key={p.key}
                  className="bg-surface-light rounded-lg p-2 text-center"
                >
                  <div className="text-lg font-bold" style={{ color: p.color }}>
                    {count}
                  </div>
                  <div className="text-[10px] text-foreground/50 leading-tight">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-foreground/30">
                    {pct}% / {p.target}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* 80/20 ratio */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-foreground/50">80/20 Rule:</span>
            <span className="text-foreground/70">
              {value} value <span className="text-foreground/30">/</span>{" "}
              {promo} promo
            </span>
            {totalWeek > 0 && promo / totalWeek > 0.2 && (
              <span className="text-amber-400 text-xs">
                Promo content is above 20%
              </span>
            )}
          </div>
        </div>

        {/* Smart Suggestion */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-accent mb-1">
                Next Move
              </div>
              <p className="text-sm text-foreground/80">{suggestion}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowPostForm(!showPostForm);
              setShowLaunchForm(false);
            }}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
          >
            + Log a Post
          </button>
          <button
            onClick={() => {
              setShowLaunchForm(!showLaunchForm);
              setShowPostForm(false);
            }}
            className="px-5 py-2.5 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
          >
            + Start a Launch
          </button>
        </div>

        {/* Post Form */}
        {showPostForm && (
          <div className="bg-surface rounded-xl border border-accent/30 p-5 space-y-4">
            <h3 className="font-bold">Log a Post</h3>

            {/* Date */}
            <div>
              <label
                htmlFor="post-date"
                className="block text-xs text-foreground/50 mb-1"
              >
                Date
              </label>
              <input
                id="post-date"
                type="date"
                value={postDate}
                onChange={(e) => setPostDate(e.target.value)}
                className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm w-full max-w-xs text-foreground"
              />
            </div>

            {/* Platform */}
            <div>
              <div className="block text-xs text-foreground/50 mb-2">
                Platform
              </div>
              <div className="flex gap-2">
                {(["facebook", "youtube", "instagram"] as Platform[]).map(
                  (pl) => (
                    <button
                      key={pl}
                      onClick={() => setPostPlatform(pl)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        postPlatform === pl
                          ? "bg-accent text-white"
                          : "bg-surface-light text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {pl === "facebook"
                        ? "Facebook"
                        : pl === "youtube"
                          ? "YouTube"
                          : "Instagram"}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Pillar */}
            <div>
              <div className="block text-xs text-foreground/50 mb-2">
                Content Pillar
              </div>
              <div className="flex flex-wrap gap-2">
                {PILLARS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPostPillar(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      postPillar === p.key
                        ? "text-white"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                    style={{
                      backgroundColor:
                        postPillar === p.key ? p.color : "var(--surface-light)",
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="post-title"
                className="block text-xs text-foreground/50 mb-1"
              >
                What did you post?
              </label>
              <input
                id="post-title"
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPost()}
                placeholder='e.g. "Spooky Scary Skeletons full show clip"'
                className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm w-full text-foreground placeholder:text-foreground/30"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addPost}
                disabled={!postTitle.trim()}
                className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Log Post
              </button>
              <button
                onClick={() => setShowPostForm(false)}
                className="px-5 py-2 text-foreground/50 hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Launch Form */}
        {showLaunchForm && (
          <div className="bg-surface rounded-xl border border-accent/30 p-5 space-y-4">
            <h3 className="font-bold">Start a Sequence Launch</h3>
            <p className="text-sm text-foreground/50">
              Create a launch checklist to track all the content you need to
              produce for a new sequence release.
            </p>
            <div>
              <label
                htmlFor="launch-name"
                className="block text-xs text-foreground/50 mb-1"
              >
                Sequence Name
              </label>
              <input
                id="launch-name"
                type="text"
                value={launchName}
                onChange={(e) => setLaunchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startLaunch()}
                placeholder='e.g. "The Dead Dance"'
                className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm w-full max-w-md text-foreground placeholder:text-foreground/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={startLaunch}
                disabled={!launchName.trim()}
                className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Create Launch Checklist
              </button>
              <button
                onClick={() => setShowLaunchForm(false)}
                className="px-5 py-2 text-foreground/50 hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  COLLAPSIBLE SECTIONS                                        */}
        {/* ============================================================ */}

        {/* Recent Posts */}
        <Section
          title="Post History"
          badge={`${allPosts.length} total`}
          expanded={!!expanded.posts}
          onToggle={() => toggle("posts")}
        >
          {allPosts.length === 0 ? (
            <p className="text-sm text-foreground/40">
              No posts logged yet. Use &quot;Log a Post&quot; above to start
              tracking.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allPosts.slice(0, 50).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-foreground/40 whitespace-nowrap">
                      {formatDate(post.date)}
                    </span>
                    <PlatformBadge platform={post.platform} />
                    <PillarBadge pillar={post.pillar} />
                    <span className="text-sm truncate">{post.title}</span>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-foreground/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
                    title="Delete post"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Active Launches */}
        {activeLaunches.length > 0 && (
          <Section
            title="Active Launches"
            badge={`${activeLaunches.length}`}
            expanded={!!expanded.launches}
            onToggle={() => toggle("launches")}
          >
            <div className="space-y-4">
              {activeLaunches.map((launch) => {
                const done = Object.values(launch.steps).filter(Boolean).length;
                const total = LAUNCH_STEPS.length;
                return (
                  <div
                    key={launch.id}
                    className="bg-surface-light rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold">{launch.sequenceName}</h4>
                        <span className="text-xs text-foreground/40">
                          Started {formatDate(launch.createdAt)} &middot; {done}
                          /{total} complete
                        </span>
                      </div>
                      <button
                        onClick={() => deleteLaunch(launch.id)}
                        className="text-foreground/30 hover:text-red-400 transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {LAUNCH_STEPS.map((step) => (
                        <label
                          key={step.key}
                          aria-label={step.label}
                          className="flex items-start gap-3 cursor-pointer group/step"
                        >
                          <input
                            type="checkbox"
                            checked={!!launch.steps[step.key]}
                            onChange={() =>
                              toggleLaunchStep(launch.id, step.key)
                            }
                            className="mt-0.5 accent-accent"
                          />
                          <span className="flex-1">
                            <span
                              className={`text-sm ${launch.steps[step.key] ? "text-foreground/40 line-through" : "text-foreground/80"}`}
                            >
                              {step.label}
                            </span>
                            <span className="text-xs text-foreground/30 ml-2">
                              {step.timing}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Content Ideas by Pillar */}
        <Section
          title="Content Ideas"
          expanded={!!expanded.ideas}
          onToggle={() => toggle("ideas")}
        >
          <p className="text-sm text-foreground/50 mb-4">
            The 80/20 principle: 80% value, personality, and community content
            &mdash; 20% promotional material.
          </p>
          <div className="space-y-4">
            {PILLARS.map((p) => (
              <div key={p.key}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <h4 className="font-semibold text-sm">{p.name}</h4>
                  <span className="text-xs text-foreground/40">
                    Target: {p.target}%
                  </span>
                </div>
                <p className="text-xs text-foreground/50 mb-1.5">
                  {p.description}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {p.ideas.map((idea) => (
                    <li
                      key={idea}
                      className="text-sm text-foreground/70 flex items-start gap-2"
                    >
                      <span className="text-foreground/20 mt-0.5">&bull;</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Platform Quick Reference */}
        <Section
          title="Platform Quick Reference"
          expanded={!!expanded.platforms}
          onToggle={() => toggle("platforms")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLATFORM_GUIDES.map((pl) => (
              <div key={pl.key} className="bg-surface-light rounded-lg p-4">
                <h4 className="font-bold mb-2">{pl.name}</h4>
                <ul className="space-y-1.5">
                  {pl.tips.map((tip) => (
                    <li
                      key={tip}
                      className="text-xs text-foreground/60 flex items-start gap-2"
                    >
                      <span className="text-accent mt-0.5 flex-shrink-0">
                        &bull;
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Content Multiplication */}
        <Section
          title="Content Multiplication"
          badge="1 recording = 6+ pieces"
          expanded={!!expanded.multiply}
          onToggle={() => toggle("multiply")}
        >
          <p className="text-sm text-foreground/50 mb-3">
            Every recording session should produce at least 6 pieces of content
            across platforms. Use this as a checklist for each recording.
          </p>
          <div className="space-y-2">
            {MULTIPLY_STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-surface-light rounded-lg px-3 py-2"
              >
                <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-xs text-foreground/40 font-mono">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/70">{step}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Community Engagement */}
        <Section
          title="Community Engagement Strategy"
          badge="Facebook Groups"
          expanded={!!expanded.community}
          onToggle={() => toggle("community")}
        >
          <p className="text-sm text-foreground/50 mb-4">
            Three-phase approach for Facebook groups. Never skip phases &mdash;
            trust is earned, not bought.
          </p>
          <div className="space-y-3">
            {COMMUNITY_PHASES.map((phase) => (
              <div
                key={phase.phase}
                className="bg-surface-light rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">
                    {phase.phase}
                  </span>
                  <h4 className="font-semibold text-sm">{phase.name}</h4>
                  <span className="text-xs text-foreground/40">
                    {phase.weeks}
                  </span>
                </div>
                <p className="text-sm text-foreground/60 ml-8">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-accent/5 border border-accent/10 rounded-lg p-3">
            <p className="text-xs text-foreground/50">
              <span className="font-semibold text-accent">
                Anti-spam rules:
              </span>{" "}
              Never mass-post promotional content. Never post links within your
              first month in a group. Never create thinly-veiled advertisements.
            </p>
          </div>
        </Section>

        {/* Performance Goals */}
        <Section
          title="Year-One Performance Goals"
          expanded={!!expanded.goals}
          onToggle={() => toggle("goals")}
        >
          <p className="text-sm text-foreground/50 mb-4">
            Realistic year-one benchmarks for the xLights niche. Track your
            current numbers against targets.
          </p>

          <div className="space-y-3">
            {Object.entries(BENCHMARKS).map(([key, benchmark]) => {
              // Map benchmark keys to metric paths
              let currentValue = 0;
              let metricPath = "";
              switch (key) {
                case "facebookFollowers":
                  currentValue = store.metrics.facebook.followers;
                  metricPath = "facebook.followers";
                  break;
                case "youtubeSubscribers":
                  currentValue = store.metrics.youtube.subscribers;
                  metricPath = "youtube.subscribers";
                  break;
                case "youtubeTopViews":
                  currentValue = store.metrics.youtube.topViews;
                  metricPath = "youtube.topViews";
                  break;
                case "instagramFollowers":
                  currentValue = store.metrics.instagram.followers;
                  metricPath = "instagram.followers";
                  break;
                case "instagramTopReelViews":
                  currentValue = store.metrics.instagram.topReelViews;
                  metricPath = "instagram.topReelViews";
                  break;
              }

              return (
                <div
                  key={key}
                  className="flex items-center justify-between bg-surface-light rounded-lg px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{benchmark.label}</div>
                    <div className="text-xs text-foreground/40">
                      Target: {benchmark.target}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingMetrics ? (
                      <input
                        type="number"
                        min={0}
                        value={currentValue}
                        onChange={(e) =>
                          updateMetric(
                            metricPath,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="bg-surface border border-border rounded px-2 py-1 text-sm w-24 text-right text-foreground"
                      />
                    ) : (
                      <span className="text-lg font-bold text-foreground">
                        {currentValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setEditingMetrics(!editingMetrics)}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {editingMetrics ? "Done Editing" : "Update Numbers"}
            </button>
            {store.metrics.lastUpdated && (
              <span className="text-xs text-foreground/30">
                Last updated: {formatDate(store.metrics.lastUpdated)}
              </span>
            )}
          </div>
        </Section>

        {/* Brand Voice Reminder */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="font-bold text-sm mb-2 text-foreground/60">
            Brand Voice Reminder
          </h3>
          <p className="text-sm text-foreground/50">
            Knowledgeable but approachable &mdash; an enthusiast who takes the
            craft seriously without pretension. Dark backgrounds, white text,
            red accents. Avoid bright filters, clip art, and stock photos.
            Prioritize high-contrast nighttime footage.
          </p>
        </div>

        {/* Back Link */}
        <div className="text-center pt-4 pb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm"
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
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
