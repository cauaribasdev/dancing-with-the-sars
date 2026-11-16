# Produto: como o app deve funcionar

Documento de trabalho da equipe para o NASA Space Apps 2026, desafio "Dancing with the SARs".
Escrito em 14/11/2026, a partir do código do branch `dev` (commit `7bc0590`) e dos testes que a equipe fez nas fontes externas nesse mesmo dia.

As rotas, com parâmetros e respostas, estão em [rotas.md](rotas.md). A arquitetura e as regras do projeto continuam as do README e do CLAUDE.md. Este documento só descreve o que entra nelas.
---

## 1. Em uma frase

O usuário abre um mapa do Brasil, escolhe um estado e vê:
- onde e quando o radar NISAR observou o estado e quais imagens podem ser comparadas visualmente;
- um painel com os números mais importantes;
- um feed de publicações;
- um feed de alertas;
- organizações sem fins lucrativos que apoiam pessoas em situação de vulnerabilidade naquela área.

## 2. O caminho do usuário

O estado é a única unidade que o usuário escolhe. Macrorregiões (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) não são selecionáveis em nenhuma tela. O Brasil inteiro aparece só como o mapa de entrada.

```
Mapa do Brasil  ──clica num estado ou escolhe na lista──►  Painel do estado
     (/)                                                  (/region/:regionId)
                                                                │
          ┌──────────────┬──────────────┬───────────────────┬───┴────────────┐
          ▼              ▼              ▼                   ▼                ▼
      Overview         Radar          Alerts              Posts            Help
   (números-chave)  (passagens,    (INMET, ativos     (publicações     (organizações
                     antes/depois)  primeiro)          do estado)       do estado)
                         │
                         ▼
                 Antes e depois  (/compare?before&after)  ·  História  (/story/:storyId)
```

1. **Mapa do Brasil** (já existe). Cada estado é pintado pelos dias com passagem do radar no mês, e o painel lateral mostra o resumo do país. Muda o seguinte:
   - o seletor do painel lista só os 27 estados, sem as macrorregiões;
   - o mapa passa a mostrar um selo nos estados com alerta ativo.
2. **Painel do estado** (a fazer, reaproveitando a página `/region/:regionId` atual, que passa a aceitar só estados). O painel lateral ganha abas, e o mapa fica fixo à direita:
   - **Overview:** o painel de números (seção 3).
   - **Radar:** o que existe hoje na página do estado, ou seja, calendário, contornos, imagem de cada passagem e links para comparar.
   - **Alerts:** o feed de alertas (seção 5).
   - **Posts:** o feed de publicações (seção 4).
   - **Help:** as organizações (seção 6).
3. **Antes e depois e História.** Já existem e não mudam. As abas Overview e Posts levam até elas.

A aba escolhida fica na URL (`?tab=alerts`), para a demonstração abrir direto nela.

A interface continua em inglês, com palavras simples. Os nomes das abas acima são os textos da tela.

## 3. Overview: o painel do estado

O painel é montado no navegador com dados que já existem ou que as rotas novas vão trazer. Não precisa de rota própria.

| Bloco | O que mostra | De onde vem |
|---|---|---|
| Radar no período | Dias com passagem, total de passagens, última passagem, intervalo típico | `GET /regions/:id/passes` (já existe) |
| Mudança em destaque | O par antes/depois mais recente do estado, com miniatura e link para comparar | `GET /regions/:id/pairs` (já existe) |
| Alertas agora | Quantos alertas ativos e o mais grave, com a cor oficial do INMET | `GET /regions/:id/alerts` (nova) |
| Onde buscar ajuda | OSCs ativas em áreas verificadas no snapshot público do IPEA, ordenadas pela distância | `GET /regions/:id/organizations` (implementada; no snapshot atual, assistência social e saúde) |
| História | Se houver história do estado (hoje só RS), um cartão com link | `GET /stories` (já existe) |
| Emergência | Defesa Civil 199 e Bombeiros 193 | Texto fixo. Os números aparecem no próprio alerta do INMET |

## 4. Feed de publicações (Posts)

**Decisão aceita:** publicações geradas automaticamente pelo app a partir de passagens, pares e histórias. Conteúdo editorial com fontes é uma extensão opcional. Rota implementada com filtro de período e paginação. Publicações de moradores permanecem fora do escopo.

Cada publicação tem: tipo (`pass`, `pair` ou `story`), data, título, texto curto e um link para a tela certa. A ordem é da mais recente para a mais antiga.

## 5. Feed de alertas (Alerts)

- **Fonte:** avisos do INMET no padrão CAP 1.2, lidos pelo nó WIS2 do INMET (`wis2bra.inmet.gov.br`), que respondeu nos testes. O feed RSS e os sites do INMET derrubaram a conexão a partir da rede da equipe, então não dependam deles.
- **Ligação com o estado:** cada alerta traz a lista de municípios com o código IBGE de 7 dígitos, e os dois primeiros dígitos são o código do estado (43 para o RS). O `regions.geojson` já guarda esse código em `ibgeCode`. Um alerta que atinge vários estados aparece no feed de cada um deles.
- **Ordem:** primeiro os ativos, do mais grave (`Extreme`, `Severe`, `Moderate`, `Minor`) para o menos grave; depois os vencidos das últimas 48 h, marcados como encerrados.
- **Cada item mostra:**
  - o evento ("Tempestade") e a severidade, com a cor oficial (`ColorRisk`);
  - o início e o fim;
  - quantos municípios do estado são atingidos e quais;
  - o texto do INMET sem alteração (`description` e `instruction`) e o link "See on INMET".
- **Idioma:** o texto do alerta vem em português e fica em português, porque é texto oficial e não deve ser traduzido nem resumido. Só os rótulos em volta ficam em inglês.
- **No mapa:** o polígono do alerta (`area/polygon`) pode ser desenhado por cima. Cuidado: o CAP usa "lat,lon" e o GeoJSON usa [lon, lat].

## 6. Organizações de apoio (Help)

- **Fonte principal: Mapa das OSCs (IPEA).** É aberto e sem chave, e traz as coordenadas de cada OSC por município. Duas complicações:
  - **Área de atuação fora da API.** A área de atuação está na planilha da página de base de dados. Sem esse filtro, a lista mistura assistência social com clubes e associações de outro tipo; num teste em Porto Alegre, apareceu uma loja maçônica.
  - **Volume.** Porto Alegre sozinha tem 8.291 OSCs (1,36 MB), e o RS tem 497 municípios.
- **Quem aparece:** só as OSCs que cumprem três condições:
  - estão ativas (`cd_situacao_cadastral = 2`);
  - atuam nas áreas 5 (assistência social), 1 (habitação), 2 (saúde) ou 12 (comunidades e favelas);
  - têm coordenadas.
- **Atualização:** a lista é gerada uma vez a partir da base do IPEA, como os limites do IBGE, e não é consultada na hora. O app mostra uma foto da base, não o cadastro ao vivo.
- **Ordem na tela:** as mais próximas da área com passagem ou mudança vista pelo radar vêm primeiro. Sem essa referência, a ordem é pelo centro do estado.
- **Cada item mostra:** nome, áreas de atuação verificadas no arquivo, município e distância. A exportação geral observada não traz o identificador interno da página detalhada; por isso o app não monta link de perfil a partir do CNPJ.
- **Cobertura atual da fonte:** o CSV geral separa assistência social e saúde entre as categorias selecionadas pelo produto. Habitação e comunidades/favelas não aparecem em colunas próprias nesse snapshot e não são apresentadas como cobertas. Campanhas do GlobalGiving continuam sem configuração.
- **Aviso fixo na tela:** "Being listed is not an endorsement. Source: Mapa das OSCs (IPEA)."
- **GlobalGiving (opcional):** precisa de chave gratuita, guardada em variável de ambiente e usada só no servidor. Não filtra por cidade, só por país; o filtro por estado (`contactState`) e por tema de desastre seria feito no servidor. Se não houver chave, a seção simplesmente não aparece.

## 7. O que o radar pode e não pode mostrar

Isto vale para o texto da tela e para a apresentação.

- **Pode:** mostrar duas imagens da mesma faixa, com a mesma geometria (mesmo `stackId`), antes e depois de um evento. Nelas, água parada fica escura e mata ou área construída alagada pode ficar mais clara. É uma comparação visual, e é o que o app já faz.
- **Não pode:** dar números como "12,4 km² alagados". As imagens de prévia são renderizações visuais, não medidas calibradas, e o projeto não usa os arquivos completos do NISAR.
- **Mudanças geológicas:** uma busca na ASF encontrou um interferograma (produto GUNW) sobre Porto Alegre, de 08/10 a 20/10/2026. Esse produto mostra deformação do terreno, o "geológico" do pedido. Ainda não foi testado se ele tem imagem de prévia aberta como a do GCOV. Fica como extensão, não como promessa.
- **Posição das imagens:** o KML com os limites exatos da prévia é público só para cenas da coleção validada. Testei hoje: devolveu 200 numa cena `NISAR_L2_GCOV_V1` e 404 numa cena provisória da cheia de julho. A história depende das provisórias, então o posicionamento continua sendo o de `georef.ts`. O KML serve para conferir o `georef.ts` nas cenas validadas.

## 8. Fora do escopo

- Macrorregiões como nível de navegação, painel ou filtro.
- Área em km² ou qualquer número tirado das imagens de prévia.
- Publicações de moradores.

## 9. Perguntas para a equipe

2. **GlobalGiving:** alguém vai criar a chave? Sem ela, a seção não entra.
3. **Interferograma (GUNW):** alguém tem tempo de testar se existe prévia aberta? Sem isso, "mudanças geológicas" fica fora da demonstração.

## Decisões de frontend aceitas

As decisões de navegação, compatibilidade de links, fuso UTC, proximidade e cache estão em [frontend.md](frontend.md). A aba Alerts solicita `include=recent`; alertas atuais são independentes do período do radar. Selos nacionais fazem parte do núcleo; polígonos e marcadores são extensões. A comparação em destaque é um par visual, não uma mudança detectada automaticamente.
