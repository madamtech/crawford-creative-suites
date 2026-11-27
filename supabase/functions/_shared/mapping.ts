// Website form fields (exact labels used on the live forms) -> database columns.
// The field map follows the appendix of docs/BACKEND_HANDOFF.md.

import { HttpError } from './http.ts';

export type Fields = Record<string, string>;
export type Form = 'order' | 'ai_intake' | 'ma_request' | 'lead';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Throwaway inboxes commonly used by spam bots.
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc',
]);

export const FORM_OF_SUBJECT: Array<[RegExp, Form]> = [
  [/^Allure Fusions/i, 'order'],
  [/^AI AuthoriTech/i, 'ai_intake'],
  [/^Madam Allure/i, 'ma_request'],
];

export function cleanFields(raw: unknown): Fields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Missing form fields');
  const out: Fields = {};
  let total = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') continue;
    const key = String(k).slice(0, 80).trim();
    const val = String(v).replace(/\u0000/g, '').trim().slice(0, 5000);
    if (!key || key.startsWith('_')) continue;   // _hp and other private keys
    total += key.length + val.length;
    out[key] = val;
  }
  if (total > 40000) throw new HttpError(413, 'Request too long');
  return out;
}

export function checkContact(f: Fields): { name: string; email: string; phone: string } {
  const name = (f.Name || '').trim();
  const email = (f.Email || '').trim().toLowerCase();
  if (!name || name.length > 200) throw new HttpError(400, 'Please enter your name');
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address');
  if (DISPOSABLE.has(email.split('@')[1])) throw new HttpError(400, 'Please use an email address you check');
  const phone = (f.Phone || '').trim().slice(0, 40);
  return { name, email, phone };
}

function int(v: string | undefined): number | null {
  const n = Number.parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n >= 1 && n <= 100000 ? n : null;
}

function isoDate(v: string | undefined): string | null {
  const s = String(v || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

function rest(f: Fields, used: string[]): string {
  return Object.entries(f)
    .filter(([k, v]) => !used.includes(k) && v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const ORDER_USED = ['Name', 'Email', 'Phone', 'Service type', 'Project type', 'Quantity', 'Dimensions',
  'Material', 'Completion date', 'Rush', 'Shipping address', 'Budget range', 'Additional instructions'];

export function mapRequest(form: Form, f: Fields, extra: { wantsAccount?: boolean; utm?: Record<string, string>; source?: string } = {}) {
  const c = checkContact(f);
  if (form === 'order') {
    const instructions = f['Additional instructions'] || '';
    const others = rest(f, ORDER_USED);
    return {
      ...c,
      service: f['Service type'] || null,
      project_type: f['Project type'] || null,
      qty: int(f.Quantity),
      size: f.Dimensions || null,
      material: f.Material || f['Laser material'] || null,
      description: f['Intended use'] || null,
      due_date: isoDate(f['Completion date']),
      rush: /^yes/i.test(f.Rush || ''),
      shipping_address: f['Shipping address'] || null,
      budget_range: f['Budget range'] || null,
      details: [instructions, others].filter(Boolean).join('\n\n') || null,
      form_fields: f,
      wants_account: !!extra.wantsAccount,
    };
  }
  if (form === 'ai_intake') {
    return {
      ...c,
      business_challenge: f['Business challenge'] || null,
      desired_outcome: f['Desired outcome'] || null,
      ai_experience: f['AI experience'] || null,
      automation_opportunity: f['Automation opportunity'] || null,
      required_integrations: f['Required integrations'] || null,
      timeline: f.Timeline || null,
      budget_range: f['Budget range'] || null,
      engagement: f.Engagement || null,
      form_fields: f,
      wants_account: !!extra.wantsAccount,
    };
  }
  if (form === 'ma_request') {
    const kind = /memorial/i.test(f['Request type'] || '') ? 'memorial' : 'custom';
    const used = ['Name', 'Email', 'Phone', 'Request type', 'Needed by', 'Budget range', 'Details'];
    return {
      ...c,
      kind,
      item: f.Item || null,
      needed_by: isoDate(f['Needed by']),
      budget_range: f['Budget range'] || null,
      details: [f.Details, rest(f, used)].filter(Boolean).join('\n\n') || null,
      form_fields: f,
      wants_account: !!extra.wantsAccount,
    };
  }
  // lead
  const interest = ({ 'madam allure': 'madam_allure', 'allure fusions': 'allure_fusions', 'ai authoritech': 'ai_authoritech' } as Record<string, string>)[
    (f['Business interest'] || '').toLowerCase()] || (['madam_allure', 'allure_fusions', 'ai_authoritech'].includes(f['Business interest']) ? f['Business interest'] : '');
  if (!interest) throw new HttpError(400, 'Please choose a business');
  if (!/^(yes|true|on)$/i.test(f.Consent || '')) throw new HttpError(400, 'Please tick the box so we may keep your details');
  const utm = extra.utm || {};
  return {
    ...c,
    business_interest: interest,
    consent: true,
    message: f.Message || null,
    source: (extra.source || 'Website - lead capture').slice(0, 120),
    utm_source: (utm.utm_source || '').slice(0, 200) || null,
    utm_medium: (utm.utm_medium || '').slice(0, 200) || null,
    utm_campaign: (utm.utm_campaign || '').slice(0, 200) || null,
  };
}

// ---------- files sent with a request ----------
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;
const EXT = /\.(jpe?g|png|pdf|svg|dxf|stl|3mf)$/i;
const FOLDER: Record<string, string> = { order: 'orders', ai_intake: 'ai', madam_allure_order: 'madam-allure' };

export type FileMeta = { name: string; type?: string; size: number };

export function safeFileName(name: string): string {
  const base = String(name || 'file').split(/[\\/]/).pop() || 'file';
  const cleaned = base.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(-80);
  return cleaned.replace(/^[.-]+/, '') || 'file';
}

export function checkFiles(list: unknown): FileMeta[] {
  if (list == null) return [];
  if (!Array.isArray(list)) throw new HttpError(400, 'Bad file list');
  if (list.length > MAX_FILES) throw new HttpError(400, `Please send up to ${MAX_FILES} files`);
  return list.map((f: any) => {
    const name = String(f?.name || '');
    const size = Number(f?.size);
    if (!EXT.test(name)) throw new HttpError(400, `${name || 'A file'} is not a JPG, PNG, PDF, SVG, DXF, STL, or 3MF file`);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) throw new HttpError(400, `${name} is larger than 25 MB`);
    return { name, type: String(f?.type || '').slice(0, 120), size };
  });
}

export function filePath(entityType: string, number: string, name: string): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${FOLDER[entityType]}/${number}/${rand}-${safeFileName(name)}`;
}
