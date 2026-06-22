/* ──────────────────────────────────────────────────────────────────
   scroll-limit.js — el footer es el final, punto.

   En vez de depender de colores o de como Safari pinte su propia
   barra, esto pone un limite real: nunca se puede hacer scroll mas
   abajo del borde inferior del <footer>. Si el usuario intenta pasar
   ese punto (momentum scroll, rebote, lo que sea), se corrige de
   vuelta al limite.

   v2: el footer real puede convivir momentaneamente con una copia
   oculta (display:none) del mismo componente mientras el framework
   de la pagina termina de montar -- esa copia oculta tiene tamaño
   cero y arruinaba el calculo. Ahora se descarta cualquier <footer>
   sin tamaño real, y se recalcula en cada scroll (no solo por timer).
   ────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  function getRealFooterBottom() {
    const footers = document.querySelectorAll("footer");
    let best = null;
    footers.forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.height <= 0) return; // copia oculta / no renderizada todavia
      const bottomAbs = r.bottom + window.scrollY;
      if (best === null || bottomAbs > best) best = bottomAbs;
    });
    return best;
  }

  function clamp() {
    const footerBottomAbs = getRealFooterBottom();
    if (footerBottomAbs == null) return; // footer no encontrado, no tocar nada
    const maxScroll = Math.max(0, Math.round(footerBottomAbs - window.innerHeight));
    if (window.scrollY > maxScroll) {
      window.scrollTo(0, maxScroll);
    }
  }

  window.addEventListener("scroll", clamp, { passive: true });
  window.addEventListener("resize", clamp);
  window.addEventListener("orientationchange", clamp);

  // El footer carga async (streaming) -- revisar varias veces mientras
  // la pagina termina de armarse, no solo una vez.
  clamp();
  document.addEventListener("DOMContentLoaded", clamp);
  window.addEventListener("load", clamp);
  [200, 500, 1000, 1800, 2800, 4200].forEach((ms) => setTimeout(clamp, ms));

  if (window.MutationObserver) {
    const obs = new MutationObserver(clamp);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 8000);
  }
})();
