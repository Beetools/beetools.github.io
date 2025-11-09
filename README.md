# 🎬 CineTalk – Multi-Chatbot Voice Assistant

Aplicação web de **chat de voz em tempo real** com suporte a **OpenAI (ChatGPT)**, **Convai** e **Gemini**, permitindo conversas naturais, respostas faladas e recomendações de filmes com diferentes personalidades de assistente.

---

## 🚀 Deploy no GitHub Pages

O projeto está hospedado em:  
👉 **[https://beetools.github.io](https://beetools.github.io)**

---

## 🧩 Estrutura do Projeto

O código foi totalmente modularizado:

```
/index.html              → estrutura base e containers
/css/style.css           → estilos globais e temas
/js/main.js              → controle da UI, troca de provedores e persistência de dados
/js/provider-chatgpt.js  → integração com OpenAI API (ChatGPT)
/js/provider-gemini.js   → integração futura com Gemini API
/js/provider-convai.js   → integração com Convai (voz + Character ID)
```

Essa separação facilita a manutenção, depuração e adição de novos chatbots no futuro.

---

## 🤖 Chatbots Suportados

| Provedor  | API utilizada | Recursos principais |
|------------|---------------|--------------------|
| **ChatGPT** | OpenAI Realtime / Completions | Respostas rápidas com voz (TTS) e personalidade ajustável |
| **Convai** | Convai Character API | Personagem 3D com voz real e `Character ID` configurável |
| **Gemini** | Google Gemini API | Estrutura pronta para integração futura |

---

## ⚙️ Como Atualizar o Site

1. Faça suas alterações no repositório local:
   ```bash
   git add .
   git commit -m "feat: descrição das mudanças"
   git push origin main
   ```

2. O GitHub Pages fará o deploy automático (normalmente leva 1–2 minutos).

📍 **Status do deploy:**  
[https://github.com/Beetools/beetools.github.io/actions](https://github.com/Beetools/beetools.github.io/actions)

---

## 🧠 Configuração e Uso

### 1. Selecione o provedor
No topo da página, escolha entre **ChatGPT**, **Gemini** ou **Convai**.

### 2. Configure suas credenciais
- Para ChatGPT: insira sua **OpenAI API Key**.
- Para Convai: insira a **Convai API Key** e o **Character ID**.

> 💡 As chaves são salvas localmente no navegador e não são compartilhadas.

### 3. Converse por texto ou voz
- Digite uma pergunta ou pressione o botão 🎤 para gravar sua fala.
- O assistente responderá em texto e/ou voz, conforme o provedor selecionado.

⚠️ **Importante:** em ambiente de produção, use **tokens efêmeros** e um **servidor intermediário** — nunca exponha suas chaves diretamente no front-end.

---

## 🎨 Funcionalidades

- 💬 Chat de texto e voz com múltiplos provedores  
- 🧠 Personalidade configurável (ChatGPT / Convai)  
- 🎙️ Gravação e reprodução de áudio em tempo real  
- 🔊 Visualizador de nível de áudio (VU meter)  
- 📋 Copiar respostas  
- 🧹 Limpar histórico  
- 🎬 Sugestões de perguntas sobre cinema  
- 🚫 Prevenção de mensagens duplicadas (Convai)  

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**, **CSS3**, **JavaScript (Vanilla)**
- **OpenAI API**, **Convai API**, **Google Gemini API**
- **Web Audio API** (gravação, reprodução e visualização)
- **LocalStorage** (salvar chaves e configurações)
- **Axios** (requisições HTTP)
- **GitHub Pages** (deploy automático)

---

## 📦 Estrutura de Branches

- `main` → versão estável e publicada  
- `feat/multi-chatbot-architecture` → versão atual com modularização e novos provedores  

---

## 🧾 Licença

Este projeto é de uso **educacional e demonstrativo**, voltado a aplicações de IA generativa e interação por voz.
