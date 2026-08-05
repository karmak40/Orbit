#!/usr/bin/env node
// Wraps `eas build --local`, routing the artifact into
// builds/<platform>/<profile>/ instead of the project root.
// `--output` is a CLI-only flag on eas-cli — eas.json has no field for it —
// so the destination has to be computed here rather than configured there.
const { spawnSync } = require('node:child_process');
const { mkdirSync, existsSync } = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { platform: null, profile: null, extra: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--platform' || arg === '-p') && argv[i + 1]) {
      args.platform = argv[++i];
    } else if ((arg === '--profile' || arg === '-e') && argv[i + 1]) {
      args.profile = argv[++i];
    } else {
      args.extra.push(arg);
    }
  }
  return args;
}

function readProfile(profileName) {
  const easConfig = require(path.join(process.cwd(), 'eas.json'));
  const profile = easConfig.build?.[profileName];
  if (!profile) {
    throw new Error(`No "${profileName}" build profile found in eas.json`);
  }
  return profile;
}

function androidExtension(profile) {
  // EAS builds an AAB for store distribution, an APK for internal/anything else.
  return profile.distribution === 'internal' ? 'apk' : 'aab';
}

const { platform, profile: profileArg, extra } = parseArgs(process.argv.slice(2));
const profileName = profileArg || 'production';

if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: node scripts/eas-build-local.js --platform <android|ios> [--profile <name>] [-- extra eas args]');
  process.exit(1);
}

const profile = readProfile(profileName);
const extension = platform === 'android' ? androidExtension(profile) : 'ipa';

const outDir = path.join(process.cwd(), 'builds', platform, profileName);
mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(outDir, `${platform}-${profileName}-${timestamp}.${extension}`);

const easArgs = [
  'eas', 'build',
  '--platform', platform,
  '--profile', profileName,
  '--local',
  '--non-interactive',
  '--output', outputPath,
  ...extra,
];

console.log(`Building ${platform}/${profileName} -> ${path.relative(process.cwd(), outputPath)}`);

const result = spawnSync('npx', easArgs, { stdio: 'inherit' });
process.exit(result.status ?? 1);
