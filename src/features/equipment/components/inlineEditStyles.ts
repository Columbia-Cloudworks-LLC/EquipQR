import { cn } from '@/lib/utils';

export const inlineEditIconClassName =
  'h-11 w-11 shrink-0 p-0 text-muted-foreground hover:text-foreground';

export const desktopHoverEditIconClassName = cn(
  inlineEditIconClassName,
  'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
);

export const responsiveHoverEditIconClassName = cn(
  inlineEditIconClassName,
  'sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100',
);

/** Applied with a base flex row on mobile to push the edit trigger to the card edge. */
export const mobileInlineEditRowExtrasClassName = 'justify-between gap-3';

export const mobileInlineEditRowClassName = cn(
  'flex w-full min-w-0 items-center',
  mobileInlineEditRowExtrasClassName,
);

export const mobileInlineEditValueClassName = 'min-w-0 flex-1';

/** Row with a leading icon: icon + value area + edit trigger at card edge. */
export const mobileInlineEditIconRowClassName =
  'mt-1 flex w-full min-w-0 items-center gap-2';

export const desktopInlineEditRowClassName =
  'group flex min-w-0 flex-1 items-center gap-2';
