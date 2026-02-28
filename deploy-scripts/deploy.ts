#!/usr/bin/env -S deno run --allow-all

import { getDeployStepInput } from "jsr:@levibostian/decaf-sdk@0.7.0";
import $ from "jsr:@david/dax@0.45.0"

const input = getDeployStepInput()

await $`make build-all`.printCommand()

// Update version.ts to point to the new release version before publishing to JSR
Deno.writeFile('deno/version.json', new TextEncoder().encode(JSON.stringify({ version: input.nextVersionName }, null, 2)))
await $`cat deno/version.json`.printCommand()
            
await $`deno run --allow-all --quiet jsr:@levibostian/decaf-script-jsr --package-path ./deno --allow-dirty`.printCommand()
await $`deno run --allow-all --quiet jsr:@levibostian/decaf-script-github-releases set-assets "dist/bin-x86_64-Linux" "dist/bin-aarch64-Linux" "dist/bin-x86_64-Darwin" "dist/bin-aarch64-Darwin" "dist/bin-x86_64-Windows.exe" "dist/bin-aarch64-Windows.exe"`.printCommand()

// Do this very last because it updates the single-source-of-truth 
await $`deno run --allow-all --quiet jsr:@levibostian/decaf-script-github-releases set`.printCommand()