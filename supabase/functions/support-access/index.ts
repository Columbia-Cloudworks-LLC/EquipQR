/**
 * Owner-granted EquipQR Support access (issue #1648 review).
 * See handler.ts for the auth sequence.
 */

import { withCorrelationId } from "../_shared/supabase-clients.ts";
import { handleSupportAccess } from "./handler.ts";

Deno.serve(withCorrelationId((req, ctx) => handleSupportAccess(req, ctx.correlationId)));
