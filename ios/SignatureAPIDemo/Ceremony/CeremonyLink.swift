import Foundation

/// Turns the ceremony URL from the server into the URL the WebView loads.
enum CeremonyLink {
    /// `embedded=true` adapts the ceremony UI; `event_delivery=redirect` makes it
    /// report its ending as a `signatureapi-message://` navigation.
    static func embedded(_ ceremonyURL: URL) -> URL {
        guard var components = URLComponents(url: ceremonyURL, resolvingAgainstBaseURL: false) else { return ceremonyURL }
        var items = (components.queryItems ?? []).filter { $0.name != "embedded" && $0.name != "event_delivery" }
        items.append(URLQueryItem(name: "embedded", value: "true"))
        items.append(URLQueryItem(name: "event_delivery", value: "redirect"))
        components.queryItems = items
        return components.url ?? ceremonyURL
    }
}
