import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ListenerChartPage from '@/app/charts/listeners/page';
import {
  getArtistListener,
  getChartingArtists,
  getChartingListenersPage,
  getErrorMessage,
  getHeroVideoUrl,
  getYouTubeLinks,
  searchAll,
} from '@/lib/api';

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
  getArtistListener: jest.fn(),
  getChartingArtists: jest.fn(),
  getChartingListenersPage: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  getHeroVideoUrl: jest.fn(),
  getYouTubeLinks: jest.fn(),
  searchAll: jest.fn(),
}));

const mockedGetArtistListener = jest.mocked(getArtistListener);
const mockedGetChartingArtists = jest.mocked(getChartingArtists);
const mockedGetChartingListenersPage = jest.mocked(getChartingListenersPage);
const mockedGetErrorMessage = jest.mocked(getErrorMessage);
const mockedGetHeroVideoUrl = jest.mocked(getHeroVideoUrl);
const mockedGetYouTubeLinks = jest.mocked(getYouTubeLinks);
const mockedSearchAll = jest.mocked(searchAll);

describe('ListenerChartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockedGetArtistListener.mockResolvedValue({
      artist_uri: 'spotify:artist:alpha',
      artist_id: 'alpha',
      artist_name: 'Alpha Artist',
      image_url: 'https://i.scdn.co/image/alpha.jpg',
      rank: 1,
      previous_rank: 3,
      listeners: 100_000_000,
      daily_change: 10_000,
      peak_rank: 1,
      peak_listeners: 105_000_000,
    });
    mockedGetChartingArtists.mockResolvedValue({});
    mockedGetHeroVideoUrl.mockReturnValue('/hero.mp4');
    mockedGetYouTubeLinks.mockResolvedValue({});
    mockedSearchAll.mockResolvedValue({
      query: '',
      topResult: null,
      artists: [],
      songs: [],
      albums: [],
      meta: {
        interpretedIntent: 'mixed',
        totalCandidates: 0,
      },
    });
    mockedGetErrorMessage.mockImplementation((error: unknown, fallback: string) => (
      error instanceof Error ? error.message : fallback
    ));
  });

  it('loads listener chart rows one page at a time', async () => {
    mockedGetChartingListenersPage
      .mockResolvedValueOnce({
        items: [
          {
            artist_uri: 'spotify:artist:alpha',
            artist_id: 'alpha',
            artist_name: 'Alpha Artist',
            image_url: 'https://i.scdn.co/image/alpha.jpg',
            rank: 1,
            previous_rank: 3,
            listeners: 100_000_000,
            daily_change: 10_000,
            peak_rank: 1,
            peak_listeners: 105_000_000,
          },
          {
            artist_uri: 'spotify:artist:bravo',
            artist_id: 'bravo',
            artist_name: 'Bravo Artist',
            image_url: 'https://i.scdn.co/image/bravo.jpg',
            rank: 2,
            previous_rank: null,
            listeners: 90_000_000,
            daily_change: -5_000,
            peak_rank: 1,
            peak_listeners: 92_000_000,
          },
        ],
        limit: 100,
        nextOffset: 100,
        offset: 0,
        total: 101,
      })
      .mockResolvedValueOnce({
        items: [
          {
            artist_uri: 'spotify:artist:charlie',
            artist_id: 'charlie',
            artist_name: 'Charlie Artist',
            image_url: '',
            rank: 101,
            previous_rank: 99,
            listeners: 50_000_000,
            daily_change: 0,
            peak_rank: null,
            peak_listeners: 50_000_000,
          },
        ],
        limit: 100,
        nextOffset: null,
        offset: 100,
        total: 101,
      });

    render(<ListenerChartPage />);

    expect(await screen.findByRole('heading', { name: 'Monthly Listeners' })).toBeInTheDocument();
    const table = await screen.findByTestId('listener-chart-table');
    expect(within(table).getByText('Alpha Artist')).toBeInTheDocument();
    const alphaRow = screen.getByRole('link', { name: /Alpha Artist/i });
    expect(within(alphaRow).getByText('▲2')).toBeInTheDocument();
    expect(within(alphaRow).queryByText('▲10.0K')).not.toBeInTheDocument();
    expect(screen.getByText('100.0M')).toBeInTheDocument();
    expect(within(alphaRow).queryByText('100.0M listeners')).not.toBeInTheDocument();
    expect(screen.getByText('+10.0K daily')).toBeInTheDocument();
    expect(screen.getByText('Peak #1 · 105.0M')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha Artist/i })).toHaveAttribute('href', '/artist/alpha');
    const bravoRow = screen.getByRole('link', { name: /Bravo Artist/i });
    expect(within(bravoRow).getByText('-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load more/i }));

    expect(await screen.findByText('Charlie Artist')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
    });
    expect(mockedGetChartingListenersPage).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(mockedGetChartingListenersPage).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 });
  });

  it('uses the same chart shell conventions as the artist chart page without chart tabs or count copy', async () => {
    mockedGetChartingListenersPage.mockResolvedValueOnce({
      items: [
        {
          artist_uri: 'spotify:artist:alpha',
          artist_id: 'alpha',
          artist_name: 'Alpha Artist',
          image_url: 'https://i.scdn.co/image/alpha.jpg',
          rank: 1,
          previous_rank: null,
          listeners: 100_000_000,
          daily_change: 10_000,
          peak_rank: 1,
          peak_listeners: 105_000_000,
        },
      ],
      limit: 100,
      nextOffset: null,
      offset: 0,
      total: 1,
    });

    render(<ListenerChartPage />);

    const heading = await screen.findByRole('heading', { name: 'Monthly Listeners' });
    const hero = heading.closest('section');

    expect(hero).toHaveClass('after:bg-gradient-to-b');
    expect(screen.getByText('Spotify Monthly Listeners')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Monthly Listener Chart' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Songs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Artists' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Albums' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Listeners' })).not.toBeInTheDocument();
    expect(screen.queryByText(/loaded/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search artists')).toBeInTheDocument();

    const table = screen.getByTestId('listener-chart-table');
    expect(table).toHaveClass('rounded-none');
    expect(table).toHaveClass('border-y');
    expect(table).toHaveClass('sm:rounded-2xl');
    expect(within(table).getByText('#')).toBeInTheDocument();
    expect(within(table).getByText('Artist')).toBeInTheDocument();
    expect(within(table).getByText('Listeners')).toBeInTheDocument();
  });

  it('uses a video from the #1 listener artist when the artist has a linked song video', async () => {
    mockedGetChartingListenersPage.mockResolvedValueOnce({
      items: [
        {
          artist_uri: 'spotify:artist:alpha',
          artist_id: 'alpha',
          artist_name: 'Alpha Artist',
          image_url: 'https://i.scdn.co/image/alpha.jpg',
          rank: 1,
          previous_rank: null,
          listeners: 100_000_000,
          daily_change: 10_000,
          peak_rank: 1,
          peak_listeners: 105_000_000,
        },
      ],
      limit: 100,
      nextOffset: null,
      offset: 0,
      total: 1,
    });
    mockedGetChartingArtists.mockResolvedValue({
      'spotify:artist:alpha': {
        songs: [
          {
            track_uri: 'spotify:track:no-video',
            track_name: 'no video',
            image_url: 'https://i.scdn.co/image/no-video.jpg',
            positions: [],
          },
          {
            track_uri: 'spotify:track:hero-song',
            track_name: 'hero song',
            image_url: 'https://i.scdn.co/image/hero-song.jpg',
            positions: [],
          },
        ],
      },
    });
    mockedGetYouTubeLinks.mockResolvedValue({
      'spotify:track:hero-song': { v: 'video-id' },
    });

    render(<ListenerChartPage />);

    const heading = await screen.findByRole('heading', { name: 'Monthly Listeners' });
    const hero = heading.closest('section');

    await waitFor(() => {
      expect(hero?.querySelector('video')).toHaveAttribute('src', '/hero.mp4');
    });
    expect(mockedGetHeroVideoUrl).toHaveBeenCalledWith('hero-song');
  });

  it('searches the global catalog instead of filtering only loaded listener rows', async () => {
    mockedGetChartingListenersPage.mockResolvedValueOnce({
      items: [
        {
          artist_uri: 'spotify:artist:alpha',
          artist_id: 'alpha',
          artist_name: 'Alpha Artist',
          image_url: 'https://i.scdn.co/image/alpha.jpg',
          rank: 1,
          previous_rank: null,
          listeners: 100_000_000,
          daily_change: 10_000,
          peak_rank: 1,
          peak_listeners: 105_000_000,
        },
      ],
      limit: 100,
      nextOffset: 100,
      offset: 0,
      total: 25_000,
    });
    mockedSearchAll.mockResolvedValueOnce({
      query: 'global-only artist',
      topResult: null,
      artists: [
        {
          type: 'artist',
          uri: 'spotify:artist:zulu',
          title: 'Zulu Artist',
          subtitle: 'Artist',
          image_url: 'https://i.scdn.co/image/zulu.jpg',
          score: 0.98,
        },
      ],
      songs: [],
      albums: [],
      meta: {
        interpretedIntent: 'artist',
        totalCandidates: 25_000,
      },
    });
    mockedGetArtistListener.mockResolvedValueOnce({
      artist_uri: 'spotify:artist:zulu',
      artist_id: 'zulu',
      artist_name: 'Zulu Artist',
      image_url: 'https://i.scdn.co/image/zulu.jpg',
      rank: 812,
      previous_rank: 820,
      listeners: 12_300_000,
      daily_change: 123_000,
      peak_rank: 700,
      peak_listeners: 12_800_000,
    });

    render(<ListenerChartPage />);

    const table = await screen.findByTestId('listener-chart-table');
    expect(await within(table).findByText('Alpha Artist')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search artists'), { target: { value: 'global-only artist' } });

    await waitFor(() => expect(mockedSearchAll).toHaveBeenCalledWith('global-only artist'));
    await waitFor(() => expect(mockedGetArtistListener).toHaveBeenCalledWith('zulu'));

    expect(within(table).queryByText('Alpha Artist')).not.toBeInTheDocument();
    expect(within(table).getByText('Zulu Artist')).toBeInTheDocument();
    expect(within(table).getByText('12.3M')).toBeInTheDocument();
    expect(screen.queryByText(/1 of 1/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });
});
