import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Native messaging is unused in v0.1 — tennis data flows through the web extension only.
        context.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
