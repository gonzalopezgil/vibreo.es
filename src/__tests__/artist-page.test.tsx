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

  it('uses global streams for globally charting songs while keeping market count and top country rank', async () => {
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
    expect(screen.getByText('5.5M · 3 markets · #3 USA')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/10\.4M/)).not.toBeInTheDocument();
    });
  });
});
