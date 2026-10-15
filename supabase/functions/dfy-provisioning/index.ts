/**
 * Done-For-You provisioning for EquipQR operators (issue #1648 review).
 * See handler.ts for the auth sequence and actions.
 */

import { withCorrelationId } from "../_shared/supabase-clients.ts";
import { handleDfyProvisioning } from "./handler.ts";

Deno.serve(withCorrelationId((req, ctx) => handleDfyProvisioning(req, ctx.correlationId)));
