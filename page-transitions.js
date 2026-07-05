"use strict";

(() => {
  const root = document.documentElement;
  const prefetched = new Set();

  function prefetch(url) {
    const destination = new URL(url, location.href);
    if (
      destination.origin !== location.origin ||
      destination.pathname === location.pathname ||
      prefetched.has(destination.href)
    ) return;

    prefetched.add(destination.href);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.as = "document";
    hint.href = destination.href;
    document.head.appendChild(hint);
  }

  function prefetchMainPages() {
    [
      "index-home.html",
      "productos.html",
      "servicios.html",
      "nosotros.html",
      "contacto.html",
      "portafolio.html",
      "vista360-classic.html",
      "vista360-digital.html"
    ].forEach(prefetch);
  }

  root.classList.add("v-page-fallback-enter");

  if ("requestIdleCallback" in window) {
    requestIdleCallback(prefetchMainPages, { timeout: 2500 });
  } else {
    setTimeout(prefetchMainPages, 1200);
  }

  addEventListener("pointerover", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (link) prefetch(link.href);
  }, { passive: true });

  addEventListener("touchstart", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (link) prefetch(link.href);
  }, { passive: true });

  addEventListener("pageshow", () => {
    root.classList.remove("v-page-fallback-leave");
    root.classList.remove("v-page-is-navigating");
  });

  addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (!link || link.target || link.hasAttribute("download")) return;

    const destination = new URL(link.href, location.href);
    if (
      destination.origin !== location.origin ||
      destination.href === location.href ||
      destination.hash && destination.pathname === location.pathname
    ) return;

    event.preventDefault();
    if (root.classList.contains("v-page-is-navigating")) return;

    root.classList.add("v-page-is-navigating");
    root.classList.remove("v-page-fallback-enter");
    root.classList.add("v-page-fallback-leave");

    setTimeout(() => location.assign(destination.href), 80);
  });
})();
