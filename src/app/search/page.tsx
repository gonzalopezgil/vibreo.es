'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, Music, Disc3, User, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, searchAll } from '@/lib/api';

type SearchItemType = 'song' | 'artist' | 'album';

interface SearchResultItem {
  type: SearchItemType;
  uri: string;
  title: string;
  subtitle: string;
  image_url: string;
  score: number;
}

interface SearchResponse {
  query: string;
  topResult: SearchResultItem | null;
  artists: SearchResultItem[];
  songs: SearchResultItem[];
  albums: SearchResultItem[];
  meta: {
    interpretedIntent: 'artist' | 'song' | 'album' | 'mixed';
    totalCandidates: number;
  };
}

interface LegacySearchItem {
  n: string;
  u: string;
  t: SearchItemType;
}

function getHref(item: SearchResultItem) {
  const id = item.uri.split(':').pop() || item.uri;
  if (item.type === 'artist') return `/artist/${id}`;
  if (item.type === 'album') return `/album/${id}`;
  return `/song/${id}`;
}

function normalizeLegacyResponse(raw: SearchResponse | LegacySearchItem[], query: string): SearchResponse {
  if (!Array.isArray(raw)) return raw;

  const items: SearchResultItem[] = raw.map((item, index) => {
    const isSong = item.t === 'song';
    const [title, ...rest] = item.n.split(' - ');
    return {
      type: item.t,
      uri: item.u,
      title: isSong ? title : item.n,
      subtitle: isSong ? rest.join(' - ') : '',
      image_url: '',
      score: raw.length - index,
    };
  });

  const artists = items.filter((item) => item.type === 'artist').slice(0, 5);
  const songs = items.filter((item) => item.type === 'song').slice(0, 8);
  const albums = items.filter((item) => item.type === 'album').slice(0, 5);

  return {
    query,
    topResult: items[0] || null,
    artists,
    songs,
    albums,
    meta: {
      interpretedIntent: 'mixed',
      totalCandidates: items.length,
    },
  };
}

function ResultTypeBadge({ type }: { type: SearchItemType }) {
  const label = type === 'artist' ? 'Artist' : type === 'album' ? 'Album' : 'Song';
  return (
    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      {label}
    </span>
  );
}

function ResultArtwork({ item, size = 56 }: { item: SearchResultItem; size?: number }) {
  const icon = item.type === 'artist'
    ? <User size={size * 0.42} className="text-zinc-500" />
    : item.type === 'album'
      ? <Disc3 size={size * 0.42} className="text-zinc-500" />
      : <Music size={size * 0.42} className="text-zinc-500" />;

  if (!item.image_url) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-zinc-800 ${item.type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}
        style={{ width: size, height: size }}
      >
        {icon}
      </div>
    );
  }

  return (
    <Image
      src={item.image_url}
      alt={item.title}
      width={size}
      height={size}
      className={`${item.type === 'artist' ? 'rounded-full' : 'rounded-xl'} object-cover shrink-0`}
      style={{ width: size, height: size }}
    />
  );
}

function TopResultCard({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={getHref(item)}
      className="block rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-center gap-4">
        <ResultArtwork item={item} size={88} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Top result</p>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-zinc-100">{item.title}</h2>
          {item.subtitle && <p className="mt-1 truncate text-sm text-zinc-400">{item.subtitle}</p>}
          <div className="mt-3 flex items-center gap-2">
            <ResultTypeBadge type={item.type} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ResultRow({ item }: { item: SearchResultItem }) {
  return (
    <li>
      <Link
        href={getHref(item)}
        className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-zinc-900/80"
      >
        <ResultArtwork item={item} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{item.title}</p>
          {item.subtitle && <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>}
        </div>
        <ResultTypeBadge type={item.type} />
      </Link>
    </li>
  );
}

function ResultSection({ title, items }: { title: string; items: SearchResultItem[] }) {
  if (!items.length) return null;
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-lg font-bold text-zinc-100">{title}</h3>
        <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-zinc-600">Top matches</span>
      </div>
      <ul className="min-w-0 space-y-1 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-2">
        {items.map((item) => (
          <ResultRow key={`${item.type}:${item.uri}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      latestRequestRef.current += 1;
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++latestRequestRef.current;
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchAll(trimmed) as SearchResponse | LegacySearchItem[];
        if (latestRequestRef.current !== requestId) return;
        setResults(normalizeLegacyResponse(data, trimmed));
      } catch (err: unknown) {
        if (latestRequestRef.current !== requestId) return;
        setError(getErrorMessage(err, 'Search failed'));
      } finally {
        if (latestRequestRef.current === requestId) setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [query]);

  const topKey = results?.topResult ? `${results.topResult.type}:${results.topResult.uri}` : null;

  const sections = useMemo(() => {
    if (!results) return { artists: [], songs: [], albums: [] };
    const filterTop = (items: SearchResultItem[]) => items.filter((item) => `${item.type}:${item.uri}` !== topKey);
    return {
      artists: filterTop(results.artists),
      songs: filterTop(results.songs),
      albums: filterTop(results.albums),
    };
  }, [results, topKey]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Search</p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Find songs, artists and albums</h1>
          <p className="text-sm text-zinc-500">Search the VIBREO catalog.</p>
        </header>

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists or albums"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 pl-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700"
          />
          {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
        </div>

        {!query.trim() && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 px-5 py-8 text-sm text-zinc-500">
            Start typing to search the VIBREO catalog.
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-900/40 bg-red-950/30 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {results && !results.topResult && !results.artists.length && !results.songs.length && !results.albums.length && !loading && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 px-5 py-8 text-sm text-zinc-500">
            No results for “{query.trim()}”.
          </div>
        )}

        {results && (results.topResult || results.artists.length || results.songs.length || results.albums.length) && (
          <div className="space-y-8">
            {results.topResult && <TopResultCard item={results.topResult} />}
            <ResultSection title="Songs" items={sections.songs} />
            <ResultSection title="Artists" items={sections.artists} />
            <ResultSection title="Albums" items={sections.albums} />
          </div>
        )}
      </div>
    </main>
  );
}
