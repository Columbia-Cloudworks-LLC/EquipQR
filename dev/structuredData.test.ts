import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * index.html is served for every public route, so its JSON-LD graph is what
 * crawlers see on marketing pages without running JavaScript.
 */
type Node = Record<string, unknown> & { '@type': string; '@id': string };

function readGraph(): Node[] {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  expect(blocks).toHaveLength(1);
  const doc = JSON.parse(blocks[0][1]) as { '@context': string; '@graph': Node[] };
  expect(doc['@context']).toBe('https://schema.org');
  return doc['@graph'];
}

function nodeOfType(graph: Node[], type: string): Node {
  const node = graph.find((n) => n['@type'] === type);
  if (!node) throw new Error(`missing ${type}`);
  return node;
}

describe('index.html JSON-LD entity schema', () => {
  it('describes Columbia Cloudworks LLC with its verified Google Business Profile', () => {
    const org = nodeOfType(readGraph(), 'Organization');

    expect(org.name).toBe('Columbia Cloudworks LLC');
    expect(org.legalName).toBe('Columbia Cloudworks LLC');
    expect(org.logo).toMatch(/^https:\/\/equipqr\.app\//);
    expect(org.sameAs).toEqual(
      expect.arrayContaining([
        'https://maps.google.com/?cid=13059136057524953855',
        'https://g.page/r/Cf8iRdYNXzu1EBM',
      ]),
    );
  });

  it('describes EquipQR as a web BusinessApplication published by Columbia Cloudworks LLC', () => {
    const graph = readGraph();
    const app = nodeOfType(graph, 'SoftwareApplication');
    const org = nodeOfType(graph, 'Organization');

    expect(app.name).toBe('EquipQR');
    expect(app.url).toBe('https://equipqr.app');
    expect(app.applicationCategory).toBe('BusinessApplication');
    expect(String(app.operatingSystem)).toMatch(/\bWeb\b/);
    expect(app.publisher).toEqual({ '@id': org['@id'] });
  });

  it('only references @ids defined in the graph', () => {
    const graph = readGraph();
    const ids = new Set(graph.map((n) => n['@id']));
    const refs = JSON.stringify(graph).match(/\{"@id":"[^"]+"\}/g) ?? [];

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ids).toContain((JSON.parse(ref) as { '@id': string })['@id']);
    }
  });
});
