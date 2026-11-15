import { useId, useState } from 'react';
import type { Region } from '../../api/types';

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
interface Props {
  regions: Region[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function RegionPicker({regions,value,onChange,disabled}: Props) {
  const [search,setSearch]=useState('');
  const id=useId();
  const states=regions.filter(r=>r.kind==='state');
  const results=states.filter(r=>normalize(`${r.name} ${r.code}`).includes(normalize(search)));
  const choose=(regionId:string)=>{onChange(regionId);setSearch('');};
  return <div className="location-picker">
    <label htmlFor={`${id}-search`}>Localização</label>
    <input id={`${id}-search`} type="search" aria-label="Buscar estado" placeholder="Nome ou sigla do estado" value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)} aria-describedby={search.trim()?`${id}-results`:undefined}/>
    {search.trim() && <div id={`${id}-results`} className="location-results">
      <p role="status">{results.length ? `${results.length} estado(s) encontrado(s)` : 'Nenhum estado encontrado.'}</p>
      <ul>{results.map(r=><li key={r.id}><button type="button" disabled={disabled} onClick={()=>choose(r.id)}>{r.name} ({r.code})</button></li>)}</ul>
    </div>}
    <label className="sr-only" htmlFor="region-select">Estado selecionado</label>
    <select id="region-select" value={value} disabled={disabled} onChange={e=>choose(e.target.value)}>
      <option value="br">Brasil</option>
      {states.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
    {value!=='br' && <button type="button" className="location-national" disabled={disabled} onClick={()=>choose('br')}>Retornar ao Brasil</button>}
  </div>;
}
