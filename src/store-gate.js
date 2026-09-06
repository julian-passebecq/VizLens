const LOCAL_ORIGIN = 'http://127.0.0.1';
const LOCAL_PERMISSION = 'http://127.0.0.1/*';
const CONSENT_KEY = 'vizlens-store-gemini-disclosure-v1';

async function hasPermission() {
  if (!chrome?.permissions?.contains) return true;
  return chrome.permissions.contains({ origins: [LOCAL_PERMISSION] });
}

function appendText(parent, tag, text, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function ensurePassiveDisclosure() {
  if (document.getElementById('storeGeminiDisclosure')) return;
  const panel = document.getElementById('aiPanel');
  const availability = document.getElementById('aiAvailability');
  if (!panel || !availability) return;
  const box = document.createElement('div');
  box.id = 'storeGeminiDisclosure';
  box.className = 'callout privacy-callout';
  appendText(box, 'strong', 'AI data disclosure');
  appendText(box, 'p', 'Scanning stays local. Only an explicit Gemini action can send bounded article/document evidence or a resized viewport image through your local companion to Google Gemini. Page URLs and your API key are not included in Gemini prompts.');
  availability.insertAdjacentElement('afterend', box);
}

function makeDialog() {
  let dialog = document.getElementById('geminiDisclosureDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'geminiDisclosureDialog';
  dialog.setAttribute('aria-labelledby', 'geminiDisclosureTitle');
  const card = document.createElement('div');
  card.className = 'callout';
  appendText(card, 'p', 'AI data disclosure', 'eyebrow');
  const title = appendText(card, 'h2', 'Before using Gemini');
  title.id = 'geminiDisclosureTitle';
  appendText(card, 'p', 'VizLens scanning and exports stay local. If you continue, the Gemini action you requested may send bounded article/document evidence or a resized viewport screenshot through the local VizLens companion to Google Gemini. The current page URL and your API key are not included in the prompt.');
  appendText(card, 'p', 'Free Tier note: requests use the Gemini API key configured on your own computer and may count against that Google project quota. VizLens does not sell data, run ads, or send page content merely because you browse or scan.');
  appendText(card, 'p', 'The localhost permission is optional and requested only if you enable Gemini features. Deterministic page scanning continues to work without it.');
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';
  actions.style.marginTop = '12px';
  const cancel = appendText(actions, 'button', 'Not now', 'quiet');
  cancel.type = 'button'; cancel.id = 'geminiDisclosureCancel';
  const accept = appendText(actions, 'button', 'Enable Gemini', 'primary');
  accept.type = 'button'; accept.id = 'geminiDisclosureAccept';
  card.append(actions);
  dialog.append(card);
  document.body.append(dialog);
  return dialog;
}

async function requestPermissionFromGesture() {
  if (!chrome?.permissions?.request) return true;
  if (await hasPermission()) return true;
  return chrome.permissions.request({ origins: [LOCAL_PERMISSION] });
}

function askForConsent() {
  if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
    return hasPermission().then((granted) => granted ? true : false);
  }
  const dialog = makeDialog();
  const accept = dialog.querySelector('#geminiDisclosureAccept');
  const cancel = dialog.querySelector('#geminiDisclosureCancel');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      accept.removeEventListener('click', onAccept);
      cancel.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      resolve(value);
    };
    const onAccept = async () => {
      try {
        const granted = await requestPermissionFromGesture();
        if (granted) localStorage.setItem(CONSENT_KEY, 'accepted');
        finish(Boolean(granted));
      } catch { finish(false); }
    };
    const onCancel = (event) => { event?.preventDefault?.(); finish(false); };
    accept.addEventListener('click', onAccept);
    cancel.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);
    dialog.showModal();
  });
}

function permissionRequiredResponse() {
  return new Response(JSON.stringify({
    ok: false,
    code: 'STORE_PERMISSION_REQUIRED',
    error: 'Gemini is optional. Start a Gemini action to review the disclosure and enable localhost companion access.',
  }), { status: 403, headers: { 'content-type': 'application/json' } });
}

export async function storeFetch(input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.origin !== LOCAL_ORIGIN) return fetch(input, init);
  const method = String(init.method || 'GET').toUpperCase();
  const permitted = await hasPermission();
  if (method === 'GET' && !permitted) return permissionRequiredResponse();
  if (!permitted || localStorage.getItem(CONSENT_KEY) !== 'accepted') {
    const accepted = await askForConsent();
    if (!accepted) return permissionRequiredResponse();
  }
  return fetch(input, init);
}

document.addEventListener('DOMContentLoaded', ensurePassiveDisclosure, { once: true });
