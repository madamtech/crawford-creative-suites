// Backend settings for the building. PUBLIC values only.
//
// Leave url empty and the site works exactly as before: forms open an email,
// and Client Login stays hidden. Fill these in once the Supabase project exists
// (docs/BACKEND_SETUP.md, step 5):
//   url               Supabase Project URL, e.g. https://abcdefgh.supabase.co
//   anonKey           the "anon" (or "publishable") key. Safe to publish.
//   turnstileSiteKey  Cloudflare Turnstile SITE key (optional). Safe to publish.
//   paymentProvider   'stripe' or 'ghl', or '' for invoice-only (Wave / PayPal
//                     invoices sent manually; checkout button stays hidden)
//   links             optional GHL booking / Skool class links shown in My Projects
//
// NEVER put the service_role key, a secret key, a Stripe secret, or any webhook
// secret in this file. Those live only in Supabase Edge Function secrets.
window.CCS_BACKEND = {
  url: 'https://aclfvmsuhadvhjhpbiae.supabase.co',
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbGZ2bXN1aGFkdmhqaHBiaWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3OTI5MjIsImV4cCI6MjExMTM2ODkyMn0.aMppeMWmW_wh87kshcqu1wq1LCzKPwt7HMOtK2mlNOM",
  turnstileSiteKey: '',
  paymentProvider: '',
  links: { booking: '', classes: '' },
};
