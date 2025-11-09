// js/provider-chatgpt.js

window.ChatGPTProvider = function (createDeps) {
  const { axios, setStatus, addMsg, toast } = createDeps;

  const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
  const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';

  // modelos (ajuste se quiser outros)
  const CHAT_MODEL = 'gpt-4.1-mini';
  const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';

  let apiKey = '';
  let messages = [];

  function setApiKey(key) {
    apiKey = key;
  }

  // define / atualiza a mensagem de sistema
  function ensureSystem(systemPrompt) {
    const base =
      systemPrompt ||
      'Você é Marco, um curador apaixonado por cinema. Responda em português, de forma curta, listando 2 a 4 filmes relevantes, sem fazer perguntas de volta.';
    if (!messages.length || messages[0].role !== 'system') {
      messages = [{ role: 'system', content: base }];
    } else {
      messages[0].content = base;
    }
  }

  // TTS: faz o ChatGPT falar a resposta usando OpenAI Audio API
    async function speak(text) {
    if (!apiKey || !text) return;

    try {
      const res = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          voice: 'alloy',
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

      if (window.AudioQueue) {
        window.AudioQueue.enqueue({ blob, mime: 'audio/mpeg' });
      } else {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(err => console.error('Erro ao tocar áudio TTS:', err));
      }
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'ChatGPT (TTS)',
          toast,
          setStatus
        });
      } else {
        console.error('Erro TTS ChatGPT:', err);
        toast('Erro ao gerar áudio da resposta do ChatGPT.');
      }
    }
  }

  // envia texto para o ChatGPT
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
        {
          model: CHAT_MODEL,
          messages
        },
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
        // fala a resposta
        speak(reply);
      }

      setStatus('🎤 Pronto para próxima pergunta', true);
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'ChatGPT',
          toast,
          setStatus
        });
      } else {
        console.error('Erro ChatGPT:', err);
        const msg = err.response?.data?.error?.message || err.message;
        toast('Erro ChatGPT: ' + msg);
        setStatus('❌ Erro', false, true);
      }
    }
  }

  // envia áudio: transcreve + manda para sendText
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
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
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
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'ChatGPT (Transcrição)',
          toast,
          setStatus
        });
      } else {
        console.error('Erro ao transcrever áudio:', err);
        const msg = err.response?.data?.error?.message || err.message;
        toast('Erro ao transcrever áudio: ' + msg);
        setStatus('❌ Erro ao processar áudio', false, true);
      }
    }
  }

  function reset(systemPrompt) {
    messages = [];
    ensureSystem(systemPrompt);
  }

  async function welcome() {
    if (!apiKey) return;

    try {
      setStatus('🔊 Gerando saudação inicial...', true);

      // Cria um prompt curto pedindo para o modelo se apresentar
      const prompt = 'Dê uma saudação inicial breve e simpática, em português, como um curador de cinema apresentando-se ao usuário.';

      // Gera a saudação via ChatGPT
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Você é Marco, um curador apaixonado por cinema. Fale sempre de forma curta, simpática e natural.'
            },
            { role: 'user', content: prompt }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = (res.data.choices?.[0]?.message?.content || '').trim();

      if (reply) {
        addMsg('assistant', reply);
        await speak(reply); // fala o texto, respeitando fila global
      }

      setStatus('🎬 Pronto para começar!', true);
    } catch (err) {
      if (window.ApiErrorHandler) {
        window.ApiErrorHandler.handle(err, {
          provider: 'ChatGPT (Boas-vindas)',
          toast,
          setStatus
        });
      } else {
        console.error('Erro ao gerar saudação:', err);
        toast('Erro ao gerar saudação inicial do ChatGPT.');
        setStatus('❌ Erro na saudação', false, true);
      }
    }
  }

  return {
    id: 'chatgpt',
    label: 'ChatGPT',
    setApiKey,
    sendText,
    sendAudio,
    reset,
    placeholderKey: 'sk-...',
    helpText:
      'Use sua OpenAI API Key. Em produção, utilize um backend/proxy seguro.'
  };
};
