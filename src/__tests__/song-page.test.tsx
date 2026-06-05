import type React from 'react';
import { render, screen } from '@testing-library/react';
import SongPage from '@/app/song/[id]/page';
import {
  getChartingSongs,
  getErrorMessage,
  getHeroVideoUrl,
  getMarketStreams,
  getSong,
  getYouTubeLinks,
} from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'hate-that' }),
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
  getChartingSongs: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getMarketStreams: jest.fn(),
  getSong: jest.fn(),
  getYouTubeLinks: jest.fn(),
}));

const mockedGetSong = jest.mocked(getSong);
const mockedGetChartingSongs = jest.mocked(getChartingSongs);
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

describe('SongPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSong.mockResolvedValue({
      track_uri: 'spotify:track:hate-that',
      track_name: 'hate that i made you love me',
      artist_names: 'Ariana Grande',
      artist_uris: 'spotify:artist:ariana',
      label: 'Republic Records',
      release_date: '2026-05-01',
      image_url: 'https://i.scdn.co/image/hate-that.jpg',
    });
    mockedGetChartingSongs.mockResolvedValue({
      'spotify:track:hate-that': [
        { country: 'global', rank: 2, streams: 5_452_802 },
      ],
    });
    mockedGetMarketStreams.mockResolvedValue({});
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hate-that': { v: 'video-id' },
    });
    mockedGetHeroVideoUrl.mockReturnValue('/hero.mp4');
    mockedGetErrorMessage.mockImplementation((error: unknown, fallback: string) => (
      error instanceof Error ? error.message : fallback
    ));
  });

  it('applies the bottom fade to the song video hero', async () => {
    render(<SongPage />);

    const heading = await screen.findByRole('heading', { name: 'hate that i made you love me' });

    expectHeroBottomFade(heading.closest('section'));
  });
});
