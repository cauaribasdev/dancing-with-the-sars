# Plano para fechar o projeto

Este plano transforma as pendências do inventário em entregas revisáveis. A prioridade é um produto confiável e demonstrável com dados reais disponíveis; fonte indisponível deve aparecer como indisponível, nunca como dado real sintético.

## Estado de partida

- Branch de trabalho: `feat/home-e-exploracao`, baseada na cadeia local de commits de redesign, navegação e composição; somente `.gitignore` está modificado antes deste plano.
- Home, exploração nacional/estadual, Radar, comparação e história já estavam implementados. Esta execução acrescenta endpoints e integrações de INMET, IPEA e Posts, além de selos nacionais de alerta.
- `server/` agora inclui adaptadores CAP/WIS2 e CSV IPEA, rotas e cache; o feed de Posts deriva do catálogo existente.
- PRs abertas #1–#4 têm dependências entre si. A cadeia local de produto ainda não está publicada.
- Permanecem limites externos: o CSV do IPEA observado tem centenas de MB e está antigo; categorias de habitação e comunidades/favelas não são campos independentes nele. Campanhas GlobalGiving e validação Firefox/Safari não estão disponíveis.

## Princípios de aceite

1. Cada funcionalidade externa tem contrato versionado, origem, atribuição, atualização e estados de vazio/erro/stale definidos.
2. Fixtures são identificadas e habilitadas apenas em desenvolvimento; nunca são confundidas com dados reais.
3. Falha numa fonte complementar não bloqueia Radar, história ou comparação.
4. Nenhuma métrica de inundação ou detecção automática é inferida das prévias PNG.
5. Toda tarefa delegada ao agente local tem um único arquivo de saída permitido, teste reproduzível e revisão de diff pelo tech lead.
6. PRs devem formar uma cadeia de bases válida; publicar não implica merge.

## Marcos

### F0 — Baseline e plano

- Registrar plano, dependências entre PRs, configuração disponível e comandos atuais.
- Confirmar `npm test`, `npm run typecheck` e `npm run build` antes de mudanças de produto.
- Aceite: baseline reproduzível e working tree preexistente preservada.

### F1 — Contratos e fixtures

- Definir schemas JSON/OpenAPI para rotas existentes e para fontes opcionais, incluindo respostas e erros, `dataSource`, timestamps, campos opcionais e semântica de vazios.
- Marcar claramente as limitações dos contratos conforme capacidades verificadas das fontes.
- Produzir fixtures válidas por contrato, exemplos vazios e falhas parciais.
- Aceite: validação automática de fixtures e documentação sem alegar integração que não existe.

### F2 — Robustez do servidor e fontes

- Implementar adaptadores isolados e cache para fontes cuja API e licença estejam verificadas; timeout, rate limit, parsing defensivo, atribuição e stale.
- Para INMET: filtrar alertas por município/UF via código IBGE, converter CAP lat/lon corretamente, ordenar e expirar alertas pelo relógio.
- Para IPEA: áreas, proximidade, limite, metadados do snapshot e distinção entre campanhas ausentes/vazias/falha.
- Posts automáticos: gerar apenas a partir de passagens/pares/histórias existentes, sem alegar detecção; links tipados e ordenação determinística.
- Aceite: testes de contrato e casos de falha; nenhuma chamada externa nos testes unitários.

### F3 — Integração frontend

- Trocar feeds demo por hooks reais quando endpoints estiverem disponíveis, manter demo exclusivamente opt-in em dev.
- Completar Overview (história, par, emergência), Alerts, Posts e Help com estados independentes, freshness, retry e sem dados de outro estado/período.
- Adicionar selos nacionais de alerta a partir do endpoint `br`, agregando alertas por prefixo IBGE.
- Aceite: chaves de cache completas, AbortSignal, ausência/erro/stale distintos e integração por feature documentada.

### F4 — Qualidade e acessibilidade

- Cobrir critérios A01–A24 e jornadas de links antigos, navegação/voltar/recarregar, troca de UF/período, composição, falhas independentes e links de Posts.
- Executar E2E em Chromium e inspeção manual de teclado, leitor de tela, zoom, foco, contraste, movimento reduzido e larguras 320/390/1024/1280.
- Validar Firefox/Safari quando ambientes estiverem disponíveis; registrar limitações sem alegar conformidade certificada.
- Tradução: traduzir interface própria legada para português; preservar textos oficiais do INMET e idioma original de narrativas/citações com indicação de idioma.
- Aceite: evidências anexadas ao inventário e regressão completa aprovada.

### F5 — Entrega e publicação

- Atualizar README, rotas, inventário, aceite e instruções de deploy (API, CORS, `VITE_API_BASE`, fallback SPA e cache).
- Executar testes, typecheck, build, smokes e validação de contratos; rever diffs por arquivo.
- Reconciliar PRs #1–#4 e publicar a cadeia consolidada com bases existentes, sem merge automático.
- Aceite: PRs abertas e interligadas corretamente, descrição com escopo, evidências e limitações; árvore limpa salvo alteração preexistente explicitamente mantida.

## Execução e dependências

Ordem: F0 → F1 → F2/F4 em paralelo lógico → F3 → F4 final → F5. A parte de F2 referente a fontes reais depende de APIs acessíveis e condições de uso verificáveis. Se não houver fonte ou credencial pública, entregar adapter de indisponibilidade e contrato explícito, mantendo a integração real como bloqueio declarado; não simular sucesso.

Cada incremento será delegado pelo `./junior.sh` conforme `AGENTS.md`, em branch Git de trabalho e com arquivos delimitados. O tech lead revisará diffs e repetirá validações antes de incorporar. Nenhuma PR será mesclada sem autorização específica.

### Verificação atual de fontes (2026-11-15)

- INMET documenta seus avisos no portal oficial e publica notificações CAP no nó WIS2 `wis2bra.inmet.gov.br`. A API WIS2 consultada retorna notificações com links XML, mas a amostra recebida era de setembro enquanto o portal já mostrava avisos de novembro; a aplicação deve medir a idade da última publicação e marcar os dados como `stale` quando ultrapassarem o limite configurado. Fonte: [API WIS2 do INMET](https://wis2bra.inmet.gov.br/oapi/openapi), [portal de avisos](https://avisos.inmet.gov.br/).
- O IPEA oferece [API pública](https://mapaosc.ipea.gov.br/api/api/documentation), [tabela oficial de áreas](https://mapaosc.ipea.gov.br/api/api/area_atuacao) e [bases mensais para download](https://mapaosc.ipea.gov.br/base-dados). O CSV geral tem cerca de 344 MB, inclui CNPJ, situação, UF, coordenadas e flags de área, mas não o id interno de perfil. A consulta ao vivo da tabela confirmou que 1 é Habitação, 2 Saúde, 5 Assistência social e 12 OSCs em comunidades/favelas. O CSV atual tem colunas para 2 e 5, mas não 1 ou 12. A importação streaming produz cache compacto e usa stale após 45 dias; a primeira carga sem cache pode demorar vários minutos e exige `CACHE_DIR` persistente.
- O adaptador IPEA passou também pela carga fria completa: snapshot de 2026-08-18, 3.832 organizações no RS, marcado como `stale` pelo limite de 45 dias. A importação levou vários minutos e gravou cache compacto em `CACHE_DIR`; não há CSV bruto no repositório.

## Progresso

- [x] F0 inspeção inicial e registro do plano.
- [x] F0 baseline de comandos na branch de trabalho: testes 33 servidor + 89 web; typecheck e build passaram.
- [x] F1 schemas Zod e especificação OpenAPI 3.1 dos três feeds; testes verificam fixtures e referências.
- [x] F2 rotas, contratos, cache e adaptadores INMET, IPEA e Posts; 60 testes do servidor passam. A carga fria IPEA foi concluída e o cache pré-aquecido foi validado.
- [x] F3 integração dos painéis de fonte, paginação e selos nacionais de alerta; consultas têm cache keys próprias e AbortSignal.
- [ ] F4 smokes Chromium: home, painéis opcionais, mapa/zoom/clipping, diário, multiday e busca estadual passaram; testes automáticos totalizam 149 (60 servidor + 89 web), typecheck e build passaram. Inspeção manual de teclado/leitor de tela/contraste/foco não foi realizada; Firefox/Safari não foram validados.
- [ ] F5 publicação das PRs.
