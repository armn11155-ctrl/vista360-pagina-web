/* ──────────────────────────────────────────────────────────────────
   hover.js — activa el atributo `style-hover` como hover real.

   En el HTML los botones traen:  style-hover="background:#3B86F5; ..."
   pero `style-hover` no es CSS válido — el navegador lo ignora. Este
   script lo lee y aplica esos estilos al pasar el cursor (y los revierte
   al salir), sin sombras ni brillos: solo el cambio de color/posición
   definido en cada botón. Funciona en todas las páginas que lo incluyan.
   ────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  function parseStyle(text) {
    const out = {};
    (text || "").split(";").forEach(function (pair) {
      const i = pair.indexOf(":");
      if (i === -1) return;
      const prop = pair.slice(0, i).trim();
      const val = pair.slice(i + 1).trim();
      if (prop) out[prop] = val;
    });
    return out;
  }

  function activar(el) {
    if (el.dataset.hoverBound) return;
    el.dataset.hoverBound = "1";

    const hoverStyles = parseStyle(el.getAttribute("style-hover"));
    const props = Object.keys(hoverStyles);
    if (props.length === 0) return;

    // Guardar el valor original de cada propiedad que vamos a cambiar
    const originales = {};
    props.forEach(function (p) {
      originales[p] = el.style.getPropertyValue(p);
    });

    const aplicar = function () {
      props.forEach(function (p) {
        el.style.setProperty(p, hoverStyles[p]);
      });
    };
    const revertir = function () {
      props.forEach(function (p) {
        if (originales[p]) el.style.setProperty(p, originales[p]);
        else el.style.removeProperty(p);
      });
    };

    el.addEventListener("mouseenter", aplicar);
    el.addEventListener("mouseleave", revertir);
    el.addEventListener("focus", aplicar);
    el.addEventListener("blur", revertir);
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[style-hover]"),
      activar,
    );
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  // Reaplica si el contenido se renderiza dinámicamente después
  if (window.MutationObserver) {
    const obs = new MutationObserver(function () { init(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
