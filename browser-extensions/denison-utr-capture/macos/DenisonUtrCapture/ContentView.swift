import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Denison UTR Capture")
                .font(.title2)
                .fontWeight(.semibold)
            Text("Safari Web Extension for local Denison Tennis OS development.")
                .foregroundStyle(.secondary)
            Text("Enable the extension in Safari → Settings → Extensions, then use “Send Results to Denison OS” on an authenticated UTR Results page.")
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(minWidth: 420, minHeight: 180)
    }
}

#Preview {
    ContentView()
}
