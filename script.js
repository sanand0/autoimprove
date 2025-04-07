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

const demoList = [
  { id: 'circle', title: 'Circle Drawing', icon: 'bi-circle' },
  { id: 'minesweeper', title: 'minesweeper', icon: 'bi-controller' },
  { id: 'fractal', title: 'Fractal', icon: 'bi-snow' },
  { id: 'rain', title: 'Rain Simulation', icon: 'bi-cloud-rain' },
  { id: 'game', title: 'Simple Game', icon: 'bi-controller' },
  { id: 'clock', title: 'Analog Clock', icon: 'bi-clock' },
  { id: 'snake', title: 'Snake Game', icon: 'bi-joystick' },
  { id: 'paint', title: 'Paint App', icon: 'bi-palette' }
];

// Replace showNotification with showToast
function showToast(title, message, type = 'success') {
  const toastContainer = document.querySelector('.toast-container');
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.innerHTML = `
    <div class="toast-header bg-${type} text-white">
      <strong class="me-auto">${title}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;
  toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

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
    messages.map(({ role, content, loading }, i) => {
      const parsedContent = marked.parse(content);
      return html`
        <section class="message ${role}-message mb-4">
          <div class="fw-bold text-capitalize mb-2">${role}:</div>
          <div class="message-content">
            ${role === "assistant" ? unsafeHTML(drawCollapsibleSections(parsedContent, i)) : unsafeHTML(parsedContent)}
            ${role === "assistant" && !loading ? unsafeHTML(drawOutput(content)) : ""}
          </div>
        </section>
      `;
    }),
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

document.querySelector("#save-conversation").addEventListener("click", () => {
  const modal = new bootstrap.Modal(document.getElementById('saveModal'));
  const input = document.getElementById('filename');
  input.value = `conversation_${Date.now()}`;
  
  const saveHandler = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      const fileHandle = await handle.getFileHandle(`${input.value}.js`, { create: true });
      const writable = await fileHandle.createWritable();
      const fileContent = `const conversation = ${JSON.stringify(messages, null, 2)};`;
      await writable.write(fileContent);
      await writable.close();
      modal.hide();
      showToast("Success", `Conversation saved as ${input.value}.js`);
    } catch (error) {
      console.error("Error saving:", error);
      showToast("Error", error.name === 'SecurityError' ? 
        'Please try saving again. File picker requires user interaction.' : 
        `Save failed: ${error.message}`, 'danger');
    }
  };

  document.getElementById('saveButton').onclick = saveHandler;
  modal.show();
  setTimeout(() => input.focus(), 200);
});

document.querySelector("#load-conversation").addEventListener("click", async () => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JavaScript files', accept: { 'text/javascript': ['.js'] }}]
    });
    
    const file = await fileHandle.getFile();
    const fileContent = await file.text();
    const conversation = eval(fileContent + '; conversation');
    
    messages.length = 0;
    messages.push(...conversation);
    drawMessages(messages);
    showToast("Success", "Conversation loaded successfully");
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("Load error:", error);
      showToast("Error", "Failed to load file", 'danger');
    }
  }
});

function renderDemos() {
  const demosContainer = document.getElementById('demos');
  demosContainer.innerHTML = demoList.map(demo => `
    <div class="col mb-4">
      <div class="card h-100 demo-card" role="button" data-demo="${demo.id}" style="cursor: pointer;">
        <div class="card-body text-center">
          <i class="bi ${demo.icon} fs-1 mb-3"></i>
          <h5 class="card-title">${demo.title}</h5>
        </div>
      </div>
    </div>
  `).join('');

  demosContainer.addEventListener('click', async (e) => {
    const card = e.target.closest('.demo-card');
    if (!card) return;
    
    const demoId = card.dataset.demo;
    try {
      const response = await fetch(`files/${demoId}.js`);
      if (!response.ok) throw new Error(`Demo not found: ${demoId}`);
      const fileContent = await response.text();
      let conversation = eval(fileContent + '; conversation');
      
      messages.length = 0;
      messages.push(...conversation);
      drawMessages(messages);
      showToast("Success", `Demo "${demoId}" loaded successfully`);
    } catch (error) {
      console.error("Demo load error:", error);
      showToast("Error", "Failed to load demo", 'danger');
    }
  });
}
renderDemos();


function drawCollapsibleSections(htmlContent, index) {
  const codeBlockRegex = /<pre><code[\s\S]*?<\/code><\/pre>/i;
  const match = htmlContent.match(codeBlockRegex);
  
  if (!match) {
    const template = document.getElementById('single-accordion-template');
    const accordion = template.content.cloneNode(true);
    const accordionEl = accordion.querySelector('.accordion');
    accordionEl.id = `accordion-${index}`;
    
    const collapseButton = accordion.querySelector('.accordion-button');
    const collapseDiv = accordion.querySelector('.accordion-collapse');
    const collapseId = `explanation-${index}`;
    
    collapseButton.dataset.bsToggle = 'collapse';
    collapseButton.dataset.bsTarget = `#${collapseId}`;
    collapseDiv.id = collapseId;
    collapseDiv.dataset.bsParent = `#accordion-${index}`;
    
    accordion.querySelector('.accordion-body').innerHTML = htmlContent;
    return accordion.firstElementChild.outerHTML;
  }

  const template = document.getElementById('double-accordion-template');
  const accordion = template.content.cloneNode(true);
  const accordionEl = accordion.querySelector('.accordion');
  accordionEl.id = `accordion-${index}`;
  
  const buttons = accordion.querySelectorAll('.accordion-button');
  const collapseDivs = accordion.querySelectorAll('.accordion-collapse');
  
  ['code', 'explanation'].forEach((type, i) => {
    const collapseId = `${type}-${index}`;
    buttons[i].dataset.bsToggle = 'collapse';
    buttons[i].dataset.bsTarget = `#${collapseId}`;
    collapseDivs[i].id = collapseId;
    collapseDivs[i].dataset.bsParent = `#accordion-${index}`;
  });
  
  const codeHtml = match[0];
  const before = htmlContent.slice(0, match.index);
  const after = htmlContent.slice(match.index + codeHtml.length);
  
  accordion.querySelectorAll('.accordion-body')[0].innerHTML = codeHtml;
  accordion.querySelectorAll('.accordion-body')[1].innerHTML = before + after;
  
  return accordion.firstElementChild.outerHTML;
}
