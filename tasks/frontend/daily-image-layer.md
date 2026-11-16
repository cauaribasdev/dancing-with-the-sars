# Tarefa — camada de uma passagem para composição diária
**Objetivo:** Reutilizar carregamento seguro de imagem para várias passagens independentes.
**Arquivo de saída:** web/src/map/DailyImageLayer.tsx
**Interface:** export function DailyImageLayer({passId,opacity,beforeId,onStatus}:{passId:string;opacity:number;beforeId:string;onStatus:(id:string,status:string)=>void})
**Comportamento:** const image=useBrowseImage(passId); useEffect(()=>onStatus(passId,image.status),[passId,image.status,onStatus]); retornar BrowseImageLayer image={image} id={'daily-'+passId} opacity={opacity} beforeId={beforeId}. Imports useEffect React; BrowseImageLayer e useBrowseImage de ./BrowseImageLayer.
**Restrições:** somente arquivo, não alterar carregamento existente nem georef, sem dependências.
**Critério de pronto:** npm run typecheck -w web
