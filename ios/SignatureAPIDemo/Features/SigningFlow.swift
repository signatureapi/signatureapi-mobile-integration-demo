import Foundation
import Observation

/// The whole demo: create a sample envelope, sign it, report how it ended.
@Observable
final class SigningFlow {
    enum Phase: Equatable {
        case ready
        case preparing
        case signing(Ceremony)
        case confirming
        case finished(Ending)
    }

    struct Ceremony: Identifiable, Equatable {
        let id = UUID()
        let envelopeId: String
        let url: URL
    }

    enum Ending: Equatable {
        case signed
        case canceled
        case couldNotOpen(String)
        case notConfirmed(String)
    }

    private(set) var phase = Phase.ready
    /// Why the last attempt to create an envelope failed, shown on the start screen.
    private(set) var startError: String?

    private let makeClient: () throws -> DemoServerClient

    init(makeClient: @escaping () throws -> DemoServerClient = { try DemoServerClient.configured() }) {
        self.makeClient = makeClient
    }

    var ceremony: Ceremony? {
        if case .signing(let ceremony) = phase { ceremony } else { nil }
    }

    func start() async {
        guard phase != .preparing else { return }
        startError = nil
        phase = .preparing
        do {
            let started = try await makeClient().startCeremony(language: Self.ceremonyLanguage)
            phase = .signing(Ceremony(envelopeId: started.envelopeId, url: started.ceremonyUrl))
        } catch {
            startError = error.localizedDescription
            phase = .ready
        }
    }

    func ceremonyEnded(with event: CeremonyEvent, envelopeId: String) async {
        if event.isCompleted {
            phase = .confirming
            phase = .finished(await confirmSignature(envelopeId: envelopeId))
        } else if event.isCanceled {
            phase = .finished(.canceled)
        } else {
            phase = .finished(.couldNotOpen(Self.explanation(for: event)))
        }
    }

    /// The signer left through the app's own Close button.
    func closeCeremony() {
        phase = .finished(.canceled)
    }

    func backToStart() {
        phase = .ready
    }

    /// `ceremony.completed` is a UI signal. The envelope on the server is the
    /// proof, and its status can take a moment to catch up.
    private func confirmSignature(envelopeId: String) async -> Ending {
        do {
            let client = try makeClient()
            for _ in 0..<12 {
                if try await client.envelope(envelopeId).signerCompleted { return .signed }
                try await Task.sleep(for: .seconds(1.5))
            }
            return .notConfirmed("SignatureAPI hasn’t confirmed the signature yet. It usually takes a few seconds.")
        } catch {
            return .notConfirmed(error.localizedDescription)
        }
    }

    private static func explanation(for event: CeremonyEvent) -> String {
        switch event.errorType {
        case "unauthorized": "This signing link is no longer valid. Start again to get a new one."
        case "already_completed": "This document has already been signed."
        case "not_available": "This document is no longer available for signing."
        default: "The signing session couldn’t be completed. Start again to get a new link."
        }
    }

    /// The device language when SignatureAPI supports it, English otherwise.
    static var ceremonyLanguage: String {
        let supported: Set = ["en", "es", "fr", "it", "pt", "de", "zh", "hu", "nl"]
        let code = Locale.current.language.languageCode?.identifier ?? "en"
        return supported.contains(code) ? code : "en"
    }
}
