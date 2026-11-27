// POST /functions/v1/intake
// The one endpoint behind Build My Project, the AI readiness form, the Madam Allure
// custom / memorial request, and light lead capture. Writes to the database with the
// service role, returns the new number, and hands back one-time upload URLs for files.
//
// Body: { form: 'order'|'ai_intake'|'ma_request'|'lead', fields: {Name, Email, ...},
//         files?: [{name, type, size}], wantsAccount?: bool, turnstileToken?: string,
//         utm?: {utm_source, utm_medium, utm_campaign}, source?: string, _hp?: string }

import { browserGate, handleError, json, readJson, rpc, signedUploadUrl, HttpError, type Env } from '../_shared/http.ts';
import { checkFiles, cleanFields, filePath, mapRequest, type Form } from '../_shared/mapping.ts';
import { turnstileOk } from '../_shared/security.ts';

const FORMS: Form[] = ['order', 'ai_intake', 'ma_request', 'lead'];

export async function handle(req: Request, env: Env): Promise<Response> {
  const gate = browserGate(req, env);
  if (gate instanceof Response) return gate;
  const cors = gate;
  try {
    const body = await readJson(req);
    const form = body.form as Form;
    if (!FORMS.includes(form)) throw new HttpError(400, 'Unknown form');

    // Honeypot: people never see this field. Pretend success so bots move on.
    if (typeof body._hp === 'string' && body._hp.trim()) {
      return json({ ok: true, kind: form, number: null, status: 'New Request' }, 200, cors);
    }
    if (!(await turnstileOk(env, body.turnstileToken, req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')))) {
      throw new HttpError(400, 'Please confirm you are not a robot and try again');
    }

    const fields = cleanFields(body.fields);
    const files = form === 'lead' ? [] : checkFiles(body.files);
    const data = mapRequest(form, fields, { wantsAccount: !!body.wantsAccount, utm: body.utm || {}, source: body.source });

    const result = await rpc(env, 'submit_request', { p: { form, data } });
    if (form === 'lead') return json({ ok: true, kind: 'lead' }, 200, cors);

    const uploads: Array<{ name: string; path: string; url: string }> = [];
    if (files.length) {
      const rows = [];
      for (const f of files) {
        const path = filePath(result.entity_type, result.number, f.name);
        uploads.push({ name: f.name, path, url: await signedUploadUrl(env, 'order-files', path) });
        rows.push({ path, original_name: f.name, content_type: f.type || null, size_bytes: f.size });
      }
      await rpc(env, 'register_intake_files', { p: { id: result.id, files: rows } });
    }
    return json({ ok: true, kind: form, number: result.number, status: result.status, uploads }, 200, cors);
  } catch (e) {
    return handleError(e, cors);
  }
}
