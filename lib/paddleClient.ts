"use client";

// Minimal typing for the pieces of Paddle.js we actually call — the full SDK has no official
// npm types package, so this is deliberately narrow rather than `any`-typed everywhere.
interface PaddleGlobal {
  Environment: { set(env: "sandbox" | "production"): void };
  Initialize(opts: { token: string }): void;
  Checkout: {
    open(opts: {
      items: { priceId: string; quantity: number }[];
      customData?: Record<string, string>;
      discountId?: string;
      settings?: { successUrl?: string };
    }): void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const PADDLE_JS_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

let readyPromise: Promise<PaddleGlobal> | null = null;

/** Lazily loads Paddle.js and calls Initialize exactly once, no matter how many buy buttons on
 * the page call this — subsequent calls just await the same in-flight/completed promise. */
export function ensurePaddleReady(): Promise<PaddleGlobal> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("ensurePaddleReady() can only run in the browser"));
      return;
    }

    function initAndResolve() {
      const paddle = window.Paddle!;
      const env = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
      if (env === "sandbox") paddle.Environment.set("sandbox");
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (!token) {
        reject(new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set"));
        return;
      }
      paddle.Initialize({ token });
      resolve(paddle);
    }

    if (window.Paddle) {
      initAndResolve();
      return;
    }

    const script = document.createElement("script");
    script.src = PADDLE_JS_SRC;
    script.async = true;
    script.onload = initAndResolve;
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(script);
  });

  return readyPromise;
}
