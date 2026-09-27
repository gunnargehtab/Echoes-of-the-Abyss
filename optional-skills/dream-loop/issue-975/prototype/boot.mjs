function showError(error) {
  const message = error instanceof Error ? error.message : String(error);
  window.__renderError = message;
  const panel = document.getElementById('error');
  panel.textContent = `The key-art renderer stopped.\n${message}`;
  panel.hidden = false;
  console.error('Key-art renderer failed:', error);
}

window.addEventListener('error', (event) => showError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => showError(event.reason));
try {
  await import('./main.mjs');
} catch (error) {
  showError(error);
}
