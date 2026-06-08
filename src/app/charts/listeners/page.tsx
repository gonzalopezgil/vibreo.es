'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Search, User, X } from 'lucide-react';
import { FlagIcon } from '@/components/FlagIcon';
import { SpotifyIcon } from '@/components/PlatformIcons';
import { VideoHero } from '@/components/VideoHero';
import { getChartingListenersPage, getErrorMessage, type ListenerChartEntry } from '@/lib/api';
import { formatStreams } from '@/lib/format';

const PAGE_SIZE = 100;
const CHART_TABS = [
  { href: '/charts/global/songs/latest', label: 'Songs' },
  { href: '/charts/global/artists/latest', label: 'Artists' },
  { href: '/charts/global/albums/latest', label: 'Albums' },
  { href: '/charts/listeners', label: 'Listeners', active: true },
];

function formatSignedCompact(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatStreams(Math.abs(value))}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
        <span className="tabular-nums text-sm font-bold text-zinc-400">{entry.rank}</span>
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
        <p className="text-xs text-zinc-500">
          {formatSignedCompact(entry.daily_change)} daily
          {entry.peak_listeners > 0 && (
            <span className="ml-1.5">
              {entry.peak_rank ? `Peak #${entry.peak_rank} · ` : 'Peak '}
              {formatStreams(entry.peak_listeners)}
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-zinc-100">{formatStreams(entry.listeners)} listeners</p>
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
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  async function loadPage(offset: number) {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const page = await getChartingListenersPage({ limit: PAGE_SIZE, offset });
      setEntries((current) => (offset === 0 ? page.items : [...current, ...page.items]));
      setTotal(page.total);
      setNextOffset(page.nextOffset);
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

  const filteredEntries = useMemo(() => {
    const query = normalize(filterQuery);
    if (!query) return entries;

    return entries.filter((entry) => normalize(entry.artist_name || entry.artist_id).includes(query));
  }, [entries, filterQuery]);

  const hasFilter = filterQuery.trim().length > 0;
  const topEntry = entries[0] || null;
  const countLabel = (() => {
    if (hasFilter) {
      const loadedLabel = nextOffset !== null ? ' loaded artists' : ' artists';
      return `${filteredEntries.length.toLocaleString()} of ${entries.length.toLocaleString()}${loadedLabel}`;
    }
    if (total > 0) {
      return `${entries.length.toLocaleString()} of ${total.toLocaleString()} loaded`;
    }
    return 'Latest snapshot';
  })();

  return (
    <main className="min-h-screen pb-24">
      <VideoHero
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

          <div className="flex gap-1 rounded-xl bg-zinc-800/50 p-1 backdrop-blur-sm">
            {CHART_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition ${
                  tab.active
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <header>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              <SpotifyIcon size={14} />
              Spotify Monthly Listeners
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-100">
              Monthly Listener Chart
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {countLabel}
            </p>

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
                placeholder="Filter by artist"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-80"
              />
              {filterQuery && !loading && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear listener search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
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
              : filteredEntries.length === 0
                ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    {filterQuery.trim()
                      ? <>No matches for &ldquo;{filterQuery.trim()}&rdquo; in this chart.</>
                      : 'No listener data available.'}
                  </div>
                )
                : filteredEntries.map((entry, index) => (
                  <ListenerChartRow key={entry.artist_uri} entry={entry} index={index} />
                ))
            }
          </div>
        </section>
      )}

      {nextOffset !== null && !loading && !error && (
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
