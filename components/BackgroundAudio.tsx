import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const AUDIO_SRC = '/audio/orbits.mp3';
const POSITION_KEY = 'violet_background_audio_position';
const VOLUME = 0.46;

let audioElement: HTMLAudioElement | null = null;
let savePositionTimer: number | null = null;

const getAudioElement = () => {
  if (!audioElement) {
    audioElement = new Audio(AUDIO_SRC);
    audioElement.loop = true;
    audioElement.preload = 'auto';
    audioElement.volume = VOLUME;
    audioElement.crossOrigin = 'anonymous';

    const savedPosition = Number(localStorage.getItem(POSITION_KEY) || '0');
    if (Number.isFinite(savedPosition) && savedPosition > 0) {
      audioElement.currentTime = savedPosition;
    }
  }

  return audioElement;
};

const savePosition = () => {
  if (!audioElement || !Number.isFinite(audioElement.currentTime)) {
    return;
  }

  localStorage.setItem(POSITION_KEY, String(audioElement.currentTime));
};

export const BackgroundAudio: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = getAudioElement();

    const syncPlayingState = () => {
      setIsPlaying(!audio.paused);
    };

    const prepareAudio = () => {
      audio.muted = false;
      audio.loop = true;
      audio.volume = VOLUME;
      if (audio.readyState === 0) {
        audio.load();
      }
    };

    const tryPlay = async () => {
      if (!enabled) {
        audio.pause();
        syncPlayingState();
        return;
      }

      try {
        prepareAudio();
        await audio.play();
        syncPlayingState();
      } catch {
        syncPlayingState();
      }
    };

    const unlockPlayback = (event?: Event) => {
      const target = event?.target;
      if (target instanceof Element && target.closest('[data-audio-toggle="true"]')) {
        return;
      }

      if (enabled && audio.paused) {
        void tryPlay();
      }
    };

    audio.addEventListener('play', syncPlayingState);
    audio.addEventListener('pause', syncPlayingState);
    audio.addEventListener('canplay', unlockPlayback);
    audio.addEventListener('canplaythrough', unlockPlayback);

    document.addEventListener('pointerdown', unlockPlayback, true);
    document.addEventListener('pointerup', unlockPlayback, true);
    document.addEventListener('touchstart', unlockPlayback, true);
    document.addEventListener('click', unlockPlayback, true);
    document.addEventListener('keydown', unlockPlayback, true);
    document.addEventListener('visibilitychange', unlockPlayback);
    window.addEventListener('violet-audio-unlock', unlockPlayback);
    void tryPlay();

    if (savePositionTimer === null) {
      savePositionTimer = window.setInterval(savePosition, 3000);
    }

    return () => {
      audio.removeEventListener('play', syncPlayingState);
      audio.removeEventListener('pause', syncPlayingState);
      audio.removeEventListener('canplay', unlockPlayback);
      audio.removeEventListener('canplaythrough', unlockPlayback);
      document.removeEventListener('pointerdown', unlockPlayback, true);
      document.removeEventListener('pointerup', unlockPlayback, true);
      document.removeEventListener('touchstart', unlockPlayback, true);
      document.removeEventListener('click', unlockPlayback, true);
      document.removeEventListener('keydown', unlockPlayback, true);
      document.removeEventListener('visibilitychange', unlockPlayback);
      window.removeEventListener('violet-audio-unlock', unlockPlayback);
    };
  }, [enabled]);

  useEffect(() => {
    const handleBeforeUnload = () => savePosition();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const toggleAudio = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const audio = getAudioElement();

    if (enabled && !audio.paused) {
      savePosition();
      audio.pause();
      setEnabled(false);
      setIsPlaying(false);
      return;
    }

    setEnabled(true);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <button
      type="button"
      data-audio-toggle="true"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={toggleAudio}
      className="fixed right-4 bottom-24 md:bottom-4 z-[170] flex h-10 w-10 items-center justify-center rounded-full border border-purple-300/30 bg-[#0f0716]/90 text-purple-100 shadow-[0_0_22px_rgba(147,51,234,0.24)] backdrop-blur-md transition-all hover:border-purple-200/70 hover:bg-purple-900/60"
      title={enabled ? (isPlaying ? 'Music on' : 'Music ready') : 'Music off'}
      aria-label={enabled ? 'Turn background music off' : 'Turn background music on'}
      aria-pressed={enabled}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
};
