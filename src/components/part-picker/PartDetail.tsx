import type { PartDetailDto } from '@/types/parts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function PartDetail({ data }: { data: PartDetailDto }) {
  const { part, distributors } = data;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {part.title} {part.brand ? `• ${part.brand}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">{part.canonical_mpn} • {part.category ?? 'Uncategorized'}</div>
          {part.description && <p className="mb-2">{part.description}</p>}
          {part.attributes && (
            <pre className="bg-muted/40 rounded p-3 text-xs overflow-auto">{JSON.stringify(part.attributes, null, 2)}</pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Website</th>
                </tr>
              </thead>
              <tbody>
                {distributors.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2">{d.name ?? '-'}</td>
                    <td className="py-2">{d.phone ? <a href={`tel:${d.phone}`} className="text-primary underline">{d.phone}</a> : '-'}</td>
                    <td className="py-2">{d.website ? <a href={d.website} target="_blank" rel="noreferrer" className="text-primary underline">{d.website}</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
