import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const AMBIENT_AUDIO_SRC = '/audio/god-on-the-code-web.mp3';
const AMBIENT_AUDIO_VOLUME = 0.22;
const STAR_COUNT = 180;
const ACCESS_REQUEST_EMAIL = 'lazarus8engine@gmail.com';
const ACCESS_REQUEST_ENDPOINT = `https://formsubmit.co/ajax/${ACCESS_REQUEST_EMAIL}`;

let ambientAudioElement: HTMLAudioElement | null = null;

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  depth: number;
  phase: number;
  tone: 'silver' | 'warm';
};

type CouncilIconStyle = CSSProperties & {
  '--council-icon': string;
};

const seededNoise = (seed: number) => {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
};

const getCouncilIconStyle = (icon: string): CouncilIconStyle => ({
  '--council-icon': `url(${icon})`,
});

const createStarMap = (): Star[] =>
  Array.from({ length: STAR_COUNT }, (_, index) => {
    const depth = 0.35 + seededNoise(index + 13) * 0.85;

    return {
      x: seededNoise(index + 1),
      y: seededNoise(index + 7),
      radius: 0.45 + seededNoise(index + 19) * 1.25,
      alpha: 0.12 + seededNoise(index + 29) * 0.38,
      speed: 2.8 + seededNoise(index + 37) * 11,
      depth,
      phase: seededNoise(index + 43) * Math.PI * 2,
      tone: seededNoise(index + 53) > 0.72 ? 'warm' : 'silver',
    };
  });

const stars = createStarMap();

const getAmbientAudioElement = () => {
  if (!ambientAudioElement) {
    ambientAudioElement = new Audio(AMBIENT_AUDIO_SRC);
    ambientAudioElement.loop = true;
    ambientAudioElement.preload = 'auto';
    ambientAudioElement.volume = AMBIENT_AUDIO_VOLUME;
    ambientAudioElement.crossOrigin = 'anonymous';
  }

  return ambientAudioElement;
};

function StarfieldBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const backdrop = backdropRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !backdrop || !context) {
      return;
    }

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let reducedMotion = motionQuery.matches;
    let pageVisible = !document.hidden;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.targetY = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    };

    const resetPointer = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const handleMotionPreference = () => {
      reducedMotion = motionQuery.matches;
    };

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;

      if (pageVisible && !animationFrame) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const draw = (timestamp: number) => {
      animationFrame = 0;

      if (!pageVisible) {
        return;
      }

      const seconds = reducedMotion ? 0 : timestamp / 1000;
      const easing = reducedMotion ? 1 : 0.045;

      pointer.x += (pointer.targetX - pointer.x) * easing;
      pointer.y += (pointer.targetY - pointer.y) * easing;

      backdrop.style.setProperty('--starfield-shift-x', `${pointer.x * 14}px`);
      backdrop.style.setProperty('--starfield-shift-y', `${pointer.y * 10}px`);

      context.clearRect(0, 0, width, height);

      for (const star of stars) {
        const travelWidth = width + 80;
        const drift = seconds * star.speed * star.depth;
        const x = ((star.x * travelWidth + drift) % travelWidth) - 40 + pointer.x * star.depth * 22;
        const y =
          star.y * height +
          Math.sin(seconds * 0.24 + star.phase) * star.depth * 6 +
          pointer.y * star.depth * 14;
        const twinkle = 0.72 + Math.sin(seconds * 0.85 + star.phase) * 0.28;
        const alpha = star.alpha * twinkle;
        const color = star.tone === 'warm' ? '255, 231, 188' : '238, 244, 255';

        context.beginPath();
        context.fillStyle = `rgba(${color}, ${alpha})`;
        context.arc(x, y, star.radius * star.depth, 0, Math.PI * 2);
        context.fill();

        if (star.depth > 0.9 && star.radius > 1.08) {
          context.beginPath();
          context.fillStyle = `rgba(${color}, ${alpha * 0.16})`;
          context.arc(x, y, star.radius * star.depth * 3.8, 0, Math.PI * 2);
          context.fill();
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', resetPointer);
    document.addEventListener('pointerleave', resetPointer);
    motionQuery.addEventListener('change', handleMotionPreference);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', resetPointer);
      document.removeEventListener('pointerleave', resetPointer);
      motionQuery.removeEventListener('change', handleMotionPreference);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="starfield-backdrop" ref={backdropRef} aria-hidden="true">
      <canvas className="starfield-canvas" ref={canvasRef} />
    </div>
  );
}

const thresholdLines = [
  {
    member: 'Sovereign',
    icon: '/council/sovereign.svg',
    text: 'Council Sessions for moments that refuse simple answers.',
  },
  {
    member: 'Warrior',
    icon: '/council/warrior.svg',
    text: 'Soul Blueprint, Eternal Mirror, and cycle memory held in one reflective system.',
  },
  {
    member: 'Sage',
    icon: '/council/sage.svg',
    text: 'A protected threshold between public invitation and private inner work.',
  },
];

const chambers = [
  {
    member: 'Lover',
    icon: '/council/lover.svg',
    title: 'Council Sessions',
    motif: 'Circular chamber',
    text: 'Eight symbolic voices gather around one inner table. Not to overpower you with answers, but to surface the shape of what is already speaking inside you.',
  },
  {
    member: 'Creator',
    icon: '/council/creator.svg',
    title: 'Soul Blueprint',
    motif: 'Living map',
    text: 'A cartography of tendencies, fragments, breakthroughs, and unfinished patterns. Less a profile than an evolving inner architecture.',
  },
  {
    member: 'Caregiver',
    icon: '/council/caregiver.svg',
    title: 'Eternal Mirror',
    motif: 'Fractured reflection',
    text: 'The mirror does not invent a self. It reveals where the self is split, hidden, defended, remembered, and ready to be integrated.',
  },
];

const pathways = [
  {
    member: 'Explorer',
    icon: '/council/explorer.svg',
    title: 'Psychogeography',
    text: 'Memory as terrain. Desire as weather. Attention as navigation. Lazarus treats inner life less like a checklist and more like a strange continent that must be walked.',
  },
  {
    member: 'Alchemist',
    icon: '/council/alchemist.svg',
    title: 'The Cycle',
    text: 'Recursive days, returning symbols, orbital diagrams, and phases of integration. The path does not move in a straight line because people do not.',
  },
];

const closingLines = [
  'You are not using a tool.',
  'You are entering a reflective system.',
  'You are not becoming someone else.',
  'You are learning how to integrate what is already here.',
];

export default function App() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessRequestState, setAccessRequestState] = useState<'idle' | 'submitting' | 'sent' | 'error'>(
    'idle'
  );

  useEffect(() => {
    let frame = 0;

    const updateScrollProgress = () => {
      frame = 0;
      const root = document.documentElement;
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      root.style.setProperty('--scroll-progress', progress.toFixed(4));
      root.style.setProperty('--scroll-progress-invert', (1 - progress).toFixed(4));
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useEffect(() => {
    const audio = getAmbientAudioElement();

    const syncPlayingState = () => {
      setAudioPlaying(!audio.paused);
    };

    const tryPlayAmbientAudio = async () => {
      if (!audioEnabled) {
        audio.pause();
        syncPlayingState();
        return false;
      }

      try {
        audio.muted = false;
        audio.loop = true;
        audio.volume = AMBIENT_AUDIO_VOLUME;

        if (audio.readyState === 0) {
          audio.load();
        }

        await audio.play();
        syncPlayingState();
        return true;
      } catch {
        syncPlayingState();
        return false;
      }
    };

    const unlockPlayback = (event?: Event) => {
      const target = event?.target;
      if (target instanceof Element && target.closest('[data-audio-toggle="true"]')) {
        return;
      }

      if (!audioEnabled || !audio.paused) {
        return;
      }

      void tryPlayAmbientAudio();
    };

    audio.addEventListener('play', syncPlayingState);
    audio.addEventListener('pause', syncPlayingState);
    audio.addEventListener('canplay', unlockPlayback);
    audio.addEventListener('canplaythrough', unlockPlayback);

    document.addEventListener('pointerdown', unlockPlayback, true);
    document.addEventListener('pointerup', unlockPlayback, true);
    document.addEventListener('touchstart', unlockPlayback, true);
    document.addEventListener('touchend', unlockPlayback, true);
    document.addEventListener('mousedown', unlockPlayback, true);
    document.addEventListener('mouseup', unlockPlayback, true);
    document.addEventListener('click', unlockPlayback, true);
    document.addEventListener('keydown', unlockPlayback, true);
    document.addEventListener('focusin', unlockPlayback, true);
    window.addEventListener('wheel', unlockPlayback, { passive: true, capture: true });
    window.addEventListener('scroll', unlockPlayback, { passive: true });
    document.addEventListener('visibilitychange', unlockPlayback);

    void tryPlayAmbientAudio();

    return () => {
      audio.removeEventListener('play', syncPlayingState);
      audio.removeEventListener('pause', syncPlayingState);
      audio.removeEventListener('canplay', unlockPlayback);
      audio.removeEventListener('canplaythrough', unlockPlayback);
      document.removeEventListener('pointerdown', unlockPlayback, true);
      document.removeEventListener('pointerup', unlockPlayback, true);
      document.removeEventListener('touchstart', unlockPlayback, true);
      document.removeEventListener('touchend', unlockPlayback, true);
      document.removeEventListener('mousedown', unlockPlayback, true);
      document.removeEventListener('mouseup', unlockPlayback, true);
      document.removeEventListener('click', unlockPlayback, true);
      document.removeEventListener('keydown', unlockPlayback, true);
      document.removeEventListener('focusin', unlockPlayback, true);
      window.removeEventListener('wheel', unlockPlayback, true);
      window.removeEventListener('scroll', unlockPlayback);
      document.removeEventListener('visibilitychange', unlockPlayback);
    };
  }, [audioEnabled]);

  const handleSurfacePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const tiltX = ((y - 50) / 50) * -2.4;
    const tiltY = ((x - 50) / 50) * 2.4;

    element.style.setProperty('--pointer-x', `${x}%`);
    element.style.setProperty('--pointer-y', `${y}%`);
    element.style.setProperty('--tilt-x', `${tiltX}deg`);
    element.style.setProperty('--tilt-y', `${tiltY}deg`);
  };

  const handleSurfacePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    element.style.setProperty('--pointer-x', '50%');
    element.style.setProperty('--pointer-y', '50%');
    element.style.setProperty('--tilt-x', '0deg');
    element.style.setProperty('--tilt-y', '0deg');
  };

  const toggleAmbientAudio = async () => {
    const audio = getAmbientAudioElement();

    if (audioEnabled && !audio.paused) {
      audio.pause();
      setAudioEnabled(false);
      setAudioPlaying(false);
      return;
    }

    setAudioEnabled(true);

    try {
      audio.volume = AMBIENT_AUDIO_VOLUME;
      await audio.play();
      setAudioPlaying(true);
    } catch {
      setAudioPlaying(false);
    }
  };

  const openAccessModal = () => {
    setAccessRequestState('idle');
    setAccessModalOpen(true);
  };

  const closeAccessModal = () => setAccessModalOpen(false);

  const getAccessRequestMailto = (formData: FormData) => {
    const details = [
      ['Name', formData.get('name')],
      ['E-Mail', formData.get('email')],
      ['Rolle / Kontext', formData.get('context')],
      ['Was ruft dich zu Lazarus?', formData.get('calling')],
      ['Gewuenschter Zugang', formData.get('accessType')],
      ['Datenschutz-Einverstaendnis', formData.get('privacy') ? 'Ja' : 'Nein'],
    ]
      .map(([label, value]) => `${label}: ${value || '-'}`)
      .join('\n');

    const subject = encodeURIComponent('Lazarus Engine App-Zugangsanfrage');
    const body = encodeURIComponent(
      `Hallo Lazarus Engine,\n\nich moechte Zugang zur App anfragen.\n\n${details}\n\nDanke.`
    );

    return `mailto:${ACCESS_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleAccessRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('_subject', 'Lazarus Engine App-Zugangsanfrage');
    formData.set('_template', 'table');
    formData.set('_captcha', 'false');

    setAccessRequestState('submitting');

    try {
      const response = await fetch(ACCESS_REQUEST_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Access request failed');
      }

      form.reset();
      setAccessRequestState('sent');
    } catch {
      setAccessRequestState('error');
    }
  };

  return (
    <>
      <StarfieldBackdrop />
      <main className="shell living-observatory">
        <section className="hero">
          <div
            className="hero-copy interactive-surface float-large"
            onPointerMove={handleSurfacePointerMove}
            onPointerLeave={handleSurfacePointerLeave}
          >
            <p className="eyebrow">Lazarus Engine</p>
            <h1>
              A threshold for reflection,
              <br />
              integration, and
              <br />
              inner architecture.
            </h1>
            <p className="lead">
              Lazarus Engine is not built to hand out certainty. It is built as a symbolic
              system for navigating the chambers of selfhood, where memory, desire, conflict,
              and transformation can be seen in relation rather than in isolation.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://app.lazarus-engine.eu">
                Enter the App
              </a>
              <button className="button button-primary" type="button" onClick={openAccessModal}>
                Request Access
              </button>
              <a className="button button-secondary" href="#chambers">
                Read the Map
              </a>
            </div>
            <div className="ambient-audio">
              <button
                type="button"
                data-audio-toggle="true"
                className={`button button-secondary button-audio${audioPlaying ? ' is-active' : ''}`}
                onClick={toggleAmbientAudio}
                aria-pressed={audioPlaying}
              >
                {audioPlaying ? 'Pause Ambient Audio' : 'Awaken Ambient Audio'}
              </button>
              <span className="ambient-audio-note">GOD ON THE CODE background loop</span>
            </div>
            <div className="hero-whisper">
              <span>Threshold between worlds</span>
              <span>Digital thought palace</span>
              <span>Library for inner navigation</span>
            </div>
          </div>

          <div
            className="hero-panel interactive-surface float-medium"
            aria-hidden="true"
            onPointerMove={handleSurfacePointerMove}
            onPointerLeave={handleSurfacePointerLeave}
          >
            <div className="hero-fog fog-far" />
            <div className="hero-fog fog-near" />
            <div className="sunlight-rays" />
            <div className="ambient-dust ambient-dust-a" />
            <div className="ambient-dust ambient-dust-b" />
            <div className="dreamcatcher" />
            <div className="crystal crystal-left" />
            <div className="crystal crystal-right" />
            <div className="crystal crystal-lower" />
            <div className="hero-smoke hero-smoke-left" />
            <div className="hero-smoke hero-smoke-right" />
            <div className="constellation constellation-a" />
            <div className="constellation constellation-b" />
            <div className="orbital orbital-large" />
            <div className="orbital orbital-mid" />
            <div className="orbital orbital-small" />
            <div className="alchemical-grid" />
            <div className="manuscript-layer" />
            <div className="orientation-sigil" />
            <div className="status-card">
              <span className="status-label">Initiation Layer</span>
              <strong>The system begins where self-explanation fails.</strong>
              <p>
                Council, mirror, map, and cycle are not modules in a dashboard. They are
                chambers in one symbolic architecture.
              </p>
            </div>
          </div>
        </section>

        <section className="band band-threshold">
          <div className="ambient-geometry geometry-threshold" aria-hidden="true" />
          <div className="band-grid">
            {thresholdLines.map((item, index) => (
              <div
                className={`metric interactive-surface float-subtle float-delay-${index + 1}`}
                key={item.text}
                onPointerMove={handleSurfacePointerMove}
                onPointerLeave={handleSurfacePointerLeave}
              >
                <span className={`council-mark council-mark-${index + 1}`} aria-hidden="true">
                  <span
                    className="council-mark-icon"
                    style={getCouncilIconStyle(item.icon)}
                  />
                </span>
                <span className="metric-mark" />
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section section-chambers" id="chambers">
          <div className="ambient-geometry geometry-chambers" aria-hidden="true" />
          <div className="ambient-roots roots-chambers" aria-hidden="true" />
          <div className="section-heading">
            <p className="eyebrow">Primary Chambers</p>
            <h2>A symbolic system for meeting what is already alive in you.</h2>
          </div>

          <div className="card-grid">
            {chambers.map((chamber, index) => (
              <article
                className={`card interactive-surface float-medium float-delay-${index + 1}`}
                key={chamber.title}
                onPointerMove={handleSurfacePointerMove}
                onPointerLeave={handleSurfacePointerLeave}
              >
                <span className={`council-mark council-mark-${index + 4}`} aria-hidden="true">
                  <span
                    className="council-mark-icon"
                    style={getCouncilIconStyle(chamber.icon)}
                  />
                </span>
                <p className="card-motif">{chamber.motif}</p>
                <h3>{chamber.title}</h3>
                <p>{chamber.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split section-paths">
          <div className="ambient-geometry geometry-paths" aria-hidden="true" />
          <div className="ambient-roots roots-paths" aria-hidden="true" />
          <div
            className="stack stack-map interactive-surface float-medium"
            onPointerMove={handleSurfacePointerMove}
            onPointerLeave={handleSurfacePointerLeave}
          >
            <p className="eyebrow">Exploration</p>
            <h2>Psychogeography, Council, and the map of returning patterns.</h2>
            <div className="pathway-list">
              {pathways.map(pathway => (
                <article
                  className="pathway interactive-surface float-subtle"
                  key={pathway.title}
                  onPointerMove={handleSurfacePointerMove}
                  onPointerLeave={handleSurfacePointerLeave}
                >
                  <span className={`council-mark council-mark-${pathway.title === 'Psychogeography' ? 7 : 8}`} aria-hidden="true">
                    <span
                      className="council-mark-icon"
                      style={getCouncilIconStyle(pathway.icon)}
                    />
                  </span>
                  <h3>{pathway.title}</h3>
                  <p>{pathway.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div
            className="stack stack-litany interactive-surface float-medium"
            onPointerMove={handleSurfacePointerMove}
            onPointerLeave={handleSurfacePointerLeave}
          >
            <p className="eyebrow">What Lazarus Is</p>
            <h2>It asks for attention, not submission.</h2>
            <ul className="litany">
              {closingLines.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="section cta section-threshold interactive-surface float-large"
          onPointerMove={handleSurfacePointerMove}
          onPointerLeave={handleSurfacePointerLeave}
        >
          <div className="ambient-geometry geometry-threshold-final" aria-hidden="true" />
          <div className="ambient-roots roots-threshold" aria-hidden="true" />
          <div>
            <p className="eyebrow">Enter the Threshold</p>
            <h2>For those who would rather navigate themselves than be simplified.</h2>
          </div>
          <a className="button button-primary" href="https://app.lazarus-engine.eu">
            Enter Lazarus
          </a>
          <button className="button button-secondary" type="button" onClick={openAccessModal}>
            Request App Access
          </button>
        </section>
      </main>
      {accessModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeAccessModal}>
          <section
            className="access-modal interactive-surface"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-request-title"
            onMouseDown={event => event.stopPropagation()}
            onPointerMove={handleSurfacePointerMove}
            onPointerLeave={handleSurfacePointerLeave}
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeAccessModal}
              aria-label="Close access request"
            >
              x
            </button>
            <p className="eyebrow">App Access</p>
            <h2 id="access-request-title">Request a Lazarus threshold key.</h2>
            <form className="access-form" onSubmit={handleAccessRequestSubmit}>
              <label>
                <span>Name</span>
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                <span>Role or context</span>
                <input
                  name="context"
                  type="text"
                  placeholder="Founder, artist, therapist, seeker..."
                />
              </label>
              <label>
                <span>What calls you to Lazarus?</span>
                <textarea name="calling" rows={4} required />
              </label>
              <label>
                <span>Desired access</span>
                <select name="accessType" defaultValue="Private beta access">
                  <option>Private beta access</option>
                  <option>Guided introduction</option>
                  <option>Collaboration conversation</option>
                </select>
              </label>
              <label className="privacy-check">
                <input name="privacy" type="checkbox" required />
                <span>I agree that my details may be used to answer this access request.</span>
              </label>
              {accessRequestState === 'sent' && (
                <p className="access-status access-status-success" role="status">
                  Request sent. Please check your inbox for the Lazarus reply.
                </p>
              )}
              {accessRequestState === 'error' && (
                <p className="access-status access-status-error" role="alert">
                  Sending failed. Please use the fallback mail link below.
                </p>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={accessRequestState === 'submitting'}
              >
                {accessRequestState === 'submitting' ? 'Sending...' : 'Send Request'}
              </button>
              {accessRequestState === 'error' && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    const formData = new FormData(
                      document.querySelector('.access-form') as HTMLFormElement
                    );
                    window.location.href = getAccessRequestMailto(formData);
                  }}
                >
                  Open Email Draft
                </button>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
