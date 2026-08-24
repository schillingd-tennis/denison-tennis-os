import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  applyLaunchAgentTemplate,
  renderLaunchAgentPlist,
  LaunchAgentPathError,
  LAUNCH_AGENT_LABEL,
  LAUNCH_AGENT_POLL_SECONDS,
  LAUNCH_AGENT_HOUR,
  LAUNCH_AGENT_MINUTE,
} from "./launchAgent";

const REPO_ROOT = join(import.meta.dirname, "../../../..");
const TEMPLATE_PATH = join(
  REPO_ROOT,
  "macos/com.denison.tennis-os.apple-messages-sync.plist.template",
);
const INSTALLER_PATH = join(REPO_ROOT, "macos/install-apple-messages-helper.sh");

function thisMacPaths() {
  const home = homedir();
  return {
    nodeBin: process.execPath,
    helperJs: join(
      REPO_ROOT,
      "helpers/apple-messages-sync/appleMessagesSync/helperMain.js",
    ),
    appSupport: join(home, "Library/Application Support/DenisonTennisOS"),
    logOut: join(home, "Library/Logs/apple-messages-sync.out.log"),
    logErr: join(home, "Library/Logs/apple-messages-sync.err.log"),
  };
}

function assertBalancedXmlTags(xml: string) {
  for (const tag of ["plist", "dict", "array", "string", "integer", "key"] as const) {
    const open = [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g"))].length;
    const close = [...xml.matchAll(new RegExp(`</${tag}>`, "g"))].length;
    assert.equal(open, close, `<${tag}> opens ${open} times but closes ${close} times`);
  }
  assert.doesNotMatch(xml, /<integer>[^<]*<\/(?!integer>)/);
  assert.doesNotMatch(xml, /<integer>23<\/key>/);
  assert.match(xml, /<key>Hour<\/key>\s*<integer>23<\/integer>/);
  assert.match(xml, /<key>Minute<\/key>\s*<integer>0<\/integer>/);
  assert.match(xml, /<key>StartInterval<\/key>\s*<integer>300<\/integer>/);
  assert.match(xml, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(xml, /<string>--tick<\/string>/);
  assert.doesNotMatch(xml, /\bnpx\b/);
}

function lintPlist(xml: string, filename: string) {
  const dir = mkdtempSync(join(tmpdir(), "apple-messages-plist-"));
  const path = join(dir, filename);
  writeFileSync(path, xml);
  const linted = spawnSync("/usr/bin/plutil", ["-lint", path], { encoding: "utf8" });
  assert.equal(linted.status, 0, linted.stdout + linted.stderr);
  assert.match(linted.stdout, /OK/);
}

test("LaunchAgent plist uses only absolute paths, polls every five minutes, and never calls npx", () => {
  const plist = renderLaunchAgentPlist({
    nodeBin: "/usr/local/bin/node",
    helperJs: "/Users/david/helpers/apple-messages-sync/appleMessagesSync/helperMain.js",
    appSupport: "/Users/david/Library/Application Support/DenisonTennisOS",
    logOut: "/Users/david/Library/Logs/apple-messages-sync.out.log",
    logErr: "/Users/david/Library/Logs/apple-messages-sync.err.log",
  });
  assert.match(plist, /<string>com.denison.tennis-os.apple-messages-sync<\/string>/);
  assert.equal(LAUNCH_AGENT_LABEL, "com.denison.tennis-os.apple-messages-sync");
  assert.equal(LAUNCH_AGENT_POLL_SECONDS, 300);
  assert.equal(LAUNCH_AGENT_HOUR, 23);
  assert.equal(LAUNCH_AGENT_MINUTE, 0);
  assertBalancedXmlTags(plist);
  assert.throws(
    () =>
      renderLaunchAgentPlist({
        nodeBin: "node",
        helperJs: "/tmp/helper.js",
        appSupport: "/tmp/app",
        logOut: "/tmp/out.log",
        logErr: "/tmp/err.log",
      }),
    (error: unknown) => error instanceof LaunchAgentPathError,
  );
});

test("template and renderer emit valid Hour/Minute/StartInterval closing tags for this Mac", () => {
  const paths = thisMacPaths();
  assert.ok(paths.nodeBin.startsWith("/"));
  assert.ok(paths.appSupport.includes("Application Support"));
  assert.ok(paths.helperJs.startsWith("/"));

  const rendered = renderLaunchAgentPlist(paths);
  assertBalancedXmlTags(rendered);
  lintPlist(rendered, "rendered.plist");
  assert.match(rendered, new RegExp(`<string>${paths.nodeBin.replace(/\//g, "\\/")}<\\/string>`));
  assert.match(rendered, new RegExp(`<string>${paths.appSupport.replace(/\//g, "\\/")}<\\/string>`));

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const fromTemplate = applyLaunchAgentTemplate(template, {
    NODE_BIN: paths.nodeBin,
    HELPER_JS: paths.helperJs,
    APP_SUPPORT: paths.appSupport,
    LOG_OUT: paths.logOut,
    LOG_ERR: paths.logErr,
  });
  assertBalancedXmlTags(fromTemplate);
  lintPlist(fromTemplate, "template.plist");
  assert.equal(fromTemplate.includes("__"), false);
});

test("installer substitution writes a plutil-valid plist without loading LaunchAgent", () => {
  const dir = mkdtempSync(join(tmpdir(), "apple-messages-install-"));
  const plistPath = join(dir, "com.denison.tennis-os.apple-messages-sync.plist");
  const result = spawnSync("bash", [INSTALLER_PATH], {
    encoding: "utf8",
    env: {
      ...process.env,
      APPLE_MESSAGES_PLIST: plistPath,
      APPLE_MESSAGES_SKIP_LAUNCHCTL: "1",
    },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const xml = readFileSync(plistPath, "utf8");
  assertBalancedXmlTags(xml);
  lintPlist(xml, "installer.plist");
  assert.match(xml, /<string>--tick<\/string>/);
  assert.match(xml, /<integer>300<\/integer>/);
});
