// Supabase Edge Function entry point (logic in handler.ts).
import { handle } from './handler.ts';

Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
