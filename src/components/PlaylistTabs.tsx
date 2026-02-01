'use client';

import { useState } from 'react';
import type { Song } from '@/data/songlist';

interface PlaylistTabsProps {
  halloweenSongs: Song[];
  christmasSongs: Song[];
  newFor2026: Song[];
}

function SongTable({ songs }: { songs: Song[] }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-surface-light">
            <th className="text-left p-4 font-semibold">Song</th>
            <th className="text-left p-4 font-semibold hidden md:table-cell">Artist</th>
            <th className="text-left p-4 font-semibold hidden sm:table-cell">Sequenced By</th>
            <th className="text-center p-4 font-semibold">Year</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, index) => (
            <tr
              key={song.id}
              className={`border-b border-border/50 hover:bg-surface-light transition-colors ${
                index % 2 === 0 ? '' : 'bg-surface-light/30'
              }`}
            >
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{song.title}</span>
                  {song.yearAdded === 2026 && (
                    <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-medium">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-foreground/60 text-sm md:hidden">{song.artist}</p>
              </td>
              <td className="p-4 text-foreground/70 hidden md:table-cell">{song.artist}</td>
              <td className="p-4 hidden sm:table-cell">
                {song.isOriginal ? (
                  <span className="text-accent font-medium">Lights of Elm Ridge</span>
                ) : (
                  <span className="text-foreground/60">{song.vendor}</span>
                )}
              </td>
              <td className="p-4 text-center text-foreground/60">{song.yearAdded}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlaylistTabs({ halloweenSongs, christmasSongs, newFor2026 }: PlaylistTabsProps) {
  const [activeTab, setActiveTab] = useState<'halloween' | 'christmas'>('halloween');

  const halloweenNew = newFor2026.filter(s => s.category === 'Halloween');
  const christmasNew = newFor2026.filter(s => s.category === 'Christmas');
  const currentNew = activeTab === 'halloween' ? halloweenNew : christmasNew;
  const currentSongs = activeTab === 'halloween' ? halloweenSongs : christmasSongs;

  const halloweenOriginals = halloweenSongs.filter(s => s.isOriginal).length;
  const christmasOriginals = christmasSongs.filter(s => s.isOriginal).length;

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
            <span>Halloween ({halloweenSongs.length})</span>
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
            {currentNew.map((song) => (
              <div
                key={song.id}
                className="bg-surface rounded-xl p-4 border border-accent/30 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{song.title}</h3>
                    <p className="text-foreground/60 text-sm">{song.artist}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    song.category === 'Halloween'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {song.category === 'Halloween' ? '🎃' : '🎄'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-foreground/50">
                  {song.isOriginal ? (
                    <span className="text-accent">Original sequence</span>
                  ) : (
                    <span>Sequence by {song.vendor}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Songs Table */}
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

        <SongTable songs={currentSongs} />
      </section>
    </>
  );
}
