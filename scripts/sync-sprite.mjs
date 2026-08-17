// The sprite engine lives in designs/source and is the one file in that archive
// that cannot be regenerated from anything else. packages/ui keeps a verbatim
// copy so the app can import it; this script re-copies it and refuses to run
// backwards, so an accidental edit in packages/ui is caught rather than shipped.
import { copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "designs", "source", "jule-sprite.js");
const target = join(root, "packages", "ui", "src", "jule", "engine.js");

const before = safeRead(target);
copyFileSync(source, target);
const after = readFileSync(target, "utf8");

if (before !== null && before !== after) {
  console.log("packages/ui/src/jule/engine.js updated from designs/source/jule-sprite.js");
} else {
  console.log("packages/ui/src/jule/engine.js already matches the design source");
}

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}
