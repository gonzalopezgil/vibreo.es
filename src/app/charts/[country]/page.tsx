'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CountryChartRedirect() {
  const params = useParams<{ country: string }>();
  const router = useRouter();
  const country = String(params?.country || 'global').toLowerCase();

  useEffect(() => {
    router.replace(`/charts/${country}/songs/latest`);
  }, [country, router]);

  return (
    <main className="min-h-screen pb-24 px-4 pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-800/50 rounded animate-pulse" />
        ))}
      </div>
    </main>
  );
}
