import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AssetQRCodeDisplay from '@/components/common/AssetQRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { useEquipmentOperatorCheckinAssignments } from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import {
  getStoredOperatorCheckinToken,
  subscribeOperatorCheckinTokenChanges,
} from '@/features/operator-check-ins/utils/operatorCheckinTokenStorage';
import { equipmentQRPath, operatorCheckInQRPath, qrFullUrl } from '@/utils/qr';

const EQUIPMENT_VARIANT = 'equipment';
export type EquipmentQRVariant = typeof EQUIPMENT_VARIANT | `assignment:${string}`;
type QRVariant = EquipmentQRVariant;

function isAssignmentVariant(variant: QRVariant): variant is `assignment:${string}` {
  return variant.startsWith('assignment:');
}

function assignmentIdFromVariant(variant: QRVariant): string | null {
  return isAssignmentVariant(variant) ? variant.slice('assignment:'.length) : null;
}

interface QRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName?: string;
  /** When provided the generated QR URL includes `?org=<id>` so the scan
   *  landing page can perform a single-org lookup instead of a cross-org scan. */
  organizationId?: string;
  /** When set, opens the dialog on this QR variant (e.g. after assigning check-in). */
  initialVariant?: QRVariant;
}

const EQUIPMENT_QR_INSTRUCTIONS = [
  'Copy the URL and paste it into your preferred QR app if that is how you generate printable codes',
  'Or download the PNG/JPG image and print it from your computer or phone',
  'Print this QR code and attach it to the equipment where technicians can scan it',
  "Scans open this equipment's details and are logged automatically",
];

const OPERATOR_CHECKIN_QR_INSTRUCTIONS = [
  'Print this QR code and place it on the vehicle or equipment for daily operator check-ins',
  'Operators scan with their phone — no login required',
  'Each submission is recorded in the daily check-in ledger',
  'This QR code is separate from the authenticated equipment scan QR',
];

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  open,
  onClose,
  equipmentId,
  equipmentName,
  organizationId,
  initialVariant = EQUIPMENT_VARIANT,
}) => {
  const { data: assignments = [], isLoading: assignmentsLoading } = useEquipmentOperatorCheckinAssignments(
    equipmentId,
    organizationId,
    { enabled: open },
  );
  const [variant, setVariant] = useState<QRVariant>(initialVariant);
  const [tokenRevision, setTokenRevision] = useState(0);

  const enabledAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.enabled),
    [assignments],
  );

  const refreshTokens = useCallback(() => {
    setTokenRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    return subscribeOperatorCheckinTokenChanges(refreshTokens);
  }, [open, refreshTokens]);

  useEffect(() => {
    if (open) {
      setVariant(initialVariant);
      refreshTokens();
    }
  }, [open, equipmentId, initialVariant, refreshTokens]);

  useEffect(() => {
    if (!open || assignmentsLoading) return;
    const selectedAssignmentId = assignmentIdFromVariant(variant);
    if (selectedAssignmentId) {
      const stillValid = enabledAssignments.some((assignment) => assignment.id === selectedAssignmentId);
      if (!stillValid) {
        setVariant(EQUIPMENT_VARIANT);
      }
    }
  }, [open, variant, enabledAssignments, assignmentsLoading]);

  const selectedAssignmentId = assignmentIdFromVariant(variant);
  const selectedAssignment = enabledAssignments.find((assignment) => assignment.id === selectedAssignmentId);
  const storedToken = selectedAssignmentId
    ? getStoredOperatorCheckinToken(selectedAssignmentId)
    : null;

  // tokenRevision ensures memo recalculates when in-memory tokens change
  const activeConfig = useMemo(() => {
    void tokenRevision;

    if (selectedAssignment && storedToken) {
      const path = operatorCheckInQRPath(storedToken);
      const checklistName = selectedAssignment.template?.name ?? 'Daily check-in';
      return {
        title: `${checklistName} QR Code`,
        qrCodeUrl: qrFullUrl(path),
        qrImageAlt: `${checklistName} QR for ${equipmentName ?? equipmentId}`,
        defaultFilenameStem: `${equipmentName ?? equipmentId}-${checklistName}`.replace(/\s+/g, '-'),
        instructionBullets: OPERATOR_CHECKIN_QR_INSTRUCTIONS,
        formatSelectId: `operator-checkin-qr-download-format-${selectedAssignment.id}`,
      };
    }

    return {
      title: 'Equipment QR Code',
      qrCodeUrl: qrFullUrl(equipmentQRPath(equipmentId, organizationId)),
      qrImageAlt: 'Equipment QR Code',
      defaultFilenameStem: `equipment-${equipmentId}`,
      instructionBullets: EQUIPMENT_QR_INSTRUCTIONS,
      formatSelectId: 'qr-code-download-format',
    };
  }, [
    tokenRevision,
    selectedAssignment,
    storedToken,
    equipmentId,
    equipmentName,
    organizationId,
  ]);

  const showMissingTokenNotice = Boolean(selectedAssignment && !storedToken);
  const hasAssignmentOptions = enabledAssignments.length > 0;
  const isDailyCheckinVariant = isAssignmentVariant(variant);

  return (
    <AssetQRCodeDisplay
      open={open}
      onClose={onClose}
      entityId={equipmentId}
      entityName={equipmentName}
      title={activeConfig.title}
      resourceLabel="equipment"
      qrCodeUrl={activeConfig.qrCodeUrl}
      qrImageAlt={activeConfig.qrImageAlt}
      defaultFilenameStem={activeConfig.defaultFilenameStem}
      instructionBullets={activeConfig.instructionBullets}
      formatSelectId={activeConfig.formatSelectId}
      imageLoading="lazy"
      headerExtra={
        hasAssignmentOptions ? (
          <div className="space-y-3 pb-2">
            <div className="space-y-2">
              <Label htmlFor="equipment-qr-variant">QR code type</Label>
              <Select value={variant} onValueChange={(value) => setVariant(value as QRVariant)}>
                <SelectTrigger id="equipment-qr-variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EQUIPMENT_VARIANT}>Equipment scan (authenticated)</SelectItem>
                  {enabledAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={`assignment:${assignment.id}`}>
                      Daily check-in: {assignment.template?.name ?? 'Checklist'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showMissingTokenNotice && (
              <Alert>
                <AlertDescription className="space-y-2">
                  <p>
                    Generate a QR link for{' '}
                    <strong>{selectedAssignment?.template?.name ?? 'this checklist'}</strong> on the equipment
                    details page first, then return here to print it.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    Close and generate link
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {isDailyCheckinVariant && !showMissingTokenNotice && (
              <p className="text-sm text-muted-foreground">
                <ExternalLink href={OPERATOR_DAILY_CHECK_INS_DOCS_URL} className="text-sm">
                  Daily check-in QR placement and printing guide
                </ExternalLink>
              </p>
            )}
          </div>
        ) : undefined
      }
      suppressQrPanel={showMissingTokenNotice}
    />
  );
};

export default QRCodeDisplay;
