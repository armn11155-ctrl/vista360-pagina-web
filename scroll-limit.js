/* ──────────────────────────────────────────────────────────────────
   scroll-limit.js — el footer es el final, punto.

   v3: ya no solo corrige DESPUES de pasarse (eso se ve/siente como un
   salto) -- ahora bloquea el gesto de touch ANTES de que pase del
   limite, igual que hacen las apps nativas para matar el rebote de
   iOS por completo. Mas la correccion de respaldo por si algo se
   escapa (momentum scroll que ya iba en camino antes de tocar).
   ────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  function getMaxScroll() {
    const footers = document.querySelectorAll("footer");
    let bottomAbs = null;
    footers.forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.height <= 0) return; // copia oculta sin renderizar
      const b = r.bottom + window.scrollY;
      if (bottomAbs === null || b > bottomAbs) bottomAbs = b;
    });
    if (bottomAbs == null) return null;
    return Math.max(0, Math.round(bottomAbs - window.innerHeight));
  }

  function correct() {
    const maxScroll = getMaxScroll();
    if (maxScroll == null) return;
    if (window.scrollY > maxScroll) window.scrollTo(0, maxScroll);
  }

  // ── Bloqueo del gesto (mata el rebote antes de que ocurra) ──────
  let touchStartY = 0;
  document.addEventListener(
    "touchstart",
    (e) => { touchStartY = e.touches[0].clientY; },
    { passive: true },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      const maxScroll = getMaxScroll();
      if (maxScroll == null) return;
      const deltaY = touchStartY - e.touches[0].clientY; // >0 = dedo sube = pagina baja
      const atBottom = window.scrollY >= maxScroll - 1;
      if (atBottom && deltaY > 0) {
        e.preventDefault(); // no dejar que el gesto siga empujando mas abajo
      }
    },
    { passive: false },
  );

  window.addEventListener("scroll", correct, { passive: true });
  window.addEventListener("resize", correct);
  window.addEventListener("orientationchange", correct);

  correct();
  document.addEventListener("DOMContentLoaded", correct);
  window.addEventListener("load", correct);
  [200, 500, 1000, 1800, 2800, 4200].forEach((ms) => setTimeout(correct, ms));

  if (window.MutationObserver) {
    const obs = new MutationObserver(correct);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 8000);
  }
})();
