'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { FlagIcon } from '@/components/FlagIcon';
import { COUNTRIES, REGIONS, COUNTRY_REGIONS, type Country, type Region } from '@/lib/countries';
import { getMarketStreams } from '@/lib/api';
import { formatStreams } from '@/lib/format';

function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function ChartCard({
  country,
  streams,
}: {
  country: Country;
  streams?: number;
}) {
  return (
    <Link
      href={`/charts/${country.code}`}
      className="group flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-center justify-center rounded-full bg-zinc-800/80 h-9 w-9 shrink-0">
        <FlagIcon code={country.code} size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-100 truncate">{country.name}</p>
        <p className="text-[11px] text-zinc-500 truncate">
          {streams !== undefined ? `${formatStreams(streams)} streams` : 'Top 200'}
        </p>
      </div>
    </Link>
  );
}

export default function ChartsPage() {
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [marketStreams, setMarketStreams] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    getMarketStreams()
      .then(setMarketStreams)
      .catch(() => setMarketStreams({}));
  }, []);

  const loading = marketStreams === null;

  // Top 10 markets by streams (always include global first)
  const topMarkets = (() => {
    if (!marketStreams || Object.keys(marketStreams).length === 0) return [];
    const entries = Object.entries(marketStreams);
    const sorted = entries
      .filter(([code]) => code !== 'global')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([code]) => code);

    return ['global', ...sorted]
      .map((code) => COUNTRIES.find((c) => c.code === code))
      .filter(Boolean) as Country[];
  })();

  // All countries alphabetically (including top markets)
  const allCountries = [...COUNTRIES].sort((a, b) => {
    if (a.code === 'global') return -1;
    if (b.code === 'global') return 1;
    return a.name.localeCompare(b.name);
  });

  const normalizedQuery = normalizeValue(query);
  const filteredCountries = allCountries.filter((country) => {
    // Text filter
    if (normalizedQuery) {
      const name = normalizeValue(country.name);
      const code = country.code.toLowerCase();
      if (!name.includes(normalizedQuery) && !code.includes(normalizedQuery)) return false;
    }
    // Region filter (hide Global when filtering by region)
    if (selectedRegion) {
      if (country.code === 'global') return false;
      const region = COUNTRY_REGIONS[country.code];
      if (region !== selectedRegion) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen px-4 pt-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Spotify charts</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-100">Choose a market</h1>

          <div className="relative mt-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a country"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-600"
            />
          </div>

          {/* Region chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setSelectedRegion(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedRegion
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedRegion === r.id
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <>
            <section className="space-y-3">
              <div className="w-32 h-5 bg-zinc-800 rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <div className="w-24 h-5 bg-zinc-800 rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {!normalizedQuery && !selectedRegion && topMarkets.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Top markets</h2>
                  <p className="mt-1 text-sm text-zinc-500">Biggest Spotify markets by daily filtered streams.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {topMarkets.map((country) => (
                    <ChartCard
                      key={country.code}
                      country={country}
                      streams={marketStreams?.[country.code]}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">All markets</h2>
                <p className="mt-1 text-sm text-zinc-500">Every market alphabetically.</p>
              </div>

              {filteredCountries.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredCountries.map((country) => (
                    <ChartCard
                      key={country.code}
                      country={country}
                      streams={marketStreams?.[country.code]}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-sm text-zinc-500">
                  No countries found for &ldquo;{query.trim()}&rdquo;.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
