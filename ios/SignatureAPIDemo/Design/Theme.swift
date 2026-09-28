import SwiftUI

/// signatureapi.com design tokens (website: src/styles/global.css and the Framer tokens).
enum Theme {
    static let text = Color(hex: 0x18181B)
    static let textSecondary = Color(hex: 0x3F3F46)
    static let textTertiary = Color(hex: 0x686870)
    static let textQuaternary = Color(hex: 0xA1A1AA)
    static let border = Color(hex: 0xE0E3E9)
    static let background = Color(hex: 0xF9F9F9)
    static let card = Color.white
    static let hover = Color(hex: 0xF4F4F5)
    static let accent = Color(hex: 0x2563EB)
    static let accentSoft = Color(hex: 0xEEF3FE)
    static let success = Color(hex: 0x15803D)
    static let successSoft = Color(hex: 0xECFDF3)
    static let danger = Color(hex: 0xB91C1C)
    static let dangerSoft = Color(hex: 0xFEF2F2)
    static let warning = Color(hex: 0xB45309)
    static let warningSoft = Color(hex: 0xFFFBEB)

    static let radius: CGFloat = 10
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension Font {
    /// SignatureAPI's display face, for titles only.
    static func brand(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
        .custom("SignatureAPITitle-Medium", size: size, relativeTo: style)
    }

    /// Inter, scaled with Dynamic Type through `relativeTo`.
    static func inter(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name = switch weight {
        case .medium: "Inter-Medium"
        case .semibold, .bold, .heavy, .black: "Inter-SemiBold"
        default: "Inter-Regular"
        }
        return .custom(name, size: size, relativeTo: style)
    }
}

extension UIFont {
    static func brand(_ size: CGFloat) -> UIFont {
        UIFont(name: "SignatureAPITitle-Medium", size: size) ?? .systemFont(ofSize: size, weight: .medium)
    }

    static func inter(_ size: CGFloat, semibold: Bool = false) -> UIFont {
        UIFont(name: semibold ? "Inter-SemiBold" : "Inter-Regular", size: size) ?? .systemFont(ofSize: size, weight: semibold ? .semibold : .regular)
    }
}

enum Appearance {
    /// Navigation bars in the brand face; SwiftUI has no per-bar font API.
    static func apply() {
        let bar = UINavigationBarAppearance()
        bar.configureWithOpaqueBackground()
        bar.backgroundColor = UIColor(Theme.background)
        bar.shadowColor = .clear
        bar.largeTitleTextAttributes = [.font: UIFont.brand(32), .foregroundColor: UIColor(Theme.text)]
        bar.titleTextAttributes = [.font: UIFont.inter(16, semibold: true), .foregroundColor: UIColor(Theme.text)]
        UINavigationBar.appearance().standardAppearance = bar
        UINavigationBar.appearance().scrollEdgeAppearance = bar
        UINavigationBar.appearance().compactAppearance = bar
        UINavigationBar.appearance().tintColor = UIColor(Theme.accent)
    }
}
