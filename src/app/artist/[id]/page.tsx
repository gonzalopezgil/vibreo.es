'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Music, User, Disc } from 'lucide-react';
import { SpotifyIcon, YouTubeMusicIcon } from '@/components/PlatformIcons';
import { ImageModal } from '@/components/ImageModal';
import { VideoHero } from '@/components/VideoHero';
import { getArtist, getChartingArtists, getChartingAlbums, getArtistChannels, getYouTubeLinks, getHeroVideoUrl, getErrorMessage } from '@/lib/api';
import { FlagIcon } from '@/components/FlagIcon';
import { getCountryName } from '@/lib/countries';
import { formatStreams } from '@/lib/format';

interface ArtistEntity {
  artist_uri: string;
  artist_name: string;
  image_url: string;
}

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

type ChartingAlbumData = {
  album_name?: string;
  artist_names?: string;
  artist_uris?: string;
  image_url?: string;
  positions?: ChartingAlbumEntry['positions'];
};

type Tab = 'songs' | 'artist-chart' | 'albums';

function extractId(uri: string) {
  return uri.split(':').pop() || uri;
}

function getSongDisplayStreams(song: ChartingSong) {
  const globalPos = song.positions.find((position) => position.country === 'global');
  return globalPos?.streams ?? song.positions.reduce((sum, position) => sum + position.streams, 0);
}

function getTopCountryPosition(song: ChartingSong) {
  let topCountryPosition: ChartingSongPosition | undefined;

  for (const position of song.positions) {
    if (position.country === 'global') continue;
    if (!topCountryPosition || position.streams > topCountryPosition.streams) {
      topCountryPosition = position;
    }
  }

  return topCountryPosition ?? song.positions[0];
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
      priority
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

    async function load() {
      try {
        const [artistData, chartingData, albumChartingData, channelsData, ytData] = await Promise.all([
          getArtist<ArtistEntity>(id),
          getChartingArtists<Record<string, ChartingArtistData>>(),
          getChartingAlbums<Record<string, ChartingAlbumData | ChartingAlbumEntry['positions']>>(),
          getArtistChannels().catch(() => ({} as Record<string, string>)),
          getYouTubeLinks().catch(() => ({} as Record<string, { m?: string; v?: string; vt?: string }>)),
        ]);
        if (cancelled) return;
        setArtist(artistData);

        const uri = `spotify:artist:${id}`;

        // Songs
        const data = chartingData[uri];
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

        // Albums — find albums where any artist_uri matches
        const matchingAlbums: ChartingAlbumEntry[] = [];
        for (const [albumUri, albumData] of Object.entries(albumChartingData)) {
          if (Array.isArray(albumData)) continue;
          // albumData can be an array of positions or an object with metadata
          // Check if it has artist_uris that match
          const artistUris = albumData.artist_uris || '';
          const uriList = artistUris.split('|').map((u) => u.trim());
          if (uriList.includes(uri)) {
            matchingAlbums.push({
              album_uri: albumUri,
              album_name: albumData.album_name || '',
              artist_names: albumData.artist_names || '',
              artist_uris: artistUris,
              image_url: albumData.image_url || '',
              positions: albumData.positions || [],
            });
          }
        }
        // Sort by best rank across all positions
        matchingAlbums.sort((a, b) => {
          const aBest = Array.isArray(a.positions) ? Math.min(...a.positions.map(p => p.rank)) : 999;
          const bBest = Array.isArray(b.positions) ? Math.min(...b.positions.map(p => p.rank)) : 999;
          return aBest - bBest;
        });
        setArtistAlbums(matchingAlbums);

        setYtLinksMap(ytData);

        // Find YouTube channel
        const artistName = artistData.artist_name?.toLowerCase() || '';
        for (const [channelId, name] of Object.entries(channelsData)) {
          if (name.toLowerCase() === artistName) {
            setYtChannelId(channelId);
            break;
          }
        }
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
                  const featuredPos = getTopCountryPosition(song);

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
