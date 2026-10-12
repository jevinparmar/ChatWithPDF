export function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename.replace(/\.[^/.]+$/, '')}_notes.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadDocx(filename, content) {
  // Generates clean HTML format with Word MIME type so Microsoft Word / LibreOffice opens it cleanly
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 1in; }
          h1, h2, h3 { color: #2e4053; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          th, td { border: 1px solid #bdc3c7; padding: 6px 10px; text-align: left; }
          th { background-color: #f2f4f4; }
          blockquote { border-left: 3px solid #3498db; margin: 1em 0; padding-left: 10px; color: #555; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre>
      </body>
    </html>
  `;
  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename.replace(/\.[^/.]+$/, '')}_summary.docx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printContent(title, content) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; color: #111; }
          h1, h2, h3 { color: #1e293b; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <hr/>
        <div>${content}</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
