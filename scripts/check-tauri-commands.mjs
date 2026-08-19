#!/usr/bin/env node
/**
 * Every `#[tauri::command]` must appear in `invoke_handler`.
 *
 * Pillar 6, as a script. Seven commands once shipped defined-but-unregistered:
 * they compiled clean, `clippy -D warnings` passed, `tsc` passed, and every
 * call would have failed at runtime with "command not found". Nothing compared
 * the two lists, so nothing complained.
 *
 * Also checks the other side of the same gap — a TypeScript binding naming a
 * command that is not registered is a runtime failure waiting for its caller.
 *
 *   node scripts/check-tauri-commands.mjs
 */
import { readFileSync } from "node:fs";

const RUST = "apps/desktop/src-tauri/src/lib.rs";
const TS = "apps/desktop/src/lib/ipc.ts";

const rust = readFileSync(RUST, "utf8");
const ts = readFileSync(TS, "utf8");

const defined = [
  ...rust.matchAll(
    /#\[tauri::command\][^\n]*\n(?:#\[[^\]]*\]\s*\n)*\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g,
  ),
].map((m) => m[1]);

const handler = rust.match(/invoke_handler\(tauri::generate_handler!\[(.*?)\]\)/s);
if (!handler) {
  console.error(`No invoke_handler found in ${RUST}`);
  process.exit(1);
}
const registered = handler[1]
  .split("\n")
  .map((line) => line.trim().replace(/,$/, ""))
  .filter((line) => line && !line.startsWith("//"));

// `call<Record<string, string>>("settings_all", ...)` has a nested `<`, so a
// lazy `call<[^>]*>` misses it and reports a false positive. Match the quoted
// command name directly instead.
const bound = new Set([...ts.matchAll(/call<[\s\S]*?>\(\s*"([a-z_]+)"/g)].map((m) => m[1]));

const problems = [];
for (const name of defined) {
  if (!registered.includes(name)) {
    problems.push(`defined but NOT registered — invoke("${name}") fails at runtime`);
  }
}
for (const name of registered) {
  if (!defined.includes(name)) problems.push(`registered but not defined — will not compile: ${name}`);
}
for (const name of bound) {
  if (!registered.includes(name)) problems.push(`TypeScript calls an unregistered command: ${name}`);
}

// Deliberately not an error: `machine_id` and `platform` are registered without
// wrappers because `appInfo` already returns both.
const unbound = registered.filter((n) => !bound.has(n));

console.log(`${defined.length} defined, ${registered.length} registered, ${bound.size} bound in TS`);
if (unbound.length) console.log(`no TS wrapper (fine if intentional): ${unbound.join(", ")}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("OK — every command is registered and every binding resolves");
