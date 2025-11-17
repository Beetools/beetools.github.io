// js/provider-convai.js

window.ConvaiProvider = function (createDeps) {
  const { axios, setStatus, addMsg, toast } = createDeps;
  const BASE = 'https://api.convai.com';

  let apiKey = '';
  let charId = '';
  let sessionId = '';
  let lastAssistantText = '';
  let lastAssistantTime = 0;

  function setApiKey(key) {
    apiKey = key;
  }

  function setCharId(id) {
    charId = id;
  }

  // evita respostas duplicadas em sequência
  function addAssistantOnce(text) {
    if (!text) return;
    const now = Date.now();
    if (text === lastAssistantText && now - lastAssistantTime < 5000) {
      return;
    }
    addMsg('assistant', text);
    lastAssistantText = text;
    lastAssistantTime = now;
  }

  async function startSession() {
    console.log('Convai startSession →', { apiKey, charId });
    if (!apiKey || !charId) {
      toast('Configure Convai API Key e Character ID.');
      return false;
    }

    try {
      setStatus('🔄 Iniciando sessão Convai...');

      const fd = new FormData();
      fd.append('userText', 'Olá!');
      fd.append('charID', charId);
      fd.append('sessionID', sessionId || '-1');
      fd.append('voiceResponse', 'True');

      const res = await axios.post(`${BASE}/character/getResponse`, fd, {
        headers: { 'CONVAI-API-KEY': apiKey }
      });

      if (res.data && res.data.sessionID) {
        sessionId = res.data.sessionID;

        if (res.data.text) addAssistantOnce(res.data.text);
        if (res.data.audio) playConvaiAudio(res.data.audio);

        setStatus('🟢 Convai conectado', true);
        return true;
      }

      throw new Error('Resposta inválida da API Convai');
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'Convai',
          toast,
          setStatus
        });
      } else {
        console.error('Erro Convai (startSession):', err);
        toast('Erro Convai: ' + (err.response?.data?.message || err.message));
        setStatus('❌ Erro Convai', false, true);
      }
      return false;
    }
  }

  async function sendText({ text }) {
    if (!apiKey || !charId) {
      toast('Configure Convai API Key e Character ID.');
      return;
    }
    if (!sessionId) {
      const ok = await startSession();
      if (!ok) return;
    }

    try {
      setStatus('🤔 Convai respondendo...', true);

      const fd = new FormData();
      fd.append('userText', text);
      fd.append('charID', charId);
      fd.append('sessionID', sessionId);
      fd.append('voiceResponse', 'True');

      const res = await axios.post(`${BASE}/character/getResponse`, fd, {
        headers: { 'CONVAI-API-KEY': apiKey }
      });

      if (res.data?.text) addAssistantOnce(res.data.text);
      if (res.data?.audio) playConvaiAudio(res.data.audio);

      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      const rawMsg =
        err.response?.data?.message ||
        err.message ||
        '';

      // Tratamento específico para voz não configurada
      if (rawMsg.includes('Unable to generate audio response')) {
        toast('Convai: não foi possível gerar áudio. Verifique se o personagem tem uma voz configurada no painel. A resposta de texto continua normalmente.');
        setStatus('⚠️ Convai sem voz de TTS válida', false, true);
        // não derruba a sessão, só avisa
        return;
      }

      // Demais erros: usa o handler genérico
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'Convai',
          toast,
          setStatus
        });
      } else {
        console.error('Erro Convai (sendText):', err);
        toast('Erro Convai: ' + rawMsg || 'Erro desconhecido.');
        setStatus('❌ Erro Convai', false, true);
      }
    }
  }

  async function sendAudio({ wavBlob }) {
    if (!apiKey || !charId) {
      toast('Configure Convai API Key e Character ID.');
      return;
    }
    if (!sessionId) {
      const ok = await startSession();
      if (!ok) return;
    }

    try {
      setStatus('🤔 Processando áudio Convai...', true);

      const fd = new FormData();

      // 🔹 Áudio usa SOMENTE file, sem userText
      fd.append('charID', charId);
      fd.append('sessionID', sessionId);
      fd.append('voiceResponse', 'True');

      // Se seu encodeWAV gera 16k mono, mantém:
      fd.append('sample_rate', '16000');

      // 🔹 Nome de campo correto segundo a doc: file
      fd.append('file', wavBlob, 'audio.wav');

      const res = await axios.post(`${BASE}/character/getResponse`, fd, {
        headers: { 'CONVAI-API-KEY': apiKey }
      });

      console.log('Convai audio response:', res.data);

      if (res.data?.userQuery) {
        addMsg('user', res.data.userQuery);
      }
      if (res.data?.text) {
        addAssistantOnce(res.data.text);
      }
      if (res.data?.audio) {
        playConvaiAudio(res.data.audio);
      }

      setStatus('🎤 Pronto para próxima pergunta', true);
      } catch (err) {
        const rawMsg =
          err.response?.data?.message ||
          err.message ||
          '';

        if (rawMsg.includes('Unable to generate audio response')) {
          toast('Convai: não foi possível gerar o áudio desta fala. Verifique a voz configurada do personagem.');
          setStatus('⚠️ Convai sem voz de TTS válida', false, true);
          return;
        }

        if (window.ApiErrorHandler) {
          window.ApiErrorHandler.handle(err, {
            provider: 'Convai',
            toast,
            setStatus
          });
        } else {
          console.error('Convai sendAudio error:', err);
          toast('Erro Convai: ' + rawMsg || 'Erro desconhecido.');
          setStatus('❌ Erro Convai', false, true);
        }
      }
  }

  function playConvaiAudio(base64Audio) {
    if (!base64Audio) return;

    try {
      if (window.AudioQueue) {
        window.AudioQueue.enqueue({
          base64: base64Audio,
          mime: 'audio/wav'
        });
      } else {
        const audio = new Audio('data:audio/wav;base64,' + base64Audio);
        audio.play().catch(err => {
          console.error('Erro ao tocar áudio Convai:', err);
        });
      }
    } catch (err) {
      console.error('Erro ao reproduzir áudio Convai:', err);
    }
  }

  function reset() {
    sessionId = '';
    // mantemos apiKey e charId para o usuário não precisar reconfigurar
  }

  async function welcome() {
    if (!apiKey || !charId) return;
    if (!sessionId) {
      await startSession(); // já gera texto + áudio de boas-vindas do personagem
    }
  }

   return {
    id: 'convai',
    label: 'Convai',
    setApiKey,
    setCharId,
    sendText,
    sendAudio,
    reset,
    welcome, // 👈
    placeholderKey: 'Convai API Key',
    helpText:
      'Use a Convai API Key e informe o Character ID no campo abaixo.'
  };
};
