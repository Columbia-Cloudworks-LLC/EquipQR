import 'dotenv/config';
import fs from 'node:fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { normalizePartNumber, canonicalizeBrand } from '../src/lib/parts/normalize.js';

function readCsv<T = any>(path: string): T[] {
  const text = fs.readFileSync(path, 'utf8');
  const parsed = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var required`);
  return v;
}

async function main() {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'));

  const parts = readCsv<any>('data/seed/parts.sample.csv');
  const distributors = readCsv<any>('data/seed/distributors.sample.csv');
  const listings = readCsv<any>('data/seed/listings.sample.csv');

  for (const p of parts) {
    const canonical_mpn: string = String(p.canonical_mpn);
    const title: string = String(p.title);
    const brand: string | null = p.brand ? canonicalizeBrand(String(p.brand)) : null;
    const category: string | null = p.category || null;
    const description: string | null = p.description || null;
    let synonyms = [];
    try {
      synonyms = p.synonyms ? JSON.parse(String(p.synonyms)) : [];
    } catch {
      synonyms = [];
    }

    const { error } = await supabase
      .from('part')
      .upsert({ canonical_mpn, title, brand, category, description, synonyms }, { onConflict: 'canonical_mpn' });
    if (error) throw error;
  }

  // Ensure distributors
  for (const d of distributors) {
    const name = String(d.name);
    const website = d.website || null;
    const phone = d.phone || null;
    const email = d.email || null;
    let regions = [];
    try {
      regions = d.regions ? JSON.parse(String(d.regions)) : [];
    } catch {
      regions = [];
    }
    // Check if exists first
    const { data: existing } = await supabase
      .from('distributor')
      .select('id')
      .eq('name', name)
      .single();
    
    if (!existing) {
      const { error } = await supabase
        .from('distributor')
        .insert({ name, website, phone, email, regions });
      if (error) throw error;
    }
  }

  // Create listings
  for (const l of listings) {
    const canonical_mpn: string = String(l.canonical_mpn);
    const distributor_name: string = String(l.distributor_name);
    const sku: string | null = l.sku || null;

    const { data: partRow, error: pErr } = await supabase
      .from('part')
      .select('id')
      .eq('canonical_mpn', canonical_mpn)
      .single();
    if (pErr) throw pErr;

    const { data: distRow, error: dErr } = await supabase
      .from('distributor')
      .select('id')
      .eq('name', distributor_name)
      .single();
    if (dErr) throw dErr;

    const { error } = await supabase
      .from('distributor_listing')
      .insert({ distributor_id: distRow.id, part_id: partRow.id, sku });
    if (error) throw error;
  }

  // Derive part_identifier from canonical MPN
  const { data: partsNow } = await supabase.from('part').select('id, canonical_mpn, brand');
  for (const p of partsNow || []) {
    const normalized = normalizePartNumber(p.canonical_mpn);
    await supabase.from('part_identifier').insert({ part_id: p.id, id_type: 'MPN', value: p.canonical_mpn, normalized_value: normalized });
    if (p.brand) {
      await supabase.from('part_identifier').insert({ part_id: p.id, id_type: 'OEM', value: p.brand, normalized_value: normalizePartNumber(p.brand) });
    }
  }

  // Call indexer separately or here
  console.log('✅ Seed complete. Run: npm run index:parts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
