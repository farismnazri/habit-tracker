'use client';

import { useEffect, useRef, useState } from 'react';

const AUDIO_SRC = '/audio/sailor-star-song-soft-melody.mp3';
const AUDIO_PREF_KEY = 'habits:bgm-enabled';
const AUDIO_VOLUME = 0.18;

function PinkMaskIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-5 w-5"
      style={{
        backgroundColor: 'var(--color-active)',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

export function BackgroundMusicToggle() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(AUDIO_PREF_KEY);
    setEnabled(saved === '1');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = AUDIO_VOLUME;
    audio.loop = true;

    if (!enabled) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      // iOS may block autoplay until a user tap; the toggle click can retry.
    });
  }, [enabled, hydrated]);

  function toggleAudio() {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(AUDIO_PREF_KEY, next ? '1' : '0');
  }

  const label = enabled ? 'Mute background music' : 'Play background music';

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" loop className="hidden" />
      <button
        type="button"
        onClick={toggleAudio}
        aria-pressed={enabled}
        aria-label={label}
        title={enabled ? 'Sound on' : 'Sound off'}
        className={[
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-canvas shadow-sm transition',
          enabled ? 'bg-active-soft hover:bg-surface' : 'hover:bg-surface-muted',
        ].join(' ')}
      >
        <PinkMaskIcon src={enabled ? '/ui/audio-volume.svg' : '/ui/audio-mute.svg'} />
        <span className="sr-only">{label}</span>
      </button>
    </>
  );
}
