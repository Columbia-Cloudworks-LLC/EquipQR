import type { EquipQrCommitment, LandscapeCase, LandscapeLens, LandscapeMechanism, LandscapeSector } from './types';

export const RIGHT_TO_REPAIR_PATH = '/right-to-repair';

export const RIGHT_TO_REPAIR_SEO = {
  title: 'Right to Repair',
  description:
    'EquipQR supports your right to repair equipment you already own. We will not hold your records hostage. This page is a public stance, not a contract.',
  path: RIGHT_TO_REPAIR_PATH,
} as const;

export const RIGHT_TO_REPAIR_REVIEWED_ON = 'August 19, 2026';

export const EQUIPQR_REPAIR_COMMITMENTS: readonly EquipQrCommitment[] = [
  {
    id: 'export',
    title: 'Your records leave with you',
    body: 'Organization owners can export operational data. If you stop using EquipQR, we do not keep your history locked behind a login as leverage.',
  },
  {
    id: 'no-hostage',
    title: 'We will not hold data hostage',
    body: 'Subscription end is not a kill switch on the work you already logged. We do not design the product so your shop cannot read or take its own equipment history.',
  },
  {
    id: 'no-pairing',
    title: 'We do not lock the machines you service',
    body: 'EquipQR is a records and work-order system. We do not pair replacement parts to our software, withhold diagnostics as a rent, or brick equipment from the cloud.',
  },
];

export const LENS_LABELS: Record<LandscapeLens | 'all', string> = {
  all: 'All layers',
  software: 'Software',
  hardware: 'Hardware',
  physical: 'Physical repair',
};

export const SECTOR_LABELS: Record<LandscapeSector | 'all', string> = {
  all: 'All sectors',
  enterprise: 'Enterprise',
  consumer: 'Consumer',
  'agriculture-fleet': 'Agriculture and fleet',
};

export const MECHANISM_LABELS: Record<LandscapeMechanism | 'all', string> = {
  all: 'All mechanisms',
  'cloud-tether': 'Cloud tether',
  'subscription-lock': 'Subscription lock',
  'parts-pairing': 'Parts pairing',
  'firmware-paywall': 'Firmware paywall',
  'diagnostic-lockout': 'Diagnostic lockout',
  'buy-vs-license': 'Buy vs license',
};

export const LANDSCAPE_CASES: readonly LandscapeCase[] = [
  {
    id: 'broadcom-vmware',
    title: 'VMware licensing after Broadcom',
    vendor: 'Broadcom',
    lenses: ['software'],
    sector: 'enterprise',
    mechanisms: ['subscription-lock'],
    period: '2023–2024',
    practice:
      'After buying VMware, Broadcom moved many customers off perpetual licenses toward subscription bundles. Public reports described sharp price increases for estates that had already capitalized the software.',
    harm: 'A stack that had been bought as an asset became a recurring rent. Switching costs kept shops paying.',
    sourceLabel: 'Broadcom VMware licensing announcement',
      sourceHref: 'https://www.broadcom.com/products/software/cloud-foundation/vmware-cloud-foundation',
  },
  {
    id: 'adobe-early-termination',
    title: 'Adobe Creative Cloud cancellation',
    vendor: 'Adobe',
    lenses: ['software'],
    sector: 'consumer',
    mechanisms: ['subscription-lock', 'buy-vs-license'],
    period: '2024',
    practice:
      'The U.S. FTC sued Adobe in June 2024 over annual-plan early termination fees and the way those fees were disclosed during signup and cancellation.',
    harm: 'Customers who thought they could leave a creative tool still owed a large remaining-term charge.',
    sourceLabel: 'FTC, United States v. Adobe Inc. (N.D. Cal., 2024)',
    sourceHref:
      'https://www.ftc.gov/news-events/news/press-releases/2024/06/ftc-takes-action-against-adobe-executives-hiding-fees-preventing-consumers-easily-cancelling',
  },
  {
    id: 'hp-dynamic-security',
    title: 'HP Dynamic Security ink lockout',
    vendor: 'HP',
    lenses: ['software', 'hardware'],
    sector: 'consumer',
    mechanisms: ['firmware-paywall'],
    period: '2016–2024',
    practice:
      'Firmware on some HP printers blocked third-party or remanufactured cartridges. Regulators and courts later treated that as a post-sale restriction on hardware already in the home or office.',
    harm: 'Printers that had been paid for stopped accepting legal supplies. Independent cartridge makers lost a market.',
    sourceLabel: 'HP Dynamic Security support documentation',
      sourceHref: 'https://support.hp.com/us-en/document/ish_6885850-6885909-16',
  },
  {
    id: 'insteon-cloud',
    title: 'Insteon cloud outage',
    vendor: 'Insteon',
    lenses: ['software'],
    sector: 'consumer',
    mechanisms: ['cloud-tether'],
    period: '2022',
    practice:
      'Insteon hubs depended on a vendor cloud. When that service went dark in 2022, installed hardware in homes stopped working as a system until a later revival effort.',
    harm: 'Buyers who had paid for hubs discovered they had leased a server they did not control.',
    sourceLabel: 'The Verge reporting on Insteon shutdown',
      sourceHref: 'https://www.theverge.com/2022/4/19/23032720/insteon-smart-home-shutdown',
  },
  {
    id: 'sony-ps-video',
    title: 'PlayStation Store video libraries',
    vendor: 'Sony',
    lenses: ['software'],
    sector: 'consumer',
    mechanisms: ['buy-vs-license'],
    period: '2020s',
    practice:
      'Movies and shows sold through the PlayStation Store were licenses. Studio withdrawals later removed titles from libraries customers had already paid for.',
    harm: 'A “purchased” shelf was not a copy the customer kept. It was a revocable grant.',
    sourceLabel: 'Sony PlayStation Store video content notice',
      sourceHref: 'https://www.playstation.com/en-us/support/important-notice/',
  },
  {
    id: 'apple-parts-pairing',
    title: 'Serialized iPhone parts pairing',
    vendor: 'Apple',
    lenses: ['hardware'],
    sector: 'consumer',
    mechanisms: ['parts-pairing'],
    period: '2020s',
    practice:
      'Some replacement parts must cryptographically pair with the phone. Independent shops and Oregon’s 2024 electronics repair law treated serialization used to block repair as the problem to regulate.',
    harm: 'A used screen or battery can work electrically and still be software-degraded.',
    sourceLabel: 'Oregon SB 1596 (2024) and public reporting on Apple parts pairing',
    sourceHref: 'https://olis.oregonlegislature.gov/liz/2024R1/Measures/Overview/SB1596',
  },
  {
    id: 'cisco-smart-licensing',
    title: 'Cisco Smart Licensing phone-home',
    vendor: 'Cisco',
    lenses: ['software', 'hardware'],
    sector: 'enterprise',
    mechanisms: ['cloud-tether', 'subscription-lock'],
    period: '2010s–',
    practice:
      'Smart Licensing expects gear to report in to Cisco’s license service. Hardware that already shipped still needs an ongoing relationship with the vendor’s control plane.',
    harm: 'A paid switch is not fully usable without the vendor’s license servers and entitlements.',
    sourceLabel: 'Cisco Smart Licensing documentation and public licensing disputes',
  },
  {
    id: 'hpe-firmware-entitlement',
    title: 'HPE firmware behind support entitlement',
    vendor: 'HPE',
    lenses: ['hardware', 'software'],
    sector: 'enterprise',
    mechanisms: ['firmware-paywall'],
    period: '2010s–',
    practice:
      'Server firmware and support packs are often gated on an active contract. Security fixes for iron already in the rack can wait on a purchase order.',
    harm: 'The machine is on the floor. The ability to patch it is rented.',
    sourceLabel: 'HPE support/SPP entitlement practice as described in public IT operations writing',
  },
  {
    id: 'deere-diagnostics',
    title: 'Farm equipment diagnostic lockout',
    vendor: 'John Deere',
    lenses: ['physical', 'software'],
    sector: 'agriculture-fleet',
    mechanisms: ['diagnostic-lockout', 'firmware-paywall'],
    period: '2010s–',
    practice:
      'Independent farmers and shops have argued that dealer-only diagnostic software and firmware keep tractors they already bought from being repaired in the field. The FTC’s 2021 Nixing the Fix report collected this pattern across industries. Later manufacturer memoranda were widely criticized as non-binding.',
    harm: 'A harvest does not wait for a dealer appointment. Tool access becomes a toll on ownership.',
    sourceLabel: 'FTC, Nixing the Fix (2021); public farm right-to-repair reporting',
    sourceHref: 'https://www.ftc.gov/reports/nixing-fix',
  },
  {
    id: 'tesla-battery-repair',
    title: 'EV high-voltage repair access',
    vendor: 'Tesla',
    lenses: ['physical', 'hardware'],
    sector: 'consumer',
    mechanisms: ['parts-pairing', 'diagnostic-lockout'],
    period: '2020s',
    practice:
      'Independent reporting has compared OEM high-voltage pack replacement quotes with specialist repair costs that reuse modules. Access to parts, procedures, and software authorization is the bottleneck, not the physics of the pack.',
    harm: 'A damaged module can total a vehicle on paper while a shop with parts access could have repaired it.',
    sourceLabel: 'Independent EV repair reporting on pack replacement vs module repair',
  },
];
