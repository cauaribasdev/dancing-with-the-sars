# Tarefa — navegação estadual acessível
**Objetivo:** Navegação de seções com rótulo e descrição, mantendo URL.
**Arquivo de saída:** web/src/features/region/StateNavigation.tsx
**Interface:** export function StateNavigation({tab,query}:{tab:string;query:string})
**Comportamento:** nav aria-label="Seções do estado"; links react-router Link para ? + cópia URLSearchParams(query) com tab substituído. Cinco links: overview "Visão geral" / "Cobertura e contexto"; radar "Radar" / "Passagens e imagens"; alerts "Alertas" / "Avisos disponíveis"; help "Como ajudar" / "Organizações próximas"; posts "Publicações" / "Atualizações do território". aria-current=page somente ativo; className state-section-link; texto principal strong e descrição small. Ícone textual seta → aria-hidden no fim. Não usar role=tab: são links de navegação. Preservar todos parâmetros.
**Contexto:** react-router já instalado.
**Restrições:** somente arquivo, sem dependências.
**Critério de pronto:** npm run typecheck -w web

Revisão 1: use import { Link } from 'react-router', não react-router-dom; export function StateNavigation nomeado. Cada item precisa id próprio overview/radar/alerts/help/posts. Dentro de map criar new URLSearchParams(query) e set('tab',item.id); aria-current={tab===item.id?'page':undefined}. Sem useLocation. Não corrigir erros de outros arquivos.
