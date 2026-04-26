#!/usr/bin/env node
const readline = require("readline");
const logger = require("../core/logger");
const { createKorCore } = require("../core");

const kor = createKorCore(process.cwd());

function printHelp() {
  console.log([
    "",
    "Comandos disponiveis:",
    "  setup",
    "  config set {key} {value}",
    "  new-chat [nome]",
    "  list-chats",
    "  use-chat {id}",
    '  ask "pergunta"',
    "  apply",
    "  exit",
    ""
  ].join("\n"));
}

function formatChat(chat, activeChatId) {
  const activeMarker = chat.id === activeChatId ? "*" : " ";
  return `${activeMarker} ${chat.id} | ${chat.name} | atualizado em ${chat.updatedAt}`;
}

async function ensureActiveChat() {
  return kor.ensureActiveChat();
}

async function promptQuestion(rl, text) {
  return new Promise((resolve) => {
    if (!rl) {
      const tempRl = readline.createInterface({ input: process.stdin, output: process.stdout });
      tempRl.question(text, (ans) => {
        tempRl.close();
        resolve(ans);
      });
    } else {
      rl.question(text, resolve);
    }
  });
}

async function handleCommand(input, rl = null) {
  const trimmed = input.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed === "help") {
    printHelp();
    return;
  }

  if (trimmed.startsWith("new-chat")) {
    const name = trimmed.replace(/^new-chat\s*/, "").trim() || undefined;
    const chat = await kor.createChat(name);
    console.log(`Chat criado e selecionado: ${chat.id} (${chat.name})`);
    return;
  }

  if (trimmed === "list-chats") {
    const active = await kor.getActiveChat();
    const chats = await kor.listChats();
    if (!chats.length) {
      console.log("Nenhum chat encontrado.");
      return;
    }

    chats.forEach((chat) => console.log(formatChat(chat, active?.id)));
    return;
  }

  if (trimmed.startsWith("use-chat")) {
    const chatId = trimmed.replace(/^use-chat\s*/, "").trim();
    if (!chatId) {
      console.log("Informe o id do chat.");
      return;
    }

    const active = await kor.useChat(chatId);
    console.log(`Chat ativo: ${active.id} (${active.name})`);
    return;
  }

  if (trimmed.startsWith("ask ")) {
    const question = trimmed.replace(/^ask\s*/, "").trim().replace(/^"|"$/g, "");
    if (!question) {
      console.log("Informe uma pergunta.");
      return;
    }

    const active = await ensureActiveChat();
    logger.info(`Executando pergunta no chat ${active.id}`);
    const result = await kor.askAgent(active.id, question);
    console.log("\nResposta:\n");
    console.log(result.answer);

    if (result.relevantFiles.length) {
      console.log("\nArquivos considerados:");
      result.relevantFiles.forEach((file) => console.log(`- ${file}`));
    }

    if (result.diffPreview.length) {
      console.log("\nAlteracoes pendentes:");
      result.diffPreview.forEach((item) => {
        console.log(`\n# ${item.path} [${item.action}]`);
        if (item.reason) {
          console.log(`Motivo: ${item.reason}`);
        }
        console.log(item.diff);
      });
      console.log('Use "apply" para confirmar as alteracoes.');
    } else {
      console.log("\nNenhuma alteracao de arquivo foi sugerida.");
    }
    return;
  }

  if (trimmed === "apply") {
    const active = await ensureActiveChat();
    const pending = await kor.getPendingChanges(active.id);
    if (!pending.length) {
      console.log("Nao ha alteracoes pendentes.");
      return;
    }

    console.log("Aplicando alteracoes pendentes...");
    const result = await kor.applyChanges(active.id);
    console.log(result.message);
    return;
  }

  if (trimmed.startsWith("config set ")) {
    const parts = trimmed.replace("config set ", "").split(" ");
    if (parts.length < 2) {
      console.log("Uso: config set <key> <value>");
      return;
    }
    const key = parts[0];
    let value = parts.slice(1).join(" ");
    
    if (key === "maxTokens") value = parseInt(value, 10);
    if (key === "temperature") value = parseFloat(value);

    await kor.saveAiConfig({ [key]: value });
    console.log(`Configuracao atualizada: ${key} = ${value}`);
    return;
  }

  if (trimmed === "setup") {
    console.log("=== Setup do Provedor de IA ===");
    const provider = await promptQuestion(rl, "Provedor (openrouter, openai, huggingface): ");
    if (!provider) return;
    
    let apiKey = await promptQuestion(rl, "API Key (deixe em branco para manter a atual): ");
    
    if (!apiKey) {
      apiKey = await kor.getApiKey(provider);
      if (!apiKey) {
        console.log("Chave de API nao fornecida e nenhuma salva para este provedor. Abortando.");
        return;
      }
    }

    console.log(`Buscando modelos para ${provider}...`);
    try {
      const models = await kor.fetchModels(provider, apiKey);
      if (!models.length) {
        console.log("Nenhum modelo encontrado.");
        return;
      }

      console.log("\nModelos disponiveis:");
      models.forEach((m, i) => {
        console.log(`[${i + 1}] ${m.name}`);
      });

      const selectedIdxStr = await promptQuestion(rl, "\nSelecione o numero do modelo: ");
      const selectedIdx = parseInt(selectedIdxStr, 10) - 1;
      
      if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= models.length) {
        console.log("Selecao invalida.");
        return;
      }

      const selectedModel = models[selectedIdx].id;
      await kor.saveAiConfig({
        provider,
        apiKey, // This will be intercepted by saveAiConfig and securely saved
        model: selectedModel
      });

      console.log(`Setup concluido. Modelo selecionado: ${selectedModel}`);
    } catch (err) {
      console.log(`Erro durante o setup: ${err.message}`);
    }
    return;
  }

  if (trimmed === "exit") {
    process.exit(0);
  }

  console.log("Comando desconhecido.");
  printHelp();
}

async function runSingleCommandFromArgs(argv) {
  if (!argv.length) {
    return false;
  }

  const [command, ...rest] = argv;
  const rawInput = [command, ...rest].join(" ");
  await handleCommand(rawInput);
  return true;
}

async function main() {
  await kor.ensureRuntime();
  await ensureActiveChat();

  if (await runSingleCommandFromArgs(process.argv.slice(2))) {
    return;
  }

  console.log("KOR Local AI Agent");
  printHelp();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ai-agent> "
  });

  rl.prompt();

  rl.on("line", async (line) => {
    rl.pause();
    try {
      await handleCommand(line, rl);
    } catch (error) {
      if (error.response && error.response.data) {
        logger.error(`API Error: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(error.message);
      }
    } finally {
      rl.resume();
      rl.prompt();
    }
  });

  rl.on("close", () => {
    console.log("Encerrando...");
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
