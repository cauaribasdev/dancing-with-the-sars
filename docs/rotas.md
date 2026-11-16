# Rotas

As rotas do site, da nossa API e das fontes externas. É o complemento de [produto.md](produto.md).

Situação de cada rota:
- **existe:** está no branch `dev` e foi chamada hoje com o servidor rodando.
- **nova:** é proposta. Os formatos abaixo definem o que cada resposta traz.
- **externa testada:** foi chamada pela equipe em 14/11/2026.

As rotas novas seguem as regras do CLAUDE.md:
- nomes e textos em inglês;
- datas `YYYY-MM-DD` em UTC;
- erros no formato `{ "error": { "code", "message" } }`;
- `dataSource` (`live`, `cache` ou `stale`) em toda resposta que depende de um serviço externo.

---

## 1. Site (`web/`)

| Caminho | Tela | Situação |
|---|---|---|
| `/?month=YYYY-MM&region=<estado>` | Mapa do Brasil, estados pintados por dias com passagem | existe; o seletor passa a listar só estados e o mapa ganha o selo de alerta ativo |
| `/region/:regionId?tab=<aba>&start&end&day&pass` | Painel do estado | existe como página do radar; passa a aceitar só estados e ganha as abas |
| `/story/:storyId` | História (hoje `rs-flood-jul-2026`) | existe |
| `/compare?before=<passId>&after=<passId>` | Antes e depois de duas passagens | existe |

Valores de `tab`: `overview` (padrão), `radar`, `alerts`, `posts`, `help`. Os parâmetros `start`, `end`, `day` e `pass` continuam valendo para a aba `radar`.

`regionId` é sempre a sigla do estado em minúsculas (`rs`, `sc`, `am`, ...). Os nomes `region` e `regionId` ficam como estão no código, mas `br` e as macrorregiões (`norte`, `nordeste`, `centro-oeste`, `sudeste`, `sul`) não são mais aceitos nas telas. Um endereço com um desses ids mostra a mensagem de página não encontrada, com link para o mapa do Brasil.
## 2. Nossa API (`/api`)

### 2.1 Já existem

| Rota | Usada em |
|---|---|
| `GET /health` | Verificação de vida |
| `GET /meta` | Rodapé, atribuições |
| `GET /regions?kind=state` | Seletor de estado |
| `GET /regions/geojson?kind=state` | Mapa do Brasil |
| `GET /regions/:id` | Painel do estado |
| `GET /regions/:id/passes?start&end` | Overview (números do radar), aba Radar |
| `GET /regions/:id/footprints?start&end` | Aba Radar (contornos) |
| `GET /regions/:id/pairs?start&end[&eventDate]` | Overview (mudança em destaque), aba Radar |
| `GET /coverage?start&end` | Mapa do Brasil |
| `GET /passes/:id` · `GET /passes/:id/browse` | Imagens de radar, antes e depois |
| `GET /stories` · `GET /stories/:id` | Overview (cartão da história), História |

Os parâmetros estão no README da raiz.
- **Período:** com só estados, o limite que vale nas telas é o de estado, 366 dias.
- **País e macrorregiões na API:** a API continua aceitando `kind=country` e `kind=region`, mas o site não usa mais esses valores.

### 2.2 `GET /regions/:id/alerts` (nova)

Avisos do INMET que atingem o estado.

| Parâmetro | Onde | Padrão | Descrição |
|---|---|---|---|
| `id` | caminho | — | Sigla do estado (`rs`, `sc`, ...), ou `br` para o mapa do Brasil (ver abaixo). Macrorregião devolve 400 |
| `include` | query | `active` | `active` só os vigentes; `recent` inclui os vencidos nas últimas 48 h |

```json
{
  "dataSource": "live",
  "region": { "id": "rs", "name": "Rio Grande do Sul" },
  "updatedAt": "2026-11-14T15:30:00Z",
  "summary": { "active": 1, "highestSeverity": "moderate" },
  "alerts": [
    {
      "id": "urn:oid:2.49.0.0.76.0.2026.28699.1",
      "event": "Tempestade",
      "severity": "moderate",
      "color": "#FFFE00",
      "onset": "2026-11-14T11:37:00Z",
      "expires": "2026-11-15T02:59:00Z",
      "status": "active",
      "headline": "Aviso de Tempestade. Severidade Grau: Moderate",
      "description": "INMET publica aviso iniciando em: 14/11/2026 08:37. Chuva entre 20 e 30 mm/h ...",
      "instruction": "Em caso de rajadas de vento: ... Defesa Civil (telefone 199) ... Corpo de Bombeiros (telefone 193).",
      "url": "https://avisos.inmet.gov.br/56404",
      "municipalities": [{ "code": 4314902, "name": "Porto Alegre" }],
      "municipalityCountTotal": 988,
      "geometry": { "type": "Polygon", "coordinates": [[[-39.243164, -14.636739], "..."]] }
    }
  ]
}
```

- **`severity`:** `minor`, `moderate`, `severe` ou `extreme` (o CAP em minúsculas).
- **`status`:** `active` ou `expired`.
- **Ordem:** ativos primeiro, do mais grave para o menos grave; dentro da mesma severidade, o que começou mais recentemente.
- **`municipalities`:** só os municípios **do estado pedido**. `municipalityCountTotal` é o total do alerta, em todo o Brasil.
- **Textos do INMET:** `event`, `headline`, `description` e `instruction` vêm como o INMET publicou, em português. Não traduzir nem resumir.
- **`geometry`:** já vem em [lon, lat]. O servidor inverte o "lat,lon" do CAP.
- **Mapa do Brasil:** o selo de alerta vem de `GET /regions/br/alerts`. É o único uso de `br`. Nessa resposta, `municipalities` traz todos os municípios do alerta, e o selo de cada estado sai desse agrupamento.
- **Município do estado:** os dois primeiros dígitos do código IBGE do município são o `ibgeCode` do estado.

### 2.3 `GET /regions/:id/organizations` (nova)

Organizações da sociedade civil que apoiam pessoas em situação de vulnerabilidade no estado.

| Parâmetro | Onde | Padrão | Descrição |
|---|---|---|---|
| `id` | caminho | — | Sigla do estado. País ou macrorregião devolve 400 |
| `areas` | query | `5,1,2,12` | Áreas de atuação do IPEA: 5 assistência social, 1 habitação, 2 saúde, 12 comunidades e favelas |
| `near` | query | centro do estado | `lon,lat` usado para ordenar por distância (por exemplo, o centro do par antes/depois em destaque) |
| `limit` | query | `20` | Máximo de itens, até 100 |

```json
{
  "region": { "id": "rs", "name": "Rio Grande do Sul" },
  "reference": { "lon": -51.22, "lat": -30.03, "kind": "pair" },
  "total": 412,
  "organizations": [
    {
      "id": 1425406,
      "name": "...",
      "areas": ["Assistência social"],
      "municipality": { "code": 4314902, "name": "Porto Alegre" },
      "lon": -51.21, "lat": -30.04,
      "distanceKm": 1.8,
      "url": "https://mapaosc.ipea.gov.br/..."
    }
  ],
  "campaigns": [],
  "notice": "Being listed is not an endorsement. Source: Mapa das OSCs (IPEA)."
}
```

- **`reference.kind`:** `pair` quando `near` foi informado a partir de um par do radar; `state` quando a referência é o centro do estado.
- **`campaigns`:** projetos do GlobalGiving (`{ "source", "title", "url" }`). Fica vazio se a chave `GLOBALGIVING_API_KEY` não estiver definida.
- **`total`:** quantas organizações do estado cumprem o filtro, antes do `limit`.

### 2.4 `GET /regions/:id/posts` (nova, opção automática aceita em [produto.md](produto.md#4-feed-de-publicações-posts))

Publicações geradas a partir dos dados do radar.

| Parâmetro | Onde | Padrão | Descrição |
|---|---|---|---|
| `id` | caminho | — | Sigla do estado. País ou macrorregião devolve 400 |
| `start` / `end` | query | últimos 30 dias | Até 366 dias, o limite de estado |

```json
{
  "dataSource": "cache",
  "region": { "id": "rs", "name": "Rio Grande do Sul" },
  "posts": [
    {
      "id": "pass-day:rs:2026-11-05",
      "kind": "pass",
      "date": "2026-11-05",
      "title": "NISAR passed over Rio Grande do Sul",
      "text": "2 passes on Nov 5, on strips 053-D-103 and 125-D-104.",
      "link": { "page": "region", "regionId": "rs", "tab": "radar", "day": "2026-11-05" }
    },
    {
      "id": "pair:053_D_103:2026-10-24:2026-11-05",
      "kind": "pair",
      "date": "2026-11-05",
      "title": "New before and after on strip 053-D-103",
      "text": "Same strip, 12 days apart: Oct 24 and Nov 5.",
      "link": { "page": "compare", "before": "<passId>", "after": "<passId>" }
    },
    {
      "id": "story:rs-flood-jul-2026",
      "kind": "story",
      "date": "2026-07-22",
      "title": "July 2026 flood in Rio Grande do Sul",
      "text": "Taquari Valley, Caí River and Guaíba seen by the NISAR radar before and after.",
      "link": { "page": "story", "storyId": "rs-flood-jul-2026" }
    }
  ]
}
```

- **`link`:** diz para qual tela a publicação leva (painel do estado, comparação ou história).
- **Ordem:** por `date`, da mais recente para a mais antiga.
- **Textos:** só dizem fatos que vêm do catálogo (data, faixa, intervalo). Nada de "a água subiu" sem fonte.

## 3. Fontes externas

Todas abertas e sem chave, exceto onde indicado. O navegador nunca chama essas fontes direto, com uma exceção: as imagens de prévia da ASF, que o site já carrega da ASF.

### 3.1 NISAR (já usado)

| Rota | Teste | Uso |
|---|---|---|
| `https://cmr.earthdata.nasa.gov/search/granules.umm_json` | 200 | Catálogo de passagens (`infra/cmr/`) |
| `https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/<coleção>/<cena>/<cena>_LATLON.png` | 200, 2 a 7 MB | Imagem de prévia |
| `.../BROWSE/NISAR_L2_GCOV_V1/<cena>/<cena>_LATLON.kml` | 200 na coleção validada; **404 na provisional** (testado hoje) | Conferir o `georef.ts` nas cenas validadas |
| `https://api.daac.asf.alaska.edu/services/search/param?dataset=NISAR&processingLevel=GUNW&intersectsWith=POINT(lon lat)` | 200 | Achar interferogramas (deformação do terreno), se a equipe decidir testar |

### 3.2 Alertas: INMET

| Rota | Teste | Uso |
|---|---|---|
| `https://wis2bra.inmet.gov.br/data/?prefix=<AAAA-MM-DD>/wis/urn:wmo:md:br-inmet:alerts/` | 200, 6 alertas em 14/11 | Lista dos XML do dia, no formato de listagem S3. Pagina com `marker` quando `IsTruncated` for `true` |
| `https://wis2bra.inmet.gov.br/data/<Key>` | 200, cerca de 34 KB | Um alerta CAP 1.2 |
| `http://alert-as.inmet.gov.br/cap_12/rss/alert-as.rss` | conexão recusada | Não usar |

Do CAP para a nossa resposta:

| Campo CAP | Campo em `/alerts` |
|---|---|
| `identifier` | `id` |
| `info/event` | `event` |
| `info/severity` | `severity`, em minúsculas |
| `parameter ColorRisk` | `color` |
| `info/onset`, `info/expires` | `onset`, `expires`, convertidos para UTC |
| `info/headline`, `description`, `instruction` | os mesmos nomes, sem alterar o texto |
| `info/web` | `url` |
| `parameter Municipios` | `municipalities`, filtrado pelo estado |
| `area/polygon` ("lat,lon ...") | `geometry`, invertido para [lon, lat] |

### 3.3 Organizações: Mapa das OSCs (IPEA)

Base: `https://mapaosc.ipea.gov.br/api/api`. O Swagger mostra `/api/...`, mas o endereço que funciona tem `/api/api/...`.

| Rota | Teste | Uso |
|---|---|---|
| `/geo/oscs/municipio/<código IBGE>` | 200; 8.291 OSCs e 1,36 MB em Porto Alegre | Coordenadas. Não traz nome nem área |
| `/osc/<id_osc>` | 200 | Situação cadastral e CNPJ |
| `/busca/cnpj/<cnpj>` | 200 | Nome. O `/cnpj/<cnpj>` do Swagger dá 404 |
| `/area_atuacao`, `/subarea_atuacao`, `/situacao_cadastral` | 200 | Tabelas de apoio |
| Planilha em `https://mapaosc.ipea.gov.br/base-dados` | não testada | Área de atuação |

### 3.4 IBGE (já usado)

| Rota | Uso |
|---|---|
| `https://servicodados.ibge.gov.br/api/v3/malhas/...` | Limites em `server/data/regions.geojson` (script `boundaries`) |
| `https://servicodados.ibge.gov.br/api/v1/localidades/estados/<UF>/municipios` | Nome dos municípios citados nos alertas e nas organizações |

### 3.5 GlobalGiving (opcional)

| Rota | Teste | Uso |
|---|---|---|
| `https://api.globalgiving.org/api/public/projectservice/countries/BR/projects/active?api_key=...` com `Accept: application/json` | 400 sem chave | `campaigns` em `/organizations`. Só no servidor, com a chave em `GLOBALGIVING_API_KEY` |

## Decisões aceitas e dependências

As rotas de alerts, organizations e posts são contratos planejados e ainda não estão disponíveis. A aba Alerts solicitará `include=recent`; `active` continua sendo o padrão da API. Para links regionais legados sem tab, day ou pass abrem Radar; na ausência de ambos, Overview. Ver [frontend.md](frontend.md). Organizations precisa de metadados de snapshot, proveniência, referência de passagem e disponibilidade parcial de campanhas; posts precisa de contrato de paginação. Não exigir esses campos antes de sua disponibilidade.
