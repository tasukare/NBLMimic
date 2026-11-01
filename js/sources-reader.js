/**
 * Research Lab (NBLMimic) — Source Library & Reader Subsystem
 * File tree with grounding checkboxes, segmented filtering, prose parser, and Drive iframe preview.
 * Pre-populates rich starter research papers and connects live RSS research feed (/api/news).
 */

import { state } from './state.js';
import { getIcon, escapeHtml, showToast, openModal } from './ui.js';
import { connectGoogleDrive, fetchDriveDocumentContent, isBinaryContent, generateDocumentExcerpt, fetchDriveDocumentBlob } from './auth-drive.js';
import { renderGlassFolderGallery } from './glass-folder-cards.js';

// ── Curated Starter Research Papers (Rich, Grounded Knowledge Base) ──
export const DEFAULT_STARTER_PAPERS = [
  // ── PDFs ──
  {
    id: 'starter-constitutional-ai',
    title: 'Constitutional AI: Harmlessness Specification.pdf',
    source: 'Anthropic Research',
    category: 'PDFs',
    mimeType: 'application/pdf',
    topic: 'ai',
    sizeFormatted: '420 KB',
    date: 'Jan 15',
    timestamp: Date.now() - 86400000 * 2,
    excerpt: 'Self-critique and revision guided by explicit natural language constitutions to produce non-evasive, harmless model behavior without human feedback.',
    content: `# Constitutional AI: Harmlessness from AI Feedback

## Executive Abstract
As large language models scale, aligning them with human values via human feedback (RLHF) becomes increasingly expensive and vulnerable to annotator biases. We propose **Constitutional AI (CAI)**, a framework for training non-evasive, harmless AI assistants through self-improvement without human intervention for harmfulness labels.

## Core Methodology
The CAI process operates in two distinct stages:

### Stage 1: Supervised Learning (Critique and Revision)
1. **Harmful Prompt Generation**: The model is prompted with red-team prompts that elicit potentially harmful or toxic responses.
2. **Critique Generation**: The model evaluates its own initial response against a set of written constitutional principles (e.g., rules drawn from the UN Declaration of Human Rights and common-sense safety standards).
3. **Self-Revision**: The model rewrites the output to satisfy the constitutional critique while remaining as helpful and informative as possible.
4. **Supervised Fine-Tuning (SL-CAI)**: The initial base model is fine-tuned on the final revised outputs using standard cross-entropy loss.

### Stage 2: Reinforcement Learning from AI Feedback (RLAIF)
Instead of hiring crowdsourced workers to score paired model completions for harmlessness, a feedback model (AI judge) compares candidate responses against constitutional rules:
- The preference label determines the reward signal for proximal policy optimization (PPO).
- This produces a harmlessness Pareto frontier superior to standard RLHF while eliminating human exposure to toxic content.

## Key Empirical Findings
- **Transparency**: Model behavior can be steered by altering concise natural-language constitutional rules rather than collecting thousands of new human labels.
- **Objection Handling**: The model learns to explain *why* a request cannot be fulfilled rather than giving evasive, sanctimonious canned refusals.`
  },
  {
    id: 'starter-attention-transformer',
    title: 'Attention Is All You Need.pdf',
    source: 'Google Brain / Research',
    category: 'PDFs',
    mimeType: 'application/pdf',
    topic: 'ai',
    sizeFormatted: '560 KB',
    date: 'Dec 18',
    timestamp: Date.now() - 86400000 * 5,
    excerpt: 'The seminal Transformer architecture based entirely on self-attention mechanisms, dispensing with recurrence and convolutions entirely.',
    content: `# Attention Is All You Need

## Executive Abstract
Dominant sequence transduction models rely on complex recurrent or convolutional neural networks within an encoder-decoder configuration. We introduce the **Transformer**, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to model global dependencies between input and output representations.

## Model Architecture
The Transformer follows an encoder-decoder paradigm using stacked self-attention and point-wise fully connected layers.

### Scaled Dot-Product Attention
Attention computation maps a query and a set of key-value pairs to an output:
\`\`\`text
Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V
\`\`\`

### Computational Efficiency
Self-attention layers connect all positions with O(1) sequentially executed operations, drastically accelerating parallel training on TPUs and GPUs.`
  },
  {
    id: 'starter-crispr-cas9',
    title: 'CRISPR-Cas9 Gene Editing in Human Therapeutics.pdf',
    source: 'Biomedical Review',
    category: 'PDFs',
    mimeType: 'application/pdf',
    topic: 'science',
    sizeFormatted: '1.2 MB',
    date: 'Nov 04',
    timestamp: Date.now() - 86400000 * 12,
    excerpt: 'Molecular mechanisms of RNA-guided endonuclease cleavage, double-strand break repair pathways, and clinical trial milestones in treating monogenic disorders.',
    content: `# CRISPR-Cas9 Gene Editing in Human Therapeutics

## Abstract
The clustered regularly interspaced short palindromic repeats (CRISPR)-associated Cas9 endonuclease system has revolutionized genomic medicine. By utilizing a single-guide RNA (sgRNA) complementary to a 20-nucleotide target sequence adjacent to a protospacer adjacent motif (PAM, 5'-NGG-3'), Cas9 induces precise double-strand breaks (DSBs).`
  },
  {
    id: 'starter-quantum-supremacy',
    title: 'Quantum Computational Supremacy on Sycamore.pdf',
    source: 'Quantum Systems Lab',
    category: 'PDFs',
    mimeType: 'application/pdf',
    topic: 'science',
    sizeFormatted: '890 KB',
    date: 'Oct 28',
    timestamp: Date.now() - 86400000 * 20,
    excerpt: 'Experimental demonstration of quantum supremacy sampling pseudo-random quantum circuits in 200 seconds on a 53-qubit superconducting processor.',
    content: `# Quantum Computational Supremacy Using a Superconducting Processor

## Overview
We demonstrate computational supremacy using a programmable superconducting quantum processor named **Sycamore**. The processor comprises a two-dimensional grid of 54 transmon qubits (53 operational, 1 disabled) with tunable capacitive couplers.`
  },

  // ── Docs & Manuscripts ──
  {
    id: 'starter-gemini-spec',
    title: 'Gemini 1.5 Pro: Multimodal Architecture Spec.docx',
    source: 'Research Lab · Specs',
    category: 'Docs',
    mimeType: 'application/vnd.google-apps.document',
    topic: 'ai',
    sizeFormatted: '1.4 MB',
    date: 'Synced',
    timestamp: Date.now() - 86400000 * 3,
    excerpt: 'Evaluation of 1M+ token context window, audio-video tensor comprehension, and needle-in-a-haystack retrieval performance.',
    content: `# Gemini 1.5 Pro: Multimodal Architecture Spec

## Executive Summary
Gemini 1.5 Pro represents a breakthrough in long-context multimodal foundation models. Capable of recalling information across 1,000,000+ tokens of text, audio, and video with 99.7% retrieval accuracy on needle-in-a-haystack benchmarks.`
  },
  {
    id: 'starter-deepseek-report',
    title: 'DeepSeek-V3 Technical Architecture Evaluation.docx',
    source: 'Lab Papers · Review',
    category: 'Docs',
    mimeType: 'application/vnd.google-apps.document',
    topic: 'ai',
    sizeFormatted: '860 KB',
    date: 'Synced',
    timestamp: Date.now() - 86400000 * 6,
    excerpt: 'Multi-head latent attention (MLA) and DeepSeekMoE architecture benchmarks on standard reasoning datasets.',
    content: `# DeepSeek-V3 Technical Architecture Evaluation

## Key Architectural Highlights
1. **Multi-Head Latent Attention (MLA)**: Low-rank key-value joint compression reducing inference memory footprint by over 70%.
2. **DeepSeekMoE**: Fine-grained expert routing with shared and routed expert specialization.`
  },

  // ── Spreadsheets & Tabular Datasets ──
  {
    id: 'starter-benchmark-metrics',
    title: 'Reasoning Benchmark Evaluation Matrix.csv',
    source: 'Lab Data · Analytics',
    category: 'Sheets',
    mimeType: 'text/csv',
    topic: 'ai',
    sizeFormatted: '48 KB',
    date: 'Today',
    timestamp: Date.now() - 86400000,
    excerpt: 'Accuracy, throughput (tokens/sec), first-token latency, and MMLU-Pro benchmark scores across cutting-edge frontier models.',
    content: `# Reasoning Benchmark Evaluation Matrix

| Model | MMLU-Pro | MATH 500 | HumanEval | Throughput (t/s) | First-Token Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Gemini 1.5 Pro | 84.7% | 67.7% | 84.1% | 110 t/s | 240 ms |
| DeepSeek-V3 | 82.6% | 65.4% | 82.6% | 95 t/s | 310 ms |
| Claude 3.5 Sonnet | 88.3% | 71.1% | 92.0% | 85 t/s | 280 ms |
| GPT-4o | 86.2% | 68.9% | 90.2% | 105 t/s | 260 ms |`
  },
  {
    id: 'starter-token-economics',
    title: 'Cluster Compute & Inference Economics.xlsx',
    source: 'Operations · Finance',
    category: 'Sheets',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    topic: 'tech',
    sizeFormatted: '112 KB',
    date: 'Yesterday',
    timestamp: Date.now() - 86400000 * 2,
    excerpt: 'Hardware amortization, energy overhead per million generated tokens, and speculative batching efficiency matrix.',
    content: `# Cluster Compute & Inference Economics

| Cluster Node | Accelerator Type | Active VRAM | Cost / 1M Tokens (Input) | Cost / 1M Tokens (Output) | Speculative Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Primary H100 SXM | 8x H100 80GB | 640 GB | $0.85 | $2.40 | 2.4x |
| Edge Infer L40S | 4x L40S 48GB | 192 GB | $0.40 | $1.20 | 1.8x |
| Cloud TPU v5e | 16-pod slice | 256 GB | $0.35 | $1.05 | 2.1x |`
  },

  // ── Presentations & Decks ──
  {
    id: 'starter-multimodal-keynote',
    title: 'Autonomous Agents & Multimodal AI 2026.pptx',
    source: 'Keynote · Deck',
    category: 'Slides',
    mimeType: 'application/vnd.google-apps.presentation',
    topic: 'ai',
    sizeFormatted: '6.4 MB',
    date: 'Synced',
    timestamp: Date.now() - 86400000 * 4,
    excerpt: 'Executive presentation deck covering vision-language models, live bidirectional audio streams, and tool use.',
    content: `# Autonomous Agents & Multimodal AI 2026

## Slide 1: The Frontier Paradigm
- From reactive chatbots to proactive multi-agent orchestration.
- Zero-latency bidirectional streaming with native audio and vision tokens.

## Slide 2: Grounding and Tool Use
- Deterministic sandbox execution.
- Verified provenance citations directly anchored into user workspace files.`
  },
  {
    id: 'starter-safety-briefing',
    title: 'Frontier AI Safety & Alignment Briefing.gslides',
    source: 'Executive Brief · Slides',
    category: 'Slides',
    mimeType: 'application/vnd.google-apps.presentation',
    topic: 'ai',
    sizeFormatted: '3.1 MB',
    date: 'This week',
    timestamp: Date.now() - 86400000 * 5,
    excerpt: 'Slide overview of red-teaming vectors, self-correcting alignment constitutions, and automated governance protocols.',
    content: `# Frontier AI Safety & Alignment Briefing

## Slide 1: Alignment Verification Pillars
- Constitutional constraints evaluated at inference time.
- Automated adversarial testing and boundary probes.

## Slide 2: Deployment Safeties
- Memory-only client keys without persistent disk logging.
- Complete local loopback data privacy.`
  },

  // ── Lab Notes & Markdown ──
  {
    id: 'starter-crypto-vault-notes',
    title: 'Client-Side Cryptographic Vaults Specification.md',
    source: 'Lab Notes · Architecture',
    category: 'Notes',
    mimeType: 'text/markdown',
    topic: 'tech',
    sizeFormatted: '180 KB',
    date: 'Today',
    timestamp: Date.now(),
    excerpt: 'Detailed specification of the AES-GCM-256 PBKDF2 hardware-bound client vault ensuring zero plaintext credential leakage to localStorage or network inspect.',
    content: `# Client-Side Cryptographic Vaults and Hardware-Bound Secrecy

## Architecture Overview
In cloud-assisted research workflows, browser extensions, telemetry scripts, and local disk inspection present significant credential theft vectors. The NBLMimic CryptoVault implements a zero-trust, client-bound encryption layer using the standard W3C Web Cryptography API (\`window.crypto.subtle\`).

## Cryptographic Primitives
1. **Key Derivation Function (KDF)**:
   - Algorithm: PBKDF2 (Password-Based Key Derivation Function 2)
   - Iterations: 100,000 rounds of HMAC-SHA-256
   - Salt: 128-bit cryptographically secure pseudo-random number persisted locally
2. **Hardware Fingerprint Entropy**:
   - Entropy gathered from screen resolution, color depth, logical CPU cores, and platform attributes
   - Guarantees derived keys cannot be extracted and decrypted across distinct physical devices or isolated browser profiles
3. **Symmetric Cipher**:
   - Algorithm: AES-GCM (Galois/Counter Mode) with 256-bit key length
   - Initialization Vector (IV): Unique 96-bit (12-byte) random nonce generated per encryption transaction
   - Authenticated Data: Provides authenticated encryption with associated data (AEAD) to detect tampering`
  },
  {
    id: 'starter-multimodal-experiment',
    title: 'Multimodal Gemini 3.8 Experiment Log.md',
    source: 'Lab Notes · Experiment',
    category: 'Notes',
    mimeType: 'text/markdown',
    topic: 'tech',
    sizeFormatted: '5.1 KB',
    date: 'Yesterday',
    timestamp: Date.now() - 86400000,
    excerpt: 'Real-time bidirectional audio capture testing with 16kHz PCM input and speculative token streaming down to edge clients.',
    content: `# Multimodal Gemini 3.8 Experiment Log

## Experiment Objectives
Verify 16kHz PCM audio streaming performance over WebSocket connection with real-time speech activity detection (VAD).

## Benchmark Observations
- Input chunk duration: 40ms frames at 16000 samples/sec.
- Server turn-taking latency: approx 180ms average before first audio buffer playback.
- Hardware mic normalization: high-pass filter at 80Hz suppresses mechanical desk rumble.`
  }
];

export function getFileIconName(mimeType = '', fileName = '') {
  const name = (fileName || '').toLowerCase();
  if (mimeType.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
    return 'file-text';
  }
  if (mimeType.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return 'file-spreadsheet';
  }
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) {
    return 'file-pdf';
  }
  return 'file';
}

// ── Live World News Aggregator & Cache (Last 72 Hours) ──
let cachedWorldNews = [];
let activeNewsCategory = 'all';

export async function fetchWorldNews(force = false) {
  try {
    const res = await fetch('/api/news' + (force ? '?refresh=1' : ''));
    if (!res.ok) return cachedWorldNews;
    const data = await res.json();
    cachedWorldNews = data.articles || [];
    return cachedWorldNews;
  } catch (err) {
    console.warn('[World News] Could not fetch live news:', err);
    return cachedWorldNews;
  }
}

// ── Default Workspace Starter Population (Strictly Research Documents) ──
export function loadDefaultWorkspaceSources() {
  const current = state.get('sources');
  if (current && current.length > 0 && current.some(s => s.source === 'Google Drive')) {
    return;
  }

  // Populate starter papers strictly — do NOT mix in raw RSS feeds
  state.set('sources', [...DEFAULT_STARTER_PAPERS]);

  // Default ground the first 3 papers
  const activeIds = state.get('activeSourceIds');
  if (activeIds.size === 0) {
    DEFAULT_STARTER_PAPERS.slice(0, 3).forEach(p => activeIds.add(p.id));
  }

  // Do not force select paper so default Folders gallery displays immediately
  renderSources();
  updateCanvasView();
}

// ── Render Source Library Tree ──
export function renderSources() {
  const container = document.getElementById('sources-list-container');
  if (!container) return;

  const sources = state.get('sources');
  const isDriveConnected = state.get('isDriveConnected');
  const activeIds = state.get('activeSourceIds');
  const selectedDocId = state.get('selectedDocId');
  const filterCat = state.get('filterCategory');
  const filterTag = state.get('filterTag');
  const searchQuery = state.get('searchQuery');

  // If unauthenticated and empty, load default starter papers so UI is immediately rich & usable
  if (!isDriveConnected && (!sources || sources.length === 0)) {
    loadDefaultWorkspaceSources();
    return;
  }

  // Total count badges
  const totalCountEl = document.getElementById('sidebar-total-count');
  if (totalCountEl) totalCountEl.textContent = String(sources.length);

  const groundingCountEl = document.getElementById('composer-grounding-count');
  if (groundingCountEl) groundingCountEl.textContent = `${activeIds.size} sources in context`;

  // Filter sources
  const filtered = sources.filter(s => {
    // 1. Segmented Filter (All, Drive, Docs, PDFs, Notes)
    if (filterCat && filterCat !== 'all') {
      const cat = filterCat.toLowerCase();
      const sCat = (s.category || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      if (cat === 'drive' && s.source !== 'Google Drive') return false;
      if (cat === 'docs' && !sCat.includes('doc') && !title.endsWith('.doc') && !title.endsWith('.docx')) return false;
      if (cat === 'pdfs' && !sCat.includes('pdf') && !title.endsWith('.pdf')) return false;
      if (cat === 'notes' && !sCat.includes('note') && !title.endsWith('.md') && !title.endsWith('.txt')) return false;
    }

    // 2. Tag Dropdown Filter
    if (filterTag && filterTag !== 'all') {
      const tag = filterTag.toLowerCase();
      const combined = `${s.title} ${s.category} ${s.topic || ''} ${s.excerpt || ''}`.toLowerCase();
      if (!combined.includes(tag)) return false;
    }

    // 3. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const combined = `${s.title} ${s.category} ${s.source || ''} ${s.excerpt || ''} ${s.content || ''}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: var(--space-6) var(--space-4); text-align: center; color: var(--text-tertiary);">
        <div style="font-size: 12.5px; font-weight: 500; color: var(--text-secondary); margin-bottom: 2px;">No documents match filter</div>
        <p style="font-size: 11.5px; color: var(--text-tertiary);">Try adjusting your search query or topic filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(source => {
    const isChecked = activeIds.has(source.id);
    const isSelected = selectedDocId === source.id;
    const iconName = getFileIconName(source.mimeType, source.title);

    const row = document.createElement('div');
    row.className = `source-row ${isSelected ? 'is-selected' : ''}`;
    row.dataset.docId = source.id;

    row.innerHTML = `
      <div class="source-checkbox-wrap" title="Include in Grounding Context">
        <input type="checkbox" class="source-checkbox" ${isChecked ? 'checked' : ''} aria-label="Ground document">
      </div>
      <div class="source-row-icon">
        ${getIcon(iconName, 14)}
      </div>
      <div class="source-row-title" title="${escapeHtml(source.title)}">${escapeHtml(source.title)}</div>
      <div class="source-row-meta">${escapeHtml(source.sizeFormatted || 'Doc')}</div>
    `;

    // Clean click delegation: checkbox toggles grounding, row selects document
    row.addEventListener('click', (e) => {
      const chk = row.querySelector('.source-checkbox');
      if (e.target === chk) {
        toggleGrounding(source.id, chk.checked);
      } else if (e.target.closest('.source-checkbox-wrap')) {
        if (chk) {
          chk.checked = !chk.checked;
          toggleGrounding(source.id, chk.checked);
        }
      } else {
        viewDocument(source.id);
      }
    });

    container.appendChild(row);
  });
}

export function toggleGrounding(docId, checked) {
  const activeIds = state.get('activeSourceIds');
  if (checked) {
    activeIds.add(docId);
  } else {
    activeIds.delete(docId);
  }

  const countEl = document.getElementById('composer-grounding-count');
  if (countEl) {
    countEl.textContent = `${activeIds.size} sources in context`;
    countEl.classList.remove('is-flashing');
    void countEl.offsetWidth; // trigger reflow
    countEl.classList.add('is-flashing');
    setTimeout(() => countEl.classList.remove('is-flashing'), 1000);
  }

  state.emit('activeSourceIds', activeIds);
}

export async function viewDocument(docId) {
  state.set('selectedDocId', docId);
  try {
    sessionStorage.setItem('nbl_selected_doc_id', docId);
  } catch (e) {}

  if (state.get('viewMode') === 'folders') {
    state.set('viewMode', 'reader');
    document.querySelectorAll('.canvas-mode-btn').forEach(b => {
      if (b.dataset.mode === 'reader') b.classList.add('is-active');
      else b.classList.remove('is-active');
    });
  }

  // Update selected class in DOM
  document.querySelectorAll('.source-row').forEach(r => {
    if (r.dataset.docId === docId) {
      r.classList.add('is-selected');
      r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      r.classList.remove('is-selected');
    }
  });

  updateCanvasView();

  const sources = state.get('sources');
  const doc = sources.find(s => s.id === docId);
  if (doc && doc.driveFileId && state.get('driveToken')) {
    // Generate local same-origin Blob URL in background to guarantee instant zero-cookie viewing
    if (!doc.blobUrl) {
      fetchDriveDocumentBlob(doc).then(res => {
        if (res && res.blobUrl) {
          doc.blobUrl = res.blobUrl;
          activeBlobController = res;
          if (state.get('selectedDocId') === doc.id) {
            document.querySelectorAll('iframe.drive-preview-iframe, iframe.reader-embed-iframe').forEach(iframe => {
              if (iframe.src && iframe.src.includes('/api/drive/file')) {
                iframe.src = res.blobUrl + '#view=FitH&toolbar=1';
              }
            });
          }
        }
      }).catch(() => {});
    }

    if (doc.content === null) {
      try {
        const fetched = await fetchDriveDocumentContent(doc);
        if (fetched && !isBinaryContent(fetched)) {
          doc.content = fetched;
          const currentMode = state.get('viewMode');
          if (currentMode === 'reader') {
            renderProseReader(doc, 'reader-prose-mount');
          } else if (currentMode === 'split') {
            renderProseReader(doc, 'split-prose-mount');
          }
        }
      } catch (e) {}
    }
  }
}

let activeBlobController = null;
export function cleanupActiveBlob() {
  if (activeBlobController) {
    try {
      activeBlobController.revoke();
    } catch (e) {}
    activeBlobController = null;
  }
}
window.addEventListener('beforeunload', cleanupActiveBlob);

export function getSafeDocumentStreamUrl(doc) {
  if (!doc) return null;
  if (doc.blobUrl) return doc.blobUrl;
  const token = state.get('driveToken');
  if (doc.driveFileId && token) {
    return `/api/drive/file?id=${encodeURIComponent(doc.driveFileId)}&mime=${encodeURIComponent(doc.mimeType || '')}&token=${encodeURIComponent(token)}`;
  }
  return null;
}
window.getSafeDocumentStreamUrl = getSafeDocumentStreamUrl;

export function switchCanvasMode(mode) {
  state.set('viewMode', mode);
  document.querySelectorAll('.canvas-mode-btn').forEach(b => {
    if (b.getAttribute('data-mode') === mode) {
      b.classList.add('is-active');
    } else {
      b.classList.remove('is-active');
    }
  });
  const headerNewsBtn = document.getElementById('btn-header-live-news');
  if (headerNewsBtn) {
    if (mode === 'news') headerNewsBtn.classList.add('is-active');
    else headerNewsBtn.classList.remove('is-active');
  }
  updateCanvasView();
}
window.switchCanvasMode = switchCanvasMode;

export function navigateBackToFolders() {
  state.set('selectedDocId', null);
  try {
    sessionStorage.removeItem('nbl_selected_doc_id');
  } catch (e) {}
  state.set('viewMode', 'folders');
  document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('is-active'));
  const foldersTab = document.getElementById('tab-canvas-folders');
  if (foldersTab) foldersTab.classList.add('is-active');
  const headerNewsBtn = document.getElementById('btn-header-live-news');
  if (headerNewsBtn) headerNewsBtn.classList.remove('is-active');
  updateCanvasView();
}
window.navigateBackToFolders = navigateBackToFolders;

export function updateCanvasView() {
  const container = document.getElementById('canvas-content-mount');
  const metaBar = document.getElementById('canvas-meta-bar');
  const metaLeft = document.getElementById('canvas-meta-left');
  const externalLinkBtn = document.getElementById('btn-open-external-drive');
  const canvasBackBtn = document.getElementById('btn-canvas-back-folders');
  const breadcrumbView = document.getElementById('btn-breadcrumb-view');

  if (!container) return;

  const viewMode = state.get('viewMode');

  // 0. Dedicated Live World News View (72 Hours)
  if (viewMode === 'news') {
    if (canvasBackBtn) canvasBackBtn.style.display = 'inline-flex';
    if (breadcrumbView) breadcrumbView.textContent = 'World News (72h)';
    if (metaBar && metaLeft) {
      metaBar.style.display = 'flex';
      metaLeft.innerHTML = `
        <span class="live-dot-emerald" style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); display: inline-block;"></span>
        <span class="canvas-meta-title">Live World News &middot; Last 72 Hours</span>
        <span class="canvas-meta-sep">&middot;</span>
        <span>Global Wire Feeds</span>
      `;
    }
    if (externalLinkBtn) externalLinkBtn.style.display = 'none';
    renderWorldNewsView(container);
    return;
  }

  const isConnected = state.get('isDriveConnected');
  const selectedDocId = state.get('selectedDocId');
  const sources = state.get('sources');

  // 1. Folders View OR No Document Selected -> Render 3D Glass Folder Cards Gallery
  if (viewMode === 'folders' || !selectedDocId) {
    if (canvasBackBtn) canvasBackBtn.style.display = 'none';
    if (breadcrumbView) breadcrumbView.textContent = 'Collections';
    if (metaBar && metaLeft) {
      metaBar.style.display = 'flex';
      metaLeft.innerHTML = `
        <span class="canvas-meta-title">Collections &middot; 3D Glass Folders</span>
        <span class="canvas-meta-sep">&middot;</span>
        <span>Interactive Vault</span>
      `;
    }
    if (externalLinkBtn) externalLinkBtn.style.display = 'none';
    renderGlassFolderGallery(
      container,
      sources || [],
      (file) => {
        if (file && file.id) {
          const currentSources = state.get('sources') || [];
          if (!currentSources.some(s => s.id === file.id)) {
            currentSources.push(file);
            state.set('sources', [...currentSources]);
          }
          viewDocument(file.id);
          state.set('viewMode', 'reader');
          document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('is-active'));
          const readerBtn = document.querySelector('.canvas-mode-btn[data-mode="reader"]');
          if (readerBtn) readerBtn.classList.add('is-active');
        }
      },
      () => {
        openModal('add-source-modal');
      }
    );
    return;
  }

  // 3. Document Selected State
  const doc = sources.find(s => s.id === selectedDocId);
  if (!doc) {
    state.set('selectedDocId', null);
    updateCanvasView();
    return;
  }

  if (canvasBackBtn) canvasBackBtn.style.display = 'inline-flex';
  if (breadcrumbView) breadcrumbView.textContent = doc.title;

  // Show metadata bar
  if (metaBar && metaLeft) {
    metaBar.style.display = 'flex';
    metaLeft.innerHTML = `
      ${getIcon(getFileIconName(doc.mimeType, doc.title), 14)}
      <span class="canvas-meta-title" title="${escapeHtml(doc.title)}">${escapeHtml(doc.title)}</span>
      <span class="canvas-meta-sep">&middot;</span>
      <span>${escapeHtml(doc.sizeFormatted || 'Document')}</span>
      <span class="canvas-meta-sep">&middot;</span>
      <span>Modified ${escapeHtml(doc.date || 'Recent')}</span>
    `;
  }

  if (externalLinkBtn) {
    const extUrl = doc.webViewLink || doc.url;
    if (extUrl) {
      externalLinkBtn.href = extUrl;
      externalLinkBtn.style.display = 'inline-flex';
    } else {
      externalLinkBtn.style.display = 'none';
    }
  }

  // Render based on active viewMode
  const streamUrl = getSafeDocumentStreamUrl(doc);

  if (viewMode === 'preview') {
    if (streamUrl) {
      container.innerHTML = `
        <div class="drive-preview-wrapper">
          <iframe src="${streamUrl}" class="drive-preview-iframe" allow="autoplay; fullscreen" title="${escapeHtml(doc.title)}"></iframe>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="reader-canvas-body">
          <div id="reader-prose-mount"></div>
        </div>
      `;
      renderProseReader(doc, 'reader-prose-mount');
    }
  } else if (viewMode === 'split') {
    if (streamUrl) {
      container.innerHTML = `
        <div class="reader-canvas-body split-mode">
          <div style="overflow-y: auto; height: 100%; border-right: 1px solid var(--border-subtle);">
            <div id="split-prose-mount"></div>
          </div>
          <div class="drive-preview-wrapper">
            <iframe src="${streamUrl}" class="drive-preview-iframe" allow="autoplay; fullscreen" title="${escapeHtml(doc.title)}"></iframe>
          </div>
        </div>
      `;
      renderProseReader(doc, 'split-prose-mount');
    } else {
      container.innerHTML = `
        <div class="reader-canvas-body">
          <div id="reader-prose-mount"></div>
        </div>
      `;
      renderProseReader(doc, 'reader-prose-mount');
    }
  } else {
    // Reader View (default editorial prose)
    container.innerHTML = `
      <div class="reader-canvas-body">
        <div id="reader-prose-mount"></div>
      </div>
    `;
    renderProseReader(doc, 'reader-prose-mount');
  }
}

// ── World News View Renderer ──
export async function renderWorldNewsView(container) {
  if (!container) container = document.getElementById('canvas-content-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="world-news-container">
      <div class="world-news-header">
        <div class="world-news-title-row">
          <div class="world-news-title-group" style="display:flex; align-items:center; gap:var(--space-2);">
            <button class="btn btn-secondary btn-sm" id="btn-news-back-to-folders" style="display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; font-size:12px; margin-right:4px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Back</span>
            </button>
            <span class="news-live-pill">
              <span class="live-dot-emerald"></span>
              LIVE FEED
            </span>
            <h2 class="world-news-title">Global News Briefing</h2>
          </div>
          <button class="btn btn-ghost btn-sm news-refresh-btn" id="btn-refresh-world-news" title="Refresh Live Feeds">
            ${getIcon('refresh-cw', 13)}
            <span>Refresh 72h</span>
          </button>
        </div>
        <p class="world-news-desc">
          Aggregated real-time headlines across Geopolitics, AI, Science, Markets, and Policy strictly published within the last 3 days. Ground any story into your active research context with one click.
        </p>
        <div class="world-news-filters" id="world-news-filter-bar">
          <button class="news-filter-pill ${activeNewsCategory === 'all' ? 'is-active' : ''}" data-cat="all">All World</button>
          <button class="news-filter-pill ${activeNewsCategory === 'world' ? 'is-active' : ''}" data-cat="world">Geopolitics &amp; World</button>
          <button class="news-filter-pill ${activeNewsCategory === 'ai & tech' ? 'is-active' : ''}" data-cat="ai & tech">AI &amp; Tech</button>
          <button class="news-filter-pill ${activeNewsCategory === 'science' ? 'is-active' : ''}" data-cat="science">Science</button>
          <button class="news-filter-pill ${activeNewsCategory === 'markets' ? 'is-active' : ''}" data-cat="markets">Global Markets</button>
        </div>
      </div>
      <div class="world-news-grid" id="world-news-cards-mount">
        <div style="grid-column: 1 / -1; padding: var(--space-8); text-align: center; color: var(--text-tertiary); font-size: 13px;">
          Loading global 72-hour feeds...
        </div>
      </div>
    </div>
  `;

  const refreshBtn = container.querySelector('#btn-refresh-world-news');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('is-refreshing');
      await fetchWorldNews(true);
      refreshBtn.classList.remove('is-refreshing');
      renderNewsCardsGrid(cachedWorldNews, container.querySelector('#world-news-cards-mount'), activeNewsCategory);
      showToast('Live 72-hour news feed refreshed');
    });
  }

  const filterBar = container.querySelector('#world-news-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.news-filter-pill');
      if (!btn) return;
      filterBar.querySelectorAll('.news-filter-pill').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeNewsCategory = btn.dataset.cat || 'all';
      renderNewsCardsGrid(cachedWorldNews, container.querySelector('#world-news-cards-mount'), activeNewsCategory);
    });
  }

  // Fetch or use cache
  if (cachedWorldNews.length === 0) {
    await fetchWorldNews(false);
  }
  renderNewsCardsGrid(cachedWorldNews, container.querySelector('#world-news-cards-mount'), activeNewsCategory);
}

function formatTimeAgo(ts) {
  if (!ts) return 'Recent';
  const time = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (isNaN(time)) return 'Recent';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function renderNewsCardsGrid(articles, mountEl, category = 'all') {
  if (!mountEl) return;

  const sources = state.get('sources');
  const filtered = (articles || []).filter(a => {
    if (!category || category === 'all') return true;
    const cat = (a.category || '').toLowerCase();
    if (category === 'world') return cat.includes('world') || cat.includes('geopolitics');
    if (category === 'ai & tech') return cat.includes('ai') || cat.includes('tech');
    if (category === 'science') return cat.includes('science');
    if (category === 'markets') return cat.includes('market') || cat.includes('business');
    return cat.includes(category);
  });

  if (filtered.length === 0) {
    mountEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: var(--space-8); text-align: center; color: var(--text-tertiary);">
        <p style="font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">No stories in this category</p>
        <p style="font-size: 12px;">Try switching to 'All World' or refreshing the live feed.</p>
      </div>
    `;
    return;
  }

  mountEl.innerHTML = '';
  filtered.forEach(art => {
    const isAlreadyImported = sources.some(s => s.id === art.id || (s.url && s.url === art.url));
    const card = document.createElement('article');
    card.className = 'news-card';

    const timeAgo = formatTimeAgo(art.timestamp || art.pubDate);

    card.innerHTML = `
      <div class="news-card-meta">
        <span class="news-publisher-badge">${escapeHtml(art.publisher || art.source || 'World Wire')}</span>
        <span class="news-card-time">${escapeHtml(timeAgo)}</span>
        <span class="news-cat-pill">${escapeHtml(art.category || 'World')}</span>
      </div>
      <h3 class="news-card-title">
        <a href="${escapeHtml(art.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(art.title)}</a>
      </h3>
      <p class="news-card-snippet">${escapeHtml(art.snippet || art.excerpt || '')}</p>
      <div class="news-card-footer">
        <a href="${escapeHtml(art.url || '#')}" target="_blank" rel="noopener noreferrer" class="news-card-link">
          <span>Open Original</span>
          ${getIcon('external-link', 11)}
        </a>
        <button class="btn-import-source ${isAlreadyImported ? 'is-imported' : ''}" data-news-id="${escapeHtml(art.id)}">
          ${isAlreadyImported ? getIcon('check', 11) : getIcon('plus', 11)}
          <span>${isAlreadyImported ? 'Imported' : 'Import to Sources'}</span>
        </button>
      </div>
    `;

    const importBtn = card.querySelector('.btn-import-source');
    if (importBtn && !isAlreadyImported) {
      importBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        importNewsArticleToSources(art, importBtn);
      });
    }

    mountEl.appendChild(card);
  });
}

export function importNewsArticleToSources(art, btnEl) {
  const sources = state.get('sources');
  const activeIds = state.get('activeSourceIds');

  if (sources.some(s => s.id === art.id || (s.url && s.url === art.url))) {
    showToast('Story already in source library');
    return;
  }

  const newSource = {
    id: art.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: art.title,
    source: art.publisher || art.source || 'World News',
    category: 'News',
    topic: (art.category || 'world').toLowerCase(),
    url: art.url,
    sizeFormatted: 'Live Wire',
    date: 'Today',
    timestamp: typeof art.timestamp === 'number' ? art.timestamp : Date.now(),
    excerpt: art.snippet || art.excerpt || '',
    content: `# ${art.title}\n\n**Source**: ${art.publisher || 'World News'} (${art.category || 'World'})\n**Published**: ${new Date(art.timestamp || Date.now()).toUTCString()}\n**Original URL**: ${art.url || 'N/A'}\n\n## Overview\n${art.snippet || art.excerpt || 'Live news article imported into research grounding.'}\n\n## Synthesis Context\nThis article was imported from the 72-hour live world news feed for immediate grounding and synthesis.`
  };

  sources.unshift(newSource);
  activeIds.add(newSource.id);

  if (btnEl) {
    btnEl.classList.add('is-imported');
    btnEl.innerHTML = `${getIcon('check', 11)} <span>Imported</span>`;
    btnEl.disabled = true;
  }

  // Flash grounding count badge
  const countEl = document.getElementById('composer-grounding-count');
  if (countEl) {
    countEl.textContent = `${activeIds.size} sources in context`;
    countEl.classList.remove('is-flashing');
    void countEl.offsetWidth;
    countEl.classList.add('is-flashing');
    setTimeout(() => countEl.classList.remove('is-flashing'), 1000);
  }

  renderSources();
  showToast(`Imported "${art.title.slice(0, 30)}..." to Sources`);
}

export function isBinaryDocument(doc) {
  if (!doc) return false;
  const mime = (doc.mimeType || '').toLowerCase();
  const name = (doc.title || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return true;
  if (mime.includes('document') || mime.includes('word') || mime.includes('officedocument') || name.endsWith('.docx') || name.endsWith('.doc')) return true;
  if (mime.includes('sheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return true;
  if (mime.includes('presentation') || mime.includes('powerpoint') || name.endsWith('.pptx') || name.endsWith('.ppt')) return true;
  if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) return true;
  return false;
}

export function getFormatBadgeClass(doc) {
  const cat = (doc.category || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();
  const name = (doc.title || '').toLowerCase();
  if (cat === 'pdfs' || mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (cat === 'docs' || mime.includes('document') || mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'doc';
  if (cat === 'sheets' || mime.includes('spreadsheet') || mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'sheet';
  if (cat === 'slides' || mime.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) return 'slide';
  return 'note';
}

export function getFileFormatLabel(doc) {
  const cat = (doc.category || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();
  const name = (doc.title || '').toLowerCase();
  if (cat === 'pdfs' || mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF Manuscript';
  if (mime.includes('google-apps.document')) return 'Google Docs';
  if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'Word Document';
  if (mime.includes('google-apps.spreadsheet')) return 'Google Sheets';
  if (mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'Spreadsheet';
  if (mime.includes('google-apps.presentation')) return 'Google Slides';
  if (mime.includes('presentation') || name.endsWith('.pptx')) return 'Slide Deck';
  if (name.endsWith('.md')) return 'Markdown';
  return doc.category || 'Document';
}

export function renderProseReader(doc, mountId = 'reader-prose-mount') {
  const mount = document.getElementById(mountId);
  if (!mount || !doc) return;

  // Purge any corrupted raw binary byte strings from memory/cache
  if (doc.content && isBinaryContent(doc.content)) {
    doc.content = null;
  }

  const isBinary = isBinaryDocument(doc);
  const isSplitMode = mountId === 'split-prose-mount';
  const streamUrl = getSafeDocumentStreamUrl(doc);

  const badgeClass = getFormatBadgeClass(doc);
  const formatLabel = getFileFormatLabel(doc);
  const excerptText = doc.excerpt || (generateDocumentExcerpt ? generateDocumentExcerpt(doc, doc.category, doc.sizeFormatted, doc.date) : `Verified cloud document "${doc.title}".`);

  // Detect clean readable prose text
  const hasCleanText = doc.content && typeof doc.content === 'string' && !isBinaryContent(doc.content);
  const words = hasCleanText ? doc.content.split(/\s+/).filter(Boolean).length : 0;
  const readMins = Math.ceil(words / 200) || 1;

  let metaDetails = '';
  if (hasCleanText) {
    metaDetails = `
      <span>${readMins} min read</span>
      <span>&middot;</span>
      <span>${words.toLocaleString()} words</span>
      <span>&middot;</span>
      <span>${escapeHtml(doc.sizeFormatted || 'Cloud Document')}</span>
      <span>&middot;</span>
      <span>${escapeHtml(doc.source || 'Drive Vault')}</span>
    `;
  } else {
    metaDetails = `
      <span>${escapeHtml(formatLabel)}</span>
      <span>&middot;</span>
      <span>${escapeHtml(doc.sizeFormatted || 'Cloud File')}</span>
      <span>&middot;</span>
      <span>Modified ${escapeHtml(doc.date || 'Recent')}</span>
      <span>&middot;</span>
      <span>${escapeHtml(doc.source || 'Google Drive')}</span>
    `;
  }

  // Determine active sub-mode (Original Document Layout vs Clean Study Text)
  // For files with streamUrl or Drive documents (Google Docs, Word Docs, PDFs):
  // default to 'original' so the user sees the original design layout and spacing!
  const hasStream = Boolean(streamUrl || doc.driveFileId);
  let activeSubMode = 'original';
  if (!hasStream && hasCleanText) {
    activeSubMode = 'text';
  } else if (window.currentDocReaderSubMode) {
    activeSubMode = window.currentDocReaderSubMode;
  }

  // Dossier Card with quick actions and submode switcher
  const dossierCardHtml = `
    <div class="reader-dossier-card">
      <div class="reader-dossier-header">
        <div class="reader-dossier-badge-group">
          <span class="reader-format-badge badge-${badgeClass}">
            ${escapeHtml(formatLabel)}
          </span>
          <span class="reader-status-pill">
            <span class="pulse-dot"></span> Cloud Verified
          </span>
        </div>
        <div class="reader-quick-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.switchCanvasMode('preview')" title="Switch to Full Screen Native Preview">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            <span>Full Screen</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.switchCanvasMode('split')" title="Switch to Split View">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            <span>Split View</span>
          </button>
          ${doc.webViewLink ? `
            <a href="${escapeHtml(doc.webViewLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Open directly in Google Drive">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Drive &nearr;</span>
            </a>
          ` : ''}
        </div>
      </div>
      <p class="reader-dossier-excerpt">${escapeHtml(excerptText)}</p>
      ${!isSplitMode && (hasStream || hasCleanText) ? `
        <div class="reader-submode-tabs">
          <button type="button" class="reader-submode-btn ${activeSubMode === 'original' ? 'is-active' : ''}" id="btn-submode-original" onclick="window.setDocReaderSubMode('original')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <span>Original Document Layout</span>
            <span class="submode-pill-badge">Original Design</span>
          </button>
          <button type="button" class="reader-submode-btn ${activeSubMode === 'text' ? 'is-active' : ''}" id="btn-submode-text" onclick="window.setDocReaderSubMode('text')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Clean Study Text</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // First-party high-definition document stream (zero cross-site cookies, zero popups)
  let embeddedPreviewHtml = '';
  if (streamUrl) {
    embeddedPreviewHtml = `
      <div class="reader-embed-section">
        <div class="reader-embed-toolbar">
          <div class="reader-embed-toolbar-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Original Document Stream &middot; ${escapeHtml(formatLabel)}</span>
            <span class="reader-embed-badge">Zero-Cookie Localhost Stream</span>
          </div>
          <div class="reader-embed-toolbar-right">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.switchCanvasMode('preview')">Full Screen</button>
            ${doc.webViewLink ? `
              <a href="${escapeHtml(doc.webViewLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Open in Google Drive tab">
                <span>Drive &nearr;</span>
              </a>
            ` : ''}
          </div>
        </div>
        <div class="reader-embed-frame-wrapper">
          <iframe src="${streamUrl}" class="reader-embed-iframe" allow="autoplay; fullscreen" title="${escapeHtml(doc.title)}"></iframe>
        </div>
      </div>
    `;
  } else if (doc.driveFileId) {
    embeddedPreviewHtml = `
      <div class="reader-embed-placeholder-card">
        <div class="reader-placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
        </div>
        <h3 class="reader-placeholder-title">Google Drive Stream Ready</h3>
        <p class="reader-placeholder-text">Connect your Google Drive session to stream this document's original design layout directly with zero cross-site cookie blocks or floating popup windows.</p>
        <div class="reader-placeholder-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="window.connectGoogleDrive()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            <span>Connect Drive Session</span>
          </button>
          ${doc.webViewLink ? `
            <a href="${escapeHtml(doc.webViewLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <span>Open in Google Drive &nearr;</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    embeddedPreviewHtml = `
      <div class="reader-embed-placeholder-card">
        <h3 class="reader-placeholder-title">Local Workspace Note</h3>
        <p class="reader-placeholder-text">This document was authored locally. Switch to Clean Study Text to read the full formatted content.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.setDocReaderSubMode('text')">
          <span>Switch to Clean Study Text</span>
        </button>
      </div>
    `;
  }

  // Clean Study Text prose body
  let proseBodyHtml = '';
  if (hasCleanText) {
    proseBodyHtml = `
      <div class="reader-content-body">
        ${formatProseMarkdown(doc.content)}
      </div>
    `;
  } else {
    proseBodyHtml = `
      <div class="reader-content-body">
        <div class="reader-embed-placeholder-card">
          <p class="reader-placeholder-text">Clean study text is not yet loaded for this file. Viewing the Original Document Layout.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.setDocReaderSubMode('original')">
            <span>View Original Document Layout</span>
          </button>
        </div>
      </div>
    `;
  }

  if (isSplitMode) {
    // Split mode renders prose on the left and iframe stream on the right
    mount.innerHTML = `
      <article class="reader-prose-container" style="max-width:100%; padding:var(--space-4);">
        <header class="reader-header">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-3);">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reader-back-to-folders" onclick="window.navigateBackToFolders && window.navigateBackToFolders()" style="display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; font-size:12px; color:var(--text-secondary);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Back to Folders</span>
            </button>
            <div class="reader-tag">${escapeHtml(doc.category || 'Document')}</div>
          </div>
          <h1 class="reader-title">${escapeHtml(doc.title)}</h1>
          <div class="reader-meta-row">
            ${metaDetails}
          </div>
        </header>
        ${dossierCardHtml}
        ${proseBodyHtml}
      </article>
    `;
  } else {
    // Full Reader View: Dual Sub-Mode panes
    mount.innerHTML = `
      <article class="reader-prose-container">
        <header class="reader-header">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-3);">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reader-back-to-folders" onclick="window.navigateBackToFolders && window.navigateBackToFolders()" style="display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; font-size:12px; color:var(--text-secondary);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Back to Folders</span>
            </button>
            <div class="reader-tag">${escapeHtml(doc.category || 'Document')}</div>
          </div>
          <h1 class="reader-title">${escapeHtml(doc.title)}</h1>
          <div class="reader-meta-row">
            ${metaDetails}
          </div>
        </header>
        ${dossierCardHtml}
        <div id="reader-submode-original" class="reader-submode-pane" style="${activeSubMode === 'original' ? '' : 'display:none;'}">
          ${embeddedPreviewHtml}
        </div>
        <div id="reader-submode-text" class="reader-submode-pane" style="${activeSubMode === 'text' ? '' : 'display:none;'}">
          ${proseBodyHtml}
        </div>
      </article>
    `;
  }
}

export function setDocReaderSubMode(mode) {
  window.currentDocReaderSubMode = mode;
  const originalPane = document.getElementById('reader-submode-original');
  const textPane = document.getElementById('reader-submode-text');
  const originalBtn = document.getElementById('btn-submode-original');
  const textBtn = document.getElementById('btn-submode-text');

  if (originalPane) originalPane.style.display = mode === 'original' ? 'block' : 'none';
  if (textPane) textPane.style.display = mode === 'text' ? 'block' : 'none';

  if (originalBtn) {
    if (mode === 'original') originalBtn.classList.add('is-active');
    else originalBtn.classList.remove('is-active');
  }
  if (textBtn) {
    if (mode === 'text') textBtn.classList.add('is-active');
    else textBtn.classList.remove('is-active');
  }
}
window.setDocReaderSubMode = setDocReaderSubMode;

export function formatInlineMarkdown(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  // Code snippets: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold: **text** or __text__
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  safe = safe.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
  safe = safe.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
  // Links: [text](url)
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return safe;
}

export function formatMarkdownTable(tableBlock) {
  const rows = tableBlock.split('\n').map(r => r.trim()).filter(r => r.startsWith('|') && r.endsWith('|'));
  if (rows.length < 2) return `<pre><code>${escapeHtml(tableBlock)}</code></pre>`;

  let html = '<div class="prose-table-wrapper"><table class="prose-table">';
  let hasOpenTbody = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (/^\|[\s:\-|]+\|$/.test(row)) {
      continue;
    }
    const cells = row.slice(1, -1).split('|').map(c => c.trim());
    if (i === 0) {
      html += '<thead><tr>' + cells.map(c => `<th>${formatInlineMarkdown(c)}</th>`).join('') + '</tr></thead><tbody>';
      hasOpenTbody = true;
    } else {
      html += '<tr>' + cells.map(c => `<td>${formatInlineMarkdown(c)}</td>`).join('') + '</tr>';
    }
  }

  if (hasOpenTbody) html += '</tbody>';
  html += '</table></div>';
  return html;
}

export function renderSingleLine(line) {
  if (line.startsWith('# ')) return `<h2>${formatInlineMarkdown(line.slice(2))}</h2>`;
  if (line.startsWith('## ')) return `<h3>${formatInlineMarkdown(line.slice(3))}</h3>`;
  if (line.startsWith('### ')) return `<h4>${formatInlineMarkdown(line.slice(4))}</h4>`;
  if (line.startsWith('> ')) return `<blockquote><p>${formatInlineMarkdown(line.slice(2))}</p></blockquote>`;

  // Question Pattern (Khmer and Latin)
  if (/^(?:សំណួរទី\s*[0-9០-៩]+|សំណួរ\s*[0-9០-៩:៖]|សំណួរទូទៅ|សំណួរជ្រៅ|(?:Question|Q)\s*[0-9]+[:.])/iu.test(line)) {
    return `
      <div class="prose-question-block">
        <div class="prose-block-tag">
          <span class="prose-badge question-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>សំណួរ &middot; QUESTION</span>
          </span>
        </div>
        <div class="prose-question-text">${formatInlineMarkdown(line)}</div>
      </div>
    `;
  }

  // Answer Pattern (Khmer and Latin)
  if (/^(?:ចម្លើយ\s*[:៖]|ចម្លើយសង្ខេប|(?:Answer|Ans|A)\s*[:.])/iu.test(line)) {
    return `
      <div class="prose-answer-block">
        <div class="prose-block-tag">
          <span class="prose-badge answer-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>ចម្លើយ &middot; ANSWER</span>
          </span>
        </div>
        <div class="prose-answer-text">${formatInlineMarkdown(line)}</div>
      </div>
    `;
  }

  // Chapter / Lesson / Section (Khmer and Latin)
  if (/^(?:ជំពូកទី\s*[0-9០-៩]+|មេរៀនទី\s*[0-9០-៩]+|ផ្នែកទី\s*[0-9០-៩]+|(?:Chapter|Lesson|Unit|Part)\s*[0-9]+)/iu.test(line)) {
    return `
      <div class="prose-chapter-header">
        <div class="prose-chapter-tag">
          <span class="prose-badge chapter-badge">SECTION</span>
        </div>
        <h3 class="prose-chapter-title">${formatInlineMarkdown(line)}</h3>
      </div>
    `;
  }

  return `<p class="prose-p">${formatInlineMarkdown(line)}</p>`;
}

export function formatProseMarkdown(text) {
  if (!text) return '';
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Smart Pre-process: insert clean double newlines before Questions, Answers, and Major Chapter Headings
  // Guarantees that even if Google Docs or text export only has single newlines, every question and answer is cleanly isolated
  normalized = normalized.replace(/([^\n])\s*(សំណួរទី\s*[0-9០-៩]+)/gu, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*(ចម្លើយ\s*[:៖])/gu, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*(ជំពូកទី\s*[0-9០-៩]+)/gu, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*(មេរៀនទី\s*[0-9០-៩]+)/gu, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*(ផ្នែកទី\s*[0-9០-៩]+)/gu, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*((?:Question|Q)\s*[0-9]+[:.])/gi, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\s*((?:Answer|Ans|A)\s*[:.])/gi, '$1\n\n$2');

  const hasDoubleNewlines = /\n\s*\n/.test(normalized);
  const rawBlocks = hasDoubleNewlines ? normalized.split(/\n\s*\n+/) : normalized.split(/\n+/);

  const output = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      const lines = trimmed.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n');
      output.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`);
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
      output.push(formatMarkdownTable(trimmed));
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split('\n').map(li => `<li>${formatInlineMarkdown(li.replace(/^[-*]\s+/, ''))}</li>`).join('');
      output.push(`<ul>${items}</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n').map(li => `<li>${formatInlineMarkdown(li.replace(/^\d+\.\s+/, ''))}</li>`).join('');
      output.push(`<ol>${items}</ol>`);
      continue;
    }

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      for (const line of lines) {
        output.push(renderSingleLine(line));
      }
    } else {
      output.push(renderSingleLine(trimmed));
    }
  }

  return output.join('\n');
}

// Window scope exposures for resilient click handlers and external calls
window.toggleGrounding = toggleGrounding;
window.viewDocument = viewDocument;
window.loadDefaultWorkspaceSources = loadDefaultWorkspaceSources;
window.fetchWorldNews = fetchWorldNews;
window.renderWorldNewsView = renderWorldNewsView;
window.importNewsArticleToSources = importNewsArticleToSources;
