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
  return safe;
}

function renderSingleLine(line) {
  if (line.startsWith('# ')) return `<h2>${formatInlineMarkdown(line.slice(2))}</h2>`;
  if (line.startsWith('## ')) return `<h3>${formatInlineMarkdown(line.slice(3))}</h3>`;
  if (line.startsWith('### ')) return `<h4>${formatInlineMarkdown(line.slice(4))}</h4>`;
  if (line.startsWith('> ')) return `<blockquote><p>${formatInlineMarkdown(line.slice(2))}</p></blockquote>`;

  // Question Pattern
  if (/^(?:សំណួរទី\s*[0-9០-៩]+|សំណួរ\s*[0-9០-៩:៖]|សំណួរទូទៅ|សំណួរជ្រៅ|(?:Question|Q)\s*[0-9]+[:.])/iu.test(line)) {
    return `<div class="prose-question-block"><div class="prose-block-tag"><span class="prose-badge question-badge">សំណួរ &middot; QUESTION</span></div><div class="prose-question-text">${formatInlineMarkdown(line)}</div></div>`;
  }

  // Answer Pattern
  if (/^(?:ចម្លើយ\s*[:៖]|ចម្លើយសង្ខេប|(?:Answer|Ans|A)\s*[:.])/iu.test(line)) {
    return `<div class="prose-answer-block"><div class="prose-block-tag"><span class="prose-badge answer-badge">ចម្លើយ &middot; ANSWER</span></div><div class="prose-answer-text">${formatInlineMarkdown(line)}</div></div>`;
  }

  // Chapter / Lesson / Part Pattern
  if (/^(?:ជំពូកទី\s*[0-9០-៩]+|មេរៀនទី\s*[0-9០-៩]+|ផ្នែកទី\s*[0-9០-៩]+|(?:Chapter|Lesson|Unit|Part)\s*[0-9]+)/iu.test(line)) {
    return `<div class="prose-chapter-header"><h3>${formatInlineMarkdown(line)}</h3></div>`;
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

const sample = `សៀវភៅណែនាំស្វ័យសិក្សាប្រវត្តិវិទ្យាថ្នាក់ទី១២ សម្រាប់ត្រៀមប្រឡងបាក់ឌុប (Bac II) កម្រងសំណួរ-ចម្លើយគន្លឹះ
សំណួរទី ១ (សំណួរទូទៅ)៖ តើប្រទេសកម្ពុជាស្ថិតក្រោមអាណាព្យាបាលបារាំងប៉ុន្មានឆ្នាំ? ចាប់ពីឆ្នាំណាដល់ឆ្នាំណា?
ចម្លើយ៖ ប្រទេសកម្ពុជាស្ថិតក្រោមអាណាព្យាបាលបារាំងចំនួន ៩០ ឆ្នាំ (ជិតមួយសតវត្សរ៍)។ ចាប់ពី ថ្ងៃទី ១១ ខែសីហា ឆ្នាំ ១៨៦៣ ដល់ ថ្ងៃទី ៩ ខែវិច្ឆិកា ឆ្នាំ ១៩៥៣។
សំណួរទី ២ (សំណួរទូទៅ)៖ មុនការមកដល់របស់បារាំង តើកម្ពុជាជួបប្រទះនូវវិបត្តិ ឬការគំរាមកំហែងបែបណាខ្លះ?
ចម្លើយ៖ ត្រូវរងការគាបសង្កត់ និងដណ្តើមទឹកដីពីសំណាក់ប្រទេសជិតខាងទាំងពីរ ពួកសៀម(ថៃ) និង ពួកយួន (វៀតណាម)។`;

console.log(formatProseMarkdown(sample));
