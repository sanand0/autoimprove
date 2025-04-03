import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";

const $prompt = document.querySelector("#prompt");
const $submit = document.querySelector("#submit");
const $model = document.querySelector("#model");
const $response = document.querySelector("#response");

const apiUrl = "https://llmfoundry.straive.com/openrouter/v1/chat/completions";
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((res) =>
  res.json()
);

const marked = new Marked();
const messages = [{ role: "system", content: "Generate a single page HTML app in a single Markdown code block." }];

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

const loadingHTML = html` <div class="d-flex justify-content-center align-items-center">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</div>`;

function drawMessages(messages) {
  render(
    messages.map(
      ({ role, content, loading }) => html`
        <section class="message ${role}-message mb-4">
          <div class="fw-bold text-capitalize mb-2">${role}:</div>
          <div class="message-content">${unsafeHTML(marked.parse(content))}</div>
          ${role == "assistant" ? (loading ? loadingHTML : unsafeHTML(drawOutput(content))) : ""}
        </section>
      `
    ),
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
