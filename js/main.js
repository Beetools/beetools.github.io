// js/main.js

(function () {
  // ===== helpers =====
  function get(id) {
    return document.getElementById(id);
  }

  function stamp() {
    return new Date().toLocaleTimeString();
  }

  // ===== DOM refs =====
  const charIdField = get('charIdField');
  const charIdInput = get('charId');
  const chat = get('chat');
  const statusEl = get('status');
  const dot = get('dot');
  const connTxt = get('connTxt');
  const ptt = get('ptt');
  const apiKeyInput = get('apiKey');
  const apiKeyLabel = get('apiKeyLabel');
  const apiKeyHelp = get('apiKeyHelp');
  const systemPromptInput = get('systemPrompt');
  const textInput = get('textInput');
  const sendBtn = get('sendBtn');
  const clearBtn = get('clearBtn');
  const copyBtn = get('copyBtn');
  const toasts = get('toasts');
  const meter = get('meter');
  const suggs = get('suggs');
  const providerBtns = document.querySelectorAll('.provider-btn');

  // ===== state =====
  let lastAssistantText = '';
  let connected = false;
  let current = null;
  let hasPlayedWelcome = false;

  // audio capture
  let audioCtx = null;
  let analyser = null;
  let rafId = null;
  let stream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // ===== UI helpers =====
  function toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    toasts.appendChild(d);
    setTimeout(() => {
      d.style.opacity = '0';
      setTimeout(() => d.remove(), 300);
    }, 2500);
  }

  function addMsg(role, text) {
    if (!text) return;
    const m = document.createElement('div');
    m.className = `msg ${role}`;
    m.textContent = text;
    const t = document.createElement('div');
    t.className = 'time';
    t.textContent = stamp();
    m.appendChild(t);
    chat.appendChild(m);
    chat.scrollTop = chat.scrollHeight;
    if (role === 'assistant') lastAssistantText = text;
    const all = chat.querySelectorAll('.msg');
    if (all.length > 60) all[0].remove();
    return m;
  }

  function setStatus(txt, ok = false, err = false) {
    statusEl.textContent = txt;
    statusEl.className =
      'status' + (ok ? ' ok' : '') + (err ? ' err' : '');
  }

  function setConn(on) {
    connected = on;
    connTxt.textContent = on ? 'Conectado' : 'Desconectado';
    dot.classList.toggle('on', on);
  }

  // ===== deps para providers =====
  const createDeps = {
    axios,
    setStatus,
    addMsg,
    toast
  };

  const providers = {
    chatgpt: window.ChatGPTProvider(createDeps),
    gemini: window.GeminiProvider(createDeps),
    convai: window.ConvaiProvider(createDeps)
  };

  // provedor padrão
  current = providers.chatgpt;

  // ===== provider UI =====
  function updateProviderUI() {
    apiKeyInput.value = '';

    apiKeyLabel.textContent =
      current.id === 'chatgpt'
        ? '🔑 OpenAI API Key'
        : current.id === 'gemini'
        ? '🔑 Gemini / Backend Key'
        : '🔑 Convai API Key';

    apiKeyInput.placeholder = current.placeholderKey || '';
    apiKeyHelp.textContent = current.helpText || '';

    // Character ID só aparece para Convai
    if (current.id === 'convai') {
      charIdField.style.display = 'grid';

      const savedChar =
        localStorage.getItem('cinetalk_convai_charid') || '';
      if (savedChar && typeof current.setCharId === 'function') {
        charIdInput.value = savedChar;
        current.setCharId(savedChar);
      }

      const savedKey =
        localStorage.getItem('cinetalk_api_key_convai') || '';
      if (savedKey) {
        apiKeyInput.value = savedKey;
        current.setApiKey(savedKey);
      }
    } else {
      charIdField.style.display = 'none';

      if (current.id === 'chatgpt') {
        const saved =
          localStorage.getItem('cinetalk_api_key_chatgpt') || '';
        if (saved) {
          apiKeyInput.value = saved;
          current.setApiKey(saved);
        }
      }
      // Gemini: usa o valor informado pelo usuário (API/URL) quando setado
    }

    setConn(false);
    setStatus('Configure a API Key para começar');
  }

  // ===== provider switch (5.2) =====
  function switchProvider(id) {
    const next = providers[id];
    if (!next || next === current) return;

    // para qualquer áudio em reprodução
    if (window.AudioQueue) {
      window.AudioQueue.stop();
    }

    // encerra sessão / contexto do provedor atual
    if (current && typeof current.reset === 'function') {
      current.reset(systemPromptInput.value.trim());
    }

    current = next;
    hasPlayedWelcome = false;

    // visual: botão ativo
    providerBtns.forEach((b) =>
      b.classList.toggle(
        'active',
        b.dataset.provider === current.id
      )
    );

    updateProviderUI();
    addMsg('system', `Provedor alterado para ${current.label}.`);

    // boas-vindas do novo provedor
    if (
      current &&
      typeof current.welcome === 'function' &&
      !hasPlayedWelcome
    ) {
      current.welcome();
      hasPlayedWelcome = true;
    }
  }

  providerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.provider;
      switchProvider(id);
    });
  });

  // ===== audio visuals =====
  function startMeter() {
    if (!analyser) return;
    const bars = [...meter.querySelectorAll('.bar')];
    function loop() {
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(arr);
      const step = Math.floor(arr.length / bars.length);
      bars.forEach((b, i) => {
        const slice = arr.slice(i * step, (i + 1) * step);
        const avg =
          slice.reduce((a, c) => a + c, 0) / slice.length || 0;
        const h = Math.max(
          6,
          Math.min(52, (avg / 255) * 56)
        );
        b.style.height = `${h}px`;
      });
      rafId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopMeter() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ===== WAV conversion =====
  async function blobToWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext ||
      window.webkitAudioContext)();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const wavBuffer = encodeWAV(audioBuffer);
    await ctx.close();
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  function encodeWAV(audioBuffer) {
    const numChannels = 1;
    const inputRate = audioBuffer.sampleRate;
    const targetRate = 16000; // 🔹 força 16k para Convai / STT
    const inputData = audioBuffer.getChannelData(0);
    const sampleRateRatio = inputRate / targetRate;

    const samples = Math.floor(inputData.length / sampleRateRatio);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, targetRate, true); // 🔹 SampleRate fixo 16k
    view.setUint32(28, targetRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    // downsample + PCM 16-bit
    let offset = 44;
    let pos = 0;
    for (let i = 0; i < samples; i++) {
      const idx = Math.floor(pos);
      const s = Math.max(-1, Math.min(1, inputData[idx] || 0));
      view.setInt16(
        offset,
        s < 0 ? s * 0x8000 : s * 0x7fff,
        true
      );
      offset += 2;
      pos += sampleRateRatio;
    }

    return buffer;
  }

  // ===== recording =====
  async function startRecording() {
    const key = apiKeyInput.value.trim();
    if (!key) {
      toast('Informe a API Key do provedor atual.');
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioCtx = new (window.AudioContext ||
        window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      startMeter();

      const mimeType = MediaRecorder.isTypeSupported(
        'audio/webm;codecs=opus'
      )
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (!audioChunks.length) {
          audioChunks = [];
          return;
        }

        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const raw = new Blob(audioChunks, { type: blobType });
        audioChunks = [];

        if (raw.size <= 2048) return;

        try {
          const systemPrompt = systemPromptInput.value.trim();
          const key = apiKeyInput.value.trim();
          current.setApiKey(key);

          if (current.id === 'convai') {
            // Convai: converte para WAV (mais compatível) e envia
            const wav = await blobToWav(raw);
            await current.sendAudio({ wavBlob: wav });
          } else {
            // ChatGPT / outros: também usam WAV para STT
            const wav = await blobToWav(raw);
            await current.sendAudio({ wavBlob: wav, systemPrompt });
          }

          setConn(true);
        } catch (err) {
          console.error(err);
          toast('Erro ao enviar áudio para o provedor atual.');
          setStatus('❌ Erro ao processar áudio', false, true);
        }
      };

      mediaRecorder.start();
      isRecording = true;
      ptt.classList.add('listening');
      setStatus(
        '🎤 Gravando... (clique novamente para parar)',
        true
      );
      setConn(true);
    } catch (err) {
      console.error(err);
      toast('Erro ao acessar microfone');
      setStatus(
        '❌ Permissão negada ou erro no microfone',
        false,
        true
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorder &&
      mediaRecorder.state === 'recording'
    ) {
      mediaRecorder.stop();
    }
    if (stream) {
      stream
        .getTracks()
        .forEach((t) => t.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    stopMeter();
    isRecording = false;
    ptt.classList.remove('listening');
  }

  function disconnect() {
    stopRecording();
    if (window.AudioQueue) {
      window.AudioQueue.stop();
    }
    setConn(false);
    setStatus('⏸️ Desconectado');
    if (current && current.reset) {
      current.reset(systemPromptInput.value.trim());
    }
    addMsg('system', 'Sessão encerrada.');
  }

  // ===== UI events =====

  // 5.3: boas-vindas automáticas após carregar
  window.addEventListener('load', () => {
    // definir provider padrão como ChatGPT visualmente
    providerBtns.forEach((b) => {
      b.classList.toggle(
        'active',
        b.dataset.provider === 'chatgpt'
      );
    });

    // carregar API Key do ChatGPT se existir
    const savedChat = localStorage.getItem(
      'cinetalk_api_key_chatgpt'
    );
    if (savedChat && current.id === 'chatgpt') {
      apiKeyInput.value = savedChat;
      current.setApiKey(savedChat);
      addMsg(
        'system',
        '✅ OpenAI API Key carregada (local).'
      );
    }

    updateProviderUI();

    // boas-vindas do provedor atual (se implementado)
    if (
      current &&
      typeof current.welcome === 'function' &&
      !hasPlayedWelcome
    ) {
      current.welcome();
      hasPlayedWelcome = true;
    }
  });

  apiKeyInput.addEventListener('change', () => {
    const key = apiKeyInput.value.trim();
    current.setApiKey(key);

    if (current.id === 'chatgpt') {
      localStorage.setItem(
        'cinetalk_api_key_chatgpt',
        key
      );
    } else if (current.id === 'convai') {
      localStorage.setItem(
        'cinetalk_api_key_convai',
        key
      );
    }

    toast('API Key aplicada ao provedor atual.');
  });

  charIdInput.addEventListener('change', () => {
    const id = charIdInput.value.trim();
    Object.values(providers).forEach((p) => {
      if (
        p.id === 'convai' &&
        typeof p.setCharId === 'function'
      ) {
        p.setCharId(id);
      }
    });
    localStorage.setItem(
      'cinetalk_convai_charid',
      id
    );
    toast('Character ID do Convai salvo.');
  });

  systemPromptInput.addEventListener('change', () => {
    if (current && current.reset) {
      current.reset(systemPromptInput.value.trim());
      toast(
        'Personalidade atualizada para este provedor.'
      );
    }
  });

  ptt.addEventListener('click', async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  });

  function sendText() {
    const txt = textInput.value.trim();
    if (!txt) return;

    const key = apiKeyInput.value.trim();
    if (!key) {
      toast('Informe a API Key do provedor atual.');
      return;
    }

    current.setApiKey(key);
    addMsg('user', txt);
    textInput.value = '';

    current.sendText({
      text: txt,
      systemPrompt: systemPromptInput.value.trim()
    });

    setConn(true);
  }

  sendBtn.addEventListener('click', sendText);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendText();
  });

  suggs.addEventListener('click', (e) => {
    const d = e.target.closest('.sugg');
    if (!d) return;
    textInput.value = d.dataset.text;
    sendText();
  });

  copyBtn.addEventListener('click', async () => {
    if (!lastAssistantText) {
      toast('Nada para copiar');
      return;
    }
    await navigator.clipboard.writeText(
      lastAssistantText
    );
    toast('Resposta copiada!');
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Limpar o histórico?')) return;
    chat.innerHTML = '';
    addMsg('system', '🧹 Histórico limpo');
    if (current && current.reset) {
      current.reset(systemPromptInput.value.trim());
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && connected) {
      disconnect();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (connected) {
      e.preventDefault();
      e.returnValue =
        'Sessão ativa. Sair mesmo?';
    }
  });
})();
