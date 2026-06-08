import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ListenerChartPage from '@/app/charts/listeners/page';
import { getChartingListenersPage, getErrorMessage } from '@/lib/api';

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
  getChartingListenersPage: jest.fn(),
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
}));

const mockedGetChartingListenersPage = jest.mocked(getChartingListenersPage);
const mockedGetErrorMessage = jest.mocked(getErrorMessage);

describe('ListenerChartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(await screen.findByRole('heading', { name: 'Monthly Listener Chart' })).toBeInTheDocument();
    const table = await screen.findByTestId('listener-chart-table');
    expect(within(table).getByText('Alpha Artist')).toBeInTheDocument();
    expect(screen.getByText('100.0M listeners')).toBeInTheDocument();
    expect(screen.getByText('+10.0K daily')).toBeInTheDocument();
    expect(screen.getByText('Peak #1 · 105.0M')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha Artist/i })).toHaveAttribute('href', '/artist/alpha');

    fireEvent.click(screen.getByRole('button', { name: /Load more/i }));

    expect(await screen.findByText('Charlie Artist')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
    });
    expect(mockedGetChartingListenersPage).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(mockedGetChartingListenersPage).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 });
  });

  it('uses the same chart shell conventions as the artist chart page', async () => {
    mockedGetChartingListenersPage.mockResolvedValueOnce({
      items: [
        {
          artist_uri: 'spotify:artist:alpha',
          artist_id: 'alpha',
          artist_name: 'Alpha Artist',
          image_url: 'https://i.scdn.co/image/alpha.jpg',
          rank: 1,
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

    const heading = await screen.findByRole('heading', { name: 'Monthly Listener Chart' });
    const hero = heading.closest('section');

    expect(hero).toHaveClass('after:bg-gradient-to-b');
    expect(screen.getByText('Spotify Monthly Listeners')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/charts/global/songs/latest');
    expect(screen.getByRole('link', { name: 'Artists' })).toHaveAttribute('href', '/charts/global/artists/latest');
    expect(screen.getByRole('link', { name: 'Albums' })).toHaveAttribute('href', '/charts/global/albums/latest');
    expect(screen.getByRole('link', { name: 'Listeners' })).toHaveClass('bg-zinc-700');
    expect(screen.getByPlaceholderText('Filter by artist')).toBeInTheDocument();

    const table = screen.getByTestId('listener-chart-table');
    expect(table).toHaveClass('rounded-none');
    expect(table).toHaveClass('border-y');
    expect(table).toHaveClass('sm:rounded-2xl');
    expect(within(table).getByText('#')).toBeInTheDocument();
    expect(within(table).getByText('Artist')).toBeInTheDocument();
    expect(within(table).getByText('Listeners')).toBeInTheDocument();
  });

  it('filters loaded listener rows using the chart search control', async () => {
    mockedGetChartingListenersPage.mockResolvedValueOnce({
      items: [
        {
          artist_uri: 'spotify:artist:alpha',
          artist_id: 'alpha',
          artist_name: 'Alpha Artist',
          image_url: 'https://i.scdn.co/image/alpha.jpg',
          rank: 1,
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
          listeners: 90_000_000,
          daily_change: -5_000,
          peak_rank: 1,
          peak_listeners: 92_000_000,
        },
      ],
      limit: 100,
      nextOffset: null,
      offset: 0,
      total: 2,
    });

    render(<ListenerChartPage />);

    const table = await screen.findByTestId('listener-chart-table');
    expect(within(table).getByText('Alpha Artist')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Filter by artist'), { target: { value: 'bravo' } });

    expect(within(table).queryByText('Alpha Artist')).not.toBeInTheDocument();
    expect(within(table).getByText('Bravo Artist')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 artists')).toBeInTheDocument();
  });
});
