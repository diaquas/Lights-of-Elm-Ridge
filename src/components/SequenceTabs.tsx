'use client';

import { useState } from 'react';
import Link from 'next/link';
import ComingSoon from './ComingSoon';
import type { Sequence } from '@/data/sequences';

interface SequenceTabsProps {
  halloweenSequences: Sequence[];
  christmasSequences: Sequence[];
  newFor2026: Sequence[];
}

function SequenceCard({ sequence }: { sequence: Sequence }) {
  return (
    <Link
      href={`/sequences/${sequence.slug}`}
      className="bg-surface rounded-xl overflow-hidden border border-border card-hover group block"
    >
      {/* Video Preview */}
      <div className="aspect-video relative overflow-hidden bg-surface-light">
        {sequence.youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${sequence.youtubeId}`}
            title={`${sequence.title} - ${sequence.artist}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <ComingSoon category={sequence.category} />
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            sequence.price === 0
              ? 'bg-green-500 text-white'
              : 'bg-accent text-white'
          }`}>
            {sequence.price === 0 ? 'FREE' : `$${sequence.price}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
              {sequence.title}
            </h3>
            {sequence.yearAdded === 2026 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                NEW
              </span>
            )}
          </div>
          <p className="text-foreground/60 text-sm">{sequence.artist}</p>
        </div>

        <p className="text-foreground/50 text-sm mb-3 line-clamp-2">
          {sequence.description}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
            {sequence.duration}
          </span>
          <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
            {sequence.difficulty}
          </span>
          {sequence.hasMatrix && (
            <span className="px-2 py-1 bg-accent/20 rounded text-xs text-accent">
              Matrix
            </span>
          )}
        </div>

        {/* CTA */}
        <span className="block w-full py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm font-medium text-center">
          View Details →
        </span>
      </div>
    </Link>
  );
}

export default function SequenceTabs({ halloweenSequences, christmasSequences, newFor2026 }: SequenceTabsProps) {
  const [activeTab, setActiveTab] = useState<'halloween' | 'christmas'>('halloween');

  const halloweenNew = newFor2026.filter(s => s.category === 'Halloween');
  const christmasNew = newFor2026.filter(s => s.category === 'Christmas');
  const currentNew = activeTab === 'halloween' ? halloweenNew : christmasNew;
  const currentSequences = activeTab === 'halloween' ? halloweenSequences : christmasSequences;

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-surface rounded-xl border border-border p-1">
          <button
            onClick={() => setActiveTab('halloween')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'halloween'
                ? 'bg-orange-500/20 text-orange-400 font-semibold'
                : 'text-foreground/60 hover:text-foreground hover:bg-surface-light'
            }`}
          >
            <span className="text-2xl">🎃</span>
            <span>Halloween ({halloweenSequences.length})</span>
            {halloweenNew.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                {halloweenNew.length} new
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('christmas')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'christmas'
                ? 'bg-green-500/20 text-green-400 font-semibold'
                : 'text-foreground/60 hover:text-foreground hover:bg-surface-light'
            }`}
          >
            <span className="text-2xl">🎄</span>
            <span>Christmas ({christmasSequences.length})</span>
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
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl">✨</span>
            <div>
              <h2 className="text-3xl font-bold">New for 2026</h2>
              <p className="text-foreground/60">Fresh {activeTab} sequences added this season</p>
            </div>
            <span className="ml-auto px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-medium">
              {currentNew.length} new
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentNew.map((sequence) => (
              <SequenceCard key={sequence.id} sequence={sequence} />
            ))}
          </div>
        </section>
      )}

      {/* Main Sequences Grid */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-4xl">{activeTab === 'halloween' ? '🎃' : '🎄'}</span>
          <div>
            <h2 className="text-3xl font-bold">
              {activeTab === 'halloween' ? 'Halloween' : 'Christmas'} Sequences
            </h2>
            <p className="text-foreground/60">
              {activeTab === 'halloween'
                ? 'Spooky, fun, and everything in between'
                : 'Holiday magic for your display'
              }
            </p>
          </div>
        </div>

        {currentSequences.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentSequences.map((sequence) => (
              <SequenceCard key={sequence.id} sequence={sequence} />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-8 border border-border text-center">
            <span className="text-6xl block mb-4">🎅</span>
            <h3 className="text-xl font-semibold mb-2">Coming This Fall</h3>
            <p className="text-foreground/60 max-w-md mx-auto">
              Christmas sequences are in production and will be available before the season starts.
              Check back soon!
            </p>
          </div>
        )}
      </section>
    </>
  );
}
