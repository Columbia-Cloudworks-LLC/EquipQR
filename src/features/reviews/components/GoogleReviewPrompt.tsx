import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useReviewMilestone } from '@/features/reviews/hooks/useReviewMilestone';
import {
  getGbpReviewUrl,
  isReviewPromptDismissed,
  markReviewPromptDismissed,
} from '@/features/reviews/lib/googleReviewPrompt';

/**
 * Shows a single dismissible toast asking organization owners/admins for a
 * Google review once the organization reaches a value milestone. The prompt is
 * recorded as soon as it is shown, so it never appears again in this browser.
 * Renders nothing.
 */
export function GoogleReviewPrompt() {
  const { currentOrganization } = useOrganization();
  const reviewUrl = getGbpReviewUrl();
  const [dismissed, setDismissed] = useState(isReviewPromptDismissed);
  const isOwnerOrAdmin =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';
  const eligible =
    Boolean(reviewUrl) &&
    !dismissed &&
    isOwnerOrAdmin &&
    currentOrganization?.userStatus === 'active';

  const { data: milestoneReached } = useReviewMilestone(currentOrganization?.id, eligible);

  useEffect(() => {
    if (!eligible || !milestoneReached || !reviewUrl) return;
    markReviewPromptDismissed();
    setDismissed(true);
    toast('Is EquipQR helping your shop?', {
      id: 'google-review-prompt',
      description: 'A quick Google review helps other repair shops find us. It takes about a minute.',
      duration: Infinity,
      action: {
        label: 'Leave a review',
        onClick: () => {
          window.open(reviewUrl, '_blank', 'noopener,noreferrer');
        },
      },
      cancel: {
        label: 'Not now',
        onClick: () => undefined,
      },
    });
  }, [eligible, milestoneReached, reviewUrl]);

  return null;
}
