# KOR Agent (VS Code Extension)

O KOR é um poderoso assistente de desenvolvimento local integrado diretamente ao seu editor. Ele foi projetado para ajudar programadores fornecendo sugestões e refatorações alimentadas por Inteligência Artificial avançada, de forma segura, modular e contextual.

## Funcionalidades Principais

- **Onisciência (Contexto de Abas):** O KOR lê e entende automaticamente **todos os arquivos que você tem abertos** nas abas do seu VS Code simultaneamente. Ele tem consciência total do que você está trabalhando no momento, sem que você precise copiar e colar código.
- **Edições Simultâneas em Múltiplos Arquivos:** O agente não fica preso a um único arquivo. Ele pode propor alterações de arquitetura complexas e aplicar mudanças em dezenas de arquivos de uma só vez, ou até mesmo criar novos arquivos do zero.
- **Loop Interativo de Terminal:** O KOR consegue sugerir e executar comandos de terminal (como `git commit`, `npm install`, testes, etc). O comando só é executado após a sua aprovação, e qualquer log de sucesso ou erro volta automaticamente para o Agente para que ele pense no próximo passo!
- **Painel de Diff Visual:** Toda sugestão de código é exibida com uma visualização de *Diff* completa (linhas adicionadas e removidas) na própria aba do VS Code, permitindo que você aprove ou rejeite mudanças com segurança antes de tocar no seu código final.
- **Suporte Multi-Provedor Seguro:** Você pode usar o provedor que preferir: **OpenRouter**, **OpenAI** ou **HuggingFace**. O setup é feito na própria extensão e as suas chaves de API ficam salvas de forma segura e global na sua máquina, nunca sujando os arquivos do seu projeto.

## Primeiros Passos

1. Após instalar a extensão, clique no ícone do KOR na barra lateral esquerda do VS Code.
2. Acesse a aba **Setup** e configure seu provedor favorito e sua *API Key*. (Se você não tem uma, recomendamos o OpenRouter por fornecer dezenas de modelos como Claude 3.5 Sonnet, GPT-4o, etc).
3. Escolha o modelo que deseja usar na lista suspensa.
4. Volte para a aba **Chats**, crie um novo chat e comece a conversar com a Inteligência Artificial!

## Segurança e Privacidade

Todo o tráfego do agente ocorre diretamente entre a sua máquina local e a API do provedor escolhido por você. Nenhuma telemetria e nenhum log de chat é armazenado fora do seu computador (os chats ficam salvos na sua própria pasta `AppData` ou `Home`).

*Transformando comandos locais em ações em tempo real.*
