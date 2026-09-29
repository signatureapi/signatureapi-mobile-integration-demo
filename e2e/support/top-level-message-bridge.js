// The document-start script a native app installs to receive ceremony events
// when it loads the ceremony as the WebView's top-level page with
// event_delivery=message.
//
// The ceremony calls parent.postMessage(payload, "*") when it ends. Loaded
// top-level, parent is the page's own window, so the page receives its own
// message. The target origin is "*", so the check is ours: accept a message only
// when it comes from the ceremony's origin AND from this very window. Anything
// else is reported as rejected, the way embed-page.html does, and the app ignores it.
//
// Install it at document start in the main frame only. It posts a JSON string,
// { kind: "event" | "rejected", payload }, to an object named signatureapiBridge:
//   iOS      window.webkit.messageHandlers.signatureapiBridge   (WKScriptMessageHandler)
//   Android  window.signatureapiBridge                          (WebViewCompat.addWebMessageListener)
// The browser tests (support/ceremony.ts) define window.signatureapiBridge themselves.
//
// This file is the snippet the apps embed. The copies in
//   ios/SignatureAPIDemo/Ceremony/CeremonyWebView.swift
//   android/app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyWebView.kt
// must stay byte-for-byte identical to the code below, so all three run the same check.
(function () {
  var CEREMONY_ORIGIN = "https://sign.signatureapi.com";

  function bridge() {
    var handlers = window.webkit && window.webkit.messageHandlers;
    return (handlers && handlers.signatureapiBridge) || window.signatureapiBridge;
  }

  window.addEventListener("message", function (event) {
    var target = bridge();
    if (!target) return;
    if (event.origin !== CEREMONY_ORIGIN || event.source !== window) {
      target.postMessage(JSON.stringify({ kind: "rejected", payload: { origin: event.origin } }));
      return;
    }
    target.postMessage(JSON.stringify({ kind: "event", payload: event.data }));
  });
})();
