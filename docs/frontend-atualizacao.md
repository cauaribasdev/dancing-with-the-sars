# Mapa de atualização e decisões

As recomendações de produto foram aceitas. Os trechos abaixo registram o mapa de atualização; as adaptações correspondentes foram incorporadas aos documentos existentes. Dependências técnicas continuam pendentes.

## README.md

Adicionar: “A evolução proposta oferece navegação por estados e abas Overview, Radar, Alerts, Posts e Help. As rotas de alertas, organizações e posts ainda são propostas. Passagens e comparações visuais não constituem detecção automática de desastre.” Preservar requisitos de Node, comandos existentes e build apenas do frontend.

## web/README.md

Substituir a descrição de navegação desejada por: “A página nacional permanece em `/`; o painel regional aceita apenas estados. Overview é a aba padrão. Links antigos sem tab com day ou pass abrem Radar.” Distinguir estado existente de evolução e testes existentes de ferramentas propostas.

## docs/CLAUDE.md

Adicionar: “Páginas consomem hooks; HTTP passa por apiGet e tipos JSON ficam no frontend. URL representa estado compartilhável, TanStack Query representa dados remotos e componentes mantêm interações efêmeras. PNGs usam exclusivamente georef.corners de qualidade utilizável; footprint e bbox não posicionam imagens.”

## docs/produto.md

Substituir linguagem que sugira detecção automática: “O radar mostra passagens e prévias para exploração e comparação visual. A comparação em destaque é um par compatível, não uma mudança automaticamente detectada ou uma medição de inundação.” Acrescentar: “Posts automáticos são recomendação ainda sujeita à decisão da equipe. Alertas atuais são independentes do período do radar. Polígonos de alertas e marcadores de organizações são extensões propostas.”

## docs/rotas.md

Adicionar: “Alerts, organizations e posts são contratos propostos, não endpoints disponíveis no código observado. Alerts usa include=recent na aba para incluir vencidos recentes; o padrão da API proposta permanece active. A consulta nacional br serve exclusivamente à agregação de selos.” Esclarecer snapshot e proveniência das organizações, referência derivada de passagem, falha parcial de campanhas e paginação de posts antes de exigir esses campos.

## Decisões e pendências

| Assunto | Evidência | Recomendação | Estado | Impacto e dependência |
|---|---|---|---|---|
| Navegação por estados | Produto e rotas | Rejeitar país e macrorregiões na interface | Confirmado | Implementação frontend |
| Migração de links | Radar antigo usa day/pass | Sem tab, esses parâmetros abrem Radar | Aceito | Implementação frontend |
| Posts automáticos | Opção A recomendada, decisão aberta | Adotar provisoriamente | Aceito | Implementação backend |
| Alertas recentes | Produto pede vencidos; API padrão active | Solicitar recent explicitamente | Aceito | Endpoint |
| Selos nacionais | Requisito de produto | Agrupar por IBGE e deduplicar ID | Confirmado; algoritmo proposto | Endpoint br |
| Polígonos e marcadores | Apresentados como possibilidade | Deixar como extensão | Aceito | Implementação posterior |
| Proximidade | kind pair/state é ambíguo | Par, passagem, centro do estado; independente da câmera | Aceito | Esclarecer contrato |
| Snapshot e campanhas | Metadados ausentes ou ambíguos | Não inventar; acrescentar status opcionais | Pendente | Backend e base IPEA |
| Paginação de posts | Não definida | Cursor estável futuramente | Pendente | Contrato backend |
| Fuso | Aquisições UTC e instantes ISO | Exibir UTC identificado | Aceito | Implementação e testes |
| GUNW | Prévia não validada | Fora do núcleo | Pendente | Validação externa |

As integrações reais dependem das novas rotas e da base de organizações. Fixtures sintéticas podem apoiar o desenvolvimento; não devem aparecer como dados reais em produção.
