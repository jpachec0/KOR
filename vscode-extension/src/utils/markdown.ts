import hljs from "highlight.js";
import { marked } from "marked";

function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const normalizedLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language: normalizedLang }).value;
  return [
    `<pre class="code-block"><div class="code-head">${normalizedLang}</div><code class="hljs language-${normalizedLang}">${highlighted}</code></pre>`
  ].join("");
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
});

export function renderMarkdown(markdown: string): string {
  return sanitizeHtml(marked.parse(markdown) as string);
}
