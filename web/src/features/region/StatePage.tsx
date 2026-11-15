import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiGet, describeError } from '../../api/client';
import { useRegions, useRegionPasses, useRegionPairs, useRegionsGeoJSON } from '../../api/hooks';
import { NotFoundPage } from '../../app/NotFoundPage';
import { paths } from '../../app/paths';
import { StateNavigation } from './StateNavigation';
import { RegionPage } from './RegionPage';
import { CoverageMap } from '../overview/CoverageMap';
import { RegionPicker } from '../overview/RegionPicker';
import { demoFeed } from './demoFeeds';
import { normalizeRegionQuery } from './navigation';


const states = new Set('ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to'.split(' '));
export function StatePage() {
 const { regionId = '' } = useParams();
 return states.has(regionId) ? <StateContent regionId={regionId}/> : <NotFoundPage/>;
}
function StateContent({regionId}: {regionId:string}) {
 const [search, setSearch] = useSearchParams();
 const navigate = useNavigate();
 const normalized = normalizeRegionQuery(search, new Date());
 const [warning, setWarning] = useState(false);
 const canonical = normalized.params.toString();
 useEffect(() => { if(search.toString() !== canonical) { setWarning(normalized.warning); setSearch(canonical, {replace:true}); } }, [canonical, search, setSearch, normalized.warning]);
 const tab = normalized.params.get('tab')!;
 const window = {start:normalized.params.get('start')!, end:normalized.params.get('end')!};
 const regions = useRegions('state');
 const geo = useRegionsGeoJSON('state');
 const [controlsOpen,setControlsOpen]=useState(false);
 return <div className="state-dashboard"><aside className="state-controls"><button className="state-controls-toggle" aria-expanded={controlsOpen} onClick={()=>setControlsOpen(!controlsOpen)}>Localização e camadas {controlsOpen ? "−" : "+"}</button><div className={`state-control-body ${controlsOpen ? "is-open" : ""}`}>
 <Link className="territory-back" to={paths.overview({region:regionId,month:window.start.slice(0,7)})}>← Mapa de {regions.data?.find(r=>r.id===regionId)?.name ?? regionId.toUpperCase()}</Link>
 <div className="state-location"><span className="panel-eyebrow">TERRITÓRIO EM ANÁLISE</span><strong>{regions.data?.find(r=>r.id===regionId)?.name ?? regionId.toUpperCase()}</strong></div>
 <details className="sidebar-disclosure"><summary>Trocar localização</summary>
 <RegionPicker regions={regions.data ?? []} value={regionId} onChange={id=>{ if(id==='br'){navigate('/');return;} const p=new URLSearchParams(canonical);p.delete('day');p.delete('pass');p.delete('image');p.delete('images');navigate(`/region/${id}?${p}`);}}/>
 </details>
 <p className="sidebar-hint">Período UTC<br/>{window.start} — {window.end}</p>
 {warning && <p role="status">Parâmetros inválidos. Aplicado o período padrão de 30 dias UTC.</p>}
 <StateNavigation tab={tab} query={canonical}/>
 </div></aside><div className="state-workspace"><div className="territory-heading"><h1>{regions.data?.find(r=>r.id===regionId)?.name ?? regionId.toUpperCase()}</h1><span>Observação territorial</span></div>
 {tab!=='radar' && <div className="state-main-map"><CoverageMap geo={geo.data} geoError={geo.error ? describeError(geo.error) : null} coverage={undefined} coverageLoading={geo.isFetching} coveragePending={true} month={window.start.slice(0,7)} regions={regions.data??[]} selectedId={regionId} onSelect={()=>{}}/></div>}
 {tab==='radar' ? <RegionPage/> : <section className="state-shell"><p>Período: {window.start} — {window.end} (UTC)</p>{tab==='overview' ? <RadarSummary id={regionId} window={window}/> : <SourcePanel id={regionId} feature={tab} window={window}/>}</section>}
 </div></div>;
}
function RadarSummary({id,window}: {id:string;window:{start:string;end:string}}) {
 const passes=useRegionPasses(id,window); const pairs=useRegionPairs(id,window);
 const summary=passes.isPlaceholderData ? undefined : passes.data?.summary;
 const pair=pairs.isPlaceholderData ? undefined : [...(pairs.data?.pairs??[])].sort((a,b)=>b.after.date.localeCompare(a.after.date)||b.before.date.localeCompare(a.before.date)||a.stackId.localeCompare(b.stackId)||a.before.id.localeCompare(b.before.id)||a.after.id.localeCompare(b.after.id))[0];
 return <><h1>Visão geral</h1>{passes.isPending && <p role="status">Carregando radar…</p>}{passes.error && <p role="alert">{describeError(passes.error)} <button onClick={()=>passes.refetch()}>Tentar novamente</button></p>}{passes.data?.dataSource==='stale' && <p>Dados desatualizados.</p>}{summary && <p>{summary.acquisitions} passagens · {summary.distinctDates} dias · intervalo típico: {summary.medianGapDays===null?'Dados insuficientes':`${summary.medianGapDays} dias`}</p>}
 {pairs.error ? <p>Comparações indisponíveis. <button onClick={()=>pairs.refetch()}>Tentar novamente</button></p> : pairs.isPending ? <p>Carregando comparações…</p> : pair ? <Link to={paths.compare(pair.before.id,pair.after.id)}>Comparar {pair.before.date} e {pair.after.date}</Link> : <p>Nenhum par disponível.</p>}
 <details className="sidebar-disclosure"><summary>Informações complementares: alertas e organizações</summary><SourcePanel id={id} feature="alerts" window={window}/><SourcePanel id={id} feature="help" window={window}/></details></>;
}
interface Feed {
 dataSource?: 'live'|'cache'|'stale';
 snapshotDate?: string|null;
 nextCursor?: string|null;
 alerts?: {id:string;headline:string;description:string;instruction:string;expires:string;onset:string;severity:string;status:'active'|'expired'}[];
 organizations?: {id:string|number;name:string;areas:string[];distanceKm:number;url?:string|null;municipality:{code:string|number;name:string}}[];
 total?:number;
 posts?: {id:string;title:string;text:string;date:string;link:{page:string;regionId?:string;day?:string;before?:string;after?:string;storyId?:string}}[];
}
function SourcePanel({id,feature,window}: {id:string;feature:string;window:{start:string;end:string}}) {
 const endpoint=feature==='help'?'organizations':feature;
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
 const demo=import.meta.env.DEV && import.meta.env.VITE_DEMO_FEEDS==='true';
 const q=useInfiniteQuery({
  queryKey:[endpoint,id,window.start,window.end,endpoint==='organizations'?'5,2':endpoint==='alerts'?'recent':'all',demo],
  initialPageParam:null as string|null,
  queryFn:({signal,pageParam})=>demo?Promise.resolve(demoFeed(endpoint,id) as Feed):apiGet<Feed>(`/regions/${id}/${endpoint}`,endpoint==='alerts'?{include:'recent'}:endpoint==='posts'?{...window,cursor:pageParam??undefined,limit:20}:{areas:'5,2',cursor:pageParam??undefined,limit:20},signal),
  getNextPageParam:(last)=>endpoint==='alerts'?undefined:last.nextCursor??undefined,
  retry:false,staleTime:endpoint==='alerts'?300_000:endpoint==='organizations'?86_400_000:3_600_000,
  refetchInterval:endpoint==='alerts'?300_000:false,
 });
 const feed=q.data?.pages.at(-1);
 const alerts=q.data?.pages.flatMap(page=>page.alerts??[])??[];
 const organizations=q.data?.pages.flatMap(page=>page.organizations??[])??[];
 const posts=q.data?.pages.flatMap(page=>page.posts??[])??[];
 return <section>{demo && <p role="status">Demonstração: dados sintéticos, não são dados reais.</p>}<h2>{feature==='help'?'Como ajudar':feature==='alerts'?'Alertas':'Publicações'}</h2>{q.isPending && <p role="status">Carregando…</p>}{q.error && <p role="alert">Não foi possível consultar esta fonte. {describeError(q.error)} <button onClick={()=>q.refetch()}>Tentar novamente</button></p>}{q.data?.pages.some(page=>page.dataSource==='stale') && <p>Dados desatualizados. <button onClick={()=>q.refetch()}>Atualizar</button></p>}
 {q.data && <>{endpoint==='alerts' && (alerts.length ? alerts.map(a=><details key={a.id}><summary>{a.headline} — {a.status==='expired'||Date.parse(a.expires)<=now?'Encerrado':a.severity}</summary><p>{a.description}</p><p>{a.instruction}</p><p>{a.onset} — {a.expires} (UTC)</p><p>A expiração local não confirma a chegada de novos avisos.</p></details>):<p>Nenhum alerta retornado pela fonte.</p>)}
 {endpoint==='organizations' && <><p>{feed?.total??0} organizações do Mapa das OSCs (IPEA). Listagem não implica endosso ou disponibilidade.{feed?.snapshotDate?` Snapshot de ${feed.snapshotDate}.`:''}</p>{organizations.map(o=><p key={o.id}>{o.url?<a href={o.url} target="_blank" rel="noreferrer">{o.name}</a>:o.name} · {o.municipality.name} · {o.distanceKm.toFixed(1)} km</p>)}{!organizations.length && <p>Nenhuma organização encontrada para as áreas disponíveis (assistência social e saúde).</p>}</>}
 {endpoint==='posts' && (posts.length?posts.map(p=>{const l=p.link;const href=l.page==='region'&&l.regionId?`${paths.region(l.regionId)}?tab=radar&day=${encodeURIComponent(l.day??'')}`:l.page==='compare'&&l.before&&l.after?paths.compare(l.before,l.after):l.page==='story'&&l.storyId?paths.story(l.storyId):null;return <article key={p.id}><h3>{href?<Link to={href}>{p.title}</Link>:p.title}</h3><p>{p.date} UTC · {p.text}</p></article>;}):<p>Nenhuma publicação encontrada.</p>)}</>}
 {q.hasNextPage && <button onClick={()=>q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage?'Carregando…':'Carregar mais'}</button>}
 </section>;
}
