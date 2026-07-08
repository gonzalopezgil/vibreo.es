'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Music, User, Disc } from 'lucide-react';
import { SpotifyIcon, YouTubeMusicIcon } from '@/components/PlatformIcons';
import { ImageModal } from '@/components/ImageModal';
import { VideoHero } from '@/components/VideoHero';
import { getArtist, getArtistListener, getChartingArtist, getChartingArtistAlbums, getArtistChannels, getYouTubeLinks, getHeroVideoUrl, getErrorMessage } from '@/lib/api';
import { FlagIcon } from '@/components/FlagIcon';
import { getCountryName } from '@/lib/countries';
import { formatStreams } from '@/lib/format';

interface ArtistEntity {
  artist_uri: string;
  artist_name: string;
  image_url: string;
  spotify_global_200_number_one_hits?: SpotifyGlobal200NumberOneHit[];
  spotify_global_200_top_10_hits?: SpotifyGlobal200Top10Hit[];
  spotify_global_200_top_200_hits?: SpotifyGlobal200Top200Hit[];
  monthly_listeners?: number;
  monthly_listeners_daily_change?: number;
  monthly_listeners_rank?: number;
  monthly_listeners_previous_rank?: number | null;
  monthly_listeners_peak_rank?: number;
  monthly_listeners_peak_listeners?: number;
}

interface SpotifyGlobal200NumberOneHit {
  track_uri: string;
  track_name: string;
  image_url: string;
  first_date: string;
  last_date: string;
  days_at_number_one: number;
}

interface SpotifyGlobal200Top10Hit {
  track_uri: string;
  track_name: string;
  image_url: string;
  peak_rank: number;
  first_date: string;
  last_date: string;
  days_in_top_10: number;
}

interface SpotifyGlobal200Top200Hit {
  track_uri: string;
  track_name: string;
  image_url: string;
  peak_rank: number;
  first_date: string;
  last_date: string;
  days_on_chart: number;
}

type SpotifyGlobal200PanelMode = 'number-one' | 'top-10' | 'top-200';

type SpotifyGlobal200PanelHit = {
  track_uri: string;
  track_name: string;
  image_url: string;
  first_date: string;
  last_date: string;
  peak_rank?: number;
  days_at_number_one?: number;
  days_in_top_10?: number;
  days_on_chart?: number;
};

interface ChartingSong {
  track_uri: string;
  track_name: string;
  image_url: string;
  positions: ChartingSongPosition[];
}

interface ArtistChartPosition {
  country: string;
  rank: number;
  days_on_chart: number;
}

interface ChartingAlbumEntry {
  album_uri: string;
  album_name: string;
  artist_names: string;
  artist_uris: string;
  image_url: string;
  positions: { country: string; rank: number; weeks_on_chart: number }[];
}

type ChartingArtistData = {
  songs?: ChartingSong[];
  positions?: ArtistChartPosition[];
};

interface ChartingSongPosition {
  country: string;
  rank: number;
  streams: number;
}

type ListenerChartingData = {
  artist_uri: string;
  artist_id: string;
  artist_name: string;
  image_url: string;
  rank: number;
  previous_rank: number | null;
  listeners: number;
  daily_change: number;
  peak_rank: number | null;
  peak_listeners: number;
};

type Tab = 'songs' | 'artist-chart' | 'albums';

function extractId(uri: string) {
  return uri.split(':').pop() || uri;
}

function getSongDisplayStreams(song: ChartingSong) {
  const globalPos = song.positions.find((position) => position.country === 'global');
  return globalPos?.streams ?? song.positions.reduce((sum, position) => sum + position.streams, 0);
}

function getFeaturedSongPosition(song: ChartingSong) {
  const globalPosition = song.positions.find((position) => position.country === 'global');
  if (globalPosition) return globalPosition;

  let topCountryPosition: ChartingSongPosition | undefined;

  for (const position of song.positions) {
    if (!topCountryPosition || position.streams > topCountryPosition.streams) {
      topCountryPosition = position;
    }
  }

  return topCountryPosition ?? song.positions[0];
}

function ListenerRankChange({ currentRank, previousRank }: { currentRank?: number; previousRank?: number | null }) {
  if (typeof currentRank !== 'number' || typeof previousRank !== 'number' || previousRank <= 0) {
    return <span className="text-zinc-500 text-xs">-</span>;
  }
  if (currentRank < previousRank) {
    return <span className="text-green-400 text-xs font-medium">▲{previousRank - currentRank}</span>;
  }
  if (currentRank > previousRank) {
    return <span className="text-red-400 text-xs font-medium">▼{currentRank - previousRank}</span>;
  }
  return <span className="text-zinc-500 text-xs">=</span>;
}

function formatRank(rank?: number | null) {
  return typeof rank === 'number' ? `#${rank}` : '—';
}

function formatOptionalStreams(streams?: number | null) {
  return typeof streams === 'number' ? formatStreams(streams) : '—';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumberOneDays(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'} at #1`;
}

function formatTop10Days(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'} in Top 10`;
}

function formatGlobal200ChartDays(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'} on Global 200`;
}

function getPeakLabelClass(isAtPeak: boolean) {
  return `text-[11px] font-normal ${isAtPeak ? 'text-amber-300' : 'text-zinc-500'}`;
}

function getPeakValueClass(isAtPeak: boolean) {
  return `tabular-nums ${isAtPeak ? 'text-amber-300' : ''}`;
}

function formatPeakLabel(isAtPeak: boolean, peakValue: string) {
  return isAtPeak ? 'Peak' : `Peak ${peakValue}`;
}

function MonthlyListenerDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-zinc-200">{children}</span>
    </div>
  );
}

function MonthlyListenersPanel({ artist }: { artist: ArtistEntity }) {
  if (typeof artist.monthly_listeners !== 'number') return null;

  const hasRankMovement = typeof artist.monthly_listeners_rank === 'number'
    && typeof artist.monthly_listeners_previous_rank === 'number'
    && artist.monthly_listeners_previous_rank > 0;
  const isAtListenersPeak = typeof artist.monthly_listeners_peak_listeners === 'number'
    && artist.monthly_listeners >= artist.monthly_listeners_peak_listeners;
  const isAtRankPeak = typeof artist.monthly_listeners_rank === 'number'
    && artist.monthly_listeners_rank > 0
    && typeof artist.monthly_listeners_peak_rank === 'number'
    && artist.monthly_listeners_rank <= artist.monthly_listeners_peak_rank;

  return (
    <section
      data-testid="monthly-listeners-panel"
      className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
            <SpotifyIcon size={14} />
            Spotify monthly listeners
          </h2>
        </div>
        <Link
          href="/charts/listeners"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-800/70 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100"
        >
          <span>Full chart</span>
          <ChevronRight size={14} className="shrink-0" />
        </Link>
      </div>

      <div className="divide-y divide-zinc-800/40">
        <MonthlyListenerDetailRow label="Monthly listeners">
          <span className="flex flex-col items-end gap-0.5">
            <span className={getPeakValueClass(isAtListenersPeak)}>{formatStreams(artist.monthly_listeners)}</span>
            <span className={getPeakLabelClass(isAtListenersPeak)}>
              {formatPeakLabel(isAtListenersPeak, formatOptionalStreams(artist.monthly_listeners_peak_listeners))}
            </span>
          </span>
        </MonthlyListenerDetailRow>

        <MonthlyListenerDetailRow label="Top Artists">
          <span className="flex flex-col items-end gap-0.5">
            <span className="inline-flex items-center gap-1.5">
              {hasRankMovement && (
                <ListenerRankChange
                  currentRank={artist.monthly_listeners_rank}
                  previousRank={artist.monthly_listeners_previous_rank}
                />
              )}
              <span className={getPeakValueClass(isAtRankPeak)}>{formatRank(artist.monthly_listeners_rank)}</span>
            </span>
            <span className={getPeakLabelClass(isAtRankPeak)}>
              {formatPeakLabel(isAtRankPeak, formatRank(artist.monthly_listeners_peak_rank))}
            </span>
          </span>
        </MonthlyListenerDetailRow>
      </div>
    </section>
  );
}

function sortSpotifyGlobal200PanelHits<T extends SpotifyGlobal200PanelHit>(hits: T[]): T[] {
  return [...hits].sort((a, b) =>
    b.last_date.localeCompare(a.last_date) ||
    b.first_date.localeCompare(a.first_date) ||
    a.track_name.localeCompare(b.track_name) ||
    a.track_uri.localeCompare(b.track_uri)
  );
}

function getSpotifyGlobal200HitMeta(mode: SpotifyGlobal200PanelMode, hit: SpotifyGlobal200PanelHit) {
  if (mode === 'number-one') {
    return [`Last #1 ${formatDate(hit.last_date)}`, formatNumberOneDays(hit.days_at_number_one || 0)];
  }
  if (mode === 'top-10') {
    return [`Peak #${hit.peak_rank || '—'}`, formatTop10Days(hit.days_in_top_10 || 0)];
  }
  return [`Peak #${hit.peak_rank || '—'}`, formatGlobal200ChartDays(hit.days_on_chart || 0)];
}

function getSpotifyGlobal200EmptyLabel(mode: SpotifyGlobal200PanelMode) {
  if (mode === 'number-one') return 'No Global 200 #1 hits yet.';
  if (mode === 'top-10') return 'No Global 200 Top 10 hits yet.';
  return 'No Global 200 Top 200 hits yet.';
}

function Global200ModeButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-right transition ${
        active
          ? 'border-green-400/40 bg-green-500/15 text-zinc-100'
          : 'border-zinc-800/60 bg-zinc-950/45 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-100'
      }`}
    >
      <p className="tabular-nums text-2xl font-extrabold leading-none">{count}</p>
      <p className={`mt-1 text-xs font-semibold ${active ? 'text-green-300' : 'text-zinc-400'}`}>{label}</p>
    </button>
  );
}

function GlobalNumberOneHitsPanel({
  numberOneHits,
  top10Hits,
  top200Hits,
}: {
  numberOneHits?: SpotifyGlobal200NumberOneHit[];
  top10Hits?: SpotifyGlobal200Top10Hit[];
  top200Hits?: SpotifyGlobal200Top200Hit[];
}) {
  const [activeMode, setActiveMode] = useState<SpotifyGlobal200PanelMode>('number-one');
  const sortedNumberOneHits = sortSpotifyGlobal200PanelHits(Array.isArray(numberOneHits) ? numberOneHits : []);
  const sortedTop10Hits = sortSpotifyGlobal200PanelHits(Array.isArray(top10Hits) ? top10Hits : []);
  const sortedTop200Hits = sortSpotifyGlobal200PanelHits(Array.isArray(top200Hits) ? top200Hits : []);
  const modeHits: Record<SpotifyGlobal200PanelMode, SpotifyGlobal200PanelHit[]> = {
    'number-one': sortedNumberOneHits,
    'top-10': sortedTop10Hits,
    'top-200': sortedTop200Hits,
  };
  const selectedHits = modeHits[activeMode];

  return (
    <section
      data-testid="global-number-one-hits-panel"
      className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50"
    >
      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800/60 p-3 sm:grid-cols-4">
        <div className="rounded-xl border border-green-500/15 bg-green-500/10 px-3 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-300">
            <SpotifyIcon size={15} />
            Spotify
          </p>
          <p className="mt-1 text-sm font-bold text-zinc-100">Global 200</p>
        </div>
        <Global200ModeButton
          active={activeMode === 'number-one'}
          count={sortedNumberOneHits.length}
          label="#1 Hits"
          onClick={() => setActiveMode('number-one')}
        />
        <Global200ModeButton
          active={activeMode === 'top-10'}
          count={sortedTop10Hits.length}
          label="Top 10 Hits"
          onClick={() => setActiveMode('top-10')}
        />
        <Global200ModeButton
          active={activeMode === 'top-200'}
          count={sortedTop200Hits.length}
          label="Top 200 Hits"
          onClick={() => setActiveMode('top-200')}
        />
      </div>

      {selectedHits.length > 0 ? (
        <div className="divide-y divide-zinc-800/40">
          {selectedHits.map((hit) => {
            const trackId = extractId(hit.track_uri);
            const [primaryMeta, secondaryMeta] = getSpotifyGlobal200HitMeta(activeMode, hit);
            return (
              <Link
                key={hit.track_uri}
                href={`/song/${trackId}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-800/40"
              >
                {hit.image_url ? (
                  <Image src={hit.image_url} alt={hit.track_name} width={40} height={40} className="shrink-0 rounded" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-800">
                    <Music size={16} className="text-zinc-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">{hit.track_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                    <span>{primaryMeta}</span>
                    <span>{secondaryMeta}</span>
                  </p>
                </div>
                <ChevronRight size={15} className="shrink-0 text-zinc-600" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-5 text-center text-sm text-zinc-500">
          {getSpotifyGlobal200EmptyLabel(activeMode)}
        </div>
      )}
    </section>
  );
}

function ArtistAvatar({ src, name, size }: { src: string; name: string; size: number }) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-800 rounded-full"
        style={{ width: size, height: size }}
      >
        <User size={size / 3} className="text-zinc-600" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full shadow-lg object-cover"
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();

  const [artist, setArtist] = useState<ArtistEntity | null>(null);
  const [songs, setSongs] = useState<ChartingSong[]>([]);
  const [artistPositions, setArtistPositions] = useState<ArtistChartPosition[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<ChartingAlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [ytChannelId, setYtChannelId] = useState<string | null>(null);
  const [ytLinksMap, setYtLinksMap] = useState<Record<string, { m?: string; v?: string; vt?: string }>>({});
  const [activeTab, setActiveTab] = useState<Tab>('songs');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setYtLinksMap({});

    async function load() {
      try {
        const [artistData, chartingData, albumChartingData, listenerData, channelsData] = await Promise.all([
          getArtist<ArtistEntity>(id),
          getChartingArtist<ChartingArtistData>(id).catch(() => null as ChartingArtistData | null),
          getChartingArtistAlbums<ChartingAlbumEntry[]>(id).catch(() => [] as ChartingAlbumEntry[]),
          getArtistListener(id).catch(() => null as ListenerChartingData | null),
          getArtistChannels().catch(() => ({} as Record<string, string>)),
        ]);
        if (cancelled) return;

        setArtist({
          ...artistData,
          monthly_listeners: listenerData?.listeners ?? artistData.monthly_listeners,
          monthly_listeners_daily_change: listenerData?.daily_change ?? artistData.monthly_listeners_daily_change,
          monthly_listeners_rank: listenerData?.rank ?? artistData.monthly_listeners_rank,
          monthly_listeners_previous_rank: listenerData?.previous_rank ?? artistData.monthly_listeners_previous_rank ?? null,
          monthly_listeners_peak_rank: listenerData?.peak_rank ?? artistData.monthly_listeners_peak_rank,
          monthly_listeners_peak_listeners: listenerData?.peak_listeners ?? artistData.monthly_listeners_peak_listeners,
        });

        // Songs
        const data = chartingData;
        if (data?.songs) {
          const sorted = [...data.songs].sort((a: ChartingSong, b: ChartingSong) => {
            return getSongDisplayStreams(b) - getSongDisplayStreams(a);
          });
          setSongs(sorted);
        }

        // Artist chart positions
        if (data?.positions) {
          const sorted = [...data.positions].sort((a: ArtistChartPosition, b: ArtistChartPosition) => a.rank - b.rank);
          setArtistPositions(sorted);
        }

        const matchingAlbums = [...albumChartingData];
        matchingAlbums.sort((a, b) => {
          const aBest = Array.isArray(a.positions) ? Math.min(...a.positions.map(p => p.rank)) : 999;
          const bBest = Array.isArray(b.positions) ? Math.min(...b.positions.map(p => p.rank)) : 999;
          return aBest - bBest;
        });
        setArtistAlbums(matchingAlbums);

        // Find YouTube channel
        const artistName = artistData.artist_name?.toLowerCase() || '';
        for (const [channelId, name] of Object.entries(channelsData)) {
          if (name.toLowerCase() === artistName) {
            setYtChannelId(channelId);
            break;
          }
        }

        void getYouTubeLinks()
          .then((ytData) => {
            if (!cancelled) setYtLinksMap(ytData);
          })
          .catch(() => {});
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load artist'));
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
            <div className="w-[160px] h-[160px] bg-zinc-800 rounded-full animate-pulse" />
            <div className="w-48 h-6 bg-zinc-800 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !artist) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error || 'Artist not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-zinc-400 hover:text-zinc-200 transition">← Go back</button>
        </div>
      </main>
    );
  }

  // Aggregate stats
  const totalCountries = new Set(songs.flatMap(s => s.positions.map(p => p.country))).size;
  const totalStreams = songs.reduce((sum, song) => sum + getSongDisplayStreams(song), 0);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'songs', label: 'Songs', count: songs.length },
    { key: 'artist-chart', label: 'Artist Chart', count: artistPositions.length },
    { key: 'albums', label: 'Albums', count: artistAlbums.length },
  ];

  const heroSourceSong = songs.find((song) => ytLinksMap[song.track_uri]?.v) || null;
  const heroVideoSrc = heroSourceSong ? getHeroVideoUrl(extractId(heroSourceSong.track_uri)) : null;

  return (
    <main className="min-h-screen">
      <VideoHero
        videoSrc={heroVideoSrc}
        className="mb-8"
        fallbackClassName="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800"
        overlayClassName="bg-gradient-to-b from-black/70 via-black/50 to-zinc-950/90"
        fallbackMedia={artist.image_url ? (
          <Image
            src={artist.image_url}
            alt=""
            fill
            sizes="100vw"
            className="blur-3xl scale-110 opacity-40 object-cover absolute inset-0 z-0"
            aria-hidden="true"
            loading="eager"
          />
        ) : null}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 pb-8">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-800/60 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="relative z-10 flex flex-col items-center text-center gap-4 px-2 py-2 md:px-6 md:py-4">
            <button
              type="button"
              onClick={() => artist.image_url && setShowImage(true)}
              disabled={!artist.image_url}
              className={artist.image_url ? 'cursor-pointer rounded-full' : 'cursor-default rounded-full'}
              aria-label={artist.image_url ? `Open ${artist.artist_name} image` : `${artist.artist_name} image unavailable`}
            >
              <ArtistAvatar src={artist.image_url} name={artist.artist_name} size={160} />
            </button>
            {showImage && artist.image_url && (
              <ImageModal src={artist.image_url} alt={artist.artist_name} onClose={() => setShowImage(false)} />
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-100">{artist.artist_name}</h1>

            {/* Quick stats */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {typeof artist.monthly_listeners === 'number' && (
                <span className="text-xs font-medium bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full">
                  {formatStreams(artist.monthly_listeners)} monthly listeners
                </span>
              )}
              {songs.length > 0 && (
                <>
                  <span className="text-xs font-medium bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full">
                    {songs.length} {songs.length === 1 ? 'song' : 'songs'} charting
                  </span>
                  <span className="text-xs font-medium bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full">
                    {totalCountries} {totalCountries === 1 ? 'market' : 'markets'}
                  </span>
                  <span className="text-xs font-medium bg-zinc-700/50 text-zinc-300 px-2.5 py-1 rounded-full">
                    {formatStreams(totalStreams)} daily filtered streams
                  </span>
                </>
              )}
              {songs.length === 0 && artistPositions.length === 0 && artistAlbums.length === 0 && (
                <span className="text-xs font-medium bg-zinc-700/50 text-zinc-400 px-2.5 py-1 rounded-full">
                  Not currently charting
                </span>
              )}
            </div>

            {/* External links */}
            <div className="flex gap-2">
              <a
                href={`https://open.spotify.com/artist/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                title="Spotify"
              >
                <SpotifyIcon size={20} />
              </a>
              {ytChannelId && (
                <a
                  href={`https://music.youtube.com/channel/${ytChannelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                  title="YouTube Music"
                >
                  <YouTubeMusicIcon size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </VideoHero>

      <div className="mx-auto max-w-2xl px-4 space-y-8">
        <MonthlyListenersPanel artist={artist} />
        <GlobalNumberOneHitsPanel
          numberOneHits={artist.spotify_global_200_number_one_hits}
          top10Hits={artist.spotify_global_200_top_10_hits}
          top200Hits={artist.spotify_global_200_top_200_hits}
        />

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-800/50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-zinc-500">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Songs */}
        {activeTab === 'songs' && songs.length > 0 && (
          <>
            <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60">
                Charting songs
              </h2>
              <div className="divide-y divide-zinc-800/40">
                {songs.map((song) => {
                  const trackId = extractId(song.track_uri);
                  const songStreams = getSongDisplayStreams(song);
                  const featuredPos = getFeaturedSongPosition(song);

                  return (
                    <Link
                      key={song.track_uri}
                      href={`/song/${trackId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition"
                    >
                      {song.image_url ? (
                        <Image src={song.image_url} alt={song.track_name} width={40} height={40} className="rounded shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                          <Music size={16} className="text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate">{song.track_name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {formatStreams(songStreams)} · {song.positions.length} {song.positions.length === 1 ? 'market' : 'markets'} · #{featuredPos?.rank} {getCountryName(featuredPos?.country || '')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Markets breakdown */}
            <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60">
                <span className="flex items-center justify-between w-full">
                  <span>Markets</span>
                  <span className="text-xs font-normal text-zinc-500">{totalCountries} {totalCountries === 1 ? 'country' : 'countries'}</span>
                </span>
              </h2>
              <div className="divide-y divide-zinc-800/40">
                {(() => {
                  const countryMap = new Map<string, { bestRank: number; totalStreams: number; songCount: number }>();
                  for (const song of songs) {
                    for (const p of song.positions) {
                      const existing = countryMap.get(p.country);
                      if (existing) {
                        existing.bestRank = Math.min(existing.bestRank, p.rank);
                        existing.totalStreams += p.streams;
                        existing.songCount++;
                      } else {
                        countryMap.set(p.country, { bestRank: p.rank, totalStreams: p.streams, songCount: 1 });
                      }
                    }
                  }
                  const sorted = [...countryMap.entries()].sort((a, b) => b[1].totalStreams - a[1].totalStreams);
                  return sorted.map(([country, data]) => (
                    <Link
                      key={country}
                      href={`/charts/${country}/songs/latest`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition"
                    >
                      <FlagIcon code={country} size={20} />
                      <span className="text-sm text-zinc-300 flex-1">{getCountryName(country)}</span>
                      <span className="text-[11px] text-zinc-500 mr-2">{data.songCount} {data.songCount === 1 ? 'song' : 'songs'}</span>
                      <span className="text-sm font-bold text-zinc-100 tabular-nums w-10 text-right">#{data.bestRank}</span>
                      <span className="text-xs text-zinc-500 tabular-nums w-14 text-right">{formatStreams(data.totalStreams)}</span>
                    </Link>
                  ));
                })()}
              </div>
            </section>
          </>
        )}

        {activeTab === 'songs' && songs.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
            No songs currently charting.
          </div>
        )}

        {/* Tab: Artist Chart */}
        {activeTab === 'artist-chart' && artistPositions.length > 0 && (
          <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60">
              <span className="flex items-center justify-between w-full">
                <span>Artist chart positions</span>
                <span className="text-xs font-normal text-zinc-500">{artistPositions.length} {artistPositions.length === 1 ? 'market' : 'markets'}</span>
              </span>
            </h2>
            <div className="divide-y divide-zinc-800/40">
              {artistPositions.map((pos) => (
                <Link
                  key={pos.country}
                  href={`/charts/${pos.country}/artists/latest`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition"
                >
                  <FlagIcon code={pos.country} size={20} />
                  <span className="text-sm text-zinc-300 flex-1">{getCountryName(pos.country)}</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums w-10 text-right">#{pos.rank}</span>
                  <span className="text-[11px] text-zinc-500 w-20 text-right">
                    {pos.days_on_chart} {pos.days_on_chart === 1 ? 'day' : 'days'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'artist-chart' && artistPositions.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
            Not on the artist chart right now.
          </div>
        )}

        {/* Tab: Albums */}
        {activeTab === 'albums' && artistAlbums.length > 0 && (
          <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-zinc-300 border-b border-zinc-800/60">
              <span className="flex items-center justify-between w-full">
                <span>Charting albums</span>
                <span className="text-xs font-normal text-zinc-500">{artistAlbums.length} {artistAlbums.length === 1 ? 'album' : 'albums'}</span>
              </span>
            </h2>
            <div className="divide-y divide-zinc-800/40">
              {artistAlbums.map((album) => {
                const albumId = extractId(album.album_uri);
                const positions = Array.isArray(album.positions) ? album.positions : [];
                const bestRank = positions.length > 0 ? Math.min(...positions.map(p => p.rank)) : null;
                const maxWeeks = positions.length > 0 ? Math.max(...positions.map(p => p.weeks_on_chart)) : null;

                return (
                  <Link
                    key={album.album_uri}
                    href={`/album/${albumId}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition"
                  >
                    {album.image_url ? (
                      <Image src={album.image_url} alt={album.album_name} width={40} height={40} className="rounded shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <Disc size={16} className="text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{album.album_name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {positions.length} {positions.length === 1 ? 'market' : 'markets'}
                        {bestRank !== null && <span> · Best #{bestRank}</span>}
                        {maxWeeks !== null && maxWeeks > 0 && <span> · {maxWeeks} {maxWeeks === 1 ? 'week' : 'weeks'}</span>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'albums' && artistAlbums.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
            No albums currently charting.
          </div>
        )}
      </div>
    </main>
  );
}
