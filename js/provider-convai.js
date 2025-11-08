// js/provider-convai.js

window.ConvaiProvider = function(createDeps) {
  const { axios, setStatus, addMsg, toast } = createDeps;
  const BASE = 'https://api.convai.com';

  let apiKey = '';
  let charId = '';
  let sessionId = '';
  let lastAssistantText = '';
  let lastAssistantTime = 0;

  function addAssistantOnce(text) {
    if (!text) return;
    const now = Date.now();
    // evita duplicar a mesma resposta em janela de 5 segundos
    if (text === lastAssistantText && (now - lastAssistantTime) < 5000) {
      return;
    }
    addMsg('assistant', text);
    lastAssistantText = text;
    lastAssistantTime = now;
  }

  function setApiKey(key) {
    apiKey = key;
  }

  function setCharId(id) {
    charId = id;
  }

  async function startSession() {
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
      console.error(err);
      toast('Erro Convai: ' + (err.response?.data?.message || err.message));
      setStatus('❌ Erro Convai', false, true);
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
      if (res.data?.audio) {
        playConvaiAudio(res.data.audio);
      }
      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      console.error(err);
      toast('Erro Convai: ' + (err.response?.data?.message || err.message));
      setStatus('❌ Erro Convai', false, true);
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
      fd.append('charID', charId);
      fd.append('sessionID', sessionId);
      fd.append('voiceResponse', 'True');
      fd.append('file', wavBlob, 'audio.wav');

      const res = await axios.post(`${BASE}/character/getResponse`, fd, {
        headers: { 'CONVAI-API-KEY': apiKey }
      });

      if (res.data?.userQuery) addMsg('user', res.data.userQuery);
      if (res.data?.text) addAssistantOnce(res.data.text);
      if (res.data?.audio) playConvaiAudio(res.data.audio);
      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      console.error(err);
      toast('Erro Convai: ' + (err.response?.data?.message || err.message));
      setStatus('❌ Erro Convai', false, true);
    }
  }

  function reset() {
    sessionId = '';
    // mantemos apiKey e charId; usuário não precisa digitar de novo ao trocar de provedor
  }

  function playConvaiAudio(base64Audio) {
    if (!base64Audio) return;
    try {
        const audio = new Audio('data:audio/wav;base64,' + base64Audio);
        audio.play().catch(err => console.error('Erro ao tocar áudio Convai:', err));
    } catch (err) {
        console.error('Erro ao reproduzir áudio Convai:', err);
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
    placeholderKey: 'Convai API Key',
    helpText: 'Use a Convai API Key e informe o Character ID no campo abaixo.'
  };
};
