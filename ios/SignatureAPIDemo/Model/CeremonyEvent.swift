import Foundation

/// A terminal event from an embedded ceremony.
///
/// With `event_delivery=redirect` the ceremony reports how it ended by
/// navigating to `signatureapi-message://<type>/?error_type=…&error_message=…`.
/// Branch on `type` and `errorType` only: `errorMessage` is user-facing copy.
struct CeremonyEvent: Equatable, Sendable {
    static let scheme = "signatureapi-message"

    let type: String
    let errorType: String?
    let errorMessage: String?

    var isCompleted: Bool { type == "ceremony.completed" }
    var isCanceled: Bool { type == "ceremony.canceled" }

    init?(url: URL) {
        guard url.scheme == Self.scheme, let host = url.host(), !host.isEmpty,
              var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        else { return nil }
        // The query is form-encoded: "+" means a space.
        components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%20")
        let items = components.queryItems ?? []
        type = host
        errorType = items.first { $0.name == "error_type" }?.value
        errorMessage = items.first { $0.name == "error_message" }?.value
    }
}
