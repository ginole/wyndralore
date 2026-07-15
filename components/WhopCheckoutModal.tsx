"use client";

import { useEffect } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

export interface WhopCheckoutTarget {
  planId: string;
  sessionId: string;
}

/**
 * Whop's checkout is an inline iframe, not an overlay like Paddle's was — so we host it in our own
 * modal to keep the buyer on the page they were reading (the "ritual, not a gimmick" positioning
 * that the ?resume=1 flow also exists to protect). The session carries our orderCode; the webhook,
 * not this component, is what actually credits the purchase — onComplete is only for the UI.
 */
export default function WhopCheckoutModal({
  target,
  email,
  onClose,
  onComplete,
}: {
  target: WhopCheckoutTarget | null;
  email?: string;
  onClose: () => void;
  onComplete?: () => void;
}) {
  // Esc to close, and don't let the page scroll behind the modal.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      <div
        className="relative my-auto w-full max-w-md rounded-2xl border border-gold-dim bg-ink-raised p-1 shadow-[0_0_60px_-12px_rgba(228,200,148,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gold-dim bg-ink-raised text-moon-dim transition-colors hover:border-gold hover:text-gold"
        >
          ✕
        </button>
        <WhopCheckoutEmbed
          planId={target.planId}
          sessionId={target.sessionId}
          environment={process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "sandbox" ? "sandbox" : "production"}
          theme="dark"
          themeOptions={{ accentColor: "#e4c894", backgroundColor: "#12162a", borderRadius: 14 }}
          {...(email ? { prefill: { email } } : {})}
          // The embed navigates the top frame to the session's redirect_url when it finishes unless
          // told not to. That fights the whole point of hosting it in a modal, and it silently kills
          // whatever onComplete started — AiReadingPanel's quota poll would be cut off mid-flight by
          // the navigation, landing the buyer on a page that reads their pre-purchase quota back to
          // them. Own the post-purchase step here instead; each caller decides in onComplete.
          skipRedirect
          onComplete={() => onComplete?.()}
        />
      </div>
    </div>
  );
}
