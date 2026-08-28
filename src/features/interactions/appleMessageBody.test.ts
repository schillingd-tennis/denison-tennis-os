import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeAttributedBody,
  extractAppleMessageBody,
  messageBody,
} from "./appleMessageBody";
import {
  containsSerializationMarkers,
  isCorruptedNotes,
  isReadableAppleMessageBody,
} from "./appleMessageNotes";
import { directionFromApple, parseAppleMessage } from "./appleMessages";

function attributedWithMessage(message: string): Buffer {
  return Buffer.concat([
    Buffer.from("streamtypedNSAttributedStringNSObjectNSString", "utf8"),
    Buffer.from([0x01, 0x2b]),
    Buffer.from(message, "utf8"),
  ]);
}

test("1 normal message.text is stored as readable body", () => {
  const result = extractAppleMessageBody({ text: "On my way to campus" });
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.source, "text");
    assert.equal(result.body, "On my way to campus");
  }
});

test("2 empty text plus valid archived attributed body decodes to readable text", () => {
  const body = attributedWithMessage("See you Friday");
  const result = extractAppleMessageBody({ text: "", attributedBody: body });
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.source, "attributed_body");
    assert.equal(result.body, "See you Friday");
  }
});

test("3 incoming and outgoing messages keep direction separate from notes", () => {
  const inbound = parseAppleMessage({
    guid: "g-in",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "Coach, I can visit next week.",
    associatedMessageType: 0,
  });
  const outbound = parseAppleMessage({
    guid: "g-out",
    chatIdentifier: "+19735550101",
    isFromMe: 1,
    date: 0,
    text: "Great — let's plan it.",
    associatedMessageType: 0,
  });
  assert.ok(inbound);
  assert.ok(outbound);
  assert.equal(inbound.direction, "inbound");
  assert.equal(outbound.direction, "outbound");
  assert.equal(inbound.notes, "Coach, I can visit next week.");
  assert.equal(outbound.notes, "Great — let's plan it.");
  assert.notEqual(inbound.notes, inbound.direction);
  assert.notEqual(outbound.notes, outbound.direction);
  assert.equal(directionFromApple(0), "inbound");
  assert.equal(directionFromApple(1), "outbound");
});

test("4 emoji and smart punctuation survive decoding", () => {
  const message = "Café 🎾 — sounds good!";
  const result = extractAppleMessageBody({
    text: "",
    attributedBody: attributedWithMessage(message),
  });
  assert.equal(result.status, "ok");
  if (result.status === "ok") assert.equal(result.body, message);
});

test("5 multiline content survives decoding", () => {
  const message = "Line one\nLine two";
  const result = extractAppleMessageBody({
    text: "",
    attributedBody: attributedWithMessage(message),
  });
  assert.equal(result.status, "ok");
  if (result.status === "ok") assert.equal(result.body, message);
});

test("6 corrupt archive data returns decode_failed", () => {
  const result = extractAppleMessageBody({
    text: "",
    attributedBody: Buffer.from("not-an-archive", "utf8"),
  });
  assert.equal(result.status, "decode_failed");
  assert.equal(decodeAttributedBody(Buffer.from("not-an-archive", "utf8")), null);
});

test("7 archive metadata followed by readable text yields only the message", () => {
  const result = extractAppleMessageBody({
    text: "",
    attributedBody: attributedWithMessage("Hello coach!"),
  });
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.body, "Hello coach!");
    assert.doesNotMatch(result.body, /NSAttributedString|NSObject|NSString|NSDictionary/);
  }
});

test("8 literal inbound or outbound text placeholder is decode_failed, not notes", () => {
  assert.equal(extractAppleMessageBody({ text: "inbound" }).status, "decode_failed");
  assert.equal(extractAppleMessageBody({ text: "outbound" }).status, "decode_failed");
  assert.equal(parseAppleMessage({
    guid: "g-dir",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "inbound",
    attributedBody: null,
    associatedMessageType: 0,
  }), null);
});

test("9 no decoded result is decode_failed when attributed body exists", () => {
  const result = extractAppleMessageBody({
    text: "",
    attributedBody: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
  });
  assert.equal(result.status, "decode_failed");
});

test("10 corrupted serialized text in message.text is rejected in favor of attributed body", () => {
  const corruptedText = `\uFFFD\uFFFD\uFFFDNSAttributedString\uFFFDNSObject\uFFFDNSString`;
  const result = extractAppleMessageBody({
    text: corruptedText,
    attributedBody: attributedWithMessage("Actual recruit text"),
  });
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.body, "Actual recruit text");
    assert.equal(result.source, "attributed_body");
  }
  assert.equal(isReadableAppleMessageBody(corruptedText), false);
  assert.equal(isCorruptedNotes(corruptedText), true);
  assert.equal(containsSerializationMarkers(corruptedText), true);
  assert.equal(messageBody(corruptedText, attributedWithMessage("Actual recruit text")), "Actual recruit text");
});

test("serialization markers and replacement characters fail readability checks", () => {
  assert.equal(isReadableAppleMessageBody("NSAttributedString"), false);
  assert.equal(isReadableAppleMessageBody("Hello there"), true);
  assert.equal(isCorruptedNotes("Hello there"), false);
  assert.equal(isCorruptedNotes("\uFFFENSAttributedString junk"), true);
});
