# Adaptador Java opcional para NPCs

O jogo publicado é estático + Netlify Functions, então o fluxo usado pelo navegador está em `netlify/functions/npc-chat.mjs`. Este módulo Java mantém um cliente equivalente para quem quiser rodar a integração em outro backend.

```bash
export GEMINI_API_KEY='sua-chave-configurada-no-ambiente'
export GEMINI_MODEL='gemini-3.5-flash'
mvn -q compile exec:java -Dexec.args='Pai, como você está?'
```

A chave é lida somente por variável de ambiente. Não copie a chave enviada em mensagens para o repositório; como ela foi compartilhada em texto, revogue-a e crie outra no Google AI Studio antes de publicar.
