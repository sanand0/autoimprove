import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";

const $prompt = document.querySelector("#prompt");
const $model = document.querySelector("#model");
const $response = document.querySelector("#response");

const loading = /* html */ `
  <div class="d-flex justify-content-center align-items-center">
    <div class="spinner-border" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
`;

const apiUrl = "https://llmfoundry.straive.com/openrouter/v1/chat/completions";
const { token } = await fetch("https://llmfoundry.straive.com/token", { credentials: "include" }).then((res) =>
  res.json()
);

const marked = new Marked();

document.querySelector("#app-prompt").addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = JSON.stringify({
    model: $model.value,
    messages: [{ role: "user", content: $prompt.value }],
    stream: true,
  });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}:autoimprove` };

  $response.innerHTML = loading;
  for await (const { content } of asyncLLM(apiUrl, { method: "POST", headers, body })) {
    if (!content) continue;
    console.log(content);
    $response.innerHTML = marked.parse(content);
  }
});
