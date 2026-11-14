# web/ — frontend do NISAR over Brazil

SPA em **Vite + React + TypeScript**, mapa com **MapLibre GL** (`react-map-gl/maplibre`), dados com **TanStack Query**,
rotas com **React Router** e estilo com **Tailwind CSS v4**. A interface é em inglês; a documentação, em português.
A linguagem visual está em [`DESIGN.md`](./DESIGN.md): leia antes de criar uma página.

## Rodando

Na raiz do repositório:

```bash
npm install
npm run dev          # API (http://localhost:8787) + site (http://localhost:5173) juntos
npm run dev:web      # só o site (precisa da API no ar)
npm run dev:api      # só a API
```

Dentro do workspace (`npm run <script> -w web`):

| Script | O que faz |
|---|---|
| `dev` | Vite em http://localhost:5173 (porta fixa). `/api` vai por proxy para `http://localhost:8787` (mude com `API_PROXY_TARGET`). |
| `build` | `tsc --noEmit` + build de produção em `web/dist/` |
| `preview` | Serve o `dist/` localmente |
| `typecheck` | Só o TypeScript |
| `test` | Vitest (lógica pura: meses, escala de cor, regras da imagem, formatação) |

**Deploy:** defina `VITE_API_BASE` (ex.: `https://minha-api.exemplo.com/api`, sem barra no final) no build.
A API precisa liberar CORS para o domínio do site (`CORS_ORIGIN` no servidor). Como é SPA com rotas no navegador,
o host deve devolver `index.html` para qualquer caminho desconhecido.

## MapLibre 6 e o worker (leia se o mapa ficar em branco)

Usamos `maplibre-gl` 6 com `react-map-gl` 8.1.3. É um par suportado: `@vis.gl/react-maplibre` 8.1.3 (o que
`react-map-gl/maplibre` usa por baixo) é desenvolvido contra `maplibre-gl ^6`.

O MapLibre 6 é só ESM e carrega o Web Worker de um arquivo separado, achado com
`new URL("./maplibre-gl-worker.mjs", import.meta.url)`. O Vite pré-empacota o módulo em dev (`node_modules/.vite/deps`)
e o reempacota no build, então esse arquivo vizinho some e o mapa fica em branco com
`Error: Worker failed to load. Check that the worker URL is correct.` A correção tem duas partes:

1. `src/map/maplibreSetup.ts` importa o worker com `?url` (o Vite serve o arquivo em dev e o copia para
   `dist/assets/` no build) e chama `setWorkerUrl()`. O arquivo do worker não importa nada, então copiar como está funciona.
   `BaseMap.tsx` importa esse módulo antes de criar qualquer mapa.
2. `vite.config.ts` tem `optimizeDeps.include: ["maplibre-gl", "react-map-gl/maplibre"]`, para que o app e o
   react-map-gl usem **a mesma instância** do maplibre-gl. Sem isso, o Vite pode descobrir as dependências em duas
   rodadas e gerar duas cópias; o `setWorkerUrl` cai numa e o mapa usa a outra.

Se o erro voltar em dev depois de mexer em dependências, pare o Vite e rode `npx vite --force` dentro de `web/`
para refazer o pré-empacotamento. Confirmado em dev e em `vite preview` (o worker aparece como
`dist/assets/maplibre-gl-worker-*.mjs`).

## Rotas

| Caminho | Página | Dono |
|---|---|---|
| `/?month=YYYY-MM&region=<id>` | Visão geral: mapa do Brasil por dias com passagem | `features/overview/` (pronta) |
| `/region/:regionId?start=YYYY-MM-DD&end=YYYY-MM-DD[&day=YYYY-MM-DD][&pass=<id>]` | Região: passagens, linha do tempo, contornos | `features/region/` (pronta) |
| `/story/:storyId` | História (hoje: `rs-flood-jul-2026`, vem de `/api/stories`) | `features/story/` (pronta) |
| `/compare?before=<passId>&after=<passId>` | Antes e depois de duas passagens quaisquer (avisa se o `stackId` difere) | `features/compare/` (pronta) |

Monte links sempre com `paths` de `src/app/paths.ts` (`paths.region(id, period)`, `paths.compare(a, b)`, ...).
Não escreva ids de história no código: pegue de `useStories()`.

## Estrutura

```
web/
  index.html              lang="en", título, favicon
  vite.config.ts          proxy /api, Tailwind, optimizeDeps do maplibre, config do vitest
  DESIGN.md               paleta, tipografia, layout, convenções de texto
  src/
    main.tsx              fontes, CSS global, monta o <App>
    app/
      App.tsx             QueryClient (sem retry em 4xx) + RouterProvider
      router.tsx          as quatro rotas
      Layout.tsx          barra superior + <Outlet>
      paths.ts            helpers de URL das páginas
      styles.css          tokens (@theme), .num, .place, .link, .btn-primary
      NotFoundPage.tsx
    api/
      client.ts           apiGet, ApiError (corpo {error:{code,message}}), describeError
      types.ts            tipos das respostas, escritos a partir da API real (não importe de server/)
      hooks.ts            useRegions, useRegionsGeoJSON, useCoverage, useStories, useStory, usePass,
                          useBrowse, useRegionPasses, useRegionFootprints, useRegionPairs
      dates.ts            meses e períodos em UTC (listMonths, monthRange, daysInclusive, ...)
      regionNames.ts      nomes em inglês do país e das macrorregiões (único lugar)
    map/
      BaseMap.tsx         mapa base sem chave (OpenFreeMap positron), atribuição, zoom; prop `overlay` p/ HTML
      maplibreSetup.ts    aponta o MapLibre para o arquivo do worker (ver seção acima)
      basemapConfig.ts    URL do estilo (uma constante), bbox do Brasil, atribuição dos dados
      layers.tsx          useLabelLayerId (inserir camadas abaixo dos rótulos), ShorelineOverlay
      BrowseImageLayer.tsx  useBrowseImage + <BrowseImageLayer> (imagem posicionada por georef.corners)
      BrowseImageStatus.tsx carregando com %, "não mostrada" e por quê, erro
      browseImage.ts      regra de qualidade + download com progresso e cache (8 imagens)
      BeforeAfterMap.tsx  visualizador antes/depois (ver "Antes e depois" abaixo); regras puras em beforeAfter.ts
      mapColors.ts        cores e larguras para camadas MapLibre
    ui/
      MapPageLayout.tsx   painel 380 px + mapa; PageTitle, SectionTitle
      feedback.tsx        ProgressBar, StaleNotice, ErrorMessage
      MonthPicker.tsx     mês anterior / lista / próximo (visão geral e região)
      format.ts           datas/números em inglês (UTC), plural, tamanho de arquivo
      Wordmark.tsx
    features/
      overview/           visão geral (CoverageMap, RegionPicker, RegionSummary,
                          CoverageLegend, StoryCard, StoryMarker, coverageScale)
      region/             página da região (ver "Página da região" abaixo)
      story/              StoryPage.tsx + storyLogic.ts (pares, textos de data, enquadramento)
      compare/            ComparePage.tsx + compareLogic.ts (ordem, avisos, detalhes)
```

Cada agente/pessoa é dono de uma pasta em `features/`. Componente usado por mais de uma página vai para `ui/`
(HTML) ou `map/` (coisa de mapa). Ao mexer em `api/` ou `map/`, mantenha a assinatura existente: outras páginas dependem dela.

## Como plugar uma página

```tsx
import { useRegionPasses } from "../../api/hooks";
import { BaseMap } from "../../map/BaseMap";
import { BrowseImageLayer, useBrowseImage } from "../../map/BrowseImageLayer";
import { BrowseImageStatus } from "../../map/BrowseImageStatus";
import { StaleNotice } from "../../ui/feedback";
import { MapPageLayout, PageTitle } from "../../ui/MapPageLayout";

const passes = useRegionPasses("rs", { start: "2026-07-01", end: "2026-08-05" });
const image = useBrowseImage(passId);              // busca /passes/:id/browse e baixa o PNG

<MapPageLayout
  panelLabel="Region"
  panel={<><PageTitle>Rio Grande do Sul</PageTitle><StaleNotice dataSource={passes.data?.dataSource} /></>}
  map={
    <BaseMap initialBbox={region.bbox} overlay={<div className="absolute left-3 top-3"><BrowseImageStatus image={image} /></div>}>
      <BrowseImageLayer image={image} />           {/* dentro do mapa */}
    </BaseMap>
  }
/>
```

Regras que valem para todas as páginas:

- **Imagem de radar só por `georef.corners`** (via `useBrowseImage`/`BrowseImageLayer`). Nunca posicione pelo
  `footprint` ou `bbox` da passagem: erra 7–11% (ver README da raiz). Sem `georef` ou com `quality: "low"`, a imagem
  não é desenhada e `BrowseImageStatus` explica o motivo.
- **Duas imagens no mesmo mapa** (antes/depois): dê `id` diferentes (`<BrowseImageLayer id="before" .../>`).
  O PNG fica em cache em memória; alternar entre elas não baixa de novo.
- **Camadas suas abaixo dos rótulos**: `beforeId={useLabelLayerId()}` (dentro do `<BaseMap>`).
- **Contornos de passagem** (`useRegionFootprints`): amarelo `MAP_COLORS.signal` sobre contorno `MAP_COLORS.ink`
  (`ANNOTATION_LINE`). Só para desenhar contorno, nunca para posicionar imagem.
- **Comparar só o mesmo `stackId`**: `useRegionPairs` já devolve pares assim; `paths.compare(before.id, after.id)`.
- **Limites de período**: país 31 dias, macrorregião 92, estado 366. Erro `window_too_large` vira texto por `describeError`.
- **`dataSource: "stale"`**: mostre `<StaleNotice>` perto dos números.
- **Nomes**: `regionName(region)` em vez de `region.name` (país e macrorregiões em inglês).

## Página da região

`features/region/`. Sem `start`/`end`, pede à API o padrão (últimos 30 dias); o seletor de mês mantém cada pedido
dentro dos limites. O dia e a passagem escolhidos ficam na URL (`day`, `pass`) para a demo abrir direto neles.

- **Linha do tempo** (`DayCalendar`): calendário com o número de passagens de cada dia (campo `timeline`).
  Escolher um dia filtra o mapa e a lista. A lista inteira só aparece até 150 passagens (estado); no país ou numa
  macrorregião ela espera um dia, para a página continuar leve.
- **Mapa** (`RegionMap`): contornos de `useRegionFootprints` (amarelo sobre tinta), contorno da região, imagem da
  passagem escolhida logo abaixo do contorno grosso dela. Mudar dia ou passagem só troca filtros das camadas, sem
  reenviar o GeoJSON. Um clique onde vários contornos se sobrepõem abre uma lista para escolher.
- **Comparar** (`useStackNeighbors`): anterior e seguinte do mesmo `stackId`. Se faltar um lado dentro do período,
  busca os 24 dias logo antes ou depois (um pedido por lado, compartilhado por todas as passagens; 24 dias cabem até no
  limite do país).
- Lógica pura em `regionLogic.ts` (período da URL, calendário, agrupamento por dia, vizinhos, janelas de margem), com testes.

## Antes e depois, história e comparação

- **Visualizador** (`map/BeforeAfterMap.tsx`): as duas imagens ficam no mesmo mapa e só uma é opaca por vez, então
  alternar é instantâneo e a vista não mexe. Botão de duas datas embaixo do mapa (a imagem mostrada é o bloco de
  tinta com borda amarela); teclado em qualquer lugar da página: `Espaço` alterna, `B` antes, `A` depois. As duas
  imagens baixam em paralelo, com progresso. A caixa "Usual water outline" desenha a linha d'água do mapa base por
  cima, para comparar com a água escura do radar. Uso: `<BeforeAfterMap before={{passId, date}} after={...}
  initialBbox pairBbox>{marcadores}</BeforeAfterMap>`; quando `pairBbox` muda, o mapa enquadra a nova área.
- **História** (`features/story/`): tudo vem de `useStory`. Abre enquadrada nos lugares da história (Lajeado, baixo
  Taquari, Jacuí e Guaíba) com o primeiro par em destaque; escolher outro par enquadra a parte da área que ele cobre.
- **Comparação** (`features/compare/`): aceita duas passagens quaisquer, põe em ordem de data, avisa em texto claro
  quando a geometria de visada difere e mostra mensagem para id ausente ou desconhecido.

## Testes

`npm test -w web` roda os testes em `src/**/*.test.ts`: períodos de mês (UTC, fevereiro, limite de 31 dias), escala de
cor (limites das classes, expressão MapLibre), regra de exibição da imagem e formatação. Sem snapshots.
