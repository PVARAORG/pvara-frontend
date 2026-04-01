import React from "react";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser environment."));
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
      existingScript.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existingScript.addEventListener("error", () => {
        turnstileScriptPromise = null;
        reject(new Error("Unable to load Turnstile."));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Unable to load Turnstile."));
    };
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

const TurnstileWidget = ({
  siteKey,
  action,
  resetKey = 0,
  onVerify,
  onExpire,
  onError,
  className = "",
}) => {
  const containerRef = React.useRef(null);
  const widgetIdRef = React.useRef(null);
  const callbacksRef = React.useRef({ onVerify, onExpire, onError });

  React.useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  React.useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    async function renderWidget() {
      try {
        const turnstile = await loadTurnstileScript();
        if (cancelled || !containerRef.current || !turnstile) {
          return;
        }

        if (widgetIdRef.current !== null && typeof turnstile.remove === "function") {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        containerRef.current.innerHTML = "";
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          size: "flexible",
          theme: "light",
          callback: (token) => callbacksRef.current.onVerify?.(token),
          "expired-callback": () => callbacksRef.current.onExpire?.(),
          "timeout-callback": () => callbacksRef.current.onExpire?.(),
          "error-callback": () => callbacksRef.current.onError?.("Verification failed to load. Please try again."),
        });
      } catch (error) {
        callbacksRef.current.onError?.(error.message || "Unable to load verification. Please try again.");
      }
    }

    renderWidget();

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null && typeof window.turnstile.remove === "function") {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, action, resetKey]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
};

export default TurnstileWidget;
