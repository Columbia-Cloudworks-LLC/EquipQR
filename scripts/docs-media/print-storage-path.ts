#!/usr/bin/env tsx

import { buildDocsMediaStoragePath } from '../lib/docsMediaPaths.mjs';

const [collection, variant, label, extension = 'png'] = process.argv.slice(2);

if (!collection || !variant || !label) {
  console.error(
    'Usage: npx tsx scripts/docs-media/print-storage-path.ts <collection> <variant> <label> [extension]',
  );
  process.exit(1);
}

console.log(
  buildDocsMediaStoragePath({
    collection,
    variant,
    label,
    extension,
  }),
);
