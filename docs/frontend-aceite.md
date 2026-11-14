# Aceite e testes propostos do frontend

Os cenários são propostas; não representam testes executados.

| Contexto | Ação | Resultado verificável | Tipo proposto |
|---|---|---|---|
| Mapa nacional | Selecionar UF no mapa e na lista | Ambos abrem a mesma UF; lista contém somente estados | Manual/E2E |
| URL de país, macrorregião ou UF desconhecida | Abrir | Página não encontrada com retorno ao mapa | Integração |
| Link legado com day ou pass e sem tab | Abrir | Radar abre e URL é normalizada com replace | Integração |
| Link sem tab, day ou pass | Abrir | Overview abre e período válido permanece | Integração |
| Aba desconhecida ou período inválido, incompleto, futuro, invertido ou acima do limite | Abrir | Padrão e aviso; sem truncamento silencioso | Unidade |
| Radar com seleção | Trocar aba, voltar e recarregar | URL restaura aba, período, dia e passagem | E2E |
| Radar com seleção | Trocar período ou estado | Dia e passagem são limpos | E2E |
| Duas requisições em ordem inversa | Concluir resposta antiga por último | Dados antigos não substituem estado atual | Integração |
| medianGapDays nulo | Abrir Overview | Dados insuficientes, nunca zero | Unidade |
| Pares empatados ou inexistentes | Abrir Overview | Ordem determinística ou mensagem de ausência | Unidade |
| Par incompatível em URL de comparação | Abrir | Aviso de incompatibilidade permanece | Manual |
| Georef nulo ou low | Selecionar passagem | PNG não é posicionado; detalhes continuam disponíveis | Integração |
| Imagem ou WebGL indisponível | Abrir tela | Conteúdo textual e retry contextual permanecem | Manual |
| Consulta de alertas vazia | Abrir Alerts | Mensagem de vazio, sem erro | Integração |
| INMET indisponível | Abrir Alerts e Radar | Erro e retry locais; Radar funciona | Integração |
| Alerta em duas UFs | Agregar selos | Um selo por UF, sem duplicar ID | Unidade |
| Alerta próximo da expiração | Avançar relógio controlado | Alerta expira sem fetch; ausência de novos não é presumida | Unidade |
| Instante na virada do dia | Exibir alerta e aquisição | UTC indicado; dia de aquisição preservado | Unidade |
| Resposta stale ou falha com dados preservados | Abrir seção | Aviso junto aos dados e retry | Integração |
| Placeholder de período anterior | Interagir antes da resposta | Dados identificados ou ocultos; ações bloqueadas | Integração |
| Organizações vazias ou indisponíveis | Abrir Help | Vazio e falha são distintos | Integração |
| Campanhas vazias | Abrir Help | Interface não inventa causa | Integração |
| Pan ou zoom | Consultar Help | Referência de distância não muda | Manual |
| Teclado e mobile | Navegar abas e expandir alerta longo | Foco visível, aba em vista e texto oficial integral acessível | Manual |
