#!/usr/bin/env bash
# Test script for CLI - generates the same output as expected-output.txt

set -euo pipefail

# Path to the log binary (passed as argument or use default)
LOG_BIN="${1:-./log}"

# Run all commands in sequence to generate the expected output
"$LOG_BIN" title "RELEASE PIPELINE — payments-api — nightly with extended validation steps"
"$LOG_BIN" note "Build the service, run tests, and publish artifacts for deployment while preserving exact spacing  and avoiding     truncation."
"$LOG_BIN" phase "Setup"
"$LOG_BIN" why "Ensure deterministic tooling across runners and capture enough context for reproducible failures."
"$LOG_BIN" kv ENV node=20.11.1 pnpm=9.1.0 os=ubuntu-22.04
"$LOG_BIN" step "Enable toolchain"
"$LOG_BIN" cmd "corepack enable"
"$LOG_BIN" cmd "node --version"
"$LOG_BIN" cmd "pnpm --version"
"$LOG_BIN" ok "toolchain ready"
"$LOG_BIN" step "Install dependencies"
"$LOG_BIN" cmd "pnpm install --frozen-lockfile"
"$LOG_BIN" ok "dependencies installed"
"$LOG_BIN" phase "Build and package the service for production deployment including generation of integrity metadata"
"$LOG_BIN" plan "Produce production-ready output in dist/ and record artifact paths for later pipeline steps."
"$LOG_BIN" step "Compile TypeScript and bundle server for distribution"
"$LOG_BIN" cmd "pnpm run build && pnpm run bundle -- --target=node20 --sourcemap --outdir=dist --minify=false"
"$LOG_BIN" ok "build finished in 18s"
"$LOG_BIN" list ARTIFACTS "dist/server.js" "dist/server.js.map" "dist/some/really/long/path/that/wraps/because/it/exceeds/width/and continues here/with  double  spaces"
"$LOG_BIN" phase "Test"
"$LOG_BIN" step "Integration tests"
"$LOG_BIN" cmd "pnpm run test:integration"
"$LOG_BIN" warn "integration tests skipped because environment is not configured for network access and the summary must wrap cleanly" --detail "detail: INTEGRATION=0" --detail "detail: network access disabled in CI for forks, see policy at https://example.com/ci/policies/network-access which is a very long line that must wrap but preserve all characters"
"$LOG_BIN" phase "Deploy (dry run)"
"$LOG_BIN" note "Validate deploy commands without publishing changes."
"$LOG_BIN" step "Validate deploy script"
"$LOG_BIN" cmd "./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping"
"$LOG_BIN" error "deploy validation failed because the environment variable DEPLOY_TOKEN was not set and the explanation must remain fully visible" "command: ./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping" "code: 2" "hint: export DEPLOY_TOKEN then rerun the pipeline; do not paste secrets into logs"
"$LOG_BIN" kv SUMMARY status=failed "failed_phase=Deploy (dry run)" duration=1m21s artifacts=3
"$LOG_BIN" done "RELEASE PIPELINE — payments-api"
