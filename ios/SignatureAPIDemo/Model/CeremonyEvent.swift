import Foundation

/// A terminal event from an embedded ceremony.
///
/// With `event_delivery=redirect` the ceremony reports how it ended by
/// navigating to `signatureapi-message://<type>/?error_type=…&error_message=…`.
/// With `event_delivery=message` it posts `{ type, error_type?, error_message? }`,
/// which the top-level message bridge forwards (see ``CeremonyWebView``).
/// Branch on `type` and `errorType` only: `errorMessage` is user-facing copy.
struct CeremonyEvent: Equatable, Sendable {
    static let scheme = "signatureapi-message"

    /// The events the ceremony emits.
    static let terminalTypes: Set = ["ceremony.completed", "ceremony.canceled", "ceremony.failed"]

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

    /// Parses the body the top-level message bridge posts: the JSON string
    /// `{"kind":"event","payload":{"type":…,"error_type":…,"error_message":…}}`.
    ///
    /// Returns nil for `"kind":"rejected"` (a message that failed the origin or
    /// source check) and for any payload that is not one of the three terminal
    /// events: a top-level page can also receive unrelated messages from itself.
    init?(messageBody: Any) {
        guard let json = messageBody as? String,
              let message = try? JSONDecoder().decode(BridgeMessage.self, from: Data(json.utf8)),
              message.kind == "event", Self.terminalTypes.contains(message.payload.type)
        else { return nil }
        type = message.payload.type
        errorType = message.payload.errorType
        errorMessage = message.payload.errorMessage
    }

    private struct BridgeMessage: Decodable {
        struct Payload: Decodable {
            let type: String
            let errorType: String?
            let errorMessage: String?

            enum CodingKeys: String, CodingKey {
                case type
                case errorType = "error_type"
                case errorMessage = "error_message"
            }
        }

        let kind: String
        let payload: Payload
    }
}
