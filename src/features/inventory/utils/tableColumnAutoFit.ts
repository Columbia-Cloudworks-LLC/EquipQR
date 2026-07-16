const DEFAULT_SANS_FONT = '500 14px ui-sans-serif, system-ui, sans-serif';
const DEFAULT_MONO_FONT = '400 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const HEADER_EXTRA_WIDTH = 28;

type MeasureColumnAutoFitWidthOptions = {
  minWidth?: number;
  maxWidth?: number;
  mono?: boolean;
};

export function measureColumnAutoFitWidth(
  samples: string[],
  options: MeasureColumnAutoFitWidthOptions = {},
): number {
  const minWidth = options.minWidth ?? 48;
  const maxWidth = options.maxWidth ?? 600;

  if (typeof document === 'undefined') {
    return minWidth;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return minWidth;
  }

  context.font = options.mono ? DEFAULT_MONO_FONT : DEFAULT_SANS_FONT;

  let widest = 0;
  for (const sample of samples) {
    widest = Math.max(widest, context.measureText(sample).width);
  }

  const fitted = Math.ceil(widest) + HEADER_EXTRA_WIDTH;
  return Math.min(maxWidth, Math.max(minWidth, fitted));
}
