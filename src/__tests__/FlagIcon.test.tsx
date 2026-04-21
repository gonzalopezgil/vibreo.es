import type React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: React.ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

import { FlagIcon } from '@/components/FlagIcon';

describe('FlagIcon', () => {
  it('renders a globe icon for the global code', () => {
    render(<FlagIcon code="global" size={18} className="extra-class" />);

    expect(screen.getByLabelText('Global')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a placeholder block for invalid country codes', () => {
    const { container } = render(<FlagIcon code="123" size={24} />);
    const placeholder = container.firstChild as HTMLElement;

    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).toHaveStyle({ width: '24px', height: '18px' });
  });

  it('renders a country flag image for valid ISO codes', () => {
    render(<FlagIcon code="ES" size={20} />);

    const flag = screen.getByRole('img', { name: 'ES' });
    expect(flag).toHaveAttribute('src', 'https://flagcdn.com/w40/es.png');
    expect(flag).toHaveAttribute('width', '20');
    expect(flag).toHaveAttribute('height', '15');
  });
});
