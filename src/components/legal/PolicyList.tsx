import type { ReactNode } from 'react';

export type PolicyListItem = {
  /** Rendered inside `<strong>` — include trailing colon when the source copy used one. */
  label: ReactNode;
  content: ReactNode;
};

export function PolicyList({ items }: { items: PolicyListItem[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={typeof item.label === 'string' ? item.label : `policy-item-${index}`}>
          <strong>{item.label}</strong> {item.content}
        </li>
      ))}
    </ul>
  );
}

export function PolicyProviderSection({
  title,
  items,
}: {
  title: string;
  items: PolicyListItem[];
}) {
  return (
    <>
      <h3>{title}</h3>
      <PolicyList items={items} />
    </>
  );
}
