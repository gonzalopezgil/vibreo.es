'use client';

/**
 * VideoHero — Reusable video background hero component.
 *
 * Shows a looping, muted, autoplaying video as an ambient background.
 * Falls back gracefully to a gradient if no video is provided or if the
 * browser can't play the video.
 *
 * Usage:
 *   <VideoHero videoSrc="/videos/hero-babydoll.mp4">
 *     <h1>Your overlay content</h1>
 *   </VideoHero>
 */

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface VideoHeroProps {
  /** Path to the MP4 video file (relative to /public, e.g. "/videos/hero-babydoll.mp4") */
  videoSrc?: string | null;
  /**
   * Tailwind gradient classes for the dark overlay between video and content.
   * Defaults to a standard dark-to-transparent gradient.
   */
  overlayClassName?: string;
  /**
   * Fallback background classes applied when no video is present or video fails.
   * Defaults to a dark zinc gradient matching the HeroSpotlight component.
   */
  fallbackClassName?: string;
  /** Overlay content rendered on top of the video */
  children?: ReactNode;
  /** Extra classes applied to the outer wrapper */
  className?: string;
  /** Allow popovers inside the hero to escape the section bounds */
  allowOverflow?: boolean;
  /** aria-label for the section element */
  label?: string;
}

export function VideoHero({
  videoSrc,
  overlayClassName = 'bg-gradient-to-b from-black/60 via-black/40 to-zinc-950',
  fallbackClassName = 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800',
  children,
  className = '',
  allowOverflow = false,
  label,
}: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Fade the video in once it's loaded enough to play
  useEffect(() => {
    if (!videoSrc) return;
    const vid = videoRef.current;
    if (!vid) return;

    const handleReady = () => {
      setVideoReady(true);
      vid.play().catch(() => {}); // Ensure play starts
    };
    const handleError = () => setVideoFailed(true);

    vid.addEventListener('canplaythrough', handleReady);
    vid.addEventListener('loadeddata', handleReady);
    vid.addEventListener('error', handleError);

    // If already ready (e.g. hot reload), update on the next frame to avoid
    // cascading a synchronous render from inside the effect body.
    let readyFrame: number | null = null;
    if (vid.readyState >= 3) {
      readyFrame = requestAnimationFrame(handleReady);
    }

    return () => {
      if (readyFrame !== null) cancelAnimationFrame(readyFrame);
      vid.removeEventListener('canplaythrough', handleReady);
      vid.removeEventListener('loadeddata', handleReady);
      vid.removeEventListener('error', handleError);
    };
  }, [videoSrc]);

  const hasVideo = !!videoSrc && !videoFailed;

  return (
    <section
      aria-label={label}
      className={`relative ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${className}`}
    >
      {/* ── Background layer ──────────────────────────────────── */}
      {/* Fallback gradient — always rendered, hidden by video once ready */}
      <div
        className={`absolute inset-0 ${fallbackClassName} transition-opacity duration-700 ${
          hasVideo && videoReady ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Video background */}
      {hasVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
          tabIndex={-1}
          src={videoSrc!}
        />
      )}

      {/* ── Dark gradient overlay (always present on top of video) ── */}
      {hasVideo && (
        <div
          className={`absolute inset-0 ${overlayClassName} pointer-events-none`}
          aria-hidden="true"
        />
      )}

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
