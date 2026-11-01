/**
 * Research Lab (NBLMimic) — Grounded Research Chat & Synthesis Subsystem
 * Editorial research briefs, interactive superscript citation chips, Raycast composer, and speech dictation.
 * ZERO EMOJIS in UI.
 */

import { state } from './state.js';
import { getIcon, escapeHtml, showToast } from './ui.js';
import { viewDocument } from './sources-reader.js';
import { fetchDriveDocumentContent } from './auth-drive.js';

let isDictating = false;
let speechRecognizer = null;

export function initChat() {
  const form = document.getElementById('chat-composer-form');
  const textarea = document.getElementById('chat-textarea');
  const micBtn = document.getElementById('btn-composer-mic');
  const modelSelect = document.getElementById('select-composer-model');

  if (modelSelect) {
    modelSelect.value = state.get('activeModel') || 'gemini-3.5-flash-lite';
    modelSelect.onchange = (e) => {
      state.set('activeModel', e.target.value);
    };
  }

  if (form) {
    form.onsubmit = handleChatSubmit;
  }

  if (textarea) {
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form?.dispatchEvent(new Event('submit'));
      }
    };
    textarea.oninput = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };
  }

  if (micBtn) {
    micBtn.onclick = toggleDictation;
  }

  // Delegated citation chip click listener on message stream
  const stream = document.getElementById('chat-messages-stream');
  if (stream) {
    stream.addEventListener('click', (e) => {
      const chip = e.target.closest('.citation-chip');
      if (chip) {
        const idx = parseInt(chip.dataset.citationIndex, 10);
        if (!isNaN(idx)) {
          handleCitationClick(idx);
        }
      }
    });
  }
}

export async function handleChatSubmit(e) {
  if (e) e.preventDefault();

  const textarea = document.getElementById('chat-textarea');
  const text = (textarea ? textarea.value : '').trim();
  if (!text) return;

  // Append user message pill
  appendUserMessage(text);
  textarea.value = '';
  textarea.style.height = 'auto';

  // Grounding context from active sources
  const sources = state.get('sources');
  const activeIds = state.get('activeSourceIds');
  const activeSources = sources.filter(s => activeIds.has(s.id));

  // Ensure active source content is loaded
  for (const src of activeSources) {
    if (src.content === null && src.driveFileId && state.get('driveToken')) {
      try {
        src.content = await fetchDriveDocumentContent(src);
      } catch (err) {}
    }
  }

  let context = '';
  if (activeSources.length > 0) {
    activeSources.forEach((src, idx) => {
      let body = src.content || src.excerpt || '';
      context += `[Source ${idx + 1}: "${src.title}"]\n${body.slice(0, 15000)}\n\n`;
    });
  }

  const systemInstruction = activeSources.length > 0
    ? `You are an elite research partner inside Research Lab (NBLMimic).
Synthesize and answer questions accurately grounded in the active sources provided below.
Cite your specific claims with strict numbered bracket notation like [1], [2], corresponding to the source number.
If information is not contained in the sources, state that clearly, then provide context based on general scientific knowledge.`
    : `You are an elite research partner inside Research Lab (NBLMimic).
Help the researcher brainstorm, explore concepts, summarize information, and plan experiments with rigorous depth.`;

  const thinkingId = appendThinkingIndicator();
  const model = state.get('activeModel') || 'gemini-3.5-flash-lite';
  const rawApiKeys = state.get('geminiApiKey') || '';
  const parsedKeys = rawApiKeys
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 5);
  const primaryKey = parsedKeys[0] || null;

  try {
    let reply = '';
    let proxyFailed = false;

    // 1. Primary: Local Proxy (/api/chat) with multi-key pool rotation
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          apiKey: primaryKey,
          apiKeys: parsedKeys.length > 0 ? parsedKeys : undefined,
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: activeSources.length > 0 ? `SOURCES:\n${context}\n\nQUESTION:\n${text}` : text }]
            }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      } else {
        const err = await res.json().catch(() => ({}));
        reply = `Error: ${err.error?.message || 'Server error occurred'}`;
      }
    } catch (fetchErr) {
      proxyFailed = true;
    }

    // 2. Direct Fallback with Client-Side Key-Ring Failover if proxy unreachable
    if (proxyFailed) {
      if (parsedKeys.length === 0) {
        removeThinkingIndicator(thinkingId);
        appendAiBrief('Connection error: Server proxy is offline and no Gemini API Key is configured. Please enter your key in Settings (BYOK).');
        return;
      }

      let directSuccess = false;
      for (let i = 0; i < parsedKeys.length; i++) {
        const candidateKey = parsedKeys[i];
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(candidateKey)}`;
        try {
          const directRes = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [
                { role: 'user', parts: [{ text: activeSources.length > 0 ? `SOURCES:\n${context}\n\nQUESTION:\n${text}` : text }] }
              ]
            })
          });

          if (directRes.ok) {
            const data = await directRes.json();
            reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
            directSuccess = true;
            break;
          } else if (directRes.status === 429 || directRes.status === 503) {
            console.warn(`[Direct BYOK] Key slot #${i + 1} hit ${directRes.status}. Trying next key...`);
            continue;
          } else {
            const err = await directRes.json().catch(() => ({}));
            reply = `Google API Error (${directRes.status}): ${err.error?.message || 'Direct call failed'}`;
            directSuccess = true;
            break;
          }
        } catch (directErr) {
          console.warn(`[Direct BYOK] Error on key slot #${i + 1}:`, directErr);
        }
      }

      if (!directSuccess && !reply) {
        reply = 'All available Gemini API keys in the client ring were exhausted or rate-limited.';
      }
    }

    removeThinkingIndicator(thinkingId);
    appendAiBrief(reply);

  } catch (err) {
    removeThinkingIndicator(thinkingId);
    appendAiBrief(`Connection error: ${err.message}`);
  }
}

export function appendUserMessage(text) {
  const stream = document.getElementById('chat-messages-stream');
  if (!stream) return;

  const row = document.createElement('div');
  row.className = 'message-row-user';
  row.innerHTML = `<div class="message-pill-user">${escapeHtml(text)}</div>`;

  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
}

export function appendAiBrief(markdownText) {
  const stream = document.getElementById('chat-messages-stream');
  if (!stream) return;

  const row = document.createElement('div');
  row.className = 'message-row-ai';

  let formatted = escapeHtml(markdownText);

  // Replace citations [1], [2] with interactive superscript chips
  formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
    return `<button class="citation-chip" data-citation-index="${num}" title="Jump to Source ${num}">[${num}]</button>`;
  });

  // Basic markdown enhancements
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:var(--bg-subtle); padding:1px 4px; border-radius:3px; font-family:var(--font-mono); font-size:11.5px;">$1</code>');
  formatted = formatted.replace(/\n\n+/g, '</p><p>');
  formatted = formatted.replace(/\n/g, '<br>');

  row.innerHTML = `
    <div class="message-ai-header">
      ${getIcon('sparkles', 12)}
      <span>Synthesis Brief</span>
    </div>
    <div class="message-ai-brief">
      <p>${formatted}</p>
    </div>
  `;

  // Attach citation click events
  row.querySelectorAll('.citation-chip').forEach(chip => {
    chip.onclick = () => {
      const idx = parseInt(chip.dataset.citationIndex, 10);
      handleCitationClick(idx);
    };
  });

  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
}

export function appendThinkingIndicator() {
  const stream = document.getElementById('chat-messages-stream');
  if (!stream) return null;

  const id = `think-${Date.now()}`;
  const row = document.createElement('div');
  row.className = 'message-row-ai';
  row.id = id;
  row.innerHTML = `
    <div class="message-thinking">
      ${getIcon('refresh-cw', 13, 'spin-slow')}
      <span>Synthesizing grounded context...</span>
    </div>
  `;

  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
  return id;
}

export function removeThinkingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

export function handleCitationClick(index) {
  const sources = state.get('sources');
  const activeIds = state.get('activeSourceIds');
  const activeSources = sources.filter(s => activeIds.has(s.id));

  const doc = activeSources[index - 1];
  if (doc) {
    viewDocument(doc.id);
    const row = document.querySelector(`.source-row[data-doc-id="${doc.id}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      row.classList.remove('is-pulse-highlight');
      void row.offsetWidth; // trigger reflow for smooth re-trigger
      row.classList.add('is-pulse-highlight');
      setTimeout(() => {
        row.classList.remove('is-pulse-highlight');
      }, 1400);
    }
    showToast(`Jumped to citation [${index}]: ${doc.title.slice(0, 28)}...`);
  } else {
    showToast(`Source [${index}] not found`);
  }
}

export function sendQuickPrompt(promptText) {
  const textarea = document.getElementById('chat-textarea');
  if (textarea) {
    textarea.value = promptText;
    handleChatSubmit();
  }
}

export function clearChatStream() {
  const stream = document.getElementById('chat-messages-stream');
  if (stream) {
    stream.innerHTML = `
      <div class="message-row-ai">
        <div class="message-ai-header">
          ${getIcon('sparkles', 12)}
          <span>Research Lab</span>
        </div>
        <div class="message-ai-brief">
          <p>Session cleared. Ask questions, compare findings, or synthesize research across your grounded sources.</p>
        </div>
      </div>
    `;
  }
}

export async function generateAudioOverview() {
  const sources = state.get('sources');
  const activeIds = state.get('activeSourceIds');
  const activeSources = sources.filter(s => activeIds.has(s.id));

  if (activeSources.length === 0) {
    showToast('Select at least 1 source for Audio Overview');
    return;
  }

  showToast('Synthesizing Audio Overview...');
  appendUserMessage(`Synthesize an Audio Overview for ${activeSources.length} active sources.`);

  const prompt = `Synthesize an engaging, highly structured spoken deep-dive script summarizing the key findings across: ${activeSources.map(s => s.title).join('; ')}.`;
  const thinkingId = appendThinkingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash-lite',
        apiKey: state.get('geminiApiKey'),
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    removeThinkingIndicator(thinkingId);
    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Overview generated.';
      appendAiBrief(`**Audio Overview Synthesis:**\n\n${reply}`);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(reply.slice(0, 450));
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        showToast('Playing spoken overview snippet');
      }
    }
  } catch (err) {
    removeThinkingIndicator(thinkingId);
    appendAiBrief(`Could not synthesize audio overview: ${err.message}`);
  }
}

export function toggleDictation() {
  const micBtn = document.getElementById('btn-composer-mic');
  const textarea = document.getElementById('chat-textarea');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Speech recognition not supported in this browser. Use Gemini Live Voice.');
    return;
  }

  if (isDictating) {
    if (speechRecognizer) speechRecognizer.stop();
    isDictating = false;
    if (micBtn) micBtn.classList.remove('is-recording');
    showToast('Dictation stopped');
    return;
  }

  try {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = 'en-US';

    speechRecognizer.onstart = () => {
      isDictating = true;
      if (micBtn) micBtn.classList.add('is-recording');
      showToast('Listening... Speak your prompt');
    };

    speechRecognizer.onresult = (evt) => {
      let finalTranscript = '';
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        if (evt.results[i].isFinal) {
          finalTranscript += evt.results[i][0].transcript;
        }
      }
      if (finalTranscript && textarea) {
        textarea.value = (textarea.value ? `${textarea.value} ` : '') + finalTranscript;
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      }
    };

    speechRecognizer.onerror = () => {
      isDictating = false;
      if (micBtn) micBtn.classList.remove('is-recording');
    };

    speechRecognizer.onend = () => {
      isDictating = false;
      if (micBtn) micBtn.classList.remove('is-recording');
    };

    speechRecognizer.start();
  } catch (err) {
    isDictating = false;
    if (micBtn) micBtn.classList.remove('is-recording');
  }
}

// Window scope exposures for resilient click handlers and external calls
window.handleCitationClick = handleCitationClick;
window.sendQuickPrompt = sendQuickPrompt;
window.clearChatStream = clearChatStream;
window.generateAudioOverview = generateAudioOverview;
