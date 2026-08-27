import Foundation

let data = FileHandle.standardInput.readDataToEndOfFile()
if data.isEmpty { exit(2) }

func emit(_ value: String) {
  let cleaned = value.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !cleaned.isEmpty else { exit(1) }
  FileHandle.standardOutput.write(Data(cleaned.utf8))
  exit(0)
}

if let keyed = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSAttributedString.self, from: data) {
  emit(keyed.string)
}

if let keyedString = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSString.self, from: data) as String? {
  emit(keyedString)
}

if let unarchived = NSUnarchiver.unarchiveObject(with: data) as? NSAttributedString {
  emit(unarchived.string)
}

if let unarchived = NSUnarchiver.unarchiveObject(with: data) as? String {
  emit(unarchived)
}

exit(1)
