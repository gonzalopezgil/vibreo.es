import type React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ArtistPage from '@/app/artist/[id]/page';
import {
  getArtist,
  getArtistChannels,
  getChartingAlbums,
  getChartingArtists,
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
  getChartingAlbums: jest.fn(),
  getChartingArtists: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getYouTubeLinks: jest.fn(),
}));

const mockedGetArtist = jest.mocked(getArtist);
const mockedGetChartingArtists = jest.mocked(getChartingArtists);
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
    mockedGetChartingAlbums.mockResolvedValue({});
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
});
