import SwiftUI

/// Screen 1: one button that creates a sample envelope and opens it for signing.
struct StartView: View {
    let flow: SigningFlow

    private var isPreparing: Bool { flow.phase == .preparing }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Spacer()
            Text("Sign a sample document")
                .font(.brand(32))
                .foregroundStyle(Theme.text)
                .accessibilityAddTraits(.isHeader)
            Text("Creates a test envelope with SignatureAPI and opens it for signing inside the app.")
                .font(.inter(16))
                .foregroundStyle(Theme.textSecondary)
            DocumentCard()
            Spacer()

            if let error = flow.startError {
                Text(error)
                    .font(.inter(14))
                    .foregroundStyle(Theme.danger)
                    .accessibilityIdentifier("start-error")
            }
            Button {
                Task { await flow.start() }
            } label: {
                HStack(spacing: 10) {
                    if isPreparing { ProgressView().tint(.white) }
                    Text(isPreparing ? "Preparing document…" : flow.startError == nil ? "Sign document" : "Try again")
                }
            }
            .buttonStyle(.primary)
            .disabled(isPreparing)
            .accessibilityIdentifier("sign-document")

            Text("Powered by SignatureAPI")
                .font(.inter(12, relativeTo: .caption))
                .foregroundStyle(Theme.textQuaternary)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }
}

private struct DocumentCard: View {
    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                ForEach(0..<4, id: \.self) { _ in Capsule().fill(Theme.hover).frame(height: 3) }
                Capsule().fill(Theme.accent.opacity(0.5)).frame(width: 22, height: 3)
            }
            .padding(8)
            .frame(width: 44, height: 56, alignment: .top)
            .background(.white, in: RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.border))
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text("Sample agreement").font(.inter(16, weight: .semibold)).foregroundStyle(Theme.text)
                Text("1 page · test mode, not legally binding").font(.inter(13, relativeTo: .footnote)).foregroundStyle(Theme.textTertiary)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border))
        .accessibilityElement(children: .combine)
    }
}
