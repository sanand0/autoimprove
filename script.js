import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";

const $prompt = document.querySelector("#prompt");
const $submit = document.querySelector("#submit");
const $model = document.querySelector("#model");
const $demos = document.querySelector("#demos");
const $response = document.querySelector("#response");

const loadingHTML = html` <div class="d-flex justify-content-center align-items-center">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</div>`;

render(loadingHTML, $demos);
fetch("config.json")
  .then((res) => res.json())
  .then(({ demos }) => {
    render(
      demos.map(
        (demo) => html`<div class="col mb-4">
          <div class="card h-100 demo-card" role="button" data-file="${demo.file}" style="cursor: pointer;">
            <div class="card-body text-center">
              <i class="bi ${demo.icon} fs-1 mb-3"></i>
              <h5 class="card-title">${demo.title}</h5>
            </div>
          </div>
        </div>`
      ),
      $demos
    );
  });

$demos.addEventListener("click", (e) => {
  const demo = e.target.closest("[data-file]");
  if (demo) load(demo.dataset.file);
});

const apiUrl = "https://llmfoundry.straive.com/openrouter/v1/chat/completions";
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((res) =>
  res.json()
);

const marked = new Marked();
const messages = [{ role: "system", content: "Generate a single page HTML app in a single Markdown code block.If this is not the first response in a thread, begin your explanation with a single line summarizing what changes were made since the previous version." }];

document.querySelector("#app-prompt").addEventListener("submit", async (e) => {
  e.preventDefault();

  messages.push({ role: "user", content: $prompt.value });
  const body = JSON.stringify({ model: $model.value, messages, stream: true });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}:autoimprove` };

  messages.push({ role: "assistant", content: "", loading: true });
  drawMessages(messages);
  const lastMessage = messages.at(-1);
  for await (const data of asyncLLM(apiUrl, { method: "POST", headers, body })) {
    lastMessage.content = data.content;
    if (!lastMessage.content) continue;
    drawMessages(messages);
  }
  delete lastMessage.loading;
  drawMessages(messages);
  // Auto size the last iframe
  const iframes = $response.querySelectorAll("iframe");
  if (iframes.length) {
    const frame = iframes[iframes.length - 1];
    frame.style.height = `${frame.contentWindow.document.body.scrollHeight + 200}px`;
  }

  $submit.textContent = "Improve";
  $prompt.value = "Improve this app!";
});

function parseAssistantContent(content) {
  const parsed = marked.parse(content);
  const codeMatch = parsed.match(/<pre><code[\s\S]*?<\/code><\/pre>/i);
  return codeMatch ? {code: codeMatch[0],explanation: parsed.replace(codeMatch[0], '')
  } : { explanation: parsed };
}

function drawMessages(messages) {
  render(
    messages.map(({ role, content, loading }, i) => html`
      <div class="mb-3 border rounded">
        <div class="p-2 bg-body-tertiary" data-bs-toggle="collapse" data-bs-target="#msg${i}" style="cursor:pointer">
          <i class="bi bi-chevron-down"></i> ${role}
        </div>
        <div id="msg${i}" class="collapse show">
          ${role === "assistant" ? (() => {
            const { code, explanation } = parseAssistantContent(content);
            return html`
              ${code ? html`
                <div class="p-2 border-bottom bi-caret-down-fill" data-bs-toggle="collapse" data-bs-target="#code${i}" style="cursor:pointer">
                  <i class="bi bi-code-slash"></i> Code
                </div>
                <div id="code${i}" class="collapse  p-2">${unsafeHTML(code)}</div>
              ` : ''}
              <div class="p-2 border-bottom bi-caret-down-fill" data-bs-toggle="collapse" data-bs-target="#exp${i}" style="cursor:pointer">
                <i class="bi bi-text-paragraph"></i> Explanation
              </div>
              <div id="exp${i}" class="collapse  p-2">${unsafeHTML(explanation)}</div>
              ${loading ? loadingHTML : unsafeHTML(drawOutput(content))}
            `;
          })() : html`<div class="p-2">${unsafeHTML(marked.parse(content))}</div>`}
        </div>
      </div>
    `),
    $response
  );
}

const contentCache = {};

function drawOutput(content) {
  if (contentCache[content]) return contentCache[content];

  // Find the first code block in the markdown content
  const match = content.match(/```[\w-]*\n([\s\S]*?)\n```/);
  if (!match) return "";

  // Draw it in an iframe
  const iframe = document.createElement("iframe");
  iframe.className = "w-100 border rounded";
  iframe.style.minHeight = "300px";
  iframe.srcdoc = match[1];

  contentCache[content] = iframe.outerHTML;
  return contentCache[content];
}

async function load(url) {
  messages.splice(0, messages.length, ...(await fetch(url).then((res) => res.json())));
  drawMessages(messages);
}

document.querySelector("#file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) load(URL.createObjectURL(file));
});

document.querySelector("#save-conversation").addEventListener("click", () => {
  const data = `data:application/json,${encodeURIComponent(JSON.stringify(messages, null, 2))}`;
  Object.assign(document.createElement("a"), { href: data, download: "autoimprove.json" }).click();
});
