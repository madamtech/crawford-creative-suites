// Supabase Edge Function entry point. The logic lives in handler.ts so the same
// code is tested locally (npm run test:backend) and served by the preview server.
import { handle } from './handler.ts';

Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
