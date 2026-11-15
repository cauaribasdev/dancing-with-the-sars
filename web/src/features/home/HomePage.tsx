import { Link, Navigate, useLocation } from 'react-router';
import { useStory } from '../../api/hooks';
import { paths } from '../../app/paths';
import { useBrowseImage } from '../../map/BrowseImageLayer';
import { StaleNotice } from '../../ui/feedback';
import { SpaceAppsBrand } from '../../ui/SpaceAppsBrand';
import { DataSources } from './DataSources';

const STORY_ID = 'rs-flood-jul-2026';
const dateLabel = (date: string) => new Intl.DateTimeFormat('pt-BR', {dateStyle:'long',timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`));

/** Preserve previously shared map URLs, including every query value and the fragment. */
export function HomeEntry() {
  const location = useLocation();
  return location.search ? <Navigate replace to={`${paths.overview()}${location.search}${location.hash}`} /> : <HomePage />;
}

function Preview({passId, date, label}: {passId:string; date:string; label:string}) {
  const image = useBrowseImage(passId);
  return <figure className="home-preview">
    {image.status === 'ready'
      ? <img src={image.imageUrl} alt={`Prévia NISAR de ${dateLabel(date)}, ${label.toLowerCase()}`} />
      : <div role="status" className="home-preview-placeholder">{image.status === 'error' || image.status === 'unavailable' ? 'Prévia indisponível. A história continua acessível.' : 'Carregando imagem NISAR…'}</div>}
    <figcaption><strong>{label}</strong><time dateTime={date}>{dateLabel(date)} · UTC</time></figcaption>
  </figure>;
}

function FeaturedStory() {
  const story = useStory(STORY_ID);
  const pair = story.data?.pairs.find(p=>p.featured);
  return <section className="home-story" aria-labelledby="home-story-title">
    <div className="home-story-heading"><div><p className="home-eyebrow">Um território, dois momentos</p><h2 id="home-story-title">Rio Grande do Sul visto pelo radar</h2></div><Link className="link" to={paths.story(STORY_ID)}>Abrir história completa →</Link></div>
    <p className="text-ink-2">Explore a história da cheia de julho de 2026 e compare observações da mesma faixa de aquisição. Veja na história onde olhar e como interpretar as diferenças.</p>
    {story.data && <StaleNotice dataSource={story.data.dataSource} />}
    {pair ? <><div className="home-preview-grid"><Preview passId={pair.before.id} date={pair.before.date} label="Antes"/><Preview passId={pair.after.id} date={pair.after.date} label="Depois"/></div><p className="text-sm text-ink-3">Prévias de aquisições reais, sem escala cartográfica nesta apresentação. Abra a história para comparar no mapa georreferenciado.</p></>
      : <div className="home-story-empty" role="status"><p>{story.isError ? 'Não foi possível carregar a prévia da história.' : story.data ? 'Nenhum par de imagens disponível para esta prévia.' : 'Buscando as observações da história…'}</p>{story.isError && <button type="button" className="link" onClick={()=>story.refetch()}>Tentar novamente</button>}<p>Você pode continuar para a história ou explorar o mapa.</p></div>}
  </section>;
}

export function HomePage() {
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <SpaceAppsBrand />
      <p className="home-eyebrow">Observação da Terra · Inteligência territorial</p>
      <h1 id="home-title">Veja como o território muda com o radar NISAR.</h1>
      <p>Explore observações do Brasil, reúna imagens de diferentes dias e compare o antes e o depois com contexto e fontes.</p>
      <div className="home-actions"><Link className="home-primary" to={paths.story(STORY_ID)}>Ver mudanças no Rio Grande do Sul <span aria-hidden>↗</span></Link><Link className="home-secondary" to={paths.overview()}>Explorar o mapa <span aria-hidden>→</span></Link></div>
    </section>
    <FeaturedStory />
    <section aria-labelledby="home-explore-title"><h2 id="home-explore-title">Escolha por onde explorar</h2><div className="home-paths">
      <Link to={paths.overview()}><span className="home-eyebrow">01 / Território</span><h3>Encontre seu estado</h3><p>Veja quando o radar observou a região e escolha um período.</p><span className="link">Abrir mapa →</span></Link>
      <Link to={`${paths.region('rs')}?tab=radar`}><span className="home-eyebrow">02 / Cobertura</span><h3>Reúna imagens</h3><p>Combine passagens de diferentes dias. A cobertura depende das imagens disponíveis.</p><span className="link">Explorar Radar do RS →</span></Link>
      <Link to={paths.story(STORY_ID)}><span className="home-eyebrow">03 / Mudanças</span><h3>Compare dois momentos</h3><p>Uma história guiada para observar diferenças e conhecer os limites da interpretação.</p><span className="link">Ver antes e depois →</span></Link>
    </div></section>
    <DataSources />
  </div>;
}
