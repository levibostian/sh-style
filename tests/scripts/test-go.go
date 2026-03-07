package main

// Test script for Go library - generates the same output as expected-output.txt

import (
	shstyle "github.com/levibostian/sh-style"
)

func main() {
	logger := shstyle.NewLogger(72)

	// Run all commands in sequence to generate the expected output
	logger.Title("RELEASE PIPELINE — payments-api — nightly with extended validation steps")
	logger.Msg("This pipeline will build, test, and deploy the payments-api service.")
	logger.Note("Build the service, run tests, and publish artifacts for deployment while preserving exact spacing  and avoiding     truncation.")
	logger.Phase("Setup")
	logger.Why("Ensure deterministic tooling across runners and capture enough context for reproducible failures.")
	logger.Kv("ENV", [][2]string{
		{"node", "20.11.1"},
		{"pnpm", "9.1.0"},
		{"os", "ubuntu-22.04"},
	})
	logger.Step("Enable toolchain")
	logger.Cmd("corepack enable")
	logger.Cmd("node --version")
	logger.Cmd("pnpm --version")
	logger.Ok("toolchain ready")
	logger.Step("Install dependencies")
	logger.Cmd("pnpm install --frozen-lockfile")
	logger.Ok("dependencies installed")
	logger.Phase("Build and package the service for production deployment including generation of integrity metadata")
	logger.Plan("Produce production-ready output in dist/ and record artifact paths for later pipeline steps.")
	logger.Step("Compile TypeScript and bundle server for distribution")
	logger.Cmd("pnpm run build && pnpm run bundle -- --target=node20 --sourcemap --outdir=dist --minify=false")
	logger.Ok("build finished in 18s")
	logger.List("ARTIFACTS", []string{
		"dist/server.js",
		"dist/server.js.map",
		"dist/some/really/long/path/that/wraps/because/it/exceeds/width/and continues here/with  double  spaces",
	})
	logger.Phase("Test")
	logger.Step("Integration tests")
	logger.Cmd("pnpm run test:integration")
	logger.Warn("integration tests skipped because environment is not configured for network access and the summary must wrap cleanly",
		"detail: INTEGRATION=0",
		"detail: network access disabled in CI for forks, see policy at https://example.com/ci/policies/network-access which is a very long line that must wrap but preserve all characters",
	)
	logger.Phase("Deploy (dry run)")
	logger.Note("Validate deploy commands without publishing changes.")
	logger.Step("Validate deploy script")
	logger.Cmd("./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping")
	logger.Error(
		"deploy validation failed because the environment variable DEPLOY_TOKEN was not set and the explanation must remain fully visible",
		"command: ./scripts/deploy.sh --dry-run --region=us-east-1 --service=payments-api --with-a-very-long-flag-name-that-forces-wrapping",
		"code: 2",
		"hint: export DEPLOY_TOKEN then rerun the pipeline; do not paste secrets into logs",
	)
	logger.Kv("SUMMARY", [][2]string{
		{"status", "failed"},
		{"failed_phase", "Deploy (dry run)"},
		{"duration", "1m21s"},
		{"artifacts", "3"},
	})
	logger.Done("RELEASE PIPELINE — payments-api")
}
