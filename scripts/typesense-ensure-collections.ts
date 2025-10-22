import 'dotenv/config';
import fs from 'node:fs';
import Typesense from 'typesense';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var required`);
  return v;
}

async function main() {
  const client = new Typesense.Client({
    nodes: [{
      host: required('TYPESENSE_HOST'),
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    }],
    apiKey: required('TYPESENSE_ADMIN_API_KEY'),
    connectionTimeoutSeconds: 5,
  });

  const schema = JSON.parse(fs.readFileSync('search/typesense/collections/parts.json', 'utf-8'));

  try {
    await client.collections('parts').retrieve();
    console.log('✅ parts collection exists');
  } catch {
    await client.collections().create(schema);
    console.log('✅ created parts collection');
  }
}

main().catch((err) => {
  console.error('❌ typesense ensure failed', err);
  process.exit(1);
});
