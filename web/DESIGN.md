# Identidade visual atual — Dancing With the SARs

Atualizado em 2026-11-15. A seção histórica abaixo documenta o design anterior; os tokens vigentes estão em `src/app/styles.css` e `src/map/mapColors.ts`.

- Home de apresentação em `/`, mapa em `/explore`; ferramentas de análise continuam centradas no mapa.
- Identidade Space Apps: logos oficiais 2026, Overpass local, Deep Blue `#07173F`, Electric Blue `#0042A6`, Neon Blue `#0960E1` e Neon Yellow `#EAFE07` pontual. Guia/fontes/licença: [recursos de marca](public/brand/README.md).
- Fundo principal `#05070D`; texto `#F8FAFC`; textos secundários `#B6C2D2` e `#94A3B8`. Hero com gradiente azul suave, painéis sólidos, sem neon/sombras decorativas. Logos intactos, sem esticar/recolorir.
- Cobertura e imagens geográficas mantêm sua paleta própria, sem recolorir observações científicas para combinar com a marca.
- Home usa imagens reais via API, jamais substituídas por ilustrações de desastres. Estados vazios/falhas mantêm os links operacionais.
- Cabeçalho de 64px, sidebar de análise compacta, home em coluna única no mobile; foco visível e links nativos. Controles móveis recolhíveis preservados.
- Home, cabeçalho e textos próprios dos detalhes de passagem em português. Há textos legados e narrativas da API em inglês; tradução integral continua pendente, sem tradução automática de conteúdo científico.
- Composição: aquisição mais antiga primeiro, recente por último. Ordem corrigida após carregamentos assíncronos do MapLibre; IDs/datas UTC visíveis. Misturar datas amplia observação disponível, não representa uma aquisição simultânea nem detecção automática.

## Registro histórico — design anterior (não normativo)

# Linguagem visual: NISAR over Brazil

Guia para quem constrói páginas em `web/`. A interface é em **inglês**; esta documentação é em português.
Os tokens moram em `src/app/styles.css` (classes Tailwind) e `src/map/mapColors.ts` (cores para camadas do MapLibre).

## Ideia

**A interface é uma carta topográfica com sobreimpressão.** O mapa é o produto; o painel é o mesmo papel do mapa
(mesma cor de fundo do estilo `positron`), com texto em tinta. Tudo que é anotação *sobre o mapa* (seleção,
contorno de passagem, marcador, linha de conferência) é desenhado em **amarelo de sinal com contorno de tinta**,
como as anotações sobreimpressas numa carta. Nomes de lugares e de águas vão em **itálico serifado**, a convenção
cartográfica clássica para hidrografia e toponímia.

Ousadia num lugar só: o amarelo no mapa. O resto é quieto.

## Cor

| Token (classe) | Hex | Uso |
|---|---|---|
| `paper` | `#f2f3f0` | Fundo do app e do painel. É o fundo do mapa base, então painel e mapa se emendam. |
| `sheet` | `#fbfbfa` | Superfícies sobre o mapa: legenda, tooltip, avisos flutuantes. |
| `ink` | `#16202a` | Texto principal (14,8:1), botões primários, contorno das anotações, foco. |
| `ink-2` | `#4d5965` | Texto secundário (6,4:1). |
| `ink-3` | `#5f6a74` | Texto discreto (5,0:1). Nada mais claro que isso para texto. |
| `rule` / `rule-strong` | `#cdd3d6` / `#9aa4ab` | Fios, bordas de controles. |
| `signal` | `#ffc21a` | **Só no mapa**, sempre com contorno `ink` por baixo (`ANNOTATION_LINE` em `mapColors.ts`). Nunca como cor de texto no painel (1,45:1). |
| `signal-wash` | `#fff3cc` | Fundo de item selecionado/hover em listas do painel, com texto `ink`. |
| `cov-1` … `cov-6` | `#67b6ce` → `#003849` | Rampa de cobertura (dias com passagem). Um matiz, claro → escuro. Validada com o script da skill dataviz (`--ordinal`): L monotônico, ΔL ≥ 0,06, ponta clara 2,06:1 sobre `paper`. **Reservada para dados de cobertura**; não use em botões ou enfeites. |
| `caution` / `caution-wash` | `#7a4a00` / `#fbf0d6` | Aviso de dado antigo (`stale`) e erros. Sempre com ícone e texto. |
| `radar-ground` | `#1d2329` | Fundo atrás de miniaturas de radar fora do mapa. |

### Por que amarelo (e não magenta)

O plano inicial usava magenta (cor de sobreimpressão das cartas aeronáuticas). Ao abrir os PNGs de prévia
descobri que **não são cinza**: são um composto em falsa-cor, com verde-menta e rosa-magenta (inferência, não
verificada na documentação: R e B ≈ HH, G ≈ HV; vegetação aparece verde, área construída/solo rosado, água escura).
Magenta sumiria dentro da imagem. Amarelo não existe nesse composto e, com contorno de tinta, aparece no papel
claro, na rampa azul-petróleo e na imagem.

**Consequência para quem desenha sobre imagens de radar:** não use verde nem magenta/rosa em nenhuma camada.
Contornos de passagem, seleção e marcadores: amarelo `signal` (miolo ~2 px) sobre `ink` (~4,5 px).

## Tipografia

- **Archivo Variable** (eixo de largura 62–125%), via `@fontsource-variable/archivo/wdth.css`. Toda a interface.
  - Título de página (`<PageTitle>`): 28 px, peso 680, `font-stretch: 118%`. É o único lugar onde a fonte alarga.
  - Corpo: 15 px / 1,5. Rótulos de controle: 13 px, peso 500, `ink-2`. Legenda e notas: 11–13 px.
  - Números em tabela ou lado a lado: classe `.num` (algarismos tabulares, mesma fonte; nada de monoespaçada).
- **Source Serif 4 Variable, itálico** (`.place`), via `opsz-italic.css`. Só para **nomes de lugares e águas**:
  nome do estado no resumo e no tooltip, rótulos de lugares no mapa. Nunca para destacar uma palavra no meio de uma frase.

Proibido: caixa alta em rótulos, rótulo-sobrancelha acima de título, `A · B · C` com ponto médio, `→` no fim de link.

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [onda+ponto] NISAR over Brazil   Map  Story          Space Apps│ 48 px
├──────────────────────┬─────────────────────────────────────────┤
│ Título (Archivo larg)│                                    [+/-]│
│ Intro curta          │                                         │
│ Controles            │              MAPA                       │
│ Resumo / lista       │                        [anotação ink+   │
│ ──── (fio ink)       │                         amarelo]        │
│ Chamada da história  │ [legenda em degraus]       [atribuição] │
└──────────────────────┴─────────────────────────────────────────┘
   380 px, rola sozinho        resto da largura
```

- Use `<MapPageLayout panel map panelLabel>` (`src/ui/MapPageLayout.tsx`). Abaixo de `lg` (1024 px) o mapa vem
  primeiro (58% da altura) e o painel segue embaixo, rolando com a página.
- Conteúdo alinhado à esquerda; nada centralizado no painel. Linhas de texto ≤ ~36–60 caracteres no painel.
- Seções do painel separadas por espaço (`gap-6`/`gap-7`). Um fio `ink` de 1 px marca a passagem para outro tipo
  de conteúdo (ex.: a chamada da história). Fios `rule` para tabelas de fatos.
- Sobre o mapa: legenda no canto inferior esquerdo, avisos de imagem no superior esquerdo, zoom no superior direito,
  atribuição no inferior direito (compacta). HTML sobre o mapa vai no prop `overlay` do `BaseMap`.
- 1280×720 é o alvo da demo (laptop ou projetor). Confira suas páginas nesse tamanho e numa tela de celular.

## Componentes e convenções

- **Botão primário** (`.btn-primary`): bloco de tinta, texto `paper`. No máximo um por tela (ex.: "See before and after").
- **Link** (`.link`): tinta, sublinhado fino `rule-strong` que engrossa no hover.
- **Selects e botões de passo**: altura 40 px, raio 4 px, borda `rule`, fundo `sheet`.
- **Raios**: 4 px em controles e superfícies flutuantes, 2–3 px em amostras e miniaturas. Nada de cartões com sombra
  igual em tudo; a única sombra é a do tooltip e da etiqueta da história no mapa.
- **Foco**: contorno `ink` de 2 px com folga de 2 px (global em `styles.css`). Não remova.
- **Carregamento**: `<ProgressBar>` de 3 px (tinta sobre `rule`), indeterminada sem `value`, real com `value` 0..1.
  Sempre acompanhada de uma frase dizendo o que está carregando e quanto pode demorar.
- **Dado antigo**: `<StaleNotice dataSource={...}>` perto dos números daquela resposta.
- **Erro**: `<ErrorMessage onRetry>` diz o que houve e o que fazer; `describeError()` traduz os códigos da API.
- **Cobertura no mapa**: classes fixas (1–2, 3–5, 6–9, 10–14, 15–19, 20+) de `coverageScale.ts`; zero = sem
  preenchimento + contorno tracejado. 1 px de papel entre estados vizinhos em vez de borda escura.
  Enquanto o mês novo carrega, o mês anterior fica a 30% de opacidade.
- **Imagem de radar**: sempre por `useBrowseImage` + `<BrowseImageLayer>` + `<BrowseImageStatus>`; fica abaixo dos
  rótulos do mapa base. `ShorelineOverlay` desenha a linha d'água do mapa base em amarelo, para conferir alinhamento.
- **Movimento**: só em resposta a ação (enquadrar a região escolhida, 900 ms). `prefers-reduced-motion` desliga a
  animação do mapa e a varredura da barra.

## Texto da interface (inglês)

- Palavras simples para leigos: **pass** (passagem do satélite), **before and after**, **days with a pass**,
  **radar image**. Evite jargão na interface (backscatter, GCOV, stackId); se for inevitável, explique ao lado.
- Frase normal (sentence case), voz ativa, verbos que dizem o que acontece: "See before and after", "Try again",
  "Back to the map".
- Datas com `src/ui/format.ts` (locale `en-US`, sempre em UTC): "July 2026", "Jul 22", "July 22, 2026", "Jul 1–27".
- **Nomes de regiões**: estados ficam com o nome oficial do IBGE ("Rio Grande do Sul", "São Paulo").
  País e macrorregiões em inglês, mapeados só em `src/api/regionNames.ts`: Brazil, North, Northeast, Central-West,
  Southeast, South. Em frase, use `regionNameInSentence()` ("the South region").
- **Textos das histórias** vêm da API como estão. O frontend não traduz nem reescreve.
- Erros não pedem desculpa e dizem o que fazer. Vazio é convite: "Pick two passes of the same place to compare them."

## Revisão do plano contra o brief (o que mudou)

1. **Tema escuro "sala de controle" descartado** antes de construir: é o padrão genérico (fundo quase preto +
   acento neon), apaga no projetor e a água escura do radar se misturaria com a interface.
2. **Magenta → amarelo de sinal** depois de olhar os PNGs reais (falsa-cor verde/magenta, ver acima).
   O painel deixou de ter cor de acento: links e foco passaram para tinta.
3. **Sem fonte monoespaçada** para números (cacoete de "dados"); algarismos tabulares da própria Archivo.
4. **Sem número gigante com rótulo pequeno** no resumo: a resposta é uma frase ("In July 2026, the radar passed
   over Rio Grande do Sul on 20 days.") seguida de uma tabela de fatos.
5. **Legenda em degraus encostados** (como escala hipsométrica), em vez de gradiente contínuo: as classes são fixas
   e comparáveis entre meses.

## Abas estaduais e novas seções — decisões aprovadas

Manter a identidade visual existente, o painel desktop de 380 px e o mapa primeiro no mobile com 58svh e mínimo de 320 px. A faixa de cinco abas permite rolagem horizontal, mantém a aba focada visível e diferencia foco de seleção. Usar semântica tablist/tab/tabpanel, setas, Home/End e ativação por Enter ou Space. Preservar a câmera ao trocar de aba.

Overview apresenta números, comparação visual, alertas, organizações, história e contatos de emergência. Radar preserva calendário e detalhe. Posts mostra tipo, data, texto e ação; Help mostra referência de distância, filtros, total, itens e aviso de não endosso. Cartões longos de alertas permitem expansão por teclado sem eliminar texto oficial.

Cada seção diferencia carregamento, vazio, erro, atualização e dados antigos, com texto e ícone além da cor e retry contextual. “No active alerts” exige consulta bem-sucedida; falha usa “Alerts could not be checked”. Textos oficiais permanecem em português com lang apropriado.

A cor de severidade é fornecida pelo INMET; somente moderate #FFFE00 é exemplificado. Usar fallback neutro para cor ausente ou inválida. A seleção no mapa usa amarelo de anotação com contorno escuro, distinguido por legenda, texto e ícone. Selos nacionais indicam alertas ativos. Polígonos de alertas e marcadores de organizações são extensões aprovadas fora do núcleo mínimo, com alternativa em lista e sem encobrir controles ou rótulos.

Verificar foco visível, contraste, toque, zoom, reflow e movimento reduzido. Não declarar conformidade certificada sem avaliação correspondente.
