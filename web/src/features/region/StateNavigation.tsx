import { Link } from 'react-router';

export function StateNavigation({ tab, query }: { tab: string; query: string }) {
  const sections = [
    { id: 'overview', label: 'Visão geral', description: 'Cobertura e contexto' },
    { id: 'radar', label: 'Radar', description: 'Passagens e imagens' },
    { id: 'alerts', label: 'Alertas', description: 'Avisos disponíveis' },
    { id: 'help', label: 'Como ajudar', description: 'Organizações próximas' },
    { id: 'posts', label: 'Publicações', description: 'Atualizações do território' },
  ];

  return (
    <nav aria-label="Seções do estado">
      {sections.map((item) => {
        const urlParams = new URLSearchParams(query);
        urlParams.set('tab', item.id);

        return (
          <Link
            key={item.id}
            to={`?${urlParams.toString()}`}
            className={`state-section-link ${tab === item.id ? 'aria-current-page' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <strong>{item.label}</strong>
            <small>{item.description}</small>
            <span aria-hidden="true">→</span>
          </Link>
        );
      })}
    </nav>
  );
}
