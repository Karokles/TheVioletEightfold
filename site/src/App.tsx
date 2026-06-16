import type { PointerEvent as ReactPointerEvent } from 'react';

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

  return (
    <main className="shell">
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
            integration, and inner architecture.
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
            <a className="button button-secondary" href="#chambers">
              Read the Map
            </a>
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

      <section className="band">
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
                  style={{ ['--council-icon' as '--council-icon']: `url(${item.icon})` }}
                />
              </span>
              <span className="metric-mark" />
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="chambers">
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
                  style={{ ['--council-icon' as '--council-icon']: `url(${chamber.icon})` }}
                />
              </span>
              <p className="card-motif">{chamber.motif}</p>
              <h3>{chamber.title}</h3>
              <p>{chamber.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split">
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
                    style={{ ['--council-icon' as '--council-icon']: `url(${pathway.icon})` }}
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
        className="section cta interactive-surface float-large"
        onPointerMove={handleSurfacePointerMove}
        onPointerLeave={handleSurfacePointerLeave}
      >
        <div>
          <p className="eyebrow">Enter the Threshold</p>
          <h2>For those who would rather navigate themselves than be simplified.</h2>
        </div>
        <a className="button button-primary" href="https://app.lazarus-engine.eu">
          Enter Lazarus
        </a>
      </section>
    </main>
  );
}
