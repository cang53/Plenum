// Builds the plenumtool.eu site: src/pages/*.html + partials -> dist/<page>/index.html.
// No dependencies. Run: node site/build.mjs   (host setting: root "site", build "node build.mjs", output "dist")
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");
const read = (p) => readFileSync(join(src, p), "utf8");

export function parsePage(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("page needs a --- front matter block");
  const meta = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { meta, body: m[2] };
}

export function render(page, partials) {
  const { meta, body } = page;
  const header = partials.header.replace(new RegExp(`data-nav="${meta.nav}"`), `data-nav="${meta.nav}" aria-current="page"`);
  const title = meta.home ? meta.title : `${meta.title} · Plenum`;
  return partials.layout
    .replaceAll("{{title}}", title)
    .replaceAll("{{description}}", meta.description)
    .replaceAll("{{path}}", meta.path ?? "/")
    .replaceAll("{{bodyClass}}", meta.body ?? "")
    .replace("{{header}}", header)
    .replace("{{footer}}", partials.footer)
    .replace("{{main}}", body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  cpSync(join(src, "assets"), join(dist, "assets"), { recursive: true });
  const partials = { layout: read("partials/layout.html"), header: read("partials/header.html"), footer: read("partials/footer.html") };
  for (const file of readdirSync(join(src, "pages"))) {
    const name = file.replace(/\.html$/, "");
    const page = parsePage(read(`pages/${file}`));
    const out = name === "index" ? join(dist, "index.html") : name === "404" ? join(dist, "404.html") : join(dist, name, "index.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(page, partials));
  }
  writeFileSync(join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");
  console.log("built", readdirSync(join(src, "pages")).length, "pages ->", dist);
}
