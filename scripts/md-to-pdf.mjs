import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = join(root, "docs", "android-agent-api-handbook.md");
const htmlPath = join(root, "docs", "android-agent-api-handbook.html");
const pdfPath = join(root, "docs", "android-agent-api-handbook.pdf");
const chrome =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const markdown = readFileSync(mdPath, "utf8");
const body = marked.parse(markdown);
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Family Care — Android Device Agent API Handbook</title>
  <style>
    @page { margin: 18mm; }
    body {
      font-family: Segoe UI, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111;
      direction: ltr;
      text-align: left;
    }
    h1, h2, h3 { page-break-after: avoid; }
    pre, code { font-family: Consolas, Menlo, monospace; }
    pre {
      background: #f6f8fa;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 9.5pt;
    }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
    th { background: #f0f3f6; }
    blockquote {
      border-left: 4px solid #4a90e2;
      margin-left: 0;
      padding: 6px 12px;
      background: #f7fbff;
    }
  </style>
</head>
<body>${body}</body>
</html>`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html, "utf8");

const result = spawnSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    htmlPath,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("Chrome print-to-pdf failed", result.status);
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${pdfPath}`);
