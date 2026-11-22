// Sends form requests to the right business inbox without any paid form service.
// Opens the visitor's email app with everything filled in, copies the request
// to the clipboard, and shows the address in case no email app is set up.
const INBOX = {
  'Allure Fusions': 'allurefusions@gmail.com',
  'AI AuthoriTech': 'ai.authoritech@gmail.com',
  'Madam Allure': 'madamallure@gmail.com',
};

function inboxFor(subject) {
  const key = Object.keys(INBOX).find((k) => subject.startsWith(k));
  return INBOX[key || 'Madam Allure'];
}

function notice(to, subject, body) {
  document.querySelector('.ccs-sent')?.remove();
  const box = document.createElement('div');
  box.className = 'ccs-sent';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Request ready to send');
  box.innerHTML = `
    <strong>Your request is ready to send</strong>
    <p>Your email app should open with the details filled in. If it didn't, your request has been copied. Paste it into a new email to <a></a>.</p>
    <div><button type="button" data-copy>Copy request again</button><button type="button" data-close>Close</button></div>`;
  const link = box.querySelector('a');
  link.textContent = to;
  link.href = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
  box.querySelector('[data-copy]').onclick = (e) => {
    copy(`${subject}\n\n${body}`);
    e.target.textContent = 'Copied';
  };
  box.querySelector('[data-close]').onclick = () => box.remove();
  document.body.appendChild(box);
  box.querySelector('[data-close]').focus();
}

function copy(text) {
  try { navigator.clipboard?.writeText(text); } catch { /* clipboard blocked; address is still shown */ }
}

window.ccsSendRequest = (subject, body) => {
  const to = inboxFor(subject);
  copy(`${subject}\n\n${body}`);
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  notice(to, subject, body);
};
