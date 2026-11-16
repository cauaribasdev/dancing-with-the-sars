Arquivo: web/src/features/region/PassDetails.tsx
Problema: tradução usa Passo/pass/passes e mantém “apart”, além de não respeitar texto do atalho.
Correção: usar sempre passagem/passagens (acertar gênero), título “Passagem em”, seção “Antes e depois”, link “Comparar com outra data: {formatDayShort(other.date)}”, sufixo “de intervalo”, download “Baixar produto”; não alterar nomes de variáveis nem lógica; corrigir português completo dos textos próprios.
Validação: npm test -w web -- src/features/region/PassDetails.test.ts && npm run typecheck -w web
Saída única: web/src/features/region/PassDetails.tsx. Retornar arquivo completo corrigido.
