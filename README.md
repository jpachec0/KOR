# KOR Agent (Advanced Local AI Assistant)

O KOR é um poderoso assistente de desenvolvimento local e extensão do VS Code projetado para ajudar programadores fornecendo sugestões e refatorações alimentadas por Inteligência Artificial avançada, de forma segura, modular e totalmente integrada ao seu ambiente de trabalho.

## Principais Funcionalidades

- **Onisciência (Contexto de Abas):** O KOR lê e entende automaticamente **todos os arquivos que você tem abertos** nas abas do seu VS Code simultaneamente. Ele tem consciência total de onde você está trabalhando.
- **Edições Simultâneas e Criação de Arquivos:** Ao contrário de assistentes comuns, o KOR não fica preso a sugerir alterações em um único arquivo. Ele pode propor alterações de arquitetura pesadas mudando dezenas de arquivos de uma só vez, ou até **criar novos arquivos** inteiros.
- **Loop de Agência Interativa (Comandos no Terminal):** O KOR consegue sugerir comandos para rodar no seu terminal (como `git commit`, `npm install`, etc.). Após você autorizar e clicar em "Apply", o KOR executa o comando por trás dos panos, lê o erro no console e, se algo falhar, ele "pensa" e te responde com a correção automaticamente!
- **Painel de Diff Visual:** Toda sugestão de código é exibida para você de forma transparente com uma visualização de *Diff* completa (linhas adicionadas e removidas) na própria aba do VS Code antes de ser aplicada ao código final.
- **Suporte Multi-Provedor Seguro:** Suporte nativo para **OpenRouter**, **OpenAI** e **HuggingFace**. O setup é interativo e 100% seguro: as chaves (API Keys) nunca tocam na pasta do seu projeto. Elas ficam armazenadas em nível global na sua máquina (AppData/Home), mantendo seu Git completamente limpo.

## Instalação e Uso Global (Terminal CLI)

Você pode instalar o KOR globalmente no seu computador para acessá-lo de qualquer pasta diretamente pelo terminal!

1. Navegue até a pasta onde o repositório KOR está baixado: `cd KOR-main`
2. Instale globalmente usando o npm:
   ```bash
   npm install -g .
   ```
3. Pronto! Agora você pode chamar o KOR de qualquer lugar digitando apenas `kor` no terminal para abrir o modo interativo, ou passar a ação diretamente:
   ```bash
   kor ask "crie um arquivo de teste"
   kor apply
   kor list-chats
   ```

**Para Atualizar:** Sempre que baixar uma versão nova do repositório, basta rodar `npm install -g .` novamente dentro da pasta do KOR para atualizar o comando global do seu sistema.

## Como Usar (Extensão VS Code)

1. Rode `npm run watch` no terminal dentro da pasta `vscode-extension` (ou compile com F5 usando as tarefas `.vscode`).
2. Abra a extensão no seu editor de código.
3. Se for a primeira vez, clique na engrenagem (Settings) na aba lateral para configurar seu provedor e sua API Key.
4. Volte para a aba **Home**, crie um novo Chat e comece a conversar com o Agente.
5. Se o Agente propuser mudanças de código ou execução de comandos, você poderá revisá-las no painel. Clique em **Apply** para autorizar.

## Arquitetura

O repositório é dividido entre o núcleo inteligente que fala com as IAs e gerencia o estado (`core/`) e a interface do usuário desenhada especificamente para a Webview do editor (`vscode-extension/`).

A comunicação e extração de JSON foram extensivamente otimizadas e "endurecidas" para prevenir alucinações das APIs, extraindo estritamente as tarefas relevantes (com Regex de salvamento de fallback) de qualquer modelo escolhido.

---
*KOR - Transformando prompts locais em ações em tempo real.*