# CineTalk - Realtime Voice

Aplicação de chat de voz em tempo real usando OpenAI Realtime API.

## 🚀 Deploy no GitHub Pages

Este site está hospedado no GitHub Pages: `https://beetools.github.io`

### Configuração

O repositório está configurado com:
- ✅ Arquivo `.nojekyll` para evitar processamento Jekyll
- ✅ Arquivo `index.html` na raiz do repositório
- ✅ Branch `main` como fonte do GitHub Pages

### Como atualizar o site

1. Faça suas alterações no `index.html`
2. Commit as mudanças:
   ```bash
   git add .
   git commit -m "Descrição das mudanças"
   ```
3. Envie para o GitHub:
   ```bash
   git push origin main
   ```
4. O GitHub Pages irá automaticamente fazer deploy das mudanças (geralmente leva de alguns segundos a 2 minutos)

### Verificar o status do deploy

Acesse: `https://github.com/Beetools/beetools.github.io/actions`

## 📋 Sobre o Projeto

**CineTalk** é um assistente de cinema em tempo real que usa:
- OpenAI Realtime API para conversação por voz
- WebSocket para comunicação bidirecional
- VAD (Voice Activity Detection) no servidor
- Interface moderna e responsiva

## 🔑 Configuração da API

Para usar a aplicação, você precisa de uma chave da OpenAI API:
1. Acesse o site
2. Insira sua API key no campo indicado
3. Segure o botão do microfone para falar

⚠️ **Aviso de Segurança**: Em produção, sempre use um token efêmero gerado no backend. Nunca exponha sua API key diretamente no browser.

## 🎨 Recursos

- 🎤 Conversação por voz em tempo real
- 💬 Chat de texto alternativo
- 🎙️ Seleção de diferentes vozes
- 📊 Visualização de áudio em tempo real
- 💾 Histórico de conversas
- 📋 Copiar respostas
- 🎬 Sugestões de perguntas sobre cinema

## 🛠️ Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- WebSocket API
- Web Audio API
- OpenAI Realtime API

## 📝 Licença

Este projeto é para fins educacionais e demonstração.
