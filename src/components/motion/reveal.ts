import type { RefCallback } from "react";

const MAX_STAGGER_STEPS = 5;
let sharedObserver: IntersectionObserver | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        sharedObserver?.unobserve(element);
        if (element.isConnected) element.dataset.reveal = "in";
      }
    },
    { threshold: 0.12 },
  );
  return sharedObserver;
}

/**
 * Faz o elemento entrar vindo da ESQUERDA da janela e parar na posição final.
 * Uso: <div ref={revealLeft(index)} className="app-card ..."> (sem wrapper, sem estado).
 * Só roda no navegador (ref callback), então o HTML do servidor continua visível.
 * skipIfVisible: true => não anima o que já está na tela ao montar (use na landing, que é SSR).
 */
export function revealLeft(index = 0, options: { skipIfVisible?: boolean } = {}): RefCallback<HTMLElement> {
  return (element) => {
    if (!element || typeof window === "undefined") return;
    if (element.dataset.reveal) return;
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    if (options.skipIfVisible && element.getBoundingClientRect().top < window.innerHeight) return;

    element.style.setProperty("--reveal-i", String(Math.min(index, MAX_STAGGER_STEPS)));
    element.dataset.reveal = "pending";
    void element.getBoundingClientRect(); // registra o estado inicial antes da transição
    element.addEventListener("transitionend", (event) => {
      if (event.target === element && (event as TransitionEvent).propertyName === "transform") {
        element.dataset.reveal = "done";
      }
    });
    getObserver().observe(element);
  };
}
