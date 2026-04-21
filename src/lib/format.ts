export function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatStreamsFull(n: number): string {
  return n.toLocaleString('de-DE');
}

export function extractId(uri: string): string {
  return uri.split(":").pop() || uri;
}
