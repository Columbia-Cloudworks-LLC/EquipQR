/**
 * Single Work Order Google Doc Data Module
 *
 * Thin wrapper: fetch related rows, then build the executive packet payload.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { fetchSingleWorkOrderGoogleDocData } from "./work-order-google-docs-single-fetch.ts";
import {
  buildSingleWorkOrderGoogleDocDataFromFetch,
  type PhotoEvidenceEntry,
  type QuickFactEntry,
  type SingleWorkOrderGoogleDocData,
} from "./work-order-google-docs-single-build.ts";

export type {
  PhotoEvidenceEntry,
  QuickFactEntry,
  SingleWorkOrderGoogleDocData,
};

export async function buildSingleWorkOrderGoogleDocData(
  supabase: SupabaseClient,
  organizationId: string,
  workOrderId: string,
): Promise<SingleWorkOrderGoogleDocData> {
  const fetched = await fetchSingleWorkOrderGoogleDocData(supabase, organizationId, workOrderId);
  return buildSingleWorkOrderGoogleDocDataFromFetch(fetched);
}

const __testables = { buildSingleWorkOrderGoogleDocData };
