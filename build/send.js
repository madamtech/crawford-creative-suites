// Sends form requests to the right business inbox without any paid form service.
// Opens the visitor's email app with everything filled in, copies the request
// to the clipboard, and shows the address in case no email app is set up.
const INBOX = {
  'Allure Fusions': 'allurefusionsfirm@gmail.com',
  'AI AuthoriTech': 'ai.authoritech@gmail.com',
  'Madam Allure': 'madamallure@gmail.com',
};

function inboxFor(subject) {
  const key = Object.keys(INBOX).find((k) => subject.startsWith(k));
  return INBOX[key || 'Madam Allure'];
}

function cleanBody(body) {
  return String(body)
    .split('\n')
    .filter((line) => !/^Phone:\s*$/.test(line))
    .join('\n')
    .trim();
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
  const text = cleanBody(body);
  const to = inboxFor(subject);
  copy(`${subject}\n\n${text}`);
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  notice(to, subject, text);
};

// Madam Allure items with no shop page: collect Name, Email, and optional Phone
// before opening the email, so the request includes a way to reply.
window.ccsAskAbout = (name, price) => {
  document.querySelector('.ccs-ask')?.remove();
  const box = document.createElement('div');
  box.className = 'ccs-ask';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-labelledby', 'ccs-ask-title');
  const title = document.createElement('strong');
  title.id = 'ccs-ask-title';
  title.textContent = 'Ask about this item';
  const intro = document.createElement('p');
  intro.textContent = `Tell us how to reach you about ${name} (${price}).`;
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="field-pair">
      <label>Name<input name="Name" type="text" autocomplete="name" required></label>
      <label>Email<input name="Email" type="email" autocomplete="email" required></label>
    </div>
    <label>Phone (optional)<input name="Phone" type="tel" autocomplete="tel"></label>
    <div><button type="submit">Send my request</button><button type="button" data-close>Cancel</button></div>`;
  form.querySelector('[data-close]').onclick = () => box.remove();
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const lines = [];
    for (const [key, value] of data.entries()) {
      if (typeof value !== 'string') continue;
      if (key === 'Phone' && !value.trim()) continue;
      lines.push(`${key}: ${value}`);
    }
    lines.push('', `I am interested in ${name} (${price}). Please contact me about options.`);
    box.remove();
    window.ccsSendRequest(`Madam Allure — ${name}`, lines.join('\n'));
  };
  box.append(title, intro, form);
  document.body.appendChild(box);
  form.querySelector('[name="Name"]').focus();
};

// Used by local tests; harmless in the browser.
window.ccsInboxFor = inboxFor;
window.ccsCleanBody = cleanBody;
