import type React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ChartTypeDatePage from '@/app/charts/[country]/[type]/[date]/page';
import {
  getChartAlbumsWeekly,
  getChartArtistsDaily,
  getChartingArtists,
  getChartSongsDaily,
  getErrorMessage,
  getHeroVideoUrl,
  getLatest,
  getMarketStreams,
  getYouTubeLinks,
} from '@/lib/api';

let mockParams = { country: 'global', type: 'songs', date: 'latest' };

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: jest.fn() }),
}));

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
  unoptimized?: boolean;
  src: string | { src: string };
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, fill: _fill, priority: _priority, unoptimized: _unoptimized, src, ...props }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : src.src} {...props} />
  ),
}));

jest.mock('@/lib/api', () => ({
  getChartAlbumsWeekly: jest.fn(),
  getChartArtistsDaily: jest.fn(),
  getChartingArtists: jest.fn(),
  getChartSongsDaily: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getLatest: jest.fn(),
  getMarketStreams: jest.fn(),
  getYouTubeLinks: jest.fn(),
}));

const mockedGetLatest = jest.mocked(getLatest);
const mockedGetChartSongsDaily = jest.mocked(getChartSongsDaily);
const mockedGetChartArtistsDaily = jest.mocked(getChartArtistsDaily);
const mockedGetChartAlbumsWeekly = jest.mocked(getChartAlbumsWeekly);
const mockedGetChartingArtists = jest.mocked(getChartingArtists);
const mockedGetMarketStreams = jest.mocked(getMarketStreams);
const mockedGetYouTubeLinks = jest.mocked(getYouTubeLinks);
const mockedGetHeroVideoUrl = jest.mocked(getHeroVideoUrl);
const mockedGetErrorMessage = jest.mocked(getErrorMessage);

function expectHeroBottomFade(hero: Element | null) {
  expect(hero).not.toBeNull();
  const className = hero?.className || '';

  expect(className).toEqual(expect.stringContaining('after:bg-gradient-to-b'));
  expect(className).toEqual(expect.stringContaining('after:via-zinc-950/75'));
  expect(className).toEqual(expect.stringContaining('after:to-zinc-950'));
  expect(className).toEqual(expect.stringContaining('md:after:h-48'));
}

describe('ChartTypeDatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { country: 'global', type: 'songs', date: 'latest' };
    mockedGetLatest.mockResolvedValue({
      songs_daily: '2026-06-04',
      artists_daily: '2026-06-04',
      albums_weekly: '2026-06-04',
    });
    mockedGetChartSongsDaily.mockResolvedValue([
      {
        rank: 1,
        uri: 'spotify:track:hate-that',
        track_name: 'hate that i made you love me',
        artist_names: 'Ariana Grande',
        artist_uris: 'spotify:artist:ariana',
        image_url: 'https://i.scdn.co/image/hate-that.jpg',
        label: 'Republic Records',
        streams: 6_300_000,
        peak_rank: 1,
        previous_rank: 2,
        days_on_chart: 2,
        consecutive_days: 2,
        entry_status: 'STANDARD',
        peak_date: '2026-06-04',
        entry_rank: 2,
        entry_date: '2026-06-03',
        release_date: '2026-05-29',
      },
    ]);
    mockedGetChartArtistsDaily.mockResolvedValue([]);
    mockedGetChartAlbumsWeekly.mockResolvedValue([]);
    mockedGetChartingArtists.mockResolvedValue({});
    mockedGetMarketStreams.mockResolvedValue({ global: 10_000_000 });
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hate-that': { v: 'video-id' },
    });
    mockedGetHeroVideoUrl.mockReturnValue('/hero.mp4');
    mockedGetErrorMessage.mockImplementation((error: unknown, fallback: string) => (
      error instanceof Error ? error.message : fallback
    ));
  });

  it('applies the bottom fade to the chart video hero', async () => {
    render(<ChartTypeDatePage />);

    const heading = await screen.findByRole('heading', { name: 'Global' });

    expectHeroBottomFade(heading.closest('section'));
  });

  it('keeps the filter search spacing tight before the table', async () => {
    render(<ChartTypeDatePage />);

    const filter = await screen.findByPlaceholderText('Filter by song or artist');
    const hero = filter.closest('section');
    const heroContent = filter.closest('.mx-auto');

    expect(hero).not.toHaveClass('mb-2');
    expect(heroContent).toHaveClass('gap-5');
    expect(heroContent).toHaveClass('pb-5');
    expect(heroContent).not.toHaveClass('pb-8');
  });

  it('reserves the #1 highlight slot while chart data is loading', () => {
    mockedGetLatest.mockReturnValue(new Promise(() => {}));

    render(<ChartTypeDatePage />);

    const heading = screen.getByRole('heading', { name: 'Global' });
    const hero = heading.closest('section');
    const heroSlot = hero?.querySelector('[data-testid="chart-hero-highlight"]');

    expect(heroSlot).toBeInTheDocument();
    expect(heroSlot).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('#1 right now')).not.toBeInTheDocument();
  });

  it('uses a video from the #1 artist when the artists chart has a linked song video', async () => {
    mockParams = { country: 'global', type: 'artists', date: 'latest' };
    mockedGetChartArtistsDaily.mockResolvedValue([
      {
        rank: 1,
        uri: 'spotify:artist:ariana',
        artist_name: 'Ariana Grande',
        image_url: 'https://i.scdn.co/image/ariana.jpg',
        peak_rank: 1,
        previous_rank: 2,
        days_on_chart: 100,
        consecutive_days: 20,
        entry_status: 'STANDARD',
        peak_date: '2026-06-04',
        entry_rank: 4,
        entry_date: '2026-01-01',
      },
    ]);
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [
          {
            track_uri: 'spotify:track:no-video',
            track_name: 'no video',
            image_url: 'https://i.scdn.co/image/no-video.jpg',
            positions: [{ country: 'global', rank: 8, streams: 1_000_000 }],
          },
          {
            track_uri: 'spotify:track:hate-that',
            track_name: 'hate that i made you love me',
            image_url: 'https://i.scdn.co/image/hate-that.jpg',
            positions: [{ country: 'global', rank: 1, streams: 6_300_000 }],
          },
        ],
        positions: [],
      },
    });
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hate-that': { v: 'video-id' },
    });

    render(<ChartTypeDatePage />);

    const heading = await screen.findByRole('heading', { name: 'Global' });
    const hero = heading.closest('section');

    await waitFor(() => {
      expect(hero?.querySelector('video')).toHaveAttribute('src', '/hero.mp4');
    });
    expect(mockedGetHeroVideoUrl).toHaveBeenCalledWith('hate-that');
  });
});
