import { getProfile } from "https://aipipe.org/aipipe.js";
import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
import { markedHighlight } from "https://cdn.jsdelivr.net/npm/marked-highlight@2/+esm";
import hljs from "https://cdn.jsdelivr.net/npm/highlight.js@11/+esm";

const { token } = getProfile();
if (!token) window.location = `https://aipipe.org/login?redirect=${window.location.href}`;

const $prompt = document.querySelector("#prompt");
const $submit = document.querySelector("#submit");
const $model = document.querySelector("#model");
const $apps = document.querySelector("#apps");
const $response = document.querySelector("#response");

const loadingHTML = html` <div class="d-flex justify-content-center align-items-center my-5">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</div>`;

fetch("README.md")
  .then(res => res.text())
  .then(docs => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(marked.parse(docs), 'text/html');
    doc.querySelectorAll('[data-target]').forEach(el => document.querySelector(el.dataset.target).innerHTML = el.innerHTML);
  });

render(loadingHTML, $apps);
fetch("config.json")
  .then((res) => res.json())
  .then(({ apps }) => {
    render(
      apps.map(
        (demo) => html`<div class="col mb-4">
          <a href="#${demo.file}" class="text-decoration-none">
            <div class="card h-100 demo-card">
              <div class="card-body text-center">
                <i class="bi ${demo.icon} fs-1 mb-3"></i>
                <h5 class="card-title">${demo.title}</h5>
              </div>
            </div>
          </a>
        </div>`
      ),
      $apps
    );
    handleHash();
  });

const apiUrl = "https://aipipe.org/openrouter/v1/chat/completions";

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const chat = [
  {
    role: "system",
    content: `Generate a single page HTML app in a single Markdown code block.
ALWAYS end with a ONE-LINE information-rich summary of the change. Begin the line with 💡`,
  },
];

function handleHash() {
  const hash = location.hash.slice(1);
  if (hash) load(hash);
}
window.addEventListener('hashchange', handleHash);

document.querySelector("#app-prompt").addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiPrompt = $prompt.value.trim();
  chat.push({ role: "user", content: apiPrompt });

  // Save tokens. Share only summary (not code), for all but the last assistant message (which has the latest code)
  const lastAssistantIndex = chat.findLastIndex((m) => m.role === "assistant");
  const messages = chat.map((m, i) =>
    m.role === "assistant" && i !== lastAssistantIndex ? { ...m, content: m.content.split("💡")[1] || m.content } : m
  );
  const body = JSON.stringify({ model: $model.value, messages, stream: true });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  chat.push({ role: "assistant", content: "", loading: true });
  redraw();
  const lastMessage = chat.at(-1);
  for await (const { error, content } of asyncLLM(apiUrl, { method: "POST", headers, body })) {
    lastMessage.content = error ?? content;
    if (error) break;
    if (content) redraw();
  }
  delete lastMessage.loading;
  redraw();
  $submit.textContent = "Improve";
  $prompt.value = "Improve this further - dramatically!";
});

function redraw() {
  $response.classList.remove("d-none");
  render(
    chat.map(
      ({ role, content, loading }, i) => html`
        <div class="mb-3 border rounded">
          <details class="w-100" open>
            <summary class="p-2 bg-body-secondary fw-bold text-uppercase user-select-none">${role}</summary>
            ${role === "assistant"
              ? (() => {
                  const match = content.match(/```[\w-]*\n([\s\S]*?)\n```/);
                  const code = match ? match[1] : "";
                  const [body, summary] = content.split("💡");
                  return html`
                    <details ?open=${loading && i == chat.length - 1}>
                      <summary class="p-2 user-select-none">
                        <i class="bi bi-text-paragraph"></i> Summary
                        ${summary ? html`<span class="ms-2 text-muted small">${summary}</span>` : ""}
                      </summary>
                      <div class="p-2">${unsafeHTML(marked.parse(body))}</div>
                    </details>
                    ${loading ? loadingHTML : unsafeHTML(drawOutput(code))}
                  `;
                })()
              : html`<div class="p-2">${unsafeHTML(marked.parse(content))}</div>`}
          </details>
        </div>
      `
    ),
    $response
  );
}

const contentCache = {};

function drawOutput(code) {
  if (contentCache[code]) return contentCache[code];

  const iframe = document.createElement("iframe");
  iframe.className = "w-100 border rounded";
  iframe.style.minHeight = "300px";
  iframe.srcdoc = code;

  // Auto adjust height
  const iframeHtml = iframe.outerHTML.replace("></iframe>",
    ` onload="this.style.height=this.contentWindow.document.documentElement.scrollHeight + 50 + 'px'"></iframe>`);

  contentCache[code] = iframeHtml;
  return contentCache[code];
}

async function load(url) {
  chat.splice(0, chat.length, ...(await fetch(url).then((res) => res.json())));
  redraw();
}

document.querySelector("#file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) load(URL.createObjectURL(file));
});

document.querySelector("#save-conversation").addEventListener("click", () => {
  const data = `data:application/json,${encodeURIComponent(JSON.stringify(chat, null, 2))}`;
  Object.assign(document.createElement("a"), { href: data, download: "autoimprove.json" }).click();
});
