# Frontend: evolução proposta

Este documento registra as decisões aceitas para a evolução do frontend. As cinco abas e os endpoints de alertas, organizações e posts ainda não existem no estado observado. O mapa nacional, a exploração regional de radar, histórias e comparação já existem.

## Produto e navegação

A cobertura mostra passagens do satélite, não desastres detectados. Uma comparação em destaque é um par de imagens para inspeção visual, não uma mudança detectada automaticamente nem uma medida de área alagada. Alertas meteorológicos e organizações são contexto complementar.

A entrada nacional mostra cobertura por estado. A pessoa escolhe um estado no mapa ou na lista e abre `/region/:regionId`, com as abas Overview, Radar, Alerts, Posts e Help. Overview resume o estado; o mapa nacional compara a cobertura dos estados. Histórias e comparação mantêm seus fluxos existentes. GlobalGiving, GUNW e posts editoriais são extensões opcionais. Posts automáticos são a opção aprovada; ainda não estão implementados.

A URL contém estado, `tab`, `start`, `end`, `day` e `pass`. A aba padrão é `overview`. Regra de compatibilidade aprovada: links sem `tab` com `day` ou `pass` abrem Radar; os demais abrem Overview. Corrigir a URL com replace. País, macrorregiões e IDs desconhecidos mostram página não encontrada com retorno ao mapa. A API antiga pode continuar aceitando esses IDs; `br` é exceção para a agregação nacional de alertas.

Ao trocar de aba, preservar período, dia e passagem; ao trocar período ou estado, limpar dia e passagem. Preservar a aba e um período válido ao mudar de estado. Escolhas deliberadas usam push; correções usam replace. Voltar, avançar e recarregar restauram a URL. Hover, expansão, progresso, seleção de cartão e câmera são locais. A câmera é preservada entre abas e enquadra o novo estado na troca de UF.

Datas malformadas, futuras, incompletas, invertidas ou com mais de 366 dias devem resultar no período padrão e mensagem de correção, sem truncamento silencioso. Aba desconhecida volta a Overview. Dia fora do período limpa dia e passagem; passagem ausente dos resultados limpa a seleção após o carregamento.

## Telas

- **Overview:** números do radar no período, comparação em destaque, alertas ativos, três organizações próximas, história quando houver e contatos Defesa Civil 199 e Bombeiros 193. `medianGapDays: null` significa dados insuficientes, não zero.
- **Radar:** preservar calendário, filtros, contornos, seleção, detalhes de passagem e comparação. Recomendar pares com o mesmo `stackId`; a comparação existente aceita URLs arbitrárias e deve manter o aviso de incompatibilidade.
- **Alerts:** solicitar `include=recent`, pois o padrão proposto da API é `active` e o produto também pede vencidos nas últimas 48 horas. Ativos primeiro, por severidade extreme, severe, moderate e minor, depois início mais recente e ID; vencidos em seção separada por expiração mais recente. Exibir municípios da UF, horários, descrição e instrução oficiais integrais em português e link oficial.
- **Posts:** itens automáticos aprovados `pass`, `pair` e `story`, em data decrescente, com desempate por tipo e ID. Links tipados levam a Radar, comparação ou história. Paginação e limites dependem de contrato.
- **Help:** organizações ativas com coordenadas nas áreas 5, 1, 2 e 12. Mostrar filtros, total antes do limite, itens retornados, município, distância e link quando disponível. Exibir “Being listed is not an endorsement. Source: Mapa das OSCs (IPEA).”

Para a comparação em destaque, consultar pares consecutivos no período selecionado e ordenar por data de `after` decrescente, data de `before` decrescente, `stackId`, ID de before e ID de after crescentes. Sem par, mostrar “No compatible comparison in this period.” Não chamar o par mais recente de maior mudança.

A referência de proximidade aprovada é o centro do bbox do par selecionado, depois o da passagem selecionada e, na ausência de ambos, o do estado. Para `[west,south,east,north]`, o centro é `[(west+east)/2,(south+north)/2]`. Atualizar `near` ao mudar a seleção, não ao mover a câmera. A distância é aproximada e não mede capacidade, disponibilidade ou área de atendimento.

Datas de aquisição são dias UTC; alertas são instantes ISO. Exibir instantes em UTC identificado e datas em formato en-US, sem alterar o dia da aquisição. Não inferir fuso por UF.

## Mapa

| Contexto | Camadas e interação |
|---|---|
| Nacional | Cobertura por UF e selos de alertas ativos; clique abre o estado |
| Overview | Limite estadual e referência do par, com ação equivalente no painel |
| Radar | Limite, contornos e imagem georreferenciada; lista alternativa para seleção |
| Alerts, Posts e Help | Limite estadual; seleção e ações disponíveis em cartões |

Selos nacionais fazem parte da intenção de produto. Consultar `GET /regions/br/alerts`, agrupar municípios pelos dois primeiros dígitos do código IBGE e deduplicar por ID em cada UF; não inferir estado pelo centro de polígono. Polígonos de alerta e marcadores de organizações são extensões aceitas, fora do núcleo mínimo. Caso sejam implementados, devem preservar rótulos e controles e oferecer alternativa em lista. Seleção local pode ser limpa por controle explícito ou mudança de estado.

Reutilizar `BaseMap`, `BrowseImageLayer`, `BrowseImageStatus`, `BeforeAfterMap` e `useLabelLayerId`. PNGs de 2–7 MB são carregados diretamente da ASF; demais fontes externas passam pela API. O cache atual em memória guarda até oito imagens. Posicionar imagem somente com `georef.corners` em ordem top-left, top-right, bottom-right, bottom-left; não desenhar com georef nulo ou qualidade low. Footprint e bbox não posicionam PNG. Preservar worker MapLibre via `?url` e `setWorkerUrl`, `optimizeDeps.include` e uma única instância. Falhas de WebGL, mapa ou imagem devem manter conteúdo textual e retry contextual.

## Arquitetura e contratos

Manter Vite, React, TypeScript, React Router, TanStack Query, Tailwind v4, MapLibre e react-map-gl, com `app/`, `api/`, `map/`, `ui/` e `features/`. Páginas consomem hooks, HTTP passa por `apiGet`, tipos JSON ficam em `web/src/api/types.ts` e o frontend não importa `server/`. Proposta: subpastas por aba em `features/region/`; `RegionTabs`, `RegionOverview`, `AlertList`, `OrganizationList` e `PostsFeed` recebem dados e ações de seus domínios. Ampliar `paths.region` conceitualmente para aba, dia e passagem sem quebrar chamadas anteriores.

Rotas existentes: `/regions?kind=state`, `/regions/geojson?kind=state`, `/coverage?start&end`, `/regions/:id/passes`, `/footprints` e `/pairs` com período, `/passes/:id`, `/passes/:id/browse`, `/stories` e `/stories/:id`. Erros usam `{error:{code,message,issues?}}`. Cobertura nacional admite até 31 dias; estado, 366 dias.

Rotas propostas, ainda indisponíveis:

- `/regions/:id/alerts?include=active|recent`: `dataSource`, `region`, `updatedAt`, `summary` e `alerts`. Cada alerta inclui ID, evento, severidade `minor|moderate|severe|extreme`, cor, início, expiração, status `active|expired`, textos oficiais, URL, municípios, total nacional e geometria. GeoJSON usa `[lon,lat]`. Exemplos com `...` não são fixtures JSON válidas.
- `/regions/:id/organizations?areas=5,1,2,12&near=lon,lat&limit=20`: máximo proposto 100; resposta com região, referência, total, organizações, campanhas e aviso. O exemplo não informa `dataSource` nem data do snapshot. `reference.kind` é ambíguo para referência derivada de passagem. `campaigns: []` não distingue falta de chave, vazio e falha parcial; não inventar motivo. Solicitar metadados opcionais compatíveis.
- `/regions/:id/posts?start&end`: padrão proposto de 30 dias e máximo de 366; resposta com `dataSource`, região e posts com ID, tipo, data, título, texto e link tipado. Limites e paginação precisam de definição.

Chaves de query devem incluir estado e todos os filtros: janela, include, áreas normalizadas, near e limit, com defaults determinísticos. Reutilizar requests entre Overview e abas; consultar sob demanda e evitar prefetch de PNGs. A política existente não repete 4xx, admite até duas novas tentativas nos demais e desabilita refetch no foco. Política aprovada para novas fontes: alerts staleTime de 5 minutos e atualização a cada 5 minutos enquanto visível; organizations 24 horas; posts uma hora. A implantação depende da capacidade e dos contratos das fontes.

Usar AbortSignal e isolar resultados por chave. Dados de outro estado nunca devem parecer pertencer ao atual. Placeholder de outro período deve ser identificado e ter ações bloqueadas ou ser ocultado. Alertas expiram pelo relógio local mesmo sem fetch, com ressalva sobre a hora do dispositivo; falha de rede não confirma ausência de novos alertas.

## Estados, acessibilidade e operação

Cada seção distingue carregamento, sucesso, vazio, erro sem cache, atualização, falha com dados preservados, resposta stale e fonte não configurada quando o contrato permitir. Falha do INMET ou IPEA não bloqueia radar. “No active alerts” exige consulta bem-sucedida; falha usa “Alerts could not be checked”. Retry é por seção. Exibir `updatedAt`, `retrievedAt`, data do snapshot e última verificação apenas quando disponíveis e com seu significado real.

Manter painel desktop de 380 px, breakpoint lg de 1024 px e mapa primeiro no mobile com 58svh e mínimo de 320 px. Abas com `tablist`, `tab`, `tabpanel`, `aria-selected`, setas, Home/End e ativação por Enter ou Space; foco visível e aba focada rolada para vista. Textos oficiais em português com `lang=pt-BR`; interface em inglês. Cor INMET é semântica da fonte, seleção usa amarelo com contorno escuro. Apenas moderate `#FFFE00` é exemplificado; usar cor retornada para outras e fallback neutro. Não depender somente de cor. Testar contraste, reflow, toque, foco e movimento reduzido; não declarar conformidade certificada.

Atalhos existentes da comparação: Space alterna, B antes e A depois, ignorando campos editáveis. Preservá-los sem conflito com controles.

Testes existentes são de lógica pura; testes de componentes, E2E e acessibilidade automatizada são propostas, não ferramentas observadas. Comandos existentes: `npm test`, `npm test -w web`, `npm run typecheck`, `npm run build`. Node 22+; README informa teste no 24. Build da raiz gera apenas frontend. `VITE_API_BASE` é definido no build, `/api` usa proxy em desenvolvimento, servidor precisa de CORS e hospedagem precisa de fallback SPA. `GLOBALGIVING_API_KEY` pertence somente ao servidor.

Sequência proposta: navegação e contratos; layout de abas; preservação do Radar; Overview; integrações; testes. Fixtures sintéticas identificadas permitem trabalho antes do backend, mas nunca devem aparecer como dados reais em produção. Metas de desempenho precisam ser acordadas e medidas.
