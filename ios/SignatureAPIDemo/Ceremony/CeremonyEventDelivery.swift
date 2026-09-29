import Foundation

/// How the ceremony reports its ending to the app: the `event_delivery` parameter.
///
/// - `redirect` (the default and the recommendation): a `signatureapi-message://`
///   navigation that `decidePolicyFor` intercepts.
/// - `message`: a `postMessage` to the page's own window, forwarded to native
///   code by a document-start script. Opt in with the `CEREMONY_EVENT_DELIVERY`
///   launch environment variable (used by the UI tests).
enum CeremonyEventDelivery: String, Sendable {
    case redirect
    case message

    /// `redirect`, unless the `CEREMONY_EVENT_DELIVERY` launch environment
    /// variable selects `message`. Any other value keeps the default.
    static func configured(environment: [String: String] = ProcessInfo.processInfo.environment) -> CeremonyEventDelivery {
        environment["CEREMONY_EVENT_DELIVERY"].flatMap(CeremonyEventDelivery.init(rawValue:)) ?? .redirect
    }
}
