import SwiftUI
import WebKit

/// Shows a SignatureAPI ceremony as the WKWebView's page and reports how it ended.
///
/// With `event_delivery=redirect` (the default) the ceremony signals its end by
/// navigating to `signatureapi-message://…`. `decidePolicyFor` sees that
/// navigation first, cancels it, and hands the event to the app.
///
/// With `event_delivery=message` the ceremony posts the event to its own window
/// instead. A document-start script forwards it to a `WKScriptMessageHandler`.
/// The `signatureapi-message://` interception stays on in both modes; it is harmless.
///
/// The ceremony needs no cookies or web storage, so the default WKWebView
/// configuration works as is.
struct CeremonyWebView: UIViewRepresentable {
    let ceremonyURL: URL
    var eventDelivery: CeremonyEventDelivery = .redirect
    let onEvent: (CeremonyEvent) -> Void

    /// The `webkit.messageHandlers` name the bridge script posts to.
    static let messageHandlerName = "signatureapiBridge"

    /// A byte-for-byte copy of the code in e2e/support/top-level-message-bridge.js,
    /// which documents it and is what the browser tests run. The Android app
    /// embeds the same copy; change all three together.
    static let messageBridgeScript = """
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
        """

    func makeCoordinator() -> Coordinator {
        Coordinator(onEvent: onEvent)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        if eventDelivery == .message {
            let controller = configuration.userContentController
            controller.addUserScript(WKUserScript(source: Self.messageBridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            // The controller retains its handlers; the proxy keeps it from retaining the coordinator.
            controller.add(WeakScriptMessageHandler(context.coordinator), name: Self.messageHandlerName)
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        #if DEBUG
        webView.isInspectable = true
        #endif
        context.coordinator.url = CeremonyLink.embedded(ceremonyURL, delivery: eventDelivery)
        webView.load(URLRequest(url: context.coordinator.url!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.stopLoading()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: messageHandlerName)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let onEvent: (CeremonyEvent) -> Void
        fileprivate var url: URL?
        private var ended = false

        init(onEvent: @escaping (CeremonyEvent) -> Void) {
            self.onEvent = onEvent
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.cancel) }

            if let event = CeremonyEvent(url: url) {
                decisionHandler(.cancel)
                end(with: event)
                return
            }

            // Links that ask for a new window, such as "Powered by SignatureAPI", open in Safari.
            if action.targetFrame == nil {
                decisionHandler(.cancel)
                UIApplication.shared.open(url)
                return
            }

            decisionHandler(.allow)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // iOS may kill the web process under memory pressure, typically while the
            // app is in the background. Reload the same link: it stays valid.
            if let url { webView.load(URLRequest(url: url)) }
        }

        /// event_delivery=message: what the bridge script forwarded. The script
        /// runs in the main frame only, but every frame can reach the handler, so
        /// check again that the sender is the ceremony's main frame.
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            let origin = message.frameInfo.securityOrigin
            guard message.frameInfo.isMainFrame,
                  origin.protocol == "https", origin.host == CeremonyLink.host, origin.port == 0,
                  let event = CeremonyEvent(messageBody: message.body)
            else { return }
            end(with: event)
        }

        /// Reports the first event only.
        private func end(with event: CeremonyEvent) {
            guard !ended else { return }
            ended = true
            onEvent(event)
        }
    }
}

/// Forwards script messages to a handler it doesn't retain.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var handler: (any WKScriptMessageHandler)?

    init(_ handler: any WKScriptMessageHandler) {
        self.handler = handler
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        handler?.userContentController(controller, didReceive: message)
    }
}
