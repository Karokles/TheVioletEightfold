const principles = [
  'Council Sessions fuer komplexe Entscheidungen',
  'Zyklen, Breakthroughs und Soul-Memory an einem Ort',
  'Getrennte App-Infrastruktur mit geschuetztem Zugang',
];

const modules = [
  {
    title: 'Inner Council',
    text: 'Acht Stimmen, ein beobachtendes Zentrum und eine Form von digitaler Spiegelung, die nicht nur antwortet, sondern sortiert.',
  },
  {
    title: 'Living Cycle',
    text: 'Der 63-Tage-Zyklus bleibt erhalten, auch wenn das Backend neu deployed wird. Arbeit darf weitergehen, statt wieder bei null zu beginnen.',
  },
  {
    title: 'Guarded Access',
    text: 'Website, App und API sind getrennt. Dadurch bleibt die oeffentliche Seite leicht, waehrend die eigentliche Innenwelt geschuetzt bleibt.',
  },
];

const steps = [
  'Lies die Website wie einen Einstieg in die Welt von Lazarus Engine.',
  'Wechsle mit einem klaren Button in die App auf app.lazarus-engine.eu.',
  'Arbeite dort mit Account, Paywall, Admin und Persistenz getrennt von der Website.',
];

export default function App() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Lazarus Engine</p>
          <h1>
            Eine Website fuer die Einladung.
            <br />
            Eine App fuer die eigentliche Arbeit.
          </h1>
          <p className="lead">
            Dieses zweite Projekt ist dein oeffentliches Standbein. Es kann frei gestaltet,
            ueber Codex weiterentwickelt und separat von der Live-App deployed werden.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://app.lazarus-engine.eu">
              Zur App
            </a>
            <a className="button button-secondary" href="#architecture">
              Struktur ansehen
            </a>
          </div>
        </div>

        <div className="hero-panel" aria-hidden="true">
          <div className="orbital orbital-large" />
          <div className="orbital orbital-mid" />
          <div className="orbital orbital-small" />
          <div className="signal-grid" />
          <div className="status-card">
            <span className="status-label">Now Live</span>
            <strong>Website + App getrennt</strong>
            <p>Codex kann die Website direkt als eigenes Projekt weiterbauen.</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-grid">
          {principles.map(item => (
            <div className="metric" key={item}>
              <span className="metric-mark" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="architecture">
        <div className="section-heading">
          <p className="eyebrow">Architektur</p>
          <h2>Ein zweites Vercel-Projekt gibt dir die Kontrolle ueber die Website.</h2>
        </div>

        <div className="card-grid">
          {modules.map(module => (
            <article className="card" key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split">
        <div className="stack">
          <p className="eyebrow">Routing</p>
          <h2>So wuerde ich die Domains stabil schneiden.</h2>
          <ul className="route-list">
            <li>
              <strong>lazarus-engine.eu</strong>
              <span>Website / Einstieg / Story / CTA</span>
            </li>
            <li>
              <strong>app.lazarus-engine.eu</strong>
              <span>Die echte App mit Login, Council, Zyklus und Admin</span>
            </li>
            <li>
              <strong>api.lazarus-engine.eu</strong>
              <span>Backend und geschuetzte App-Funktionen</span>
            </li>
          </ul>
        </div>

        <div className="stack">
          <p className="eyebrow">Ablauf</p>
          <h2>Wie wir das in Vercel anbinden.</h2>
          <ol className="step-list">
            {steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section cta">
        <div>
          <p className="eyebrow">Naechster Schritt</p>
          <h2>Verbinde `site/` als neues Vercel-Projekt und lass die Root-App unangetastet.</h2>
        </div>
        <a className="button button-primary" href="https://app.lazarus-engine.eu">
          App oeffnen
        </a>
      </section>
    </main>
  );
}
