// js/provider-chatgpt.js

window.ChatGPTProvider = function(createDeps) {
  const { axios, setStatus, addMsg, toast } = createDeps;

  const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
  const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
  const CHAT_MODEL = 'gpt-4.1-mini';
  const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';

  let apiKey = '';
  let messages = [];

  async function speak(text) {
    if (!apiKey) return;
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',       // ou tts-1-hd se preferir
          voice: 'alloy',       // escolha de voz
          input: text
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(err => console.error('Erro ao tocar áudio TTS:', err));
    } catch (err) {
      console.error('Erro TTS ChatGPT:', err);
    }
  }

  function setApiKey(key) {
    apiKey = key;
  }

  function ensureSystem(systemPrompt) {
    const base = systemPrompt || 'Você é Marco, um curador apaixonado por cinema. Responda em português, curto, listando 2 a 4 filmes, sem fazer perguntas de volta.';
    if (!messages.length || messages[0].role !== 'system') {
      messages = [{ role: 'system', content: base }];
    } else {
      messages[0].content = base;
    }
  }

  async function sendText({ text, systemPrompt }) {
    if (!apiKey) {
      toast('Informe a OpenAI API Key.');
      return;
    }
    ensureSystem(systemPrompt);
    messages.push({ role: 'user', content: text });

    try {
      setStatus('🤔 Processando com ChatGPT...', true);
      const res = await axios.post(
        OPENAI_CHAT_URL,
        { model: CHAT_MODEL, messages },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = (res.data.choices?.[0]?.message?.content || '').trim();
      if (reply) {
        messages.push({ role: 'assistant', content: reply });
        addMsg('assistant', reply);
      }
      if (reply) {
        speak(reply);
      }
      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || err.message;
      toast('Erro ChatGPT: ' + msg);
      setStatus('❌ Erro', false, true);
    }
  }

  async function sendAudio({ wavBlob, systemPrompt }) {
    if (!apiKey) {
      toast('Informe a OpenAI API Key.');
      return;
    }

    try {
      setStatus('🎙️ Transcrevendo áudio...', true);
      const fd = new FormData();
      fd.append('file', wavBlob, 'audio.wav');
      fd.append('model', TRANSCRIBE_MODEL);

      const tr = await axios.post(OPENAI_TRANSCRIBE_URL, fd, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      const text = (tr.data.text || '').trim();
      if (!text) {
        toast('Não foi possível entender o áudio.');
        setStatus('🎤 Pronto para próxima pergunta', true);
        return;
      }

      addMsg('user', text);
      await sendText({ text, systemPrompt });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || err.message;
      toast('Erro ao transcrever áudio: ' + msg);
      setStatus('❌ Erro ao processar áudio', false, true);
    }
  }

  function reset(systemPrompt) {
    messages = [];
    ensureSystem(systemPrompt);
  }

  return {
    id: 'chatgpt',
    label: 'ChatGPT',
    setApiKey,
    sendText,
    sendAudio,
    reset,
    placeholderKey: 'sk-...',
    helpText: 'Use sua OpenAI API Key. Em produção, utilize um backend/proxy seguro.'
  };
};
