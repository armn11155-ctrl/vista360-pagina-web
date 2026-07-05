"use strict";

(() => {
  if (typeof document.startViewTransition === "function") return;

  const root = document.documentElement;
  root.classList.add("v-page-fallback-enter");

  addEventListener("pageshow", () => {
    root.classList.remove("v-page-fallback-leave");
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

    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;

    const destination = new URL(link.href, location.href);
    if (
      destination.origin !== location.origin ||
      destination.href === location.href ||
      destination.hash && destination.pathname === location.pathname
    ) return;

    event.preventDefault();
    root.classList.remove("v-page-fallback-enter");
    root.classList.add("v-page-fallback-leave");

    setTimeout(() => location.assign(destination.href), 180);
  });
})();
