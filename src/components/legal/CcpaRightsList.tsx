import {
  ccpaRightsPolicyItems,
  ccpaRightsSummaryItems,
  type CcpaRightPolicyItem,
  type CcpaRightSummaryItem,
} from '@/components/legal/ccpaRightsContent';

type CcpaRightsListProps =
  | { variant: 'summary' }
  | { variant: 'policy' };

const renderSummaryList = (items: CcpaRightSummaryItem[]) => (
  <ul>
    {items.map((item) => (
      <li key={item.title}>
        <strong>{item.title}</strong> {item.description}
      </li>
    ))}
  </ul>
);

const renderPolicyList = (items: CcpaRightPolicyItem[]) => (
  <ul>
    {items.map((item) => (
      <li key={item.title}>
        <strong>{item.title}</strong> {item.description}
      </li>
    ))}
  </ul>
);

export const CcpaRightsList = (props: CcpaRightsListProps) => {
  if (props.variant === 'summary') {
    return renderSummaryList(ccpaRightsSummaryItems);
  }
  return renderPolicyList(ccpaRightsPolicyItems);
};
