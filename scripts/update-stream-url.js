const fs = require('fs');

let code = fs.readFileSync('js/sources-reader.js', 'utf8');

const oldFn = `export function getSafeDocumentStreamUrl(doc) {
  if (!doc) return null;
  if (doc.blobUrl) return doc.blobUrl;
  const token = state.get('driveToken');
  if (doc.driveFileId && token) {
    return \`/api/drive/file?id=\${encodeURIComponent(doc.driveFileId)}&mime=\${encodeURIComponent(doc.mimeType || '')}&token=\${encodeURIComponent(token)}\`;
  }
  return null;
}`;

const newFn = `export function getSafeDocumentStreamUrl(doc) {
  if (!doc) return null;
  const name = (doc.title || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();
  const isSpreadsheetOrOffice = mime.includes('sheet') || mime.includes('excel') || mime.includes('spreadsheet') ||
                               mime.includes('word') || mime.includes('presentation') ||
                               name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.docx') ||
                               name.endsWith('.doc') || name.endsWith('.pptx') || name.endsWith('.ppt');

  // Use Google Drive official preview embed for spreadsheets and Office docs so raw binary zip ('PK\\x03\\x04') never streams into iframe
  if (doc.driveFileId && isSpreadsheetOrOffice) {
    return \`https://drive.google.com/file/d/\${encodeURIComponent(doc.driveFileId)}/preview\`;
  }

  if (doc.blobUrl) return doc.blobUrl;
  const token = state.get('driveToken');
  if (doc.driveFileId && token) {
    if (mime.includes('pdf') || name.endsWith('.pdf') || mime.includes('google-apps.document')) {
      return \`/api/drive/file?id=\${encodeURIComponent(doc.driveFileId)}&mime=\${encodeURIComponent(doc.mimeType || '')}&token=\${encodeURIComponent(token)}\`;
    }
    return \`https://drive.google.com/file/d/\${encodeURIComponent(doc.driveFileId)}/preview\`;
  }
  if (doc.driveFileId) {
    return \`https://drive.google.com/file/d/\${encodeURIComponent(doc.driveFileId)}/preview\`;
  }
  return null;
}`;

if (code.includes(oldFn)) {
  code = code.replace(oldFn, newFn);
  fs.writeFileSync('js/sources-reader.js', code, 'utf8');
  console.log('Successfully updated getSafeDocumentStreamUrl in js/sources-reader.js');
} else {
  console.log('Could not find oldFn exactly, checking pattern');
  code = code.replace(/export function getSafeDocumentStreamUrl\(doc\) \{[\s\S]*?return null;\s*\}/, newFn);
  fs.writeFileSync('js/sources-reader.js', code, 'utf8');
  console.log('Replaced by regex in js/sources-reader.js');
}
