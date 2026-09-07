/* eslint-disable @typescript-eslint/no-require-imports -- plain CJS script; runs inside the Docker CLI stage under bun (no Node there) */
/**
 * TAJ Electronics — Prisma CLI runtime closure copier
 *
 * Why this exists:
 *   The /install wizard runs `prisma db push` INSIDE the production container
 *   (see src/lib/installer/db-setup.ts). A Next.js standalone image only ships
 *   the traced server runtime, so the Prisma CLI's dependencies would otherwise
 *   be missing — which is exactly the class of error reported on the VPS:
 *     "Cannot find package 'effect' from '/app/node_modules/@prisma/config/…'"
 *     "Cannot find package 'fast-check' from '…/@prisma/config/node_modules/effect/dist/cjs/FastCheck.js'"
 *   Cherry-picking folders by hand (prisma, @prisma, effect, c12, …) is fragile:
 *   every new Prisma release can add another dependency.
 *
 * What it does:
 *   Walks node_modules and computes the FULL dependency closure of the Prisma
 *   CLI, using Node-style module resolution (handles BOTH hoisted packages at
 *   the tree root AND nested `<pkg>/node_modules/<dep>` copies), following
 *   dependencies + optionalDependencies + resolvable peerDependencies. Every
 *   directory in the closure is copied — nesting preserved, so resolution in
 *   the destination behaves exactly like in the source tree — together with
 *   the generated `.prisma` client and the `.bin/prisma` entry.
 *
 *   It then FAILS THE BUILD if any non-optional dependency failed to resolve,
 *   so a broken install surfaces at `docker compose build` time instead of
 *   crashing the /install wizard at runtime on the server.
 *
 * Usage:
 *   bun|node scripts/prisma-cli-closure.js <src-node_modules-dir> <dest-dir>
 *   (defaults: ./node_modules → ./prisma-cli-dist)
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(process.argv[2] ?? path.join(process.cwd(), "node_modules"));
const DEST = path.resolve(process.argv[3] ?? path.join(process.cwd(), "prisma-cli-dist"));

// The Prisma CLI and the generated client (engines for runtime queries)
const SEEDS = ["prisma", "@prisma/client"];

// never copied into the runtime image (build-time-only tooling)
const SKIP = new Set(["typescript", "eslint"]);

function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Node-style resolution of `name` as a dependency of the package at `fromDir`,
 * bounded to the SRC node_modules tree:
 *   <fromDir>/node_modules/<name>          → nested copy (version conflicts)
 *   ../node_modules/<name> (walking up)    → intermediate levels
 *   SRC/<name>                             → hoisted copy (tree root)
 * Mirrors how Node/Bun resolve requires inside the built image.
 */
function resolveDep(fromDir, name) {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, "node_modules", name);
    if (exists(candidate) && candidate.startsWith(SRC + path.sep)) return candidate;
    if (dir === SRC) {
      // SRC itself is the node_modules root — check the hoisted level directly
      // (works regardless of what the SRC directory is named on disk)
      const hoisted = path.join(SRC, name);
      if (exists(hoisted)) return hoisted;
      return null;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

const seen = new Set(); // keyed by path relative to SRC (handles shadowed/nested copies)
const closure = []; // relative paths, nesting preserved
const missingHard = []; // declared non-optional deps that did not resolve → build error

function specOf(pkg, name) {
  return String(
    (pkg.dependencies ?? {})[name] ??
      (pkg.optionalDependencies ?? {})[name] ??
      (pkg.peerDependencies ?? {})[name] ??
      ""
  );
}

function visit(pkgDir) {
  const rel = path.relative(SRC, pkgDir);
  if (seen.has(rel)) return;
  seen.add(rel);
  const pkg = readPkg(pkgDir);
  if (!pkg) return; // not a real package dir (file dep, folder w/o package.json)
  closure.push(rel);

  const names = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);

  for (const name of names) {
    if (SKIP.has(name) || name.startsWith("@types/")) continue;
    if (/^(npm|file|link|workspace|portal):/.test(specOf(pkg, name))) continue; // aliases — key ≠ installed name
    const depDir = resolveDep(pkgDir, name);
    if (!depDir) {
      // optional deps + peers may legitimately be absent on this install;
      // a real `dependencies` entry that cannot be resolved is a broken tree
      const optional =
        name in (pkg.optionalDependencies ?? {}) || name in (pkg.peerDependencies ?? {});
      if (!optional) missingHard.push(`${rel} → ${name}`);
      continue;
    }
    visit(depDir);
  }
}

for (const seed of SEEDS) {
  const dir = path.join(SRC, seed);
  if (exists(dir)) visit(dir);
}

if (closure.length === 0) {
  console.error("prisma-cli-closure: nothing found — is node_modules installed?");
  process.exit(1);
}

if (missingHard.length > 0) {
  console.error("prisma-cli-closure: unresolved hard dependencies — node_modules is incomplete:");
  for (const m of missingHard) console.error("  - " + m);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

let files = 0;
function copyIntoModules(rel) {
  const src = path.join(SRC, rel);
  const dest = path.join(DEST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: false });
  files++;
}

for (const rel of closure) copyIntoModules(rel);

// generated Prisma client (query engine + schema copy) for the runtime app
if (exists(path.join(SRC, ".prisma"))) copyIntoModules(".prisma");

// CLI entry symlink (node_modules/.bin/prisma) so db-setup.ts finds it directly
if (exists(path.join(SRC, ".bin", "prisma"))) copyIntoModules(path.join(".bin", "prisma"));

console.log(`prisma-cli-closure: copied ${closure.length + 2} package entries (${files} dirs) → ${DEST}`);

// Belt & braces: the two packages whose absence caused real VPS incidents.
// They are hard dependencies of prisma@6 → @prisma/config → effect today; the
// generic missingHard check above already guarantees them, these checks make
// the failure mode unmistakable if a future Prisma version reshuffles deps.
// (Match at ANY nesting level — e.g. "@prisma/config/node_modules/effect".)
for (const required of ["effect", "fast-check"]) {
  const found = closure.some((r) => r === required || r.endsWith(path.sep + required));
  if (!found) {
    console.error(`prisma-cli-closure: WARNING — '${required}' not in closure; prisma CLI may fail at runtime`);
    process.exit(1);
  }
}
