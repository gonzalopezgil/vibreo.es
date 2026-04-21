'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function ImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-6 right-6 bg-zinc-900 border border-zinc-700 rounded-full p-2.5 text-zinc-100 hover:bg-zinc-800 transition z-10 shadow-lg"
      >
        <X size={28} />
      </button>
      <Image
        src={src}
        alt={alt}
        width={600}
        height={600}
        className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
