'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Loader2, Search, User, X } from 'lucide-react';
import { FlagIcon } from '@/components/FlagIcon';
import { SpotifyIcon } from '@/components/PlatformIcons';
import { VideoHero } from '@/components/VideoHero';
import {
  getArtistListener,
  getChartingArtists,
  getChartingListenersPage,
  getErrorMessage,
  getHeroVideoUrl,
  getYouTubeLinks,
  searchAll,
  type ListenerChartEntry,
  type YouTubeLinks,
} from '@/lib/api';
import { formatStreams } from '@/lib/format';

const PAGE_SIZE = 100;
const SEARCH_RESULT_LIMIT = 10;

type SearchResultItem = NonNullable<Awaited<ReturnType<typeof searchAll>>['topResult']>;

interface ChartingArtistSong {
  track_uri: string;
}

interface ChartingArtistData {
  songs?: ChartingArtistSong[];
}

function formatSignedCompact(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatStreams(Math.abs(value))}`;
}

function extractId(uri: string) {
  return uri.split(':').pop() || uri;
}

function getListenerHeroVideoTrackId(
  listenerEntries: ListenerChartEntry[],
  chartingArtistsData: Record<string, ChartingArtistData>,
  ytData: YouTubeLinks,
) {
  for (const entry of listenerEntries) {
    const sourceSong = chartingArtistsData[entry.artist_uri]?.songs?.find((song) => ytData[song.track_uri]?.v);
    if (sourceSong) return extractId(sourceSong.track_uri);
  }
  return null;
}

function RankChangeIndicator({ entry }: { entry: ListenerChartEntry }) {
  if (typeof entry.previous_rank !== 'number' || entry.previous_rank <= 0) {
    return <span className="text-zinc-500 text-xs">-</span>;
  }
  if (entry.rank < entry.previous_rank) {
    return <span className="text-green-400 text-xs font-medium">▲{entry.previous_rank - entry.rank}</span>;
  }
  if (entry.rank > entry.previous_rank) {
    return <span className="text-red-400 text-xs font-medium">▼{entry.rank - entry.previous_rank}</span>;
  }
  return <span className="text-zinc-500 text-xs">=</span>;
}

function isListenerPeak(entry: ListenerChartEntry) {
  return typeof entry.peak_listeners === 'number' && entry.peak_listeners > 0 && entry.listeners >= entry.peak_listeners;
}

function isRankPeak(entry: ListenerChartEntry) {
  return typeof entry.peak_rank === 'number' && entry.peak_rank > 0 && entry.rank <= entry.peak_rank;
}

function getPeakLabelClass(isAtPeak: boolean) {
  return `text-[11px] font-normal ${isAtPeak ? 'text-amber-300' : 'text-zinc-500'}`;
}

function getListenerValueClass(isAtPeak: boolean) {
  return `text-sm font-bold tabular-nums ${isAtPeak ? 'text-amber-300' : 'text-zinc-100'}`;
}

function formatPeakLabel(isAtPeak: boolean, peakValue: string) {
  return isAtPeak ? 'Peak' : `Peak ${peakValue}`;
}

function ListenerChartRow({
  entry,
  index,
}: {
  entry: ListenerChartEntry;
  index: number;
}) {
  return (
    <Link
      href={`/artist/${entry.artist_id}`}
      className={`flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/40 ${
        index % 2 === 0 ? 'bg-zinc-900/30' : ''
      }`}
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
        <RankChangeIndicator entry={entry} />
        <span className={`tabular-nums text-sm font-bold ${isRankPeak(entry) ? 'text-amber-300' : 'text-zinc-400'}`}>
          {entry.rank}
        </span>
      </div>

      {entry.image_url ? (
        <Image
          src={entry.image_url}
          alt={entry.artist_name}
          width={40}
          height={40}
          className="shrink-0 rounded-full object-cover"
          loading={index === 0 ? 'eager' : 'lazy'}
          style={{ width: 40, height: 40 }}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <User size={16} className="text-zinc-600" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{entry.artist_name || entry.artist_id}</p>
        <p className="text-xs text-zinc-500">{formatSignedCompact(entry.daily_change)} daily</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={getListenerValueClass(isListenerPeak(entry))}>{formatStreams(entry.listeners)}</p>
        {entry.peak_listeners > 0 && (
          <p className={getPeakLabelClass(isListenerPeak(entry))}>
            {formatPeakLabel(isListenerPeak(entry), formatStreams(entry.peak_listeners))}
          </p>
        )}
      </div>
    </Link>
  );
}

function ListenerRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 ${
        index % 2 === 0 ? 'bg-zinc-900/30' : ''
      }`}
    >
      <div className="h-4 w-8 shrink-0 animate-pulse rounded bg-zinc-800" />
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-800" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-36 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-zinc-800" />
    </div>
  );
}

function HeroHighlightSkeleton() {
  return (
    <div
      data-testid="listener-hero-highlight"
      aria-hidden="true"
      className="mt-4 flex min-h-[52px] items-center gap-3"
    >
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-zinc-800/80" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/80" />
        <div className="h-3.5 w-36 animate-pulse rounded bg-zinc-800/80" />
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/80" />
      </div>
    </div>
  );
}

export default function ListenerChartPage() {
  const [entries, setEntries] = useState<ListenerChartEntry[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ListenerChartEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [heroVideoTrackId, setHeroVideoTrackId] = useState<string | null>(null);
  const latestSearchRef = useRef(0);

  async function loadPage(offset: number) {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const page = await getChartingListenersPage({ limit: PAGE_SIZE, offset });
      setEntries((current) => (offset === 0 ? page.items : [...current, ...page.items]));
      setNextOffset(page.nextOffset);

      if (offset === 0) {
        const [chartingArtistsData, ytData] = await Promise.all([
          getChartingArtists<Record<string, ChartingArtistData>>().catch(() => ({} as Record<string, ChartingArtistData>)),
          getYouTubeLinks().catch(() => ({} as YouTubeLinks)),
        ]);

        setHeroVideoTrackId(getListenerHeroVideoTrackId(page.items, chartingArtistsData, ytData));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load listener chart'));
    } finally {
      if (offset === 0) setLoading(false);
      else setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadPage(0);
  }, []);

  useEffect(() => {
    const trimmed = filterQuery.trim();
    if (!trimmed) {
      latestSearchRef.current += 1;
      setSearchResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const requestId = ++latestSearchRef.current;
    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);

        const data = await searchAll(trimmed);
        if (latestSearchRef.current !== requestId) return;

        const seen = new Set<string>();
        const artistCandidates: SearchResultItem[] = [];
        const pushArtist = (item: SearchResultItem | null) => {
          if (!item || item.type !== 'artist' || seen.has(item.uri)) return;
          seen.add(item.uri);
          artistCandidates.push(item);
        };

        pushArtist(data.topResult);
        data.artists.forEach(pushArtist);

        const listenerRows = await Promise.all(
          artistCandidates.slice(0, SEARCH_RESULT_LIMIT).map((item) => (
            getArtistListener(extractId(item.uri)).catch(() => null)
          )),
        );
        if (latestSearchRef.current !== requestId) return;

        setSearchResults(listenerRows.filter((entry): entry is ListenerChartEntry => Boolean(entry)));
      } catch (err: unknown) {
        if (latestSearchRef.current !== requestId) return;
        setSearchResults([]);
        setSearchError(getErrorMessage(err, 'Search failed'));
      } finally {
        if (latestSearchRef.current === requestId) setSearching(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [filterQuery]);

  const hasQuery = filterQuery.trim().length > 0;
  const topEntry = entries[0] || null;
  const displayEntries = hasQuery ? (searchResults ?? []) : entries;
  const heroVideoSrc = heroVideoTrackId ? getHeroVideoUrl(heroVideoTrackId) : null;

  return (
    <main className="min-h-screen pb-24">
      <VideoHero
        videoSrc={heroVideoSrc}
        className="z-20"
        allowOverflow
        fallbackClassName="bg-zinc-950"
        overlayClassName="bg-gradient-to-b from-black/70 via-black/50 to-zinc-950/90"
        fallbackMedia={topEntry?.image_url ? (
          <Image
            src={topEntry.image_url}
            alt=""
            fill
            sizes="100vw"
            className="blur-3xl scale-110 opacity-35 object-cover absolute inset-0 z-0"
            aria-hidden="true"
            loading="eager"
          />
        ) : null}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-8 pb-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/charts"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/60 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
            >
              <ChevronLeft size={16} />
              All charts
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-zinc-300">
              <FlagIcon code="global" size={16} />
              Global
            </div>
          </div>

          <header>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              <SpotifyIcon size={14} />
              Spotify Monthly Listeners
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-100">
              Monthly Listeners
            </h1>

            {loading ? (
              <HeroHighlightSkeleton />
            ) : topEntry && (
              <div data-testid="listener-hero-highlight" className="mt-4 flex min-h-[52px] items-center gap-3">
                {topEntry.image_url ? (
                  <Image
                    src={topEntry.image_url}
                    alt={topEntry.artist_name}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full object-cover shadow-lg"
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800/80 shadow-lg">
                    <User size={18} className="text-zinc-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">#1 right now</p>
                  <p className="truncate text-sm font-bold text-zinc-100">{topEntry.artist_name || topEntry.artist_id}</p>
                  <p className="text-xs text-zinc-400">{formatStreams(topEntry.listeners)} monthly listeners</p>
                </div>
              </div>
            )}
          </header>

          {(loading || entries.length > 0) && (
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search artists"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-80"
              />
              {searching && (
                <Loader2
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-500"
                />
              )}
              {filterQuery && !loading && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear listener search"
                  className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300 ${
                    searching ? 'right-9' : 'right-3'
                  }`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </VideoHero>

      {error && (
        <div className="mx-auto mt-6 w-full max-w-3xl px-4">
          <div className="text-center space-y-3 py-12">
            <p className="text-zinc-400 text-sm">Couldn&apos;t load listener chart right now.</p>
            <p className="text-xs text-red-300">{error}</p>
            <button onClick={() => window.location.reload()} className="text-sm text-zinc-500 hover:text-zinc-200 transition underline">Try again</button>
          </div>
        </div>
      )}

      {searchError && !error && (
        <div className="mx-auto mt-4 w-full max-w-3xl px-4 text-sm text-red-300">
          {searchError}
        </div>
      )}

      {!error && (
        <section className="mx-auto mt-0 w-full max-w-3xl min-h-0 px-0 sm:px-4">
          <div
            data-testid="listener-chart-table"
            className="overflow-hidden rounded-none border-y border-zinc-800/60 sm:rounded-2xl sm:border"
          >
            <div className="flex items-center gap-3 border-b border-zinc-700/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span className="w-8 shrink-0 text-center">#</span>
              <span className="flex-1">Artist</span>
              <span className="w-28 shrink-0 text-right sm:w-36">Listeners</span>
            </div>

            {loading
              ? Array.from({ length: 20 }).map((_, index) => (
                <ListenerRowSkeleton key={index} index={index} />
              ))
              : searching
                ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    Searching all artists...
                  </div>
                )
                : displayEntries.length === 0
                ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    {filterQuery.trim()
                      ? <>No listener results for &ldquo;{filterQuery.trim()}&rdquo;.</>
                      : 'No listener data available.'}
                  </div>
                )
                : displayEntries.map((entry, index) => (
                  <ListenerChartRow key={entry.artist_uri} entry={entry} index={index} />
                ))
            }
          </div>
        </section>
      )}

      {nextOffset !== null && !loading && !error && !hasQuery && (
        <div className="mx-auto mt-5 w-full max-w-3xl px-4">
          <button
            type="button"
            onClick={() => loadPage(nextOffset)}
            disabled={loadingMore}
            className="flex w-full items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </main>
  );
}
