import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getScanFeedbackDebugInfo,
  markScanFeedbackPending,
  playDirectScanFeedbackTone,
  prepareScanFeedback,
  triggerPendingScanFeedback,
} from '@/lib/scanFeedback';

/**
 * Development-only page to critique scan feedback audio/haptics.
 * Route is registered only when `import.meta.env.DEV` is true (see App.tsx).
 */
const DebugScanFeedback: React.FC = () => {
  const [info, setInfo] = useState(() => getScanFeedbackDebugInfo());

  const refresh = useCallback(() => {
    setInfo(getScanFeedbackDebugInfo());
  }, []);

  const handlePrepare = () => {
    prepareScanFeedback();
    refresh();
  };

  const handleMarkPending = () => {
    markScanFeedbackPending();
    refresh();
  };

  const handleTriggerPending = () => {
    triggerPendingScanFeedback();
    refresh();
  };

  const handleDirectTone = () => {
    playDirectScanFeedbackTone();
    refresh();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Scan feedback debug</CardTitle>
            <p className="text-sm text-muted-foreground">
              Production plays audio and haptic only after a <strong>live camera</strong> scan on{' '}
              <code>/dashboard/scan</code> completes and the QR redirect resolves access. Upload and direct QR URLs
              stay silent.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Web Audio</dt>
                <dd>{info.webAudioSupported ? 'supported' : 'not available'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Shared AudioContext.state</dt>
                <dd>{info.contextState ?? 'no context yet'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Vibration API</dt>
                <dd>{info.vibrationSupported ? 'supported' : 'not available'}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handlePrepare}>
                Prepare / unlock audio
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleDirectTone}>
                Play direct test tone
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleMarkPending}>
                Mark pending (sessionStorage)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleTriggerPending}>
                Consume pending + play
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Use “Prepare” from a click first (mirrors Start camera scan), then try the direct tone. “Mark pending +
              Consume pending” simulates navigating from scanner to QR redirect completion.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugScanFeedback;
