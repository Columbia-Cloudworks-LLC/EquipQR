interface DistributorRowProps {
  name: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
}

export default function DistributorRow({ name, phone, website, email }: DistributorRowProps) {
  return (
    <tr>
      <td className="py-2">{name ?? '-'}</td>
      <td className="py-2">
        {phone ? <a className="text-primary underline" href={`tel:${phone}`}>Call</a> : '-'}
      </td>
      <td className="py-2">
        {website ? <a className="text-primary underline" href={website} target="_blank" rel="noreferrer">Open site</a> : '-'}
      </td>
    </tr>
  );
}
