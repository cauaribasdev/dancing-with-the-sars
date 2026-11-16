import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiGet, describeError } from '../../api/client';
import { useRegions, useRegionPasses, useRegionPairs } from '../../api/hooks';
import { NotFoundPage } from '../../app/NotFoundPage';
import { paths } from '../../app/paths';
import { RegionPage } from './RegionPage';
import { demoFeed } from './demoFeeds';
import { normalizeRegionQuery } from './navigation';

const tabs = ['overview', 'radar', 'alerts', 'help', 'posts'];
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
 return <><section className="state-shell">
 <Link to="/">← Mapa nacional</Link>
 <label>Estado <select value={regionId} onChange={e => { const p=new URLSearchParams(canonical); p.delete('day'); p.delete('pass'); navigate(`/region/${e.target.value}?${p}`); }}>
 {(regions.data ?? []).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
 {!regions.data && <option value={regionId}>{regionId.toUpperCase()}</option>}
 </select></label>
 {warning && <p role="status">Parâmetros inválidos. Aplicado o período padrão de 30 dias UTC.</p>}
 <nav aria-label="Seções do estado">{tabs.map(t=><Link key={t} aria-current={t===tab?'page':undefined} to={`?${new URLSearchParams({...Object.fromEntries(normalized.params),tab:t})}`}>{t[0].toUpperCase()+t.slice(1)}</Link>)}</nav>
 </section>
 {tab==='radar' ? <RegionPage/> : <section className="state-shell"><p>Período: {window.start} — {window.end} (UTC)</p>{tab==='overview' ? <RadarSummary id={regionId} window={window}/> : <SourcePanel id={regionId} feature={tab} window={window}/>}</section>}
 </>;
}
function RadarSummary({id,window}: {id:string;window:{start:string;end:string}}) {
 const passes=useRegionPasses(id,window); const pairs=useRegionPairs(id,window);
 const summary=passes.isPlaceholderData ? undefined : passes.data?.summary;
 const pair=pairs.isPlaceholderData ? undefined : [...(pairs.data?.pairs??[])].sort((a,b)=>b.after.date.localeCompare(a.after.date)||b.before.date.localeCompare(a.before.date)||a.stackId.localeCompare(b.stackId)||a.before.id.localeCompare(b.before.id)||a.after.id.localeCompare(b.after.id))[0];
 return <><h1>Overview</h1>{passes.isPending && <p role="status">Carregando radar…</p>}{passes.error && <p role="alert">{describeError(passes.error)} <button onClick={()=>passes.refetch()}>Tentar novamente</button></p>}{passes.data?.dataSource==='stale' && <p>Dados desatualizados.</p>}{summary && <p>{summary.acquisitions} passagens · {summary.distinctDates} dias · intervalo típico: {summary.medianGapDays===null?'Dados insuficientes':`${summary.medianGapDays} dias`}</p>}
 {pairs.error ? <p>Comparações indisponíveis. <button onClick={()=>pairs.refetch()}>Tentar novamente</button></p> : pairs.isPending ? <p>Carregando comparações…</p> : pair ? <Link to={paths.compare(pair.before.id,pair.after.id)}>Comparar {pair.before.date} e {pair.after.date}</Link> : <p>Nenhum par disponível.</p>}
 <SourcePanel id={id} feature="alerts" window={window}/><SourcePanel id={id} feature="help" window={window}/></>;
}
interface Feed {
 dataSource?: string;
 alerts?: {id:string;headline:string;description:string;instruction:string;expires:string;onset:string;severity:string}[];
 organizations?: {id:number;name:string;distanceKm:number;url:string}[];
 total?:number;
 posts?: {id:string;title:string;text:string;date:string;link:{page:string;regionId?:string;day?:string;before?:string;after?:string;storyId?:string}}[];
}
function SourcePanel({id,feature,window}: {id:string;feature:string;window:{start:string;end:string}}) {
 const endpoint=feature==='help'?'organizations':feature;
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
 const demo=import.meta.env.DEV && import.meta.env.VITE_DEMO_FEEDS==='true';
 const q=useQuery({queryKey:[endpoint,id,window.start,window.end,demo],queryFn:({signal})=>demo?Promise.resolve(demoFeed(endpoint,id) as Feed):apiGet<Feed>(`/regions/${id}/${endpoint}`,endpoint==='alerts'?{include:'recent'}:endpoint==='posts'?window:{areas:'5,1,2,12',limit:20},signal),retry:false,staleTime: endpoint==='alerts'?300000:3600000,refetchInterval:endpoint==='alerts'?300000:false});
 return <section>{demo && <p role="status">Demonstração: dados sintéticos, não são dados reais.</p>}<h2>{feature==='help'?'Help':feature==='alerts'?'Alerts':'Posts'}</h2>{q.isPending && <p role="status">Carregando…</p>}{q.error && <p role="alert">Não foi possível verificar esta fonte. {describeError(q.error)} <button onClick={()=>q.refetch()}>Tentar novamente</button></p>}{q.data?.dataSource==='stale' && <p>Dados desatualizados. <button onClick={()=>q.refetch()}>Atualizar</button></p>}
 {q.data && <>{endpoint==='alerts' && (q.data.alerts?.length ? q.data.alerts.map(a=><details key={a.id}><summary>{a.headline} — {Date.parse(a.expires)<=now?'Vencido':a.severity}</summary><p>{a.description}</p><p>{a.instruction}</p><p>{a.onset} — {a.expires} (UTC)</p><p>A expiração local não verifica a chegada de novos avisos.</p></details>):<p>Nenhum alerta retornado pela fonte.</p>)}
 {endpoint==='organizations' && <><p>{q.data.total??0} organizações. Listagem não implica endosso ou disponibilidade.</p>{q.data.organizations?.map(o=><p key={o.id}><a href={o.url}>{o.name}</a> · {o.distanceKm.toFixed(1)} km</p>)}{!q.data.organizations?.length && <p>Nenhuma organização encontrada.</p>}</>}
 {endpoint==='posts' && (q.data.posts?.length?q.data.posts.map(p=>{const l=p.link;const href=l.page==='region'&&l.regionId?`${paths.region(l.regionId)}?tab=radar&day=${encodeURIComponent(l.day??'')}`:l.page==='compare'&&l.before&&l.after?paths.compare(l.before,l.after):l.page==='story'&&l.storyId?paths.story(l.storyId):null;return <article key={p.id}><h3>{href?<Link to={href}>{p.title}</Link>:p.title}</h3><p>{p.date} UTC · {p.text}</p></article>;}):<p>Nenhuma publicação encontrada.</p>)}</>}
 </section>;
}
