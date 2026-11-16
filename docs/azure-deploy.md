# Guia de Implementação para Deploy no Azure

O aplicativo usa o grupo `rg-dwts-prototype`, plano F1 em Chile Central e runtime Node 24 LTS. A inicialização é `node node_modules/tsx/dist/cli.mjs server/src/azure.ts`; as configurações incluem `CACHE_DIR=/home/dwts-cache` e `SCM_DO_BUILD_DURING_DEPLOYMENT=false`.

## Pré-requisitos
- Azure CLI instalado e autenticado
- Node.js 24 LTS instalado localmente
- npm instalado localmente

## Instruções

### 1. Configuração do Projeto
Acesse a raiz do seu projeto e execute os seguintes comandos:

```bash
npm ci
env -u VITE_API_BASE npm run build
```

### 2. Preparação do Arquivo Zip
Execute o comando abaixo para preparar o arquivo zip do seu projeto:

```bash
rm -f /tmp/dwts-azure-release.zip
zip -qry /tmp/dwts-azure-release.zip package.json package-lock.json node_modules server/src server/data web/dist -x '*/.cache/*' '*/node_modules/server/*' '*/node_modules/web/*'
```

### 3. Deploy no Azure
Use o comando abaixo para implantar seu aplicativo no Azure:

```bash
az webapp deploy -g rg-dwts-prototype -n dancing-sars-2026 --src-path /tmp/dwts-azure-release.zip --type zip
```

### 4. Verificação do Deploy
Acesse o site implantado em:

- [https://dancing-sars-2026.azurewebsites.net](https://dancing-sars-2026.azurewebsites.net)
- [https://dancing-sars-2026.azurewebsites.net/alerts](https://dancing-sars-2026.azurewebsites.net/alerts)
- [https://dancing-sars-2026.azurewebsites.net/api/regions](https://dancing-sars-2026.azurewebsites.net/api/regions)

### Observações
- O `VITE_API_BASE` deve estar ausente no build para usar a mesma origem.
- Dependências `tsx` e `esbuild` são necessárias em runtime.
- O cache do IPEA pode levar alguns minutos para ser inicializado.

Este processo não é automatizado e deve ser executado manualmente.
