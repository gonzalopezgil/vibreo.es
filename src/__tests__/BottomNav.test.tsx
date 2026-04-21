import type React from 'react';
import { render, screen } from '@testing-library/react';

const mockUsePathname = jest.fn();

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

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { BottomNav } from '@/components/BottomNav';

describe('BottomNav', () => {
  it('renders links for the main navigation tabs', () => {
    mockUsePathname.mockReturnValue('/');

    render(<BottomNav />);

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /charts/i })).toHaveAttribute('href', '/charts');
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
  });

  it('marks the home tab active only on the exact root path', () => {
    mockUsePathname.mockReturnValue('/');

    render(<BottomNav />);

    expect(screen.getByRole('link', { name: /home/i })).toHaveClass('text-white');
    expect(screen.getByRole('link', { name: /charts/i })).toHaveClass('text-zinc-500');
  });

  it('marks nested chart routes as active', () => {
    mockUsePathname.mockReturnValue('/charts/global');

    render(<BottomNav />);

    expect(screen.getByRole('link', { name: /charts/i })).toHaveClass('text-white');
    expect(screen.getByRole('link', { name: /search/i })).toHaveClass('text-zinc-500');
    expect(screen.getByRole('link', { name: /home/i })).toHaveClass('text-zinc-500');
  });
});
