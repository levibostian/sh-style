#!/usr/bin/env -S deno run --allow-all
// Test script for Deno library - generates the same output as expected-output.txt

import {
  title,
  note,
  phase,
  why,
  kv,
  step,
  cmd,
  ok,
  plan,
  list,
  warn,
  error,
  done,
} from "../../deno/mod.ts";

// Run all commands in sequence to generate the expected output
title("RELEASE PIPELINE — payments-api — nightly with extended validation steps");
note("Build the service, run tests, and publish artifacts for deployment while preserving exact spacing  and avoiding     truncation.");
phase("Setup");
why("Ensure deterministic tooling across runners and capture enough context for reproducible failures.");
kv("ENV", [["node", "20.11.1"], ["pnpm", "9.1.0"], ["os", "ubuntu-22.04"]]);
step("Enable toolchain");
cmd("corepack enable");
cmd("node --version");
cmd("pnpm --version");
ok("toolchain ready");
step("Install dependencies");
cmd("pnpm install --frozen-lockfile");
ok("dependencies installed");
phase("Build and package the service for production deployment including generation of integrity metadata");
plan("Produce production-ready output in dist/ and record artifact paths for later pipeline steps.");
step("Compile TypeScript and bundle server for distribution");
cmd("pnpm run build && pnpm run bundle -- --target=node20 --sourcemap --outdir=dist --minify=false");
ok("build finished in 18s");
list("ARTIFACTS", [
  "dist/server.js",
  "dist/server.js.map",
  "dist/some/really/long/path/that/wraps/because/it/exceeds/width/and continues here/with  double  spaces",
]);
phase("Test");
step("Integration tests");
cmd("pnpm run test:integration");
warn("integration tests skipped because environment is not configured for network access and the summary must wrap cleanly", [
  "detail: INTEGRATION=0",
  "detail: network access disabled in CI for forks, see policy at https://example.com/ci/policies/network-access which is a very long line that must wrap but preserve all characters",
]);
phase("Deploy (dry run)");
note("Validate deploy commands without publishing changes.");
step("Validate deploy script");
cmd("./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping");
error([
  "deploy validation failed because the environment variable DEPLOY_TOKEN was not set and the explanation must remain fully visible",
  "command: ./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping",
  "code: 2",
  "hint: export DEPLOY_TOKEN then rerun the pipeline; do not paste secrets into logs",
]);
kv("SUMMARY", [["status", "failed"], ["failed_phase", "Deploy (dry run)"], ["duration", "1m21s"], ["artifacts", "3"]]);
done("RELEASE PIPELINE — payments-api");
