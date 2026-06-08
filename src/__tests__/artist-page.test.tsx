import type React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import ArtistPage from '@/app/artist/[id]/page';
import {
  getArtist,
  getArtistChannels,
  getArtistListener,
  getChartingAlbums,
  getChartingArtists,
  getChartingListeners,
  getErrorMessage,
  getHeroVideoUrl,
  getYouTubeLinks,
} from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ariana' }),
  useRouter: () => ({ back: jest.fn() }),
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
  getArtist: jest.fn(),
  getArtistChannels: jest.fn(),
  getArtistListener: jest.fn(),
  getChartingAlbums: jest.fn(),
  getChartingArtists: jest.fn(),
  getChartingListeners: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getYouTubeLinks: jest.fn(),
}));

const mockedGetArtist = jest.mocked(getArtist);
const mockedGetArtistListener = jest.mocked(getArtistListener);
const mockedGetChartingArtists = jest.mocked(getChartingArtists);
const mockedGetChartingListeners = jest.mocked(getChartingListeners);
const mockedGetChartingAlbums = jest.mocked(getChartingAlbums);
const mockedGetArtistChannels = jest.mocked(getArtistChannels);
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

describe('ArtistPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetArtist.mockResolvedValue({
      artist_uri: 'spotify:artist:ariana',
      artist_name: 'Ariana Grande',
      image_url: 'https://i.scdn.co/image/ariana.jpg',
    });
    mockedGetArtistListener.mockResolvedValue({
      artist_uri: 'spotify:artist:ariana',
      artist_id: 'ariana',
      artist_name: 'Ariana Grande',
      image_url: 'https://i.scdn.co/image/ariana.jpg',
      listeners: 87_388_651,
      daily_change: 271_982,
      rank: 14,
      previous_rank: 16,
      peak_rank: 1,
      peak_listeners: 126_970_279,
    });
    mockedGetChartingAlbums.mockResolvedValue({});
    mockedGetChartingListeners.mockResolvedValue({});
    mockedGetArtistChannels.mockResolvedValue({});
    mockedGetYouTubeLinks.mockResolvedValue({});
    mockedGetHeroVideoUrl.mockReturnValue('/hero.mp4');
    mockedGetErrorMessage.mockImplementation((error: unknown, fallback: string) => (
      error instanceof Error ? error.message : fallback
    ));
  });

  it('applies the bottom fade to the artist video hero', async () => {
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [
          {
            track_uri: 'spotify:track:hate-that',
            track_name: 'hate that i made you love me',
            image_url: 'https://i.scdn.co/image/hate-that.jpg',
            positions: [{ country: 'global', rank: 2, streams: 5_452_802 }],
          },
        ],
        positions: [],
      },
    });
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hate-that': { v: 'video-id' },
    });

    render(<ArtistPage />);

    const heading = await screen.findByRole('heading', { name: 'Ariana Grande' });

    expectHeroBottomFade(heading.closest('section'));
  });

  it('uses the global rank for globally charting songs', async () => {
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [
          {
            track_uri: 'spotify:track:hate-that',
            track_name: 'hate that i made you love me',
            image_url: 'https://i.scdn.co/image/hate-that.jpg',
            positions: [
              { country: 'global', rank: 2, streams: 5_452_802 },
              { country: 'us', rank: 3, streams: 3_000_000 },
              { country: 'gb', rank: 7, streams: 1_900_000 },
            ],
          },
        ],
        positions: [],
      },
    });

    render(<ArtistPage />);

    expect(await screen.findByText('hate that i made you love me')).toBeInTheDocument();
    expect(screen.getByText('5.5M · 3 markets · #2 Global')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/10\.4M/)).not.toBeInTheDocument();
    });
  });

  it('uses the highest-streaming country rank when a song is not charting globally', async () => {
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [
          {
            track_uri: 'spotify:track:local-song',
            track_name: 'local song',
            image_url: 'https://i.scdn.co/image/local-song.jpg',
            positions: [
              { country: 'gb', rank: 2, streams: 500_000 },
              { country: 'us', rank: 12, streams: 1_000_000 },
              { country: 'br', rank: 20, streams: 1_400_000 },
            ],
          },
        ],
        positions: [],
      },
    });

    render(<ArtistPage />);

    expect(await screen.findByText('local song')).toBeInTheDocument();
    expect(screen.getByText('2.9M · 3 markets · #20 Brazil')).toBeInTheDocument();
  });

  it('renders monthly listener metrics in a dedicated panel before chart tabs', async () => {
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [
          {
            track_uri: 'spotify:track:one',
            track_name: 'song one',
            image_url: 'https://i.scdn.co/image/one.jpg',
            positions: [{ country: 'global', rank: 1, streams: 3_000_000 }],
          },
          {
            track_uri: 'spotify:track:two',
            track_name: 'song two',
            image_url: 'https://i.scdn.co/image/two.jpg',
            positions: [{ country: 'us', rank: 2, streams: 2_000_000 }],
          },
          {
            track_uri: 'spotify:track:three',
            track_name: 'song three',
            image_url: 'https://i.scdn.co/image/three.jpg',
            positions: [{ country: 'gb', rank: 3, streams: 2_700_000 }],
          },
        ],
        positions: [],
      },
    });

    render(<ArtistPage />);

    expect(await screen.findByRole('heading', { name: 'Spotify monthly listeners' })).toBeInTheDocument();
    const panel = screen.getByTestId('monthly-listeners-panel');
    const currentListenersChip = screen.getByText('87.4M monthly listeners');

    expect(panel).toHaveClass('overflow-hidden');
    expect(panel).toHaveClass('rounded-2xl');
    expect(panel).toHaveClass('border-zinc-800/60');
    expect(currentListenersChip).toHaveClass('bg-amber-500/15');
    expect(currentListenersChip).toHaveClass('text-amber-300');
    expect(within(panel).queryByText('Ariana Grande')).not.toBeInTheDocument();
    expect(within(panel).queryByAltText('Ariana Grande')).not.toBeInTheDocument();
    expect(within(panel).getByText('Current listeners')).toBeInTheDocument();
    expect(within(panel).getByText('Current position')).toBeInTheDocument();
    expect(within(panel).getByText('Peak listeners')).toBeInTheDocument();
    expect(within(panel).getByText('Peak position')).toBeInTheDocument();
    expect(within(panel).getByText('87.4M')).toBeInTheDocument();
    expect(within(panel).getByText('▲2')).toBeInTheDocument();
    expect(within(panel).queryByText('▲272.0K')).not.toBeInTheDocument();
    expect(within(panel).getByText('Up 2 today')).toBeInTheDocument();
    expect(screen.queryByText('+272.0K daily')).not.toBeInTheDocument();
    expect(within(panel).getByText('#14')).toBeInTheDocument();
    expect(within(panel).getByText('127.0M')).toBeInTheDocument();
    expect(within(panel).getByText('#1')).toBeInTheDocument();
    expect(within(panel).queryByText(/Songs charting/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Markets/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Daily filtered streams/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText('3 songs charting')).not.toBeInTheDocument();
    expect(within(panel).queryByText('3 markets')).not.toBeInTheDocument();
    expect(within(panel).queryByText('7.7M')).not.toBeInTheDocument();
    expect(screen.getByText('3 songs charting')).toHaveClass('bg-green-500/15');
    expect(screen.getByText('3 markets')).toHaveClass('bg-blue-500/15');
    expect(screen.getByText('7.7M daily filtered streams')).toHaveClass('bg-zinc-700/50');
    expect(within(panel).getByRole('link', { name: /Full chart/i })).toHaveAttribute('href', '/charts/listeners');
    expect(within(panel).queryByText('Global listener chart position')).not.toBeInTheDocument();
    expect(screen.queryByText('Chart rank')).not.toBeInTheDocument();
  });

  it('requests only this artist listener record instead of the full listener map', async () => {
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:ariana': {
        songs: [],
        positions: [],
      },
    });
    mockedGetArtistListener.mockResolvedValue({
      artist_uri: 'spotify:artist:ariana',
      artist_id: 'ariana',
      artist_name: 'Ariana Grande',
      image_url: 'https://i.scdn.co/image/ariana.jpg',
      listeners: 88_000_000,
      daily_change: -50_000,
      rank: 13,
      previous_rank: 12,
      peak_rank: 1,
      peak_listeners: 126_970_279,
    });

    render(<ArtistPage />);

    expect(await screen.findByText('88.0M monthly listeners')).toBeInTheDocument();
    const panel = screen.getByTestId('monthly-listeners-panel');

    expect(within(panel).getByText('88.0M')).toBeInTheDocument();
    expect(screen.getByText('▼1')).toBeInTheDocument();
    expect(screen.getByText('Down 1 today')).toBeInTheDocument();
    expect(screen.queryByText('-50.0K daily')).not.toBeInTheDocument();
    expect(screen.getByText('#13')).toBeInTheDocument();
    expect(mockedGetArtistListener).toHaveBeenCalledWith('ariana');
    expect(mockedGetChartingListeners).not.toHaveBeenCalled();
  });
});
