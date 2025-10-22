import 'dotenv/config';
import Typesense from 'typesense';
import { createClient } from '@supabase/supabase-js';
import { normalizePartNumber, tokenizePartNumber } from '../src/lib/parts/normalize.js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var required`);
  return v;
}

async function main() {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'));
  const client = new Typesense.Client({
    nodes: [{ host: required('TYPESENSE_HOST'), port: Number(process.env.TYPESENSE_PORT ?? 8108), protocol: process.env.TYPESENSE_PROTOCOL ?? 'http' }],
    apiKey: required('TYPESENSE_ADMIN_API_KEY'),
    connectionTimeoutSeconds: 5,
  });

  const { data: parts, error } = await supabase
    .from('part')
    .select('id,canonical_mpn,title,brand,category,synonyms');
  if (error) throw error;

  // Get distributor counts
  const { data: countsData, error: countsErr } = await supabase
    .from('distributor_listing')
    .select('part_id');
  if (countsErr) throw countsErr;
  const countMap = new Map<string, number>();
  for (const row of countsData || []) {
    countMap.set(row.part_id, (countMap.get(row.part_id) ?? 0) + 1);
  }

  const docs = (parts || []).map((p) => {
    const tokens = new Set<string>();
    tokenizePartNumber(`${p.brand ?? ''} ${p.canonical_mpn}`).forEach((t) => tokens.add(t));
    tokens.add(normalizePartNumber(p.canonical_mpn));

    const distributor_count = countMap.get(p.id) ?? 0;
    const has_distributors = distributor_count > 0;

    return {
      id: p.id,
      canonical_mpn: p.canonical_mpn,
      normalized_tokens: Array.from(tokens),
      title: p.title,
      brand: p.brand ?? '',
      category: p.category ?? '',
      synonyms: p.synonyms ?? [],
      fitment_equip_types: [],
      fitment_models: [],
      distributor_count,
      has_distributors,
      popularity: 0,
    };
  });

  // Batch import
  const chunkSize = 500;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const res = await client.collections('parts').documents().import(chunk, { action: 'upsert' });
    console.log(`Indexed ${i + chunk.length}/${docs.length}`, res.length);
  }
  console.log('✅ Index complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
