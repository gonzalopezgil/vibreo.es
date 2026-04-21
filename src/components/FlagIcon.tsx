'use client';

import Image from 'next/image';
import { Globe } from 'lucide-react';

interface FlagIconProps {
  code: string;
  size?: number;
  className?: string;
}

export function FlagIcon({ code, size = 20, className = '' }: FlagIconProps) {
  const lowerCode = code.toLowerCase();

  if (lowerCode === 'global' || lowerCode === 'xw') {
    return (
      <Globe
        size={size}
        className={`text-blue-400 ${className}`}
        aria-label="Global"
      />
    );
  }

  if (!/^[a-z]{2}$/.test(lowerCode)) {
    return <span className={`inline-block rounded-sm bg-zinc-700 ${className}`} style={{ width: size, height: Math.round(size * 0.75) }} />;
  }

  return (
    <Image
      src={`https://flagcdn.com/w40/${lowerCode}.png`}
      alt={lowerCode.toUpperCase()}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block rounded-sm ${className}`}
      unoptimized
    />
  );
}
