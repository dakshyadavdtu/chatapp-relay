export async function renderChatPlaceholder(container) {
  const title = document.createElement('h1');
  title.textContent = 'Chat';
  const note = document.createElement('p');
  note.textContent = 'Not connected yet.';
  container.append(title, note);
}
