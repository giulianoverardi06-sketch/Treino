/** Baixa um arquivo gerado no aparelho (backup, CSV). */
export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dá tempo ao navegador de começar o download antes de soltar a URL.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}
