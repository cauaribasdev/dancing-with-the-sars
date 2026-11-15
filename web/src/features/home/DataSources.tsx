export function DataSources() {
  return (
    <section aria-label="Fontes e limitações">
      <div className="border-rule bg-sheet rounded-xl p-4">
        <h2 className="text-ink-2">Fontes</h2>
        <ul>
          <li className="link">NASA/ISRO NISAR - <a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noopener noreferrer" className="link">nisar.jpl.nasa.gov</a></li>
          <li className="link">ASF DAAC - <a href="https://asf.alaska.edu/" target="_blank" rel="noopener noreferrer" className="link">asf.alaska.edu</a></li>
          <li className="link">IBGE - <a href="https://www.ibge.gov.br/" target="_blank" rel="noopener noreferrer" className="link">www.ibge.gov.br</a></li>
        </ul>
        <p className="text-ink-3">As prévias são renderizações visuais, não medidas calibradas.</p>
        <p className="text-ink-3">A composição pode combinar datas diferentes e não garante cobertura integral.</p>
      </div>
    </section>
  );
}
