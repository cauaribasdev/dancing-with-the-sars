# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

O restante deste arquivo está em português, a língua da equipe. Este arquivo é versionado em `docs/`, junto com as decisões de produto em [produto.md](produto.md) e as rotas em [rotas.md](rotas.md).

## O projeto

Entrada da equipe no **NASA Space Apps Challenge 2026**, desafio "Dancing with the SARs": um app interativo que usa dados do radar **NISAR** (NASA + ISRO) para mostrar mudanças na superfície da Terra.

Nossa proposta é um mapa do Brasil em três níveis:

1. **Brasil:** cada estado colorido pela frequência com que o satélite passou no período.
2. **Estado:** linha do tempo das passagens e o contorno de cada uma no mapa.
3. **Antes e depois:** duas imagens de radar da mesma área, sobrepostas no mapa, para ver o que mudou.

**O estado é a única unidade que o usuário escolhe.** Macrorregiões (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) não aparecem como opção em nenhuma tela, e o Brasil inteiro aparece só no mapa de entrada. A API continua aceitando país e macrorregião, mas o site não usa esses valores, e as rotas novas recebem só estados.

A história principal é a **cheia de julho de 2026 no Rio Grande do Sul** (o Taquari passou da cota de inundação em 22/07). A cheia de abril/maio de 2024 não aparece: os dados do NISAR sobre o Brasil começam em 30/10/2025.

Prazo de entrega: noite de 15/11/2026. Prefira a solução mais simples que funcione na demonstração.

## Comandos

Monorepo com npm workspaces: `server/` (API) e `web/` (site). Rodar da raiz. Requer Node.js 22+.

```bash
npm install          # instala os dois pacotes
npm run dev          # API (porta 8787) e site (porta 5173) juntos
npm run dev:api      # só a API, em http://localhost:8787/api
npm run dev:web      # só o site; /api é redirecionado para localhost:8787
npm test             # testes dos dois pacotes
npm run typecheck
npm run build        # build do site
```

Um teste só:

```bash
npm test -w server -- test/pairs.test.ts      # um arquivo
npm test -w server -- -t "bracketingPairs"    # por nome
```

Não há linter configurado. A verificação é type check mais testes.

Scripts do servidor (`npm run <script> -w server`):

- `warm -- 2026-06`: pré-carrega o cache. Rode pouco antes de uma demonstração.
- `check:browse`: valida o alinhamento das imagens em cenas reais (usa a rede).
- `boundaries`: baixa de novo os limites do IBGE e sobrescreve `server/data/regions.geojson`. Só rode se precisar mudar os limites.

Para simular a NASA fora do ar (bash): `PORT=8799 CMR_BASE_URL=http://127.0.0.1:9 CACHE_TTL_PAST_HOURS=0.05 CACHE_TTL_RECENT_HOURS=0.05 npm run start -w server`. O que está em cache volta marcado como `stale`; o que não está volta como erro 502.

## Arquitetura

### Backend (`server/`): Node + TypeScript, Hono, Zod

Camadas com portas e adaptadores. A regra é a direção das importações:

```
http ──────┐            ┌────── infra
           ▼            ▼
         application (ports.ts)
                │
              domain
                │
              shared
```

- `domain/`: tipos e regras puras (passagem, região, deduplicação, pares, cobertura, georreferenciamento). Sem I/O e sem framework.
- `application/`: casos de uso e as interfaces que eles exigem (`ports.ts`: `Catalog`, `BrowseService`, `RegionRepository`, `Deps`).
- `infra/`: implementações das interfaces (catálogo da NASA, imagens da ASF, cache em disco, regiões do IBGE).
- `http/`: rotas por recurso, validação e conversão de erro em status HTTP. `hono` e `zod` só aparecem aqui.
- `composition-root.ts`: único lugar que liga as implementações às interfaces.

`server/test/architecture.test.ts` falha se alguém importar na direção errada (por exemplo, `domain` importando `infra`, ou `http` importando `infra`). Não contorne esse teste; mova o código para a camada certa.

Caminho de uma requisição: rota em `http/routes/` valida a entrada, chama um caso de uso em `application/`, que busca dados pelas portas e aplica funções de `domain/`.

Onde colocar código novo:

- **Regra de negócio:** função pura em `domain/`, com teste.
- **Rota:** `http/routes/<recurso>.ts`, sem regra de negócio dentro.
- **Fonte de dados:** interface em `application/ports.ts`, implementação em `infra/`, ligação em `composition-root.ts` e um fake em `test/helpers.ts`.
- **História:** um item a mais em `STORIES`, em `application/stories/definitions.ts`. As passagens e os pares são buscados ao vivo.

### Frontend (`web/`): em construção

O que já está decidido:

- Vite + React + TypeScript, site estático. Sem Next.js e sem renderização no servidor.
- MapLibre (via `react-map-gl/maplibre`), TanStack Query, React Router, Tailwind v4.
- Pastas: `app/` (rotas e layout), `api/` (cliente, tipos e hooks), `map/` (peças de mapa compartilhadas), `ui/`, e uma pasta por tela em `features/` (`overview`, `region`, `story`, `compare`).
- Rotas: `/`, `/region/:regionId`, `/story/:storyId`, `/compare?before=<id>&after=<id>`. Em `/region/:regionId`, o `regionId` é sempre a sigla do estado em minúsculas (`rs`, `sc`, ...). O nome `region` ficou do código original.
- Os tipos da API ficam copiados em `web/src/api/types.ts`. O site não importa nada de `server/`. Se mudar o formato de uma resposta no servidor, atualize esse arquivo.
- Toda a interface em inglês, com palavras simples ("pass", "before and after"). Os nomes dos estados ficam como vêm do IBGE; o país aparece como "Brazil".
- A linguagem visual (cores, tipografia, convenções de componente) ficará em `web/DESIGN.md`. Leia antes de criar uma tela.

## O que o projeto consome

| Fonte | O que vem dela | Acesso | Onde |
|---|---|---|---|
| NASA CMR, `cmr.earthdata.nasa.gov/search/granules.umm_json` | Metadados das passagens NISAR do produto GCOV (coleções `NISAR_L2_GCOV_V1`, `_PROVISIONAL_V1`, `_BETA_V1`) | Aberto, sem login | `server/src/infra/cmr/` |
| ASF, `nisar.asf.earthdatacloud.nasa.gov/BROWSE/` | Imagens de prévia `_LATLON.png` de cada passagem (2 a 7 MB) | Aberto, com CORS liberado | O servidor baixa uma vez para calcular a posição (`infra/browse/`); o navegador carrega o PNG direto da ASF |
| IBGE, API de malhas e de localidades | Contorno do país, das 5 regiões e dos 27 estados | Aberto | Baixado uma vez para `server/data/regions.geojson`; não é consultado em tempo de execução |
| Imprensa | Datas e números da cheia | Links citados | `server/src/application/stories/definitions.ts` |

O projeto não usa os arquivos completos do NISAR (HDF5 de 5 a 7 GB, que exigem Earthdata Login) e não guarda nenhuma credencial.

## API

Base: `/api`. Datas em `YYYY-MM-DD` (UTC). Sem `start` e `end`, vale o período dos últimos 30 dias.

| Rota | Devolve |
|---|---|
| `GET /health` | Verificação de vida |
| `GET /meta` | Produtos, limites de período, notas e atribuições |
| `GET /regions?kind=country\|region\|state` | Lista de regiões (`br`, `sul`, `rs`, ...) com bbox |
| `GET /regions/geojson?kind=` | Polígonos das regiões |
| `GET /regions/:id` | Uma região |
| `GET /regions/:id/passes?start&end` | Passagens que tocam o polígono da região, com resumo e linha do tempo |
| `GET /regions/:id/footprints?start&end` | As mesmas passagens como GeoJSON |
| `GET /regions/:id/pairs?start&end[&eventDate]` | Pares antes/depois de mesma geometria. Com `eventDate`, a última passagem antes e a primeira depois do evento |
| `GET /coverage?start&end` | Cobertura por estado no Brasil inteiro |
| `GET /passes/:id` | Uma passagem |
| `GET /passes/:id/browse` | URL da imagem de prévia e os quatro cantos dela no mapa |
| `GET /stories`, `GET /stories/:id` | Histórias. `rs-flood-jul-2026` traz narrativa, fontes, passagens e os pares em destaque já posicionados |

- **Período máximo:** 31 dias para o país, 92 para macrorregião, 366 para estado. Acima disso a resposta é 400 `window_too_large`. Como o site só trabalha com estados, o limite que vale nas telas é 366 dias; o de 31 dias vale para `/coverage`, que pinta o mapa do Brasil.
- **Origem do dado:** respostas do catálogo trazem `dataSource` (e o header `X-Data-Source`) com `live`, `cache` ou `stale`. `stale` quer dizer que a NASA não respondeu e o dado é o último salvo.
- **Erros:** sempre `{ "error": { "code", "message" } }`, com status 400, 404 ou 502 (500 para erro inesperado).

## Regras do domínio que não são óbvias

- **Só compare passagens com o mesmo `stackId`** (trilha + direção + frame). Com outra geometria de visada, o brilho muda mesmo sem mudança no chão. O satélite repete a mesma geometria a cada 12 dias.
- **Nunca posicione a imagem de prévia pelo contorno ou pelo bbox da passagem.** O PNG tem margens variáveis e está em Web Mercator; pelo bbox ele fica deslocado de 7 a 11%. Use os cantos de `/passes/:id/browse`, calculados em `server/src/domain/georef.ts`. Se `georef` vier nulo ou com `quality: "low"`, não desenhe a imagem.
- **Água parada aparece escura** no radar; mata ou área construída alagada pode aparecer mais clara. As imagens de prévia são renderizações visuais, não medidas calibradas: não tire números (km² alagados) delas.
- **Cada imagem cobre uma faixa de cerca de 240 km**, não um estado inteiro.
- **No mapa do Brasil, pinte os estados por `distinctDates`** (dias com passagem), não por `acquisitions`, que acompanha o tamanho do estado.
- **Uma mesma aquisição aparece mais de uma vez no catálogo** (beta, provisional, validated). `domain/acquisitions.ts` fica com a melhor.
- **As chaves do cache têm versão** (`cmr:v1:`, `browse-georef:v1:`). Se mudar o formato de `Pass` ou do georreferenciamento, suba a versão, senão o servidor devolve registros no formato antigo vindos de `server/.cache/`.

## Padrões do projeto

- **Idioma:** código, nomes, comentários, textos da interface (incluindo o que a API devolve para exibição) e mensagens de commit em inglês. README, este arquivo e os demais documentos em português.
- **Stack:** TypeScript de ponta a ponta. Não há Python no projeto.
- **Git:** o trabalho acontece no branch `dev`. Commits em inglês, no formato Conventional Commits com escopo, por exemplo `feat(server): ...` ou `fix(web): ...`.
- **Testes sem rede:** os testes usam os fakes de `server/test/helpers.ts` e um registro real do catálogo em `test/fixtures/`. Nenhum teste chama a NASA.
- **Não invente dado:** registro do catálogo sem um campo necessário é descartado, não preenchido. Fatos sobre um evento entram com a fonte citada.
- **Windows:** parar `npm run dev` pode deixar o processo `node` vivo na porta. Para liberar, ache o PID com `netstat -ano | findstr :8787` e encerre com `Stop-Process -Id <PID>`.


## Estado atual e evolução aprovada

O seletor e a página regional atuais ainda aceitam país e macrorregiões; a restrição a estados é uma evolução aprovada, ainda não implementada. Preserve hooks, apiGet e tipos JSON no frontend; não importe server/. URL representa estado compartilhável, TanStack Query dados remotos e componentes interações efêmeras. PNGs usam somente georef.corners de qualidade utilizável. Veja [frontend.md](frontend.md).
