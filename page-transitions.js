"use strict";

/*
 * Navegación SPA para las páginas HTML de VISTA360.
 * Descarga el siguiente documento en segundo plano, desmonta la vista React
 * actual y monta la nueva sin recargar la pestaña del navegador.
 */
(() => {
  const pageCache = new Map();
  const root = document.documentElement;
  let navigating = false;
  let currentPageUrl = normalizeUrl(location.href).href;

  function normalizeUrl(value) {
    const url = new URL(value, location.href);
    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.replace(/index\.html$/, "index-home.html");
    }
    url.hash = "";
    return url;
  }

  function isInternalPage(url) {
    return (
      url.origin === location.origin &&
      !url.pathname.endsWith(".dc.html") &&
      (url.pathname.endsWith("/") || url.pathname.endsWith(".html"))
    );
  }

  function fetchPage(value) {
    const url = normalizeUrl(value);
    if (!isInternalPage(url)) return Promise.reject(new Error("external navigation"));
    if (pageCache.has(url.href)) return pageCache.get(url.href);

    const request = fetch(url.href, {
      credentials: "same-origin",
      headers: { "X-VISTA360-Navigation": "spa" }
    }).then((response) => {
      if (!response.ok) throw new Error(`page request failed: ${response.status}`);
      return response.text();
    }).catch((error) => {
      pageCache.delete(url.href);
      throw error;
    });

    pageCache.set(url.href, request);
    return request;
  }

  function prefetch(value) {
    const url = normalizeUrl(value);
    if (url.pathname === location.pathname || !isInternalPage(url)) return;
    fetchPage(url).catch(() => {});
  }

  function syncHead(nextDocument) {
    document.title = nextDocument.title;

    ["description", "theme-color", "color-scheme"].forEach((name) => {
      const incoming = nextDocument.querySelector(`meta[name="${name}"]`);
      const current = document.querySelector(`meta[name="${name}"]`);
      if (incoming && current) {
        current.setAttribute("content", incoming.getAttribute("content") || "");
      } else if (incoming) {
        document.head.appendChild(document.importNode(incoming, true));
      } else if (current && name === "description") {
        current.remove();
      }
    });
  }

  function ensureTurnstile(nextDocument) {
    if (!nextDocument.querySelector(".cf-turnstile")) return;
    if (window.turnstile || document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  async function ensureHelperScripts(nextDocument) {
    const helpers = Array.from(nextDocument.querySelectorAll("script[src]"))
      .map((script) => new URL(script.getAttribute("src"), location.href))
      .filter((url) => /\/(hover|hero-video|formats-detail)\.js$/.test(url.pathname));

    for (const url of helpers) {
      const name = url.pathname.split("/").pop();
      const ready =
        (name === "hover.js" && window.__vista360HoverLoaded) ||
        (name === "hero-video.js" && window.__vista360HeroVideoLoaded) ||
        (name === "formats-detail.js" && window.initVista360Detail);
      if (ready) continue;

      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url.href;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  function waitForPageReady() {
    return new Promise((resolve) => {
      if (document.querySelector(".vn-site-nav")) {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
        return;
      }

      const observer = new MutationObserver(() => {
        if (!document.querySelector(".vn-site-nav")) return;
        observer.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 3000);
    });
  }

  async function installPage(html, url, pushHistory) {
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    if (!nextDocument.querySelector("x-dc")) {
      throw new Error("invalid VISTA360 page");
    }

    ensureTurnstile(nextDocument);
    window.__dcUnmount?.();

    if (pushHistory) history.pushState({ vista360: true }, "", url.href);
    syncHead(nextDocument);

    const nextBody = document.importNode(nextDocument.body, true);
    document.body.replaceWith(nextBody);
    window.scrollTo(0, 0);
    window.__dcBoot?.();

    await waitForPageReady();
    await ensureHelperScripts(nextDocument);
    dispatchEvent(new CustomEvent("vista360:navigation", {
      detail: { url: url.href }
    }));
    currentPageUrl = url.href;
  }

  async function navigate(value, { pushHistory = true } = {}) {
    const url = normalizeUrl(value);
    if (navigating || url.href === currentPageUrl) return;
    navigating = true;
    root.classList.add("v-page-is-navigating");

    try {
      const html = await fetchPage(url);
      const swap = () => installPage(html, url, pushHistory);

      if (typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(swap);
        await transition.finished;
      } else {
        root.classList.add("v-page-fallback-leave");
        await swap();
      }

      root.classList.remove("v-page-fallback-leave");
      root.classList.add("v-page-fallback-enter");
    } catch (error) {
      console.warn("[VISTA360] SPA fallback:", error);
      location.assign(url.href);
      return;
    } finally {
      navigating = false;
      root.classList.remove("v-page-is-navigating");
    }
  }

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
      !isInternalPage(destination) ||
      (destination.hash && destination.pathname === location.pathname)
    ) return;

    event.preventDefault();
    navigate(destination);
  });

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

  addEventListener("popstate", () => {
    navigate(location.href, { pushHistory: false });
  });

  history.replaceState({ vista360: true }, "", location.href);
  root.classList.add("v-page-fallback-enter");

  const prefetchMainPages = () => {
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
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(prefetchMainPages, { timeout: 2500 });
  } else {
    setTimeout(prefetchMainPages, 1200);
  }
})();
