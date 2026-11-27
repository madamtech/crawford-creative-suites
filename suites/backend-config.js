// Backend settings for the building. PUBLIC values only.
//
// Leave url empty and the site works exactly as before: forms open an email,
// and Client Login stays hidden. Fill these in once the Supabase project exists
// (docs/BACKEND_SETUP.md, step 5):
//   url               Supabase Project URL, e.g. https://abcdefgh.supabase.co
//   anonKey           the "anon" (or "publishable") key. Safe to publish.
//   turnstileSiteKey  Cloudflare Turnstile SITE key (optional). Safe to publish.
//   paymentProvider   'stripe' or 'ghl' (Tanika's choice), or '' for no online payments yet
//   links             optional GHL booking / Skool class links shown in My Projects
//
// NEVER put the service_role key, a secret key, a Stripe secret, or any webhook
// secret in this file. Those live only in Supabase Edge Function secrets.
window.CCS_BACKEND = {
  url: '',
  anonKey: '',
  turnstileSiteKey: '',
  paymentProvider: '',
  links: { booking: '', classes: '' },
};
