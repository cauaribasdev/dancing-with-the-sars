# Tarefa para o júnior
**Objetivo:** criar identificação compacta do evento com os logos oficiais já disponíveis.
**Arquivo de saída:** `web/src/ui/SpaceAppsBrand.tsx`
**Assinatura/interface:** export function SpaceAppsBrand({compact = false}: {compact?: boolean})
**Entradas e saídas:** link externo https://www.spaceappschallenge.org/2026/ com aria-label="NASA Space Apps Challenge 2026, site do evento", target="_blank" rel="noreferrer"; img src compact ? '/brand/space-apps-orbit.svg' : '/brand/space-apps-horizontal.svg'; alt="NASA Space Apps Challenge"; className do link compact ? 'spaceapps-brand spaceapps-brand-compact' : 'spaceapps-brand'; image sem dimensões inline (CSS determina altura, largura auto); nada além disso.
**Arquivos de contexto/exemplo:** nenhum.
**Restrições:** somente saída, sem dependências, sem redesenhar ou alterar logos, não acrescentar texto que sugira endosso NASA. Não importar React desnecessariamente.
**Critério de pronto:** npm run typecheck -w web
