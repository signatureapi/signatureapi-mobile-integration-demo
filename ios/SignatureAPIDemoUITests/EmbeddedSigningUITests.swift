import XCTest

/// End-to-end: the real app, a real WKWebView and a real test-mode ceremony.
///
/// Needs the demo server running (cd server && npm run dev). If it is not on
/// http://localhost:3000, pass its address to the test runner:
///   TEST_RUNNER_DEMO_SERVER_URL=http://localhost:3100 xcodebuild test …
final class EmbeddedSigningUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// The app must intercept signatureapi-message://ceremony.completed and then
    /// show "Document signed" only after the server confirms it.
    @MainActor func testSigningTheSampleDocument() throws {
        let app = launch()
        let web = try openCeremony(in: app)

        try signAndFinish(in: web)

        expectResult("Document signed", in: app, timeout: 45)
        holdForRecording()
    }

    /// Cancelling inside the ceremony emits ceremony.canceled, which must reach the app.
    @MainActor func testCancellingInsideTheCeremony() throws {
        let app = launch()
        let web = try openCeremony(in: app)

        cancelInsideTheCeremony(in: web)

        expectResult("Signing canceled", in: app, timeout: 30)
    }

    // MARK: event_delivery=message

    /// Same flow with the opt-in message delivery: the ceremony posts
    /// ceremony.completed to its own window and the bridge script forwards it.
    @MainActor func testSigningTheSampleDocumentWithMessageDelivery() throws {
        let app = launch(eventDelivery: "message")
        let web = try openCeremony(in: app)

        try signAndFinish(in: web)

        expectResult("Document signed", in: app, timeout: 45)
        holdForRecording()
    }

    /// ceremony.canceled must reach the app through the message handler too.
    @MainActor func testCancellingInsideTheCeremonyWithMessageDelivery() throws {
        let app = launch(eventDelivery: "message")
        let web = try openCeremony(in: app)

        cancelInsideTheCeremony(in: web)

        expectResult("Signing canceled", in: app, timeout: 30)
    }

    // MARK: Helpers

    /// `eventDelivery` sets the app's `CEREMONY_EVENT_DELIVERY`. Without it the
    /// runner's own value passes through (TEST_RUNNER_CEREMONY_EVENT_DELIVERY),
    /// and without that the app uses its default, redirect.
    @MainActor private func launch(eventDelivery: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        let environment = ProcessInfo.processInfo.environment
        if let server = environment["DEMO_SERVER_URL"] {
            app.launchEnvironment["DEMO_SERVER_URL"] = server
        }
        if let delivery = eventDelivery ?? environment["CEREMONY_EVENT_DELIVERY"] {
            app.launchEnvironment["CEREMONY_EVENT_DELIVERY"] = delivery
        }
        app.launch()
        return app
    }

    @MainActor private func openCeremony(in app: XCUIApplication) throws -> XCUIElement {
        app.buttons["sign-document"].tap()
        let web = app.webViews.firstMatch
        let agree = web.buttons["Agree and Continue"]
        if !agree.waitForExistence(timeout: 60) {
            let error = app.staticTexts["start-error"]
            XCTFail(error.exists ? "Could not start: \(error.label)" : "The ceremony did not load")
        }
        return web
    }

    /// Accepts the disclosure, adopts the typed signature and taps Finish.
    @MainActor private func signAndFinish(in web: XCUIElement) throws {
        tapWhenReady(try checkbox(in: web, labelPrefix: "By checking"))
        tapWhenReady(web.buttons["Agree and Continue"])
        tapWhenReady(web.buttons["Sign here"])
        tapWhenReady(try checkbox(in: web, labelPrefix: "By selecting"))
        tapWhenReady(web.buttons["Adopt and Sign"])
        tapWhenReady(web.buttons["Finish"])
    }

    /// Cancels through the ceremony's own cancel control.
    @MainActor private func cancelInsideTheCeremony(in web: XCUIElement) {
        tapWhenReady(web.buttons["Cancel"])
        tapWhenReady(web.buttons["Yes"])
    }

    @MainActor private func expectResult(_ expected: String, in app: XCUIApplication, timeout: TimeInterval, file: StaticString = #filePath, line: UInt = #line) {
        let title = app.staticTexts["result-title"]
        XCTAssertTrue(title.wait(for: \.label, toEqual: expected, timeout: timeout), "last result title: \(title.label)", file: file, line: line)
    }

    /// Keeps the final screen up for screen recordings:
    ///   TEST_RUNNER_DEMO_RECORDING_HOLD=3 xcodebuild test …
    @MainActor private func holdForRecording() {
        if let seconds = ProcessInfo.processInfo.environment["DEMO_RECORDING_HOLD"].flatMap(Double.init) {
            Thread.sleep(forTimeInterval: seconds)
        }
    }

    /// Web content animates in; a tap before it settles is lost.
    @MainActor private func tapWhenReady(_ element: XCUIElement, timeout: TimeInterval = 20, file: StaticString = #filePath, line: UInt = #line) {
        let ready = element.waitForExistence(timeout: timeout) && element.wait(for: \.isHittable, toEqual: true, timeout: timeout)
        XCTAssertTrue(ready, "\(element) never became tappable", file: file, line: line)
        Thread.sleep(forTimeInterval: 0.4)
        element.tap()
    }

    /// Web checkboxes surface as switches or check boxes depending on the WebKit build.
    @MainActor private func checkbox(in web: XCUIElement, labelPrefix: String) throws -> XCUIElement {
        let types = [XCUIElement.ElementType.switch.rawValue, XCUIElement.ElementType.checkBox.rawValue]
        let predicate = NSPredicate(format: "elementType IN %@ AND label BEGINSWITH %@", types, labelPrefix)
        let element = web.descendants(matching: .any).matching(predicate).firstMatch
        if !element.waitForExistence(timeout: 15) {
            XCTFail("No checkbox labelled “\(labelPrefix)…”. Web content:\n\(web.debugDescription)")
        }
        return element
    }
}
