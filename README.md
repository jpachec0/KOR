# KOR Local AI Agent

Agente local de programacao em Node.js com chats persistentes, memoria contextual, indexacao de projeto, selecao heuristica de arquivos e integracao com OpenAI, OpenRouter e Hugging Face.

O projeto agora tem duas interfaces complementares:

- CLI local em terminal
- Extensao do VS Code com chat visual estilo assistant

## O que este projeto entrega

- Multiplos chats persistidos em `.ai-agent/chats/{chatId}`
- Historico completo por chat em `history.json`
- Resumo de contexto em `context.json`
- Rastro de arquivos relevantes em `files.json`
- Indexacao local do projeto em `.ai-agent/index/project-index.json`
- Montagem de prompt com resumo do projeto, historico recente e arquivos lidos do disco em tempo real
- Suporte a providers configuraveis via `config/ai.json`
- Proposta de alteracoes em arquivos com visualizacao de diff antes de aplicar
- Cache simples de respostas para melhorar performance
- Estrutura preparada para embeddings futuros
- API HTTP fina para integrar interfaces visuais sem duplicar a logica do agente
- Extensao do VS Code em `vscode-extension/` com multiplos chats, markdown renderizado e Apply no editor

## Estrutura

```text
.ai-agent/
  chats/
  memory/
  index/
cli/
config/
core/
server/
vscode-extension/
```

## Requisitos

- Node.js 18.17+ 
- Chave de API do provider escolhido

## Instalacao

```bash
npm install
```

## Configuracao da IA

Edite [config/ai.json](/home/rakal/Documents/Dev/KOR/config/ai.json) e substitua a chave:

```json
{
  "provider": "openrouter",
  "apiKey": "COLOCAR_AQUI",
  "model": "mistralai/mistral-7b-instruct",
  "baseUrl": "",
  "maxTokens": 2000,
  "temperature": 0.2
}
```

Providers suportados:

- `openrouter` : opcao preferida para modelos gratuitos ou de baixo custo
- `huggingface` : fallback gratuito, dependendo do modelo escolhido
- `openai` : opcao paga

## Uso

### Terminal

Inicie a CLI:

```bash
npm start
```

Voce tambem pode executar comandos diretos:

```bash
node cli/index.js list-chats
node cli/index.js new-chat backend-refactor
node cli/index.js ask "Explique a arquitetura deste projeto"
node cli/index.js apply
```

Comandos:

- `new-chat [nome]`
- `list-chats`
- `use-chat {id}`
- `ask "sua pergunta"`
- `apply`
- `exit`

### Backend HTTP para o VS Code

Inicie a API:

```bash
npm run api
```

Por padrao ela sobe em `http://localhost:3000`.

Endpoints usados pela extensao:

- `GET /health`
- `GET /api/state`
- `POST /api/chats`
- `POST /api/chats/:chatId/activate`
- `POST /api/chats/:chatId/ask`
- `GET /api/chats/:chatId/pending`
- `POST /api/chats/:chatId/pending/clear`

### Extensao do VS Code

Instale as dependencias da extensao:

```bash
cd vscode-extension
npm install
npm run build
```

Depois:

1. Abra a pasta `vscode-extension` no VS Code.
2. Pressione `F5` para iniciar a Extension Development Host.
3. Na instancia de testes, abra a pasta do projeto que voce quer usar com o agente.
4. Garanta que o backend HTTP esteja rodando com `npm run api` na raiz do projeto.

Configuracao da extensao:

- Setting: `korAgent.backendUrl`
- Valor padrao: `http://localhost:3000`

Comandos disponiveis no VS Code:

- `AI: Open Chat`
- `AI: Ask Selection`
- `AI: New Chat`

## Fluxo de trabalho

1. O sistema garante a estrutura de runtime em `.ai-agent/`.
2. Cada `ask` indexa o projeto, escolhe arquivos relevantes por heuristica e relê os arquivos do disco.
3. O prompt inclui:
   - resumo do projeto
   - resumo do historico longo
   - ultimas mensagens completas
   - conteudo dos arquivos relevantes
4. A IA responde em JSON com:
   - `answer`
   - `summary`
   - `relevantFiles`
   - `proposedChanges`
5. O agente converte `proposedChanges` em diff local e exibe antes de aplicar.
6. O comando `apply` grava as mudancas apenas apos sua confirmacao explicita.
7. Na extensao, o botao `Apply` usa a API do VS Code para escrever os arquivos no editor e depois limpa o estado pendente no backend.

## Persistencia de chat

Cada chat fica em `.ai-agent/chats/{chatId}/` com:

- `meta.json`
- `history.json`
- `context.json`
- `files.json`
- `pending-changes.json`

## Seguranca

- O agente nunca aplica alteracoes automaticamente
- Todos os caminhos sao validados para permanecer dentro do projeto
- O sistema nao executa comandos arbitrarios a pedido da IA
- A extensao do VS Code pede confirmacao explicita do usuario ao clicar em `Apply`; nenhuma mudanca e aplicada so por receber a resposta da IA

## Extensoes futuras

- `core/embeddingStore.js` ja define um ponto de extensao para busca vetorial
- O seletor de arquivos pode ser enriquecido com embeddings sem quebrar a CLI atual
- O cache em `.ai-agent/memory/response-cache.json` pode evoluir para estrategia com expiracao por hash de arquivos

## Observacoes

- O conteudo dos arquivos nao fica congelado no historico: ele e sempre relido do disco no momento do `ask`
- O projeto esta pronto para uso, faltando apenas configurar a chave de API
- A CLI continua funcionando do mesmo jeito; a extensao apenas consome a API HTTP que reaproveita o mesmo backend
