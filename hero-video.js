/* ──────────────────────────────────────────────────────────────────
   hero-video.js — red de seguridad independiente para el autoplay
   del video del hero. No depende del framework de la página (el
   componente "DC") ni de su componentDidMount: busca el video por sí
   solo y reintenta reproducirlo desde varios momentos distintos. Si
   el otro mecanismo ya lo puso a correr, esto no hace nada (play()
   sobre un video que ya está reproduciéndose es inofensivo).
   ────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  window.__vista360HeroVideoLoaded = true;

  function intentar() {
    const v = document.getElementById("heroVideo");
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");

    const tryPlay = function () {
      const p = v.play();
      if (p && p.catch) p.catch(function () {});
    };

    tryPlay();

    if (!v.dataset.heroNetBound) {
      v.dataset.heroNetBound = "1";
      let intentos = 0;
      const poll = setInterval(function () {
        intentos++;
        if (!v.paused || intentos > 40) { clearInterval(poll); return; }
        tryPlay();
      }, 250);

      ["touchstart", "click", "scroll"].forEach(function (ev) {
        window.addEventListener(ev, tryPlay, { once: true, passive: true });
      });
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) tryPlay();
      });
    }
  }

  intentar();
  window.addEventListener("vista360:navigation", intentar);
  document.addEventListener("DOMContentLoaded", intentar);
  window.addEventListener("load", intentar);
  requestAnimationFrame(function () { requestAnimationFrame(intentar); });

  // El video puede aparecer recién cuando el framework de la página
  // termine de montar sus componentes — observar el DOM por si llega tarde.
  if (window.MutationObserver) {
    const obs = new MutationObserver(intentar);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }
})();
