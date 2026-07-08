import type React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { getChartSongsDaily, getHeroVideoUrl, getLatest, getYouTubeLinks } from '@/lib/api';
import type { ChartEntry } from '@/components/ChartRow';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

type MockImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  fill?: boolean;
  priority?: boolean;
  src: string | { src: string };
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, fill: _fill, priority: _priority, src, ...props }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : src.src} {...props} />
  ),
}));

jest.mock('@/lib/api', () => ({
  getChartSongsDaily: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getLatest: jest.fn(),
  getYouTubeLinks: jest.fn(),
}));

const mockedGetLatest = jest.mocked(getLatest);
const mockedGetChartSongsDaily = jest.mocked(getChartSongsDaily);
const mockedGetYouTubeLinks = jest.mocked(getYouTubeLinks);
const mockedGetHeroVideoUrl = jest.mocked(getHeroVideoUrl);

const chartEntry: ChartEntry = {
  rank: 1,
  uri: 'spotify:track:hero-track',
  track_name: 'Hero Track',
  artist_names: 'Vibreo Artist',
  artist_uris: 'spotify:artist:vibreo-artist',
  image_url: 'https://i.scdn.co/image/hero.jpg',
  label: 'Vibreo Records',
  streams: 5_500_000,
  peak_rank: 1,
  previous_rank: 2,
  days_on_chart: 10,
  consecutive_days: 10,
  entry_status: 'STANDARD',
  peak_date: '2026-06-04',
  entry_rank: 2,
  entry_date: '2026-05-26',
  release_date: '2026-05-20',
};

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetLatest.mockResolvedValue({
      songs_daily: '2026-06-04',
      artists_daily: '2026-06-04',
      albums_weekly: '2026-06-04',
      updated_at: '2026-06-04T12:00:00Z',
    });
    mockedGetChartSongsDaily.mockResolvedValue([
      chartEntry,
      { ...chartEntry, rank: 2, uri: 'spotify:track:second', track_name: 'Second Track', streams: 4_000_000 },
    ]);
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hero-track': { v: 'hero-video' },
    });
    mockedGetHeroVideoUrl.mockReturnValue('/hero.mp4');
  });

  it('renders the home chart before YouTube links finish loading', async () => {
    mockedGetYouTubeLinks.mockReturnValue(new Promise<Awaited<ReturnType<typeof getYouTubeLinks>>>(() => {}));

    render(<Home />);

    expect(await screen.findByRole('heading', { name: 'Hero Track' }, { timeout: 1000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "What's Hot" })).toBeInTheDocument();
    expect(screen.getByText('Second Track')).toBeInTheDocument();
  });

  it('uses a compact home hero height while preserving the bottom fade overlap', async () => {
    render(<Home />);

    const heading = await screen.findByRole('heading', { name: 'Hero Track' });
    const videoHero = heading.closest('section');
    const content = videoHero?.querySelector('.mx-auto');
    const whatsHot = screen.getByRole('heading', { name: "What's Hot" }).closest('section');

    expect(videoHero).toHaveClass('min-h-[calc(75svh-2.625rem)]');
    expect(videoHero).toHaveClass('after:bg-gradient-to-b');
    expect(videoHero).toHaveClass('after:to-zinc-950');
    expect(content).toHaveClass('min-h-[calc(75svh-2.625rem)]');
    expect(content).toHaveClass('pb-20');
    expect(content).toHaveClass('md:pb-24');
    expect(whatsHot).toHaveClass('-mt-16');
    expect(whatsHot).toHaveClass('sm:-mt-[5.25rem]');
  });
});
