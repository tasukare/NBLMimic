function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatInlineMarkdown(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  safe = safe.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
  safe = safe.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return safe;
}

function formatMarkdownTable(tableBlock) {
  const rows = tableBlock.split('\n').map(r => r.trim()).filter(r => r.startsWith('|') && r.endsWith('|'));
  if (rows.length < 2) return `<pre><code>${escapeHtml(tableBlock)}</code></pre>`;

  let html = '<div class="prose-table-wrapper"><table class="prose-table">';
  let isHeader = true;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (/^\|[\s:-|]+\|$/.test(row)) {
      isHeader = false;
      continue;
    }
    const cells = row.slice(1, -1).split('|').map(c => c.trim());
    if (isHeader && i === 0) {
      html += '<thead><tr>' + cells.map(c => `<th>${formatInlineMarkdown(c)}</th>`).join('') + '</tr></thead><tbody>';
    } else {
      html += '<tr>' + cells.map(c => `<td>${formatInlineMarkdown(c)}</td>`).join('') + '</tr>';
    }
  }

  html += '</tbody></table></div>';
  return html;
}

function renderSingleLine(line) {
  if (line.startsWith('# ')) return `<h2>${formatInlineMarkdown(line.slice(2))}</h2>`;
  if (line.startsWith('## ')) return `<h3>${formatInlineMarkdown(line.slice(3))}</h3>`;
  if (line.startsWith('### ')) return `<h4>${formatInlineMarkdown(line.slice(4))}</h4>`;
  if (line.startsWith('> ')) return `<blockquote><p>${formatInlineMarkdown(line.slice(2))}</p></blockquote>`;

  if (/^(?:សំណួរទី\s*[0-9០-៩]+|សំណួរ\s*[0-9០-៩:៖]|សំណួរទូទៅ|សំណួរជ្រៅ|(?:Question|Q)\s*[0-9]+[:.])/iu.test(line)) {
    return `<div class="prose-question-block"><div class="prose-block-tag"><span class="prose-badge question-badge">សំណួរ &middot; QUESTION</span></div><div class="prose-question-text">${formatInlineMarkdown(line)}</div></div>`;
  }

  if (/^(?:ចម្លើយ\s*[:៖]|ចម្លើយសង្ខេប|(?:Answer|Ans|A)\s*[:.])/iu.test(line)) {
    return `<div class="prose-answer-block"><div class="prose-block-tag"><span class="prose-badge answer-badge">ចម្លើយ &middot; ANSWER</span></div><div class="prose-answer-text">${formatInlineMarkdown(line)}</div></div>`;
  }

  if (/^(?:ជំពូកទី\s*[0-9០-៩]+|មេរៀនទី\s*[0-9០-៩]+|ផ្នែកទី\s*[0-9០-៩]+|(?:Chapter|Lesson|Unit|Part)\s*[0-9]+)/iu.test(line)) {
    return `<div class="prose-chapter-header"><div class="prose-chapter-tag"><span class="prose-badge chapter-badge">SECTION</span></div><h3 class="prose-chapter-title">${formatInlineMarkdown(line)}</h3></div>`;
  }

  return `<p class="prose-p">${formatInlineMarkdown(line)}</p>`;
}

function formatProseMarkdown(text) {
  if (!text) return '';
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

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

const test1 = `# Constitutional AI
Some text here.

| Model | Score |
| :--- | :--- |
| Gemini | 99% |
| Claude | 98% |

សំណួរទី ១៖ តើអ្វីទៅជា Constitutional AI?
ចម្លើយ៖ ជាវិធីសាស្ត្របង្វឹក AI ដោយមិនចាំបាច់មានមនុស្សដាក់ស្លាកសញ្ញាពុល។`;

console.log(formatProseMarkdown(test1));
