'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Music, X } from 'lucide-react';
import { formatStreams, formatStreamsFull } from '@/lib/format';
import { SpotifyIcon, YouTubeMusicIcon, YouTubeIcon } from './PlatformIcons';

export interface ChartEntry {
  rank: number;
  uri: string;
  track_name: string;
  artist_names: string;
  artist_uris: string;
  image_url: string;
  label: string;
  streams: number;
  peak_rank: number;
  previous_rank: number;
  days_on_chart: number;
  consecutive_days: number;
  entry_status: string;
  peak_date: string;
  entry_rank: number;
  entry_date: string;
  release_date: string;
}

function formatArtists(raw: string): string {
  return raw.split('|').join(', ');
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ChangeIndicator({ entry }: { entry: ChartEntry }) {
  if (entry.entry_status === 'NEW_ENTRY' || (entry.previous_rank === 0 && entry.days_on_chart <= 1)) {
    return <span className="text-[10px] font-bold tracking-wide text-blue-400">NEW</span>;
  }
  if (entry.entry_status === 'RE_ENTRY') {
    return <span className="text-[10px] font-bold tracking-wide text-purple-400">RE</span>;
  }
  if (entry.rank < entry.previous_rank) {
    const diff = entry.previous_rank - entry.rank;
    return <span className="text-green-400 text-xs font-medium">▲{diff}</span>;
  }
  if (entry.rank > entry.previous_rank) {
    const diff = entry.rank - entry.previous_rank;
    return <span className="text-red-400 text-xs font-medium">▼{diff}</span>;
  }
  return <span className="text-zinc-500 text-xs">=</span>;
}

export function AlbumThumb({
  src,
  alt,
  size,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Music size={Math.round(size / 2.5)} className="text-zinc-600" />
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} width={size} height={size} className={`shrink-0 ${className}`} priority={priority} />
  );
}

/* ── Detail Card (expanded view) ──────────────────────────────────────── */

export function DetailCard({ song, onClose, ytLinks }: { song: ChartEntry; onClose: () => void; ytLinks?: { m?: string; v?: string; vt?: string } | null }) {
  const trackId = song.uri.split(':').pop() || '';

  return (
    <div className="border-b border-zinc-700/60 bg-zinc-900/80 px-4 py-4">
      <div className="flex items-start gap-4">
        <Link href={`/song/${trackId}`} className="shrink-0">
          {song.image_url ? (
            <Image src={song.image_url} alt={song.track_name} width={80} height={80} className="rounded-lg" />
          ) : (
            <div className="w-[80px] h-[80px] rounded-lg bg-zinc-800 flex items-center justify-center">
              <Music size={28} className="text-zinc-600" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <Link href={`/song/${trackId}`} className="text-base font-bold text-zinc-100 hover:text-white transition">
              {song.track_name}
            </Link>
            <p className="text-sm text-zinc-400">
              {song.artist_names.split('|').map((name, i) => {
                const uris = song.artist_uris.split('|');
                const artistId = (uris[i] || '').split(':').pop() || '';
                return (
                  <span key={artistId || i}>
                    {i > 0 && ', '}
                    <Link href={`/artist/${artistId}`} className="hover:text-zinc-200 transition">
                      {name.trim()}
                    </Link>
                  </span>
                );
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="text-zinc-500">Streams</span>
              <p className="text-zinc-200 font-medium">{formatStreamsFull(song.streams)}</p>
            </div>
            <div>
              <span className="text-zinc-500">Peak</span>
              <p className="text-zinc-200 font-medium">
                #{song.peak_rank}
                <span className="text-[10px] text-zinc-500 ml-1">{formatDate(song.peak_date)}</span>
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Days on chart</span>
              <p className="text-zinc-200 font-medium">
                {song.days_on_chart}
                <span className="text-[10px] text-zinc-500 ml-1">{song.consecutive_days} consecutive</span>
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Entry</span>
              <p className="text-zinc-200 font-medium">
                #{song.entry_rank}
                <span className="text-[10px] text-zinc-500 ml-1">{formatDate(song.entry_date)}</span>
              </p>
            </div>
            {song.label && (
              <div>
                <span className="text-zinc-500">Label</span>
                <p className="text-zinc-200 font-medium">{song.label}</p>
              </div>
            )}
            {song.release_date && (
              <div>
                <span className="text-zinc-500">Released</span>
                <p className="text-zinc-200 font-medium">{formatDate(song.release_date)}</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-zinc-500 hover:text-zinc-300 transition shrink-0 mt-1"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/song/${trackId}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/20 transition"
        >
          <Music size={12} />
          Song page
        </Link>
        <div className="flex gap-1.5 ml-auto">
          <a
            href={`https://open.spotify.com/track/${trackId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
            title="Spotify"
          >
            <SpotifyIcon size={16} />
          </a>
          {ytLinks?.v && (
            <a
              href={`https://www.youtube.com/watch?v=${ytLinks.v}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
              title={ytLinks.vt === 'OMV' ? 'Music Video' : 'YouTube'}
            >
              <YouTubeIcon size={16} />
            </a>
          )}
          {ytLinks?.m && (
            <a
              href={`https://music.youtube.com/watch?v=${ytLinks.m}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
              title="YouTube Music"
            >
              <YouTubeMusicIcon size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ChartRow with expandable detail ──────────────────────────────────── */

export function ChartRowExpandable({
  song,
  index,
  isExpanded,
  onToggle,
  striped = false,
  ytLinks,
}: {
  song: ChartEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  striped?: boolean;
  ytLinks?: { m?: string; v?: string; vt?: string } | null;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-800/40 ${
          striped && index % 2 === 0 ? 'bg-zinc-900/30' : ''
        } ${isExpanded ? 'bg-zinc-800/50' : ''}`}
      >
        <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
          <ChangeIndicator entry={song} />
          <span className="tabular-nums text-sm font-bold text-zinc-400">{song.rank}</span>
        </div>

        <AlbumThumb src={song.image_url} alt={song.track_name} size={40} className="rounded" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{song.track_name}</p>
          <p className="truncate text-xs text-zinc-400">{formatArtists(song.artist_names)}</p>
        </div>

        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-300">
          {formatStreams(song.streams)}
        </span>
      </div>

      {isExpanded && <DetailCard song={song} onClose={onToggle} ytLinks={ytLinks} />}
    </div>
  );
}
