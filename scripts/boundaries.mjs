import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

async function imports(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = ts.createSourceFile(
    entry,
    await readFile(entry, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const paths = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      paths.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      assert.ok(
        node.arguments[0] && ts.isStringLiteral(node.arguments[0]),
        "Computed dynamic import requires boundary review",
      );
      paths.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const path of paths) {
    assert.ok(!path.startsWith("openai"), "Provider dependency reached from replay");
    if (path.startsWith(".")) {
      const file = resolve(dirname(entry), path.replace(/\.js$/, ".ts"));
      assert.ok(
        !relative(process.cwd(), file).startsWith("src/discovery/"),
        "Discovery reached from replay",
      );
      await imports(file, seen);
    }
  }
  return seen;
}
for (const entry of ["src/core/replay.ts", "src/cli/replay.ts"]) await imports(resolve(entry));
const runtime = await imports(resolve("src/services/session.ts"));
assert.ok(
  [...runtime].every((path) => !relative(process.cwd(), path).startsWith("demo/")),
  "Runtime imports simulator internals",
);
console.log("Replay dependency and simulator boundaries verified");
