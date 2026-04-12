
//tsx .tools/snap.ts --dir ./server --ext .ts,.json
//ollama run qwen2.5-coder:7b

import fs from "fs";
import path from "path";

const DEFAULT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(__dirname, "project_snapshot.txt");

const COMPRESSIBLE = [".json"];

const REMOVE_COMMENTS = false;
const REMOVE_EMPTY_LINES = false;

type Options = {
  root: string;
  exts: string[] | null;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);

  let root = DEFAULT_ROOT;
  let exts: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir") {
      root = path.resolve(args[i + 1]);
      i++;
    }

    if (args[i] === "--ext") {
      exts = args[i + 1].split(",").map(v => v.trim());
      i++;
    }
  }

  return { root, exts };
}

function loadIgnore(root: string): string[] {
  const p = path.join(root, ".agentignore");
  if (!fs.existsSync(p)) return [];

  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .map(v => v.trim())
    .filter(v => v && !v.startsWith("#"));
}

function matchIgnore(rel: string, ignore: string[]): boolean {
  return ignore.some(pattern => {
    if (pattern.endsWith("/")) return rel.startsWith(pattern.slice(0, -1));

    if (pattern.startsWith("*")) return rel.endsWith(pattern.slice(1));

    if (pattern.includes("*")) {
      const r = new RegExp(
        "^" +
          pattern
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*") +
          "$"
      );
      return r.test(rel);
    }

    return rel === pattern || rel.startsWith(pattern + "/");
  });
}

function shouldInclude(file: string, exts: string[] | null): boolean {
  if (!exts) return true;
  return exts.includes(path.extname(file));
}

function compress(file: string, content: string): string {
  const ext = path.extname(file);

  if (COMPRESSIBLE.includes(ext)) {
    try {
      return JSON.stringify(JSON.parse(content));
    } catch {}
  }

  return content;
}

function stripComments(ext: string, content: string): string {
  if (!REMOVE_COMMENTS) return content;

  if (ext === ".ts" || ext === ".js") {
    content = content.replace(/\/\/.*$/gm, "");
    content = content.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  return content;
}

function stripEmpty(content: string): string {
  if (!REMOVE_EMPTY_LINES) return content;
  return content.replace(/^\s*[\r\n]/gm, "");
}

function walk(
  dir: string,
  root: string,
  ignore: string[],
  exts: string[] | null,
  out: string[]
) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = path.relative(root, full).replace(/\\/g, "/");

    if (matchIgnore(rel, ignore)) continue;

    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, root, ignore, exts, out);
      continue;
    }

    if (!shouldInclude(full, exts)) continue;

    let content = fs.readFileSync(full, "utf8");

    content = compress(full, content);
    content = stripComments(path.extname(full), content);
    content = stripEmpty(content);

    out.push(`===== FILE: ${rel} =====\n${content}\n`);
  }
}

function main() {
  const { root, exts } = parseArgs();

  const ignore = loadIgnore(root);

  const result: string[] = [];

  walk(root, root, ignore, exts, result);

  const output = result.join("\n");

  fs.writeFileSync(OUTPUT_FILE, output);

  const tokens = Math.ceil(output.length / 4);

  console.log(`Estimated tokens: ${tokens}`);
}
main();