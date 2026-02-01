'use client';

import { useState } from 'react';
import Link from 'next/link';
import ColorChips from './ColorChips';
import ComingSoon from './ComingSoon';
import type { Song } from '@/data/songlist';

interface PlaylistTabsProps {
  halloweenSongs: Song[];
  christmasSongs: Song[];
  newFor2026: Song[];
}

function SongCard({ song }: { song: Song }) {
  // Determine the link destination
  const href = song.isOriginal && song.sequenceSlug
    ? `/sequences/${song.sequenceSlug}`
    : song.vendorUrl || '#';

  const isExternal = !song.isOriginal && song.vendorUrl;
  const hasLink = (song.isOriginal && song.sequenceSlug) || song.vendorUrl;

  // Get thumbnail: YouTube, imageUrl, or Coming Soon
  const thumbnailUrl = song.youtubeId
    ? `https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`
    : song.imageUrl || null;

  // Fallback colors based on category
  const defaultColors = song.category === 'Halloween'
    ? ['#f39c12', '#9b59b6', '#e74c3c']
    : ['#e74c3c', '#2ecc71', '#f1c40f'];

  const CardContent = (
    <div className={`bg-surface rounded-xl overflow-hidden border border-border transition-all ${hasLink ? 'card-hover cursor-pointer' : ''} group`}>
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-surface-light">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${song.title} - ${song.artist}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ComingSoon category={song.category} />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {song.yearAdded === 2026 && (
            <span className="px-2 py-1 bg-accent text-white rounded-full text-xs font-bold">
              NEW
            </span>
          )}
        </div>

        {/* Source badge */}
        <div className="absolute bottom-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            song.isOriginal
              ? 'bg-accent/90 text-white'
              : 'bg-surface/90 text-foreground/80'
          }`}>
            {song.isOriginal ? 'Original' : song.vendor}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${hasLink ? 'group-hover:text-accent transition-colors' : ''}`}>
              {song.title}
            </h3>
            <p className="text-foreground/60 text-sm truncate">{song.artist}</p>
          </div>
          {song.dominantColors && (
            <ColorChips colors={song.dominantColors} />
          )}
          {!song.dominantColors && (
            <ColorChips colors={defaultColors} />
          )}
        </div>

        {/* CTA */}
        {hasLink && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-sm text-accent flex items-center gap-1">
              {song.isOriginal ? 'View Sequence' : 'View on ' + song.vendor}
              {isExternal ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!hasLink) {
    return CardContent;
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {CardContent}
      </a>
    );
  }

  return (
    <Link href={href}>
      {CardContent}
    </Link>
  );
}

export default function PlaylistTabs({ halloweenSongs, christmasSongs, newFor2026 }: PlaylistTabsProps) {
  const [activeTab, setActiveTab] = useState<'halloween' | 'christmas'>('halloween');
  const [showAllNew, setShowAllNew] = useState(false);

  const halloweenNew = newFor2026.filter(s => s.category === 'Halloween');
  const christmasNew = newFor2026.filter(s => s.category === 'Christmas');
  const currentNew = activeTab === 'halloween' ? halloweenNew : christmasNew;
  const currentSongs = activeTab === 'halloween' ? halloweenSongs : christmasSongs;

  // Show first 3, or all if expanded
  const visibleNew = showAllNew ? currentNew : currentNew.slice(0, 3);
  const hasMoreNew = currentNew.length > 3;

  const halloweenOriginals = halloweenSongs.filter(s => s.isOriginal).length;
  const christmasOriginals = christmasSongs.filter(s => s.isOriginal).length;

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-surface rounded-xl border border-border p-1">
          <button
            onClick={() => { setActiveTab('halloween'); setShowAllNew(false); }}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'halloween'
                ? 'bg-orange-500/20 text-orange-400 font-semibold'
                : 'text-foreground/60 hover:text-foreground hover:bg-surface-light'
            }`}
          >
            <span className="text-2xl">🎃</span>
            <span>Halloween ({halloweenSongs.length})</span>
            {halloweenNew.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                {halloweenNew.length} new
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('christmas'); setShowAllNew(false); }}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'christmas'
                ? 'bg-green-500/20 text-green-400 font-semibold'
                : 'text-foreground/60 hover:text-foreground hover:bg-surface-light'
            }`}
          >
            <span className="text-2xl">🎄</span>
            <span>Christmas ({christmasSongs.length})</span>
            {christmasNew.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                {christmasNew.length} new
              </span>
            )}
          </button>
        </div>
      </div>

      {/* New for 2026 Section (filtered by active tab) */}
      {currentNew.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">✨</span>
            <h2 className="text-2xl font-bold">New for 2026</h2>
            <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
              {currentNew.length} songs
            </span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleNew.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMoreNew && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllNew(!showAllNew)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border rounded-xl text-foreground/70 hover:text-foreground transition-colors"
              >
                {showAllNew ? (
                  <>
                    Show Less
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Show {currentNew.length - 3} More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main Songs Grid */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{activeTab === 'halloween' ? '🎃' : '🎄'}</span>
          <h2 className="text-2xl font-bold">
            {activeTab === 'halloween' ? 'Halloween' : 'Christmas'}
          </h2>
          <span className="text-foreground/50 text-sm">
            {activeTab === 'halloween' ? halloweenOriginals : christmasOriginals} original / {currentSongs.length} total
          </span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      </section>
    </>
  );
}
