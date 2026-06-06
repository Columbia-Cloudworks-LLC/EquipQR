import React from 'react';
import { humanizeAttributeValue } from '@/features/work-orders/utils/workOrderHelpers';

const DANGEROUS_PROTOCOLS_REGEX = /^(javascript|data|vbscript):/i;

export function humanizeCustomAttributeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const isUrl = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) return false;
  const urlPattern = /^(https?:\/\/|www\.)[\w-]+(\.[\w-]+)+([\w\-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/i;
  return urlPattern.test(trimmed);
};

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return trimmed;
};

export function renderCustomAttributeValue(value: string): React.ReactNode {
  if (isUrl(value)) {
    const url = normalizeUrl(value);
    if (DANGEROUS_PROTOCOLS_REGEX.test(url)) {
      return <div className="text-lg break-all">{value}</div>;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg break-all text-primary hover:underline"
        aria-label={`${value} (opens in new tab)`}
      >
        {value}
      </a>
    );
  }
  return <div className="text-lg break-all">{humanizeAttributeValue(value)}</div>;
}
