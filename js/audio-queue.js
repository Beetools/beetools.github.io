// js/audio-queue.js
// Controla reprodução de áudio em fila, sem sobreposição entre ChatGPT / Convai / etc.

(function (global) {
  const audio = new Audio();
  let queue = [];
  let playing = false;

  function playNext() {
    if (!queue.length) {
      playing = false;
      return;
    }

    const item = queue.shift();
    let url = null;

    const onEnded = () => {
      if (url) URL.revokeObjectURL(url);
      playNext();
    };

    audio.onended = onEnded;
    audio.onpause = () => {}; // mantém simples

    try {
      if (item.blob) {
        url = URL.createObjectURL(item.blob);
        audio.src = url;
      } else if (item.base64) {
        audio.src = `data:${item.mime || 'audio/wav'};base64,${item.base64}`;
      } else if (item.src) {
        audio.src = item.src;
      } else {
        playNext();
        return;
      }

      playing = true;
      audio.play().catch(err => {
        console.error('Erro ao reproduzir áudio:', err);
        playNext();
      });
    } catch (err) {
      console.error('Erro ao iniciar reprodução de áudio:', err);
      playNext();
    }
  }

  function enqueue(item) {
    queue.push(item);
    if (!playing) {
      playNext();
    }
  }

  function stop() {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
    queue = [];
    playing = false;
  }

  global.AudioQueue = { enqueue, stop };
})(window);
