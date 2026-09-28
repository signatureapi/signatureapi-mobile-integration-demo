import Foundation

/// Client for the demo server (../server). The app never calls SignatureAPI
/// directly: an API key in an app bundle is a leaked API key.
struct DemoServerClient: Sendable {
    let baseURL: URL
    var session: URLSession = .shared

    struct StartedCeremony: Decodable, Sendable {
        let envelopeId: String
        let ceremonyUrl: URL
    }

    struct EnvelopeSummary: Decodable, Sendable {
        struct Recipient: Decodable, Sendable {
            let key: String
            let status: String
        }

        let status: String
        let recipients: [Recipient]

        var signerCompleted: Bool { recipients.contains { $0.key == "signer" && $0.status == "completed" } }
    }

    /// The server address from the build (Info.plist `DemoServerURL`), unless
    /// the `DEMO_SERVER_URL` launch environment variable overrides it.
    static func configured(bundle: Bundle = .main, environment: [String: String] = ProcessInfo.processInfo.environment) throws -> DemoServerClient {
        let value = environment["DEMO_SERVER_URL"] ?? bundle.object(forInfoDictionaryKey: "DemoServerURL") as? String ?? ""
        guard let url = URL(string: value), url.scheme != nil, url.host() != nil else {
            throw DemoServerError.notConfigured(value)
        }
        return DemoServerClient(baseURL: url)
    }

    /// Creates the sample envelope and returns the signer's ceremony URL.
    func startCeremony(language: String) async throws -> StartedCeremony {
        struct Body: Encodable { let name = "Demo Signer"; let language: String }
        // Includes waiting for SignatureAPI to process the envelope.
        return try await send("POST", "ceremonies", body: Body(language: language), timeout: 60)
    }

    func envelope(_ envelopeId: String) async throws -> EnvelopeSummary {
        try await send("GET", "envelopes/\(envelopeId)")
    }

    private func send<Response: Decodable>(
        _ method: String,
        _ path: String,
        body: (some Encodable)? = String?.none,
        timeout: TimeInterval = 20
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path), timeoutInterval: timeout)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw DemoServerError.unreachable(baseURL)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw DemoServerError.http(status: status, message: message ?? HTTPURLResponse.localizedString(forStatusCode: status))
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }

    private struct ErrorBody: Decodable { let error: String }
}

enum DemoServerError: LocalizedError {
    case notConfigured(String)
    case unreachable(URL)
    case http(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .notConfigured(let value): "The demo server address “\(value)” is not valid. Set DEMO_SERVER_URL in the Xcode build settings."
        case .unreachable(let url): "Couldn’t reach the demo server at \(url.absoluteString). Check that it is running and that this device can reach it."
        case .http(let status, let message): "The demo server returned \(status): \(message)"
        }
    }
}
