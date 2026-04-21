'use client';

import Image from 'next/image';
import Link from 'next/link';
import { User } from 'lucide-react';

export interface ArtistChartEntry {
  rank: number;
  uri: string;
  artist_name: string;
  image_url: string;
  peak_rank: number;
  previous_rank: number;
  days_on_chart: number;
  consecutive_days: number;
  entry_status: string;
  peak_date: string;
  entry_rank: number;
  entry_date: string;
}

function ChangeIndicator({ entry }: { entry: ArtistChartEntry }) {
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

export function ArtistChartRow({
  entry,
  index,
  striped = false,
}: {
  entry: ArtistChartEntry;
  index: number;
  striped?: boolean;
}) {
  const artistId = entry.uri.split(':').pop() || '';

  return (
    <Link
      href={`/artist/${artistId}`}
      className={`flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/40 ${
        striped && index % 2 === 0 ? 'bg-zinc-900/30' : ''
      }`}
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
        <ChangeIndicator entry={entry} />
        <span className="tabular-nums text-sm font-bold text-zinc-400">{entry.rank}</span>
      </div>

      {entry.image_url ? (
        <Image
          src={entry.image_url}
          alt={entry.artist_name}
          width={40}
          height={40}
          className="shrink-0 rounded-full object-cover"
          style={{ width: 40, height: 40 }}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <User size={16} className="text-zinc-600" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{entry.artist_name}</p>
        <p className="text-xs text-zinc-500">
          {entry.days_on_chart} {entry.days_on_chart === 1 ? 'day' : 'days'} on chart
          {entry.peak_rank > 0 && <span className="ml-1.5">· Peak #{entry.peak_rank}</span>}
        </p>
      </div>
    </Link>
  );
}
