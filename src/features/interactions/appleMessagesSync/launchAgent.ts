export const LAUNCH_AGENT_LABEL = "com.denison.tennis-os.apple-messages-sync";
export const LAUNCH_AGENT_POLL_SECONDS = 300;
export const LAUNCH_AGENT_HOUR = 23;
export const LAUNCH_AGENT_MINUTE = 0;

export type LaunchAgentPaths = {
  nodeBin: string;
  helperJs: string;
  appSupport: string;
  logOut: string;
  logErr: string;
};

export class LaunchAgentPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaunchAgentPathError";
  }
}

export function assertAbsolutePath(name: string, value: string): void {
  if (!value.startsWith("/") || value.includes("://")) {
    throw new LaunchAgentPathError(`${name} must be an absolute filesystem path.`);
  }
  if (/\bnpx\b/.test(value)) {
    throw new LaunchAgentPathError("LaunchAgent paths must not use npx.");
  }
}

export function renderLaunchAgentPlist(paths: LaunchAgentPaths): string {
  for (const [name, value] of Object.entries(paths)) {
    assertAbsolutePath(name, value);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${paths.nodeBin}</string>
    <string>${paths.helperJs}</string>
    <string>--tick</string>
    <string>--home</string>
    <string>${paths.appSupport}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${paths.appSupport}</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${LAUNCH_AGENT_HOUR}</integer>
    <key>Minute</key>
    <integer>${LAUNCH_AGENT_MINUTE}</integer>
  </dict>
  <key>StartInterval</key>
  <integer>${LAUNCH_AGENT_POLL_SECONDS}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${paths.logOut}</string>
  <key>StandardErrorPath</key>
  <string>${paths.logErr}</string>
</dict>
</plist>
`;
}
