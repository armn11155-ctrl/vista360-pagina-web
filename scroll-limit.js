/* ──────────────────────────────────────────────────────────────────
   scroll-limit.js — el footer es el final, punto.

   En vez de depender de colores o de como Safari pinte su propia
   barra, esto pone un limite real: nunca se puede hacer scroll mas
   abajo del borde inferior del <footer>. Si el usuario intenta pasar
   ese punto (momentum scroll, rebote, lo que sea), se corrige de
   vuelta al limite.
   ────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  let maxScroll = null;

  function recalc() {
    const footer = document.querySelector("footer");
    if (!footer) { maxScroll = null; return; }
    const rect = footer.getBoundingClientRect();
    const footerBottomAbs = rect.bottom + window.scrollY;
    maxScroll = Math.max(0, Math.round(footerBottomAbs - window.innerHeight));
  }

  function clamp() {
    if (maxScroll == null) return;
    if (window.scrollY > maxScroll) {
      window.scrollTo(0, maxScroll);
    }
  }

  window.addEventListener("scroll", clamp, { passive: true });
  window.addEventListener("resize", recalc);
  window.addEventListener("orientationchange", recalc);

  // El footer carga async (streaming) -- recalcular varias veces
  // mientras se termina de armar la pagina, no solo una vez.
  recalc();
  document.addEventListener("DOMContentLoaded", recalc);
  window.addEventListener("load", recalc);
  [300, 800, 1500, 2500, 4000].forEach((ms) => setTimeout(recalc, ms));

  if (window.MutationObserver) {
    const obs = new MutationObserver(recalc);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 8000);
  }
})();
