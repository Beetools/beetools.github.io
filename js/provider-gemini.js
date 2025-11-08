// js/provider-gemini.js

window.GeminiProvider = function(createDeps) {
  const { setStatus, addMsg, toast } = createDeps;
  let apiKey = '';

  function setApiKey(key) { apiKey = key; }

  async function sendText({ text }) {
    if (!apiKey) {
      toast('Informe a API Key do Gemini (via backend/proxy).');
      return;
    }
    // TODO: chamar seu endpoint backend que fala com Gemini.
    setStatus('Gemini (mock): processando...', true);
    addMsg('assistant', '[Demo Gemini] Recomendações baseadas em: ' + text);
    setStatus('🎤 Pronto para próxima pergunta', true);
  }

  async function sendAudio({ wavBlob }) {
    // Mesmo esquema: mandar para seu backend que usa Gemini.
    toast('Envio de áudio para Gemini não implementado neste demo.');
  }

  function reset() {}

  return {
    id: 'gemini',
    label: 'Gemini',
    setApiKey,
    sendText,
    sendAudio,
    reset,
    placeholderKey: 'API Gemini / URL backend',
    helpText: 'Para segurança, use um backend que consome a API Gemini e não exponha sua chave no front.'
  };
};
