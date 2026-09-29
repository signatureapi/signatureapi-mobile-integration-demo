import Foundation

/// Turns the ceremony URL from the server into the URL the WebView loads.
enum CeremonyLink {
    static let host = "sign.signatureapi.com"

    /// `embedded=true` adapts the ceremony UI; `event_delivery` picks how it
    /// reports its ending (see ``CeremonyEventDelivery``).
    static func embedded(_ ceremonyURL: URL, delivery: CeremonyEventDelivery = .redirect) -> URL {
        guard var components = URLComponents(url: ceremonyURL, resolvingAgainstBaseURL: false) else { return ceremonyURL }
        var items = (components.queryItems ?? []).filter { $0.name != "embedded" && $0.name != "event_delivery" }
        items.append(URLQueryItem(name: "embedded", value: "true"))
        items.append(URLQueryItem(name: "event_delivery", value: delivery.rawValue))
        components.queryItems = items
        return components.url ?? ceremonyURL
    }
}
