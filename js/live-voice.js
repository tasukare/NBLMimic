/**
 * NBLMimic — Gemini 3.8 Live Spoken Assistant
 * Real-time WebSocket (BidiGenerateContent), 16kHz PCM capture, 24kHz gapless playback & waveform visualizer.
 * Sleek floating audio bar inside workspace with transcript drawer. ZERO EMOJIS.
 */

import { state } from './state.js';
import { getIcon, escapeHtml, showToast } from './ui.js';

let liveWs = null;
let liveOutAudioCtx = null;
let liveInAudioCtx = null;
let liveOutAnalyser = null;
let liveInAnalyser = null;
let liveMicStream = null;
let liveMicProcessor = null;
let liveNextPlayTime = 0;
let liveActiveAudioSources = [];
let isLiveMicActive = false;
let isLiveSessionOpen = false;
let liveVisualizerAnimId = null;

export function initLiveVoice() {
  const triggerBtn = document.getElementById('btn-header-live-voice');
  const composerLiveBtn = document.getElementById('btn-composer-live-trigger');
  const barCloseBtn = document.getElementById('btn-live-bar-close');
  const barMicBtn = document.getElementById('btn-live-bar-mic');
  const barInterruptBtn = document.getElementById('btn-live-bar-interrupt');
  const barTranscriptToggle = document.getElementById('btn-live-bar-transcript');

  if (triggerBtn) {
    triggerBtn.onclick = toggleLiveVoiceBar;
  }
  if (composerLiveBtn) {
    composerLiveBtn.onclick = toggleLiveVoiceBar;
  }
  if (barCloseBtn) {
    barCloseBtn.onclick = closeLiveVoiceBar;
  }
  if (barMicBtn) {
    barMicBtn.onclick = toggleLiveMic;
  }
  if (barInterruptBtn) {
    barInterruptBtn.onclick = interruptLivePlayback;
  }
  if (barTranscriptToggle) {
    barTranscriptToggle.onclick = toggleLiveTranscriptDrawer;
  }
}

export function toggleLiveVoiceBar() {
  const bar = document.getElementById('live-voice-floating-bar');
  if (!bar) return;

  if (bar.classList.contains('is-active')) {
    closeLiveVoiceBar();
  } else {
    openLiveVoiceBar();
  }
}

export async function openLiveVoiceBar() {
  const bar = document.getElementById('live-voice-floating-bar');
  if (!bar) return;

  bar.classList.add('is-active');
  isLiveSessionOpen = true;

  const headerBtn = document.getElementById('btn-header-live-voice');
  if (headerBtn) headerBtn.classList.add('is-connected');

  startWaveformVisualizer();
  await connectGeminiLive();
}

export function closeLiveVoiceBar() {
  const bar = document.getElementById('live-voice-floating-bar');
  if (bar) bar.classList.remove('is-active');

  isLiveSessionOpen = false;
  const headerBtn = document.getElementById('btn-header-live-voice');
  if (headerBtn) headerBtn.classList.remove('is-connected');

  stopWaveformVisualizer();
  stopMicCapture();
  stopLiveAudioPlayback();

  if (liveWs) {
    try { liveWs.close(); } catch (e) {}
    liveWs = null;
  }
}

export function toggleLiveTranscriptDrawer() {
  const drawer = document.getElementById('live-transcript-drawer');
  if (drawer) {
    drawer.classList.toggle('is-open');
  }
}

// ── Audio Helpers ──

function downsampleTo16k(inputFloats, inputRate) {
  if (!inputRate || inputRate === 16000) {
    return float32To16BitPCM(inputFloats);
  }
  const ratio = inputRate / 16000;
  const newLength = Math.round(inputFloats.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.min(Math.floor(i * ratio), inputFloats.length - 1);
    const s = Math.max(-1, Math.min(1, inputFloats[srcIndex]));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return result;
}

function float32To16BitPCM(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToPCM24kAudioBuffer(ctx, base64Str) {
  const binaryString = window.atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);
  return audioBuffer;
}

function queueLiveAudioPlayback(base64Pcm) {
  if (!liveOutAudioCtx) {
    liveOutAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    liveOutAnalyser = liveOutAudioCtx.createAnalyser();
    liveOutAnalyser.fftSize = 64;
    liveOutAnalyser.connect(liveOutAudioCtx.destination);
  }
  if (liveOutAudioCtx.state === 'suspended') {
    liveOutAudioCtx.resume();
  }

  const audioBuffer = base64ToPCM24kAudioBuffer(liveOutAudioCtx, base64Pcm);
  const source = liveOutAudioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(liveOutAnalyser);

  const now = liveOutAudioCtx.currentTime;
  if (liveNextPlayTime < now) {
    liveNextPlayTime = now + 0.04;
  }
  source.start(liveNextPlayTime);
  liveNextPlayTime += audioBuffer.duration;

  liveActiveAudioSources.push(source);
  updateInterruptBtn();

  source.onended = () => {
    const idx = liveActiveAudioSources.indexOf(source);
    if (idx !== -1) liveActiveAudioSources.splice(idx, 1);
    updateInterruptBtn();
  };
}

function stopLiveAudioPlayback() {
  liveActiveAudioSources.forEach(s => {
    try { s.stop(); } catch (e) {}
  });
  liveActiveAudioSources.length = 0;
  if (liveOutAudioCtx) {
    liveNextPlayTime = liveOutAudioCtx.currentTime;
  }
  updateInterruptBtn();
}

function updateInterruptBtn() {
  const btn = document.getElementById('btn-live-bar-interrupt');
  if (btn) {
    btn.style.display = liveActiveAudioSources.length > 0 ? 'inline-flex' : 'none';
  }
}

export function interruptLivePlayback() {
  stopLiveAudioPlayback();
  appendTranscript('System', 'Spoken response interrupted');
  setLiveStatus('Ready');
}

// ── WebSocket Connection to Gemini 3.8 Live ──
export async function connectGeminiLive() {
  let apiKey = state.get('geminiApiKey');
  let ephemeralToken = null;

  if (!apiKey) {
    try {
      const cfg = await fetch('/api/live-config').then(r => r.json());
      if (cfg.ephemeralToken) {
        ephemeralToken = cfg.ephemeralToken;
      } else if (cfg.apiKey) {
        apiKey = cfg.apiKey;
        state.set('geminiApiKey', apiKey, true);
      }
    } catch (e) {}
  }

  if (!apiKey && !ephemeralToken) {
    setLiveStatus('API Key required in Settings (BYOK)');
    appendTranscript('System', 'To connect Gemini 3.8 Live, add GEMINI_API_KEY to your local .env or configure in Settings.');
    return;
  }

  if (liveWs && (liveWs.readyState === WebSocket.OPEN || liveWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setLiveStatus('Connecting to Gemini 3.8 Live...');

  const wsAuth = ephemeralToken
    ? `access_token=${encodeURIComponent(ephemeralToken)}`
    : `key=${encodeURIComponent(apiKey)}`;
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?${wsAuth}`;

  try {
    liveWs = new WebSocket(wsUrl);

    liveWs.onopen = () => {
      setLiveStatus('Configuring session...');

      // Context grounding from active sources
      const sources = state.get('sources');
      const activeIds = state.get('activeSourceIds');
      const activeSources = sources.filter(s => activeIds.has(s.id));

      let context = '';
      activeSources.slice(0, 4).forEach((s, idx) => {
        context += `[Source ${idx + 1}: "${s.title}"]\n${(s.content || s.excerpt || '').slice(0, 1000)}\n\n`;
      });

      const instruction = `You are a real-time, highly intelligent research partner inside NBLMimic.
Keep your spoken responses natural, concise (1-3 spoken sentences), and direct.
If the researcher asks about their documents, refer to the active research context:
${context || 'No specific sources are active right now.'}`;

      const setupMsg = {
        setup: {
          model: 'models/gemini-3.8-live',
          generationConfig: {
            responseModalities: ['AUDIO']
          },
          systemInstruction: {
            parts: [{ text: instruction }]
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      };

      liveWs.send(JSON.stringify(setupMsg));
    };

    liveWs.onmessage = async (event) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : await event.data.text();
        const msg = JSON.parse(raw);

        if (msg.setupComplete) {
          setLiveStatus(isLiveMicActive ? 'Listening (mic active)...' : 'Connected. Tap mic to speak.');
          return;
        }

        if (msg.serverContent) {
          const sc = msg.serverContent;

          if (sc.interrupted) {
            stopLiveAudioPlayback();
            setLiveStatus('Listening...');
            appendTranscript('Gemini', '[Interrupted]');
            return;
          }

          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                queueLiveAudioPlayback(part.inlineData.data);
                setLiveStatus('Gemini speaking...');
              }
              if (part.text) {
                appendTranscript('Gemini', part.text);
              }
            }
          }

          if (sc.outputTranscription?.text) {
            appendTranscript('Gemini', sc.outputTranscription.text);
          }

          if (sc.inputTranscription?.text) {
            appendTranscript('You', sc.inputTranscription.text);
          }

          if (sc.turnComplete) {
            setLiveStatus(isLiveMicActive ? 'Listening...' : 'Ready');
          }
        }
      } catch (err) {
        console.error('[Live] Message parsing error:', err);
      }
    };

    liveWs.onerror = () => {
      setLiveStatus('Connection error. Check API key in Settings.');
    };

    liveWs.onclose = () => {
      setLiveStatus('Session closed. Tap to reconnect.');
      stopLiveAudioPlayback();
      if (!isLiveSessionOpen) {
        stopMicCapture();
      }
    };

  } catch (err) {
    setLiveStatus(`Connection error: ${err.message}`);
  }
}

export async function startMicCapture() {
  try {
    // Relaxed audio constraints - avoid OverconstrainedError on 48kHz/44.1kHz sound cards
    liveMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      liveInAudioCtx = new AudioContextClass({ sampleRate: 16000 });
    } catch (e) {
      liveInAudioCtx = new AudioContextClass();
    }
    if (liveInAudioCtx.state === 'suspended') {
      await liveInAudioCtx.resume();
    }

    liveInAnalyser = liveInAudioCtx.createAnalyser();
    liveInAnalyser.fftSize = 64;

    const source = liveInAudioCtx.createMediaStreamSource(liveMicStream);
    source.connect(liveInAnalyser);

    liveMicProcessor = liveInAudioCtx.createScriptProcessor(2048, 1, 1);
    liveMicProcessor.onaudioprocess = (e) => {
      if (!isLiveMicActive) return;
      if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;

      const inputFloats = e.inputBuffer.getChannelData(0);
      const pcm16 = downsampleTo16k(inputFloats, liveInAudioCtx.sampleRate);
      const b64 = bufferToBase64(pcm16.buffer);

      liveWs.send(JSON.stringify({
        realtimeInput: {
          audio: {
            data: b64,
            mimeType: 'audio/pcm;rate=16000'
          }
        }
      }));
    };

    source.connect(liveMicProcessor);
    liveMicProcessor.connect(liveInAudioCtx.destination);

    isLiveMicActive = true;
    const micBtn = document.getElementById('btn-live-bar-mic');
    if (micBtn) {
      micBtn.classList.add('is-active');
      micBtn.innerHTML = getIcon('mic', 15);
    }
    setLiveStatus('Listening...');

  } catch (err) {
    console.error('[Live] Mic access error:', err);
    isLiveMicActive = false;
    setLiveStatus('Microphone permission denied.');
    showToast('Microphone access blocked');
  }
}

export function stopMicCapture() {
  isLiveMicActive = false;
  if (liveMicStream) {
    liveMicStream.getTracks().forEach(t => t.stop());
    liveMicStream = null;
  }
  if (liveMicProcessor) {
    try { liveMicProcessor.disconnect(); } catch (e) {}
    liveMicProcessor = null;
  }
  if (liveInAudioCtx) {
    try { liveInAudioCtx.close(); } catch (e) {}
    liveInAudioCtx = null;
  }
  const micBtn = document.getElementById('btn-live-bar-mic');
  if (micBtn) {
    micBtn.classList.remove('is-active');
    micBtn.innerHTML = getIcon('mic-off', 15);
  }
  setLiveStatus('Microphone muted');
}

export async function toggleLiveMic() {
  if (isLiveMicActive) {
    stopMicCapture();
  } else {
    // Start mic immediately within user gesture tick
    await startMicCapture();
    if (!liveWs || liveWs.readyState !== WebSocket.OPEN) {
      await connectGeminiLive();
    }
  }
}

function setLiveStatus(text) {
  const el = document.getElementById('live-bar-status-text');
  if (el) el.textContent = text;
}

function appendTranscript(sender, text) {
  const drawer = document.getElementById('live-transcript-drawer');
  if (!drawer) return;

  const row = document.createElement('div');
  row.style.marginBottom = '4px';
  row.innerHTML = `<strong style="color:var(--text-primary);">${escapeHtml(sender)}:</strong> <span>${escapeHtml(text)}</span>`;

  drawer.appendChild(row);
  drawer.scrollTop = drawer.scrollHeight;
}

function startWaveformVisualizer() {
  const canvas = document.getElementById('live-wave-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const midY = height / 2;
  const freqData = new Uint8Array(16);

  function draw() {
    liveVisualizerAnimId = requestAnimationFrame(draw);

    let maxEnergy = 0;
    if (liveOutAnalyser && liveActiveAudioSources.length > 0) {
      liveOutAnalyser.getByteFrequencyData(freqData);
    } else if (liveInAnalyser && isLiveMicActive) {
      liveInAnalyser.getByteFrequencyData(freqData);
    } else {
      freqData.fill(0);
    }

    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i] > maxEnergy) maxEnergy = freqData[i];
    }
    const energy = maxEnergy / 255;

    ctx.clearRect(0, 0, width, height);

    // Minimal 3-line subtle waveform
    const numBars = 12;
    const barWidth = 3;
    const gap = (width - numBars * barWidth) / (numBars - 1);

    for (let i = 0; i < numBars; i++) {
      const barHeight = Math.max(3, (freqData[i] || 0) / 255 * (height - 4) + energy * 4);
      const x = i * (barWidth + gap);
      const y = midY - barHeight / 2;

      ctx.fillStyle = energy > 0.05 ? 'var(--text-primary)' : 'var(--border-strong)';
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  if (liveVisualizerAnimId) cancelAnimationFrame(liveVisualizerAnimId);
  draw();
}

function stopWaveformVisualizer() {
  if (liveVisualizerAnimId) cancelAnimationFrame(liveVisualizerAnimId);
  liveVisualizerAnimId = null;
}
