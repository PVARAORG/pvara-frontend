import React from "react";

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise = null;

function ensureTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.turnstile || null), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Cloudflare Turnstile.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error("Failed to load Cloudflare Turnstile."));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export default function TurnstileWidget({
  siteKey,
  action,
  resetKey,
  onVerify,
  onExpire,
  onError,
}) {
  const containerRef = React.useRef(null);
  const widgetIdRef = React.useRef(null);

  React.useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let isCancelled = false;

    ensureTurnstileScript()
      .then((turnstile) => {
        if (!turnstile || !containerRef.current || isCancelled) {
          return;
        }

        if (widgetIdRef.current !== null) {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: (token) => onVerify?.(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onError?.("Verification failed. Please try again."),
        });
      })
      .catch((error) => {
        if (!isCancelled) {
          onError?.(error.message);
        }
      });

    return () => {
      isCancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onError, onExpire, onVerify, siteKey]);

  React.useEffect(() => {
    if (resetKey === undefined || widgetIdRef.current === null || !window.turnstile) {
      return;
    }
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} />;
}
