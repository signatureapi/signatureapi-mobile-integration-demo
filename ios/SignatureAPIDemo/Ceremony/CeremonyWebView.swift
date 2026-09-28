import SwiftUI
import WebKit

/// Shows a SignatureAPI ceremony as the WKWebView's page and reports how it ended.
///
/// The ceremony signals its end by navigating to `signatureapi-message://…`.
/// `decidePolicyFor` sees that navigation first, cancels it, and hands the event
/// to the app. The ceremony needs no cookies or web storage, so the default
/// WKWebView configuration works as is.
struct CeremonyWebView: UIViewRepresentable {
    let ceremonyURL: URL
    let onEvent: (CeremonyEvent) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onEvent: onEvent)
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        #if DEBUG
        webView.isInspectable = true
        #endif
        context.coordinator.url = CeremonyLink.embedded(ceremonyURL)
        webView.load(URLRequest(url: context.coordinator.url!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.stopLoading()
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
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
                guard !ended else { return }
                ended = true
                onEvent(event)
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
    }
}
