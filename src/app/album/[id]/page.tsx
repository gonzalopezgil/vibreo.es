'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Disc } from 'lucide-react';
import { SpotifyIcon } from '@/components/PlatformIcons';
import { ImageModal } from '@/components/ImageModal';
import { getAlbum, getChartingAlbums, getErrorMessage } from '@/lib/api';
import { FlagIcon } from '@/components/FlagIcon';
import { getCountryName } from '@/lib/countries';

interface AlbumEntity {
  album_uri: string;
  album_name: string;
  artist_names: string;
  artist_uris: string;
  label: string;
  release_date: string;
  image_url: string;
}

interface ChartPosition {
  country: string;
  rank: number;
  weeks_on_chart: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractId(uri: string) {
  return uri.split(':').pop() || uri;
}

export default function AlbumPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();

  const [album, setAlbum] = useState<AlbumEntity | null>(null);
  const [positions, setPositions] = useState<ChartPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [albumData, chartingData] = await Promise.all([
          getAlbum<AlbumEntity>(id),
          getChartingAlbums<Record<string, ChartPosition[] | { positions?: ChartPosition[] }>>(),
        ]);
        if (cancelled) return;
        setAlbum(albumData);

        const uri = `spotify:album:${id}`;
        const raw = chartingData[uri];
        const pos: ChartPosition[] = Array.isArray(raw) ? raw : (raw?.positions || []);
        pos.sort((a: ChartPosition, b: ChartPosition) => a.rank - b.rank);
        setPositions(pos);
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load album'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-[200px] h-[200px] bg-zinc-800 rounded-xl animate-pulse" />
            <div className="w-48 h-6 bg-zinc-800 rounded animate-pulse" />
            <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !album) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error || 'Album not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-zinc-400 hover:text-zinc-200 transition">← Go back</button>
        </div>
      </main>
    );
  }

  const artistList = album.artist_names.split('|').map((name, i) => {
    const uris = album.artist_uris.split('|');
    return { name: name.trim(), id: extractId(uris[i]?.trim() || '') };
  });

  const bestRank = positions.length > 0 ? Math.min(...positions.map(p => p.rank)) : null;
  const maxWeeks = positions.length > 0 ? Math.max(...positions.map(p => p.weeks_on_chart)) : null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 pt-6 space-y-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          {album.image_url ? (
            <button
              type="button"
              onClick={() => setShowImage(true)}
              className="cursor-pointer rounded-xl"
              aria-label={`Open ${album.album_name} artwork`}
            >
              <Image
                src={album.image_url}
                alt={album.album_name}
                width={200}
                height={200}
                className="rounded-xl shadow-lg"
                priority
              />
            </button>
          ) : (
            <div className="w-[200px] h-[200px] rounded-xl bg-zinc-800 flex items-center justify-center">
              <Disc size={64} className="text-zinc-600" />
            </div>
          )}
          {showImage && album.image_url && (
            <ImageModal src={album.image_url.replace('ab67616d00001e02', 'ab67616d0000b273')} alt={album.album_name} onClose={() => setShowImage(false)} />
          )}

          <div>
            <h1 className="text-2xl font-extrabold text-zinc-100">{album.album_name}</h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
              {artistList.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && <span className="text-zinc-600">, </span>}
                  <Link
                    href={`/artist/${a.id}`}
                    className="text-base text-zinc-300 hover:text-white transition"
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {positions.length > 0 && (
              <>
                <span className="text-xs font-medium bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full">
                  Charting in {positions.length} {positions.length === 1 ? 'country' : 'countries'}
                </span>
                {bestRank !== null && (
                  <span className="text-xs font-medium bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full">
                    Best: #{bestRank}
                  </span>
                )}
                {maxWeeks !== null && maxWeeks > 0 && (
                  <span className="text-xs font-medium bg-zinc-700/50 text-zinc-300 px-2.5 py-1 rounded-full">
                    Up to {maxWeeks} {maxWeeks === 1 ? 'week' : 'weeks'} on chart
                  </span>
                )}
              </>
            )}
            {positions.length === 0 && (
              <span className="text-xs font-medium bg-zinc-700/50 text-zinc-400 px-2.5 py-1 rounded-full">
                Not currently charting
              </span>
            )}
          </div>

          {/* External link */}
          <a
            href={`https://open.spotify.com/album/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
            title="Spotify"
            aria-label="Open in Spotify"
          >
            <SpotifyIcon size={20} />
          </a>
        </div>

        {/* Details */}
        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60">Details</h2>
          <div className="divide-y divide-zinc-800/40">
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-zinc-500">Label</span>
              <span className="text-xs text-zinc-200 font-medium">{album.label || '—'}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-zinc-500">Released</span>
              <span className="text-xs text-zinc-200 font-medium">{formatDate(album.release_date)}</span>
            </div>
          </div>
        </section>

        {/* Chart positions by country */}
        {positions.length > 0 && (
          <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60 flex items-center justify-between">
              <span>Chart positions</span>
              <span className="text-xs font-normal text-zinc-500">{positions.length} {positions.length === 1 ? 'market' : 'markets'}</span>
            </h2>

            <div className="divide-y divide-zinc-800/40">
              {positions.map((pos) => (
                <Link
                  key={pos.country}
                  href={`/charts/${pos.country}/albums/latest`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition"
                >
                  <FlagIcon code={pos.country} size={20} />
                  <span className="text-sm text-zinc-300 flex-1">{getCountryName(pos.country)}</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums w-10 text-right">#{pos.rank}</span>
                  <span className="text-[11px] text-zinc-500 w-16 text-right">
                    {pos.weeks_on_chart} {pos.weeks_on_chart === 1 ? 'week' : 'weeks'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
