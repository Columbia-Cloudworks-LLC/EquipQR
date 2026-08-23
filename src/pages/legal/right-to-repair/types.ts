export type LandscapeLens = 'software' | 'hardware' | 'physical';

export type LandscapeSector = 'enterprise' | 'consumer' | 'agriculture-fleet';

export type LandscapeMechanism =
  | 'cloud-tether'
  | 'subscription-lock'
  | 'parts-pairing'
  | 'firmware-paywall'
  | 'diagnostic-lockout'
  | 'buy-vs-license';

export type LandscapeCase = {
  id: string;
  title: string;
  vendor: string;
  lenses: readonly [LandscapeLens, ...LandscapeLens[]];
  sector: LandscapeSector;
  mechanisms: readonly [LandscapeMechanism, ...LandscapeMechanism[]];
  period: string;
  practice: string;
  harm: string;
  sourceLabel: string;
  sourceHref: string;
};

export type LandscapeFilters = {
  lens: LandscapeLens | 'all';
  sector: LandscapeSector | 'all';
  mechanism: LandscapeMechanism | 'all';
  query: string;
};

export type EquipQrCommitmentId = 'export' | 'no-hostage' | 'no-pairing';

export type EquipQrCommitment = {
  id: EquipQrCommitmentId;
  title: string;
  body: string;
};
