// js/provider-gemini.js

// Provider de demonstração para Gemini.
// A ideia é sempre chamar um BACKEND seu, nunca a API Gemini direto do front.

window.GeminiProvider = function (createDeps) {
  const { axios, setStatus, addMsg, toast } = createDeps;

  let apiKey = '';      // aqui pode ser a key do seu backend ou apenas ignorada
  let endpoint = '';    // opcional: URL do seu backend

  function setApiKey(value) {
    // Você pode usar este campo como:
    // - chave Gemini (se estiver em ambiente controlado)
    // - ou URL do seu backend/proxy
    // No texto da UI já indicamos "API Gemini / URL backend".
    if (value && value.startsWith('http')) {
      endpoint = value.trim();
    } else {
      apiKey = value.trim();
    }
  }

  async function sendText({ text }) {
    if (!apiKey && !endpoint) {
      toast('Informe a API Key / URL do backend para usar o Gemini.');
      return;
    }

    // DEMO atual: apenas resposta mockada
    // Quando conectar de verdade:
    // - use axios.post(endpoint, { text }) e trate com ApiErrorHandler.
    try {
      setStatus('✨ Gemini (demo): processando...', true);

      // --- Exemplo de chamada real (comente se ainda não tiver backend) ---
      // if (endpoint) {
      //   const res = await axios.post(endpoint, { text, apiKey });
      //   const reply = (res.data.reply || '').trim();
      //   if (reply) addMsg('assistant', reply);
      // } else {
      //   throw new Error('Endpoint do backend Gemini não configurado.');
      // }

      // --- Resposta mock enquanto não há backend ---
      const reply = `[Demo Gemini] Recomendações de filmes baseadas em: "${text}"`;
      addMsg('assistant', reply);

      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'Gemini',
          toast,
          setStatus
        });
      } else {
        console.error('Erro Gemini (sendText):', err);
        toast('Erro ao chamar Gemini (ver console).');
        setStatus('❌ Erro Gemini', false, true);
      }
    }
  }

  async function sendAudio({ wavBlob }) {
    // Aqui a lógica será similar ao ChatGPT:
    // 1. Enviar wavBlob para seu backend.
    // 2. Backend transcreve + pergunta ao Gemini.
    // 3. Backend devolve reply.
    try {
      toast('Envio de áudio para Gemini não implementado neste demo.');
      setStatus('Gemini (demo): áudio não configurado.', false, true);
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'Gemini (Áudio)',
          toast,
          setStatus
        });
      } else {
        console.error('Erro Gemini (sendAudio):', err);
      }
    }
  }

  function reset() {
    // nada específico por enquanto
  }

  function welcome() {
    addMsg('assistant', '[Demo Gemini] Pronto para sugerir filmes quando você quiser. ✨');
  }

  return {
    id: 'gemini',
    label: 'Gemini',
    setApiKey,
    sendText,
    sendAudio,
    reset,
    welcome,
    placeholderKey: 'API Gemini / URL backend',
    helpText:
      'Para produção, use um backend/proxy que consome a API Gemini; não exponha a chave no front-end.'
  };
};
