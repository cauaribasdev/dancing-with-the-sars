export function SpaceAppsBrand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="https://www.spaceappschallenge.org/2026/"
      aria-label="NASA Space Apps Challenge 2026, site do evento"
      target="_blank"
      rel="noreferrer"
      className={`spaceapps-brand ${compact ? 'spaceapps-brand-compact' : ''}`}
    >
      <img
        src={compact ? '/brand/space-apps-orbit.svg' : '/brand/space-apps-horizontal.svg'}
        alt="NASA Space Apps Challenge"
      />
    </a>
  );
}
