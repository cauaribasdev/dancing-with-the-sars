# Dancing with the SARs — NISAR no Brasil

Projeto para o **NASA Space Apps Challenge 2026**, desafio
[Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/):
um mapa interativo do Brasil para explorar as passagens do radar **NISAR** (NASA-ISRO) e
comparar o antes e o depois de mudanças na superfície. A primeira história é a **cheia de julho de 2026 no Rio Grande do Sul**.

O repositório é um monorepo com dois workspaces npm: a **API** em `server/` (Hono) e o **site** em `web/` (Vite + React + MapLibre). A home e os principais controles são em português; alguns textos legados e narrativas da API permanecem em inglês; veja [`web/README.md`](web/README.md) e [`web/DESIGN.md`](web/DESIGN.md).

## Entrada e exploração

- `/`: home com identidade Space Apps, prévias reais e acesso direto à história do RS.
- `/explore`: mapa Brasil/estados. URLs antigas `/?region=...&month=...` continuam abrindo o mapa com filtros.
- `/region/:id?tab=radar`: calendário e composição de passagens de múltiplos dias.
- `/story/rs-flood-jul-2026` e `/compare?before=...&after=...`: história e comparação preservadas.

Plano deste incremento: [home e exploração](docs/plano-home-exploracao.md). Rastreabilidade: [inventário frontend](docs/frontend-inventario.md).

## Rodando

Requisitos: Node.js 22+ (testado no 24).

```bash
npm install
npm run dev          # API em http://localhost:8787/api + site em http://localhost:5173, juntos
npm run dev:api      # só a API (recarrega ao salvar)
npm run dev:web      # só o site (o Vite faz proxy de /api para a porta 8787)
npm run build        # build de produção do site em web/dist/
npm test             # testes dos dois workspaces (offline, sem credenciais)
npm run typecheck    # TypeScript dos dois workspaces
```

Em produção, o site precisa saber onde está a API: defina `VITE_API_BASE` no build (detalhes em [`web/README.md`](web/README.md)).

Scripts do servidor (`npm run <script> -w server`):

| Script | O que faz |
|---|---|
| `boundaries` | Baixa os limites oficiais do IBGE (país, 5 regiões, 27 UFs) para `server/data/regions.geojson` (já versionado) |
| `check:browse` | Valida o georreferenciamento das imagens de prévia em cenas reais (`-- rs 2026-07-11 2026-07-27`) |
| `warm` | Pré-carrega o cache (histórias + cobertura mensal) para a demo não depender da NASA na hora (`-- 2026-06` para começar em junho) |

## API

Todas as rotas ficam sob `/api`. Datas são `YYYY-MM-DD` (UTC). Sem `start`/`end`, o período padrão são os últimos 30 dias.
Respostas que vêm do catálogo trazem `dataSource` (e o header `X-Data-Source`) com valor `live`, `cache` ou `stale`.
`stale` significa que a fonte está antiga ou falhou e o servidor devolveu um snapshot que já estava salvo.

| Rota | Para que serve |
|---|---|
| `GET /health` | Health check |
| `GET /meta` | Produtos, limites de período, notas e atribuições |
| `GET /regions?kind=state\|region\|country` | Lista de regiões (`br`, `sul`, `rs`, ...) com bbox |
| `GET /regions/geojson?kind=state` | Polígonos para desenhar o mapa |
| `GET /regions/:id/passes?start&end` | Passagens NISAR que **tocam o polígono** da região + linha do tempo + resumo |
| `GET /regions/:id/footprints?start&end` | As mesmas passagens como GeoJSON (contornos no mapa) |
| `GET /regions/:id/pairs?start&end[&eventDate]` | Pares antes/depois com **mesma geometria** (mesmo `stackId`). Com `eventDate`: o último antes e o primeiro depois do evento |
| `GET /regions/:id/alerts?include=active\|recent` | Alertas CAP do INMET filtrados por prefixo IBGE; `br` devolve o escopo nacional |
| `GET /regions/:id/organizations?areas&near&limit&cursor` | OSCs do snapshot público do IPEA, filtradas por área e ordenadas por distância |
| `GET /regions/:id/posts?start&end&limit&cursor` | Feed automático de dias com passagens, pares compatíveis e histórias |
| `GET /coverage?start&end` | Cobertura por estado no Brasil inteiro (máx. 31 dias), para colorir o mapa |
| `GET /passes/:id` | Uma passagem pelo id |
| `GET /passes/:id/browse` | URL da imagem de prévia + **cantos georreferenciados** (formato da fonte `image` do MapLibre) |
| `GET /stories` · `GET /stories/:id` | Histórias curadas. `rs-flood-jul-2026` devolve narrativa, fontes, passagens e pares destacados já georreferenciados |

OpenAPI 3.1 dos três feeds complementares: [`server/openapi.json`](server/openapi.json).

Limites de período: país 31 dias, macrorregião 92 dias, estado 366 dias. O motivo é o tamanho: cada registro do catálogo tem cerca de 29 KB e o Brasil tem cerca de 1.500 passagens por mês.

Exemplos:

```bash
curl "localhost:8787/api/stories/rs-flood-jul-2026"
curl "localhost:8787/api/regions/rs/pairs?start=2026-07-01&end=2026-08-05&eventDate=2026-07-22"
curl "localhost:8787/api/coverage?start=2026-07-01&end=2026-07-31"
```

## Como funciona

```
IBGE (limites)  ─┐
                 ├─> RegionIndex ──┐
NASA CMR ─> catálogo (blocos semanais, cache em disco) ─> normalização ─> filtro por polígono
                                   │                        ─> dedupe ─> pares / cobertura / histórias
ASF (PNG de prévia) ─> georreferenciamento (cache permanente) ┘
```

- **Produto: GCOV** (retroespalhamento do radar), nas coleções validated, provisional e beta. É o produto certo para água e enchentes: água parada aparece escura. Os dados sobre o Brasil começam em 30/10/2025.
- **Catálogo:** a busca de metadados no [NASA CMR](https://cmr.earthdata.nasa.gov/search) é aberta. O período é dividido em blocos semanais fixos, buscados em paralelo e guardados em `server/.cache/` já normalizados (pequenos). Semanas passadas ficam 7 dias no cache, a semana atual 3 horas.
- **Deduplicação:** a mesma aquisição pode aparecer como beta, provisional e validated. Fica uma por `stackId` + ciclo, preferindo validated, frame completo e dupla polarização.
- **Pares:** só são comparadas passagens com o mesmo `stackId` (trilha + direção + frame). Mudar a geometria de visada muda o brilho mesmo sem mudança no chão.
- **Alertas:** o adaptador lê CAP 1.2 do bucket público WIS2 do INMET, mantém cache em disco e marca dados como `stale` se a publicação mais recente tiver mais de 24 horas. A lista estadual usa os dois primeiros dígitos do código IBGE do município; a resposta nacional usa `/regions/br/alerts`.
- **Posts:** gerados do catálogo por dia de aquisição, pares consecutivos do mesmo `stackId` e histórias da aplicação; cursor é offset determinístico na consulta e a janela estadual respeita o limite de 366 dias.
- **IPEA:** o endpoint Organizations baixa o CSV geral (cerca de 344 MB) em streaming na primeira consulta, conserva só OSCs ativas com coordenadas nas áreas de saúde ou assistência social e guarda o resultado compacto em `CACHE_DIR`. O snapshot observado (agosto de 2026) é servido com `stale` após 45 dias. Configure `IPEA_CSV_URL`, `IPEA_TIMEOUT_MS` e um `CACHE_DIR` persistente; a primeira consulta sem cache pode levar alguns minutos. Habitação e comunidades/favelas não são colunas separadas no snapshot atual, e campanhas do GlobalGiving não estão configuradas.

### Georreferenciamento das imagens de prévia (descoberta importante)

O arquivo `_LATLON.png` **não** cobre o bbox do contorno informado pelo CMR. Ele tem margens transparentes de tamanho variável, os pixels são quadrados em **Web Mercator** e às vezes a borda da imagem corta um canto dos dados. Os limites exatos ficam num KML que exige login.

Por isso, `server/src/domain/georef.ts` reconstrói os limites a partir de dados abertos:
1. encontra os pontos extremos da área com dados no PNG;
2. casa esses pontos com os vértices extremos do contorno;
3. descarta os cantos cortados;
4. ajusta `x = a + s·lon`, `y = b − s·mercY` por mínimos quadrados.

Em 24 cenas reais do RS o erro ficou entre 1,5 e 4,6 px, com proporção de pixel de 0,99 a 1,00. Usar o bbox diretamente deslocaria a imagem em 7–11% (até 68% em frames parciais). Para repetir a validação: `npm run check:browse -w server`.

## Fontes de dados

- **NISAR GCOV** — NASA/JPL e ISRO, via [NASA CMR](https://cmr.earthdata.nasa.gov/search) e [ASF DAAC](https://asf.alaska.edu/). Imagens de prévia abertas; arquivos HDF5 completos (5–7 GB) exigem [Earthdata Login](https://urs.earthdata.nasa.gov/) gratuito.
- **Limites territoriais** — [IBGE, API de malhas](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3).
- **Alertas meteorológicos** — CAP do [INMET](https://avisos.inmet.gov.br/) publicado via nó [WIS2](https://wis2bra.inmet.gov.br/oapi/openapi).
- **Organizações** — snapshot CSV do [Mapa das OSCs/IPEA](https://mapaosc.ipea.gov.br/base-dados), com áreas 2 (saúde) e 5 (assistência social) no arquivo verificado.
- **Contexto do evento** — notícias listadas em `server/src/application/stories/definitions.ts`. Confirme com a Defesa Civil do RS.

## Limitações conhecidas

- As imagens de prévia são renderizações visuais, não retroespalhamento calibrado. Números quantitativos (ex.: km² alagados) exigiriam os arquivos HDF5.
- Em agosto de 2026 há um intervalo sem aquisições sobre o RS (27/07 → 16/08).
- O cache fica em disco local; num deploy novo ele começa vazio (use `npm run warm`). Antes de publicar a rota de organizações, execute `npm run warm:ipea -w server` com `CACHE_DIR` persistente; o primeiro download e parsing do CSV geral (cerca de 344 MB) pode levar vários minutos. `IPEA_TIMEOUT_MS` controla o limite (padrão 10 min). O snapshot observado é de agosto de 2026 e será identificado como `stale` depois de 45 dias.

## Arquitetura

O servidor é organizado em camadas (portas e adaptadores). As regras de negócio não sabem de onde vêm os dados nem que existe HTTP; quem fala com o mundo externo fica nas bordas.

| Camada | O que fica aqui |
|---|---|
| `shared/` | Funções utilitárias puras (datas, `mapLimit`). Sem I/O. |
| `domain/` | Tipos e regras de negócio: `Pass`, `Region`, deduplicação, pares, cobertura, georreferenciamento, `DomainError`. Sem I/O, sem framework. |
| `application/` | Casos de uso (buscar passagens de uma região, cobertura, histórias) e as **portas** em `ports.ts`: as interfaces `Catalog`, `BrowseService`, `RegionRepository` e o tipo `Deps`. |
| `infra/` | Adaptadores que implementam as portas: catálogo do CMR, georreferenciamento das prévias da ASF, cache em disco, regiões do IBGE. |
| `http/` | Hono: rotas, validação com zod e conversão de `DomainError` em status HTTP. |
| `composition-root.ts` | Único lugar que escolhe qual implementação de `infra/` vai em cada porta. |

Regra de dependência: cada camada só importa as camadas abaixo dela; `infra/` e `http/` não se conhecem e se encontram apenas no `composition-root.ts`.

```
http ──────┐            ┌────── infra
           ▼            ▼
         application (ports)
                │
                ▼
              domain
                │
                ▼
              shared
```

`config.ts` só pode ser lido por `infra/`, `http/` e `composition-root.ts`; `hono` e `zod` só aparecem em `http/`. O teste `server/test/architecture.test.ts` verifica tudo isso e falha se alguém importar na direção errada.

### Onde colocar código novo

- **Nova fonte de dados** (outro catálogo, outro satélite): se o contrato já existe, implemente a interface de `application/ports.ts` em `infra/<fonte>/`. Se não existe, declare a interface nova em `ports.ts` e adicione o campo em `Deps`. Depois ligue a implementação em `composition-root.ts` e crie um fake em `test/helpers.ts`.
- **Nova rota**: em `http/routes/<recurso>.ts` (ou num arquivo novo, montado em `http/app.ts`). A rota valida a entrada com os schemas de `http/schemas.ts`, chama um caso de uso de `application/` e monta a resposta. Sem regra de negócio na rota.
- **Nova regra de negócio**: função pura em `domain/`, com teste. Se ela precisar de dados externos, o caso de uso em `application/` busca os dados pelas portas e passa para a função. Para recusar uma entrada, lance `DomainError` com `kind` (`not_found`, `invalid` ou `upstream`); o status HTTP é escolhido em `http/errors.ts`.
- **Nova história**: um item a mais em `STORIES`, em `application/stories/definitions.ts`. Passagens e pares são buscados ao vivo, não precisa de código novo.

## Estrutura

```
server/
  data/regions.geojson        limites IBGE (gerado por scripts/fetch-boundaries.ts)
  src/index.ts                ponto de entrada (sobe o servidor)
  src/composition-root.ts     liga as implementações de infra/ às portas
  src/config.ts               coleções, limites, TTLs (variáveis de ambiente: PORT, CORS_ORIGIN, CACHE_DIR, ...)
  src/shared/                 datas, concorrência
  src/domain/                 tipos e regras: passagens, regiões, histórias, dedupe, pares, cobertura, georreferenciamento
  src/application/            casos de uso, portas (ports.ts) e histórias curadas (stories/)
  src/infra/                  CMR, prévias da ASF, cache em disco, índice de regiões
  src/http/                   app Hono, schemas, erros, rotas por recurso (routes/)
  scripts/                    limites IBGE, validação das imagens, aquecimento do cache
  test/                       vitest (fixture real do CMR + dados sintéticos + regra de arquitetura)
web/
  src/main.tsx                ponto de entrada do site
  src/app/                    rotas, casca (barra superior), providers, tokens de estilo
  src/api/                    cliente HTTP, tipos das respostas, hooks do TanStack Query
  src/map/                    mapa base, imagem de radar georreferenciada, camadas compartilhadas
  src/ui/                     componentes pequenos (layout, carregando, avisos, formatação)
  src/features/               uma pasta por página: overview, region, story, compare
  DESIGN.md                   linguagem visual (paleta, tipografia, layout, texto)
```


## Estado atual e evolução aprovada

A navegação por estados e as abas Overview, Radar, Alerts, Posts e Help estão implementadas. Alertas usam CAP do INMET, Posts são gerados a partir do radar e Help consulta o snapshot público do Mapa das OSCs; veja limites de áreas e atualização em [rotas](docs/rotas.md). Comparações visuais não constituem detecção automática de desastre. Consulte [a documentação de frontend](docs/frontend.md).
