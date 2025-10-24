import 'dotenv/config';

const host = process.env.TYPESENSE_HOST;
const port = process.env.TYPESENSE_PORT;
const protocol = process.env.TYPESENSE_PROTOCOL;
const apiKey = process.env.TYPESENSE_API_KEY;

console.log('Testing Typesense Cloud connection...');
console.log(`URL: ${protocol}://${host}:${port}`);

const searchParams = {
  q: "x12",
  query_by: "canonical_mpn,normalized_tokens,title,brand,synonyms",
  query_by_weights: "5,5,3,2,2",
  prefix: true,
  num_typos: 2,
  per_page: 8
};

const res = await fetch(`${protocol}://${host}:${port}/collections/parts/documents/search`, {
  method: "POST",
  headers: { "X-TYPESENSE-API-KEY": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(searchParams)
});

console.log('Status:', res.status);
const text = await res.text();
console.log('Response:', text);

if (res.ok) {
  const data = JSON.parse(text);
  console.log('Found', data.found, 'results');
  if (data.hits) {
    data.hits.forEach(h => console.log(' -', h.document.title, h.document.canonical_mpn));
  }
} else {
  console.error('ERROR:', text);
}

