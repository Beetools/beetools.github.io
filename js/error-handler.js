// js/error-handler.js
// Utilitário centralizado para tratamento de erros da API.
// Uso esperado (em qualquer provider ou no main.js):
// ApiErrorHandler.handle(err, { provider: 'ChatGPT', toast, setStatus });

(function (global) {
  function extractMessage(err) {
    if (!err) return '';

    // OpenAI / APIs padrão
    if (err.response?.data?.error?.message) {
      return String(err.response.data.error.message);
    }

    // Algumas APIs retornam { message: '...' }
    if (err.response?.data?.message) {
      return String(err.response.data.message);
    }

    // Texto cru
    if (err.message) return String(err.message);

    try {
      return JSON.stringify(err);
    } catch {
      return '';
    }
  }

  function handle(err, opts = {}) {
    const {
      provider = 'API',
      toast = () => {},
      setStatus = () => {}
    } = opts;

    console.error(`${provider} Error:`, err);

    const status = err?.response?.status;
    const msg = extractMessage(err);
    const msgLower = msg.toLowerCase();

    // 429 - Rate limit
    if (status === 429 || msgLower.includes('rate-limit') || msgLower.includes('too many requests')) {
      toast(
        `⚠️ ${provider} atingiu o limite de uso temporariamente.
Tente novamente em alguns minutos ou configure sua própria API key nas configurações.`
      );
      setStatus(`⚠️ Limite de uso atingido em ${provider}.`, false, true);
      return;
    }

    // 401 - Auth
    if (status === 401 || msgLower.includes('invalid api key') || msgLower.includes('unauthorized')) {
      toast(
        `🔑 Problema de autenticação em ${provider}.
Verifique se a API key está correta.`
      );
      setStatus(`❌ API key inválida ou ausente em ${provider}.`, false, true);
      return;
    }

    // 403 - Forbidden
    if (status === 403) {
      toast(
        `🚫 Acesso negado em ${provider}.
Confirme permissões, billing e domínio autorizado.`
      );
      setStatus(`🚫 Acesso negado em ${provider}.`, false, true);
      return;
    }

    // 5xx - servidor
    if (status >= 500 && status < 600) {
      toast(
        `🚧 ${provider} está com instabilidade no momento.
Tente novamente mais tarde.`
      );
      setStatus(`🚧 Erro no servidor de ${provider}.`, false, true);
      return;
    }

    // Fallback genérico
    toast(
      `❌ Erro ao processar requisição em ${provider}.
${msg || 'Verifique o console para mais detalhes.'}`
    );
    setStatus(`❌ Erro em ${provider}.`, false, true);
  }

  // Exporta globalmente
  global.ApiErrorHandler = { handle };
})(window);
