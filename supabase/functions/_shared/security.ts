// Spam check (Cloudflare Turnstile) and webhook signatures (Stripe, GHL, outgoing events).

import type { Env } from './http.ts';

const enc = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Turnstile is optional: when TURNSTILE_SECRET is not set, only the honeypot applies.
export async function turnstileOk(env: Env, token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetch(env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

// Stripe-Signature: t=<unix>,v1=<hex hmac of "t.payload">. Five-minute tolerance.
export async function verifyStripe(raw: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]).filter((p) => p.length === 2));
  const t = Number(parts.t);
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowSec - t) > 300) return false;
  const expected = await hmacHex(secret, `${t}.${raw}`);
  return sigs.some((s) => safeEqual(s, expected));
}

// Outgoing events are signed the same way, so GHL/Make/Zapier can check them.
export async function signEvent(secret: string, raw: string, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${nowSec},v1=${await hmacHex(secret, `${nowSec}.${raw}`)}`;
}
