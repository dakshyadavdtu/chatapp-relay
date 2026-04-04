import { getJson } from '../api/client.js';
import { authState, performLogin, performLogout } from '../features/auth/state.js';
import { navigate } from '../app/router.js';
import { startChatRealtime, stopChatRealtime } from '../features/chat/realtime.js';
import { resetChatState } from '../features/chat/state.js';

export async function renderHome(container) {
  const title = document.createElement('h1');
  title.textContent = 'Relay';
  container.append(title);

  const sessionLine = document.createElement('p');
  if (authState.status === 'checking') {
    sessionLine.textContent = 'Session: checking';
  } else if (authState.status === 'signed_in') {
    const name = authState.user?.username || authState.user?.name || authState.user?.id || 'user';
    sessionLine.textContent = `Session: signed in (${name})`;
  } else {
    sessionLine.textContent = 'Session: signed out';
  }
  container.append(sessionLine);

  const line = document.createElement('p');
  line.textContent = 'Checking API…';
  container.append(line);

  try {
    const body = await getJson('/api/health');
    if (body?.success && body?.data?.ok) {
      line.textContent = 'API reachable';
    } else {
      line.textContent = 'API returned an unexpected shape';
    }
  } catch {
    line.textContent = 'API not reachable (start the backend on port 3000)';
  }

  const authBox = document.createElement('div');
  authBox.className = 'auth-box';
  container.append(authBox);

  if (authState.status === 'signed_in') {
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Log out';
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      statusEl.textContent = 'Session: signing out...';
      await performLogout();
      stopChatRealtime();
      resetChatState();
      navigate('/');
      container.replaceChildren();
      await renderHome(container);
    });
    authBox.append(logoutBtn);
  } else if (authState.status !== 'checking') {
    const form = document.createElement('form');
    form.className = 'login-form';
    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.placeholder = 'Username';
    userInput.required = true;
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = 'Password';
    passInput.required = true;
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Log in';
    const msg = document.createElement('p');
    msg.className = 'login-msg';
    form.append(userInput, passInput, submitBtn, msg);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      userInput.disabled = true;
      passInput.disabled = true;
      msg.textContent = 'Signing in...';
      try {
        await performLogin(userInput.value.trim(), passInput.value);
        startChatRealtime();
        navigate('/chat');
        msg.textContent = '';
      } catch (err) {
        msg.textContent = err?.message ?? 'Login failed';
        submitBtn.disabled = false;
        userInput.disabled = false;
        passInput.disabled = false;
        return;
      }
      submitBtn.disabled = false;
      userInput.disabled = false;
      passInput.disabled = false;
    });
    authBox.append(form);
  }
}
