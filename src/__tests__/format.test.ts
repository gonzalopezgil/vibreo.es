import { extractId, formatStreams, formatStreamsFull } from '@/lib/format';

describe('formatStreams', () => {
  it('formats millions with one decimal place', () => {
    expect(formatStreams(1_250_000)).toBe('1.3M');
  });

  it('formats thousands with one decimal place', () => {
    expect(formatStreams(15_400)).toBe('15.4K');
  });

  it('returns small values unchanged', () => {
    expect(formatStreams(999)).toBe('999');
  });
});

describe('extractId', () => {
  it('returns the last segment from a colon-delimited uri', () => {
    expect(extractId('spotify:track:abc123')).toBe('abc123');
  });

  it('returns the original string when no id segment exists', () => {
    expect(extractId('plain-id')).toBe('plain-id');
  });
});

describe('formatStreamsFull', () => {
  it('formats full stream counts with dot grouping', () => {
    expect(formatStreamsFull(1_234_567)).toBe('1.234.567');
  });
});
