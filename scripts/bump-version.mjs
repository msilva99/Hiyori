#!/usr/bin/env node
// Bumps the app version everywhere it needs to live before a release tag:
// package.json + package-lock.json (via `npm version`) and src-tauri/tauri.conf.json,
// which is the one release.yml and the in-app updater actually read.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
   console.error("Usage: node scripts/bump-version.mjs <version>   (e.g. 1.0.3)");
   process.exit(1);
}

// A validated \d+.\d+.\d+ string is safe to interpolate into a shell command - execSync's
// single-string form is used (rather than execFileSync) because on Windows, npm resolves to
// npm.cmd, which needs a real shell to invoke and fails with EINVAL otherwise.
execSync(`npm version ${version} --no-git-tag-version --allow-same-version`, { stdio: "inherit" });

// A targeted string replace (not JSON.parse/stringify) so this only ever touches the
// version line - re-serializing the whole file reformats untouched arrays/whitespace too.
const tauriConfPath = "src-tauri/tauri.conf.json";
const tauriConf = readFileSync(tauriConfPath, "utf8");
const versionLine = /^(\s*"version":\s*")[^"]*(",?)$/m;
if (!versionLine.test(tauriConf)) {
   console.error(`Couldn't find a "version" field in ${tauriConfPath} - update it manually.`);
   process.exit(1);
}
writeFileSync(tauriConfPath, tauriConf.replace(versionLine, `$1${version}$2`));

console.log(`\nBumped to ${version} in package.json, package-lock.json, and ${tauriConfPath}.`);
console.log("Review the diff, then commit/tag/push as usual.");
