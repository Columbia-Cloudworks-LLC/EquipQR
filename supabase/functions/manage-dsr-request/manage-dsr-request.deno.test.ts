import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

Deno.test("isMutatingAction flags read-only actions correctly", () => {
  assertEquals(__testables.isMutatingAction("list_queue"), false);
  assertEquals(__testables.isMutatingAction("get_case"), false);
  assertEquals(__testables.isMutatingAction("verify"), true);
});

Deno.test("buildSlaBucket marks overdue requests", () => {
  const bucket = __testables.buildSlaBucket({
    id: "x",
    status: "processing",
    request_type: "access",
    due_at: "2000-01-01T00:00:00.000Z",
    received_at: "1999-01-01T00:00:00.000Z",
    updated_at: "2000-01-01T00:00:00.000Z",
    organization_id: "org-1",
    requester_email: "test@example.com",
    verification_method: null,
    checklist_progress: {},
    required_checklist_steps: [],
    export_artifacts: {},
  });

  assertEquals(bucket, "overdue");
});

Deno.test("areRequiredChecklistStepsComplete enforces completion", () => {
  const complete = __testables.areRequiredChecklistStepsComplete({
    id: "x",
    status: "processing",
    request_type: "access",
    due_at: "2099-01-01T00:00:00.000Z",
    received_at: "2099-01-01T00:00:00.000Z",
    updated_at: "2099-01-01T00:00:00.000Z",
    organization_id: "org-1",
    requester_email: "test@example.com",
    verification_method: null,
    checklist_progress: {
      verify_identity: { completed_at: "2099-01-01T01:00:00.000Z" },
      search_systems: { completed_at: "2099-01-01T01:00:00.000Z" },
      fulfill_request: { completed_at: "2099-01-01T01:00:00.000Z" },
    },
    required_checklist_steps: ["verify_identity", "search_systems", "fulfill_request"],
    export_artifacts: {},
  });

  const incomplete = __testables.areRequiredChecklistStepsComplete({
    id: "x",
    status: "processing",
    request_type: "access",
    due_at: "2099-01-01T00:00:00.000Z",
    received_at: "2099-01-01T00:00:00.000Z",
    updated_at: "2099-01-01T00:00:00.000Z",
    organization_id: "org-1",
    requester_email: "test@example.com",
    verification_method: null,
    checklist_progress: {
      verify_identity: { completed_at: "2099-01-01T01:00:00.000Z" },
      search_systems: { completed_at: "2099-01-01T01:00:00.000Z" },
    },
    required_checklist_steps: ["verify_identity", "search_systems", "fulfill_request"],
    export_artifacts: {},
  });

  assertEquals(complete, true);
  assertEquals(incomplete, false);
});
