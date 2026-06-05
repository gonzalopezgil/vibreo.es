import type React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from '@/app/search/page';
import { searchAll } from '@/lib/api';

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
  src: string | { src: string };
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : src.src} {...props} />
  ),
}));

jest.mock('@/lib/api', () => ({
  getErrorMessage: jest.fn((error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
  )),
  searchAll: jest.fn(),
}));

const mockedSearchAll = jest.mocked(searchAll);

const searchResponse = {
  query: 'Ariana Grande',
  topResult: {
    type: 'artist' as const,
    uri: 'spotify:artist:ariana',
    title: 'Ariana Grande',
    subtitle: '',
    image_url: '/artist.jpg',
    score: 100,
  },
  artists: [
    {
      type: 'artist' as const,
      uri: 'spotify:artist:ariana',
      title: 'Ariana Grande',
      subtitle: '',
      image_url: '/artist.jpg',
      score: 100,
    },
    {
      type: 'artist' as const,
      uri: 'spotify:artist:other',
      title: 'Ariana Sessions',
      subtitle: '',
      image_url: '',
      score: 70,
    },
  ],
  songs: [
    {
      type: 'song' as const,
      uri: 'spotify:track:song-1',
      title: 'Save Your Tears (Remix)',
      subtitle: 'The Weeknd, Ariana Grande',
      image_url: '/song.jpg',
      score: 90,
    },
  ],
  albums: [
    {
      type: 'album' as const,
      uri: 'spotify:album:album-1',
      title: 'eternal sunshine',
      subtitle: 'Ariana Grande',
      image_url: '/album.jpg',
      score: 80,
    },
  ],
  meta: {
    interpretedIntent: 'artist' as const,
    totalCandidates: 4,
  },
};

describe('SearchPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedSearchAll.mockResolvedValue(searchResponse);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('keeps every result group on the same responsive width anchor', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search songs, artists or albums'), 'Ariana Grande');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => expect(mockedSearchAll).toHaveBeenCalledWith('Ariana Grande'));
    await screen.findByText('Top result');

    const topCard = screen.getByText('Top result').closest('a');
    const resultStack = topCard?.parentElement;
    const songsSection = screen.getByRole('heading', { name: 'Songs' }).closest('section');
    const artistsSection = screen.getByRole('heading', { name: 'Artists' }).closest('section');
    const albumsSection = screen.getByRole('heading', { name: 'Albums' }).closest('section');

    expect(resultStack).toHaveClass('space-y-8');
    expect(songsSection?.parentElement).toBe(resultStack);
    expect(artistsSection?.parentElement).toBe(resultStack);
    expect(albumsSection?.parentElement).toBe(resultStack);
    expect(resultStack).not.toHaveClass('lg:grid-cols-2');
  });
});
