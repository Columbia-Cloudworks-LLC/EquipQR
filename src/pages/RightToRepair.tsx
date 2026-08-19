import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Download, Unlock, Wrench } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import { PageBackButton } from '@/components/layout/PageBackButton';
import LegalFooter from '@/components/layout/LegalFooter';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RightToRepairLandscape } from '@/pages/legal/right-to-repair/RightToRepairLandscape';
import {
  EQUIPQR_REPAIR_COMMITMENTS,
  RIGHT_TO_REPAIR_REVIEWED_ON,
  RIGHT_TO_REPAIR_SEO,
} from '@/pages/legal/right-to-repair/rightToRepairContent';
import type { EquipQrCommitmentId } from '@/pages/legal/right-to-repair/types';

const COMMITMENT_ICONS: Record<EquipQrCommitmentId, LucideIcon> = {
  export: Download,
  'no-hostage': Unlock,
  'no-pairing': Wrench,
};

export function RightToRepair(): JSX.Element {
  return (
    <>
      <PageSEO
        title={RIGHT_TO_REPAIR_SEO.title}
        description={RIGHT_TO_REPAIR_SEO.description}
        path={RIGHT_TO_REPAIR_SEO.path}
      />
      <div className="flex min-h-screen flex-col bg-background">
        <LandingHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <section className="relative bg-gradient-to-br from-background via-background to-primary/5 pb-16 pt-32">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl">
                <PageBackButton className="mb-6" />
                <div className="text-center">
                  <p className="text-sm font-medium uppercase tracking-wide text-primary">
                    Public stance
                  </p>
                  <h1
                    data-route-heading="true"
                    tabIndex={-1}
                    className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                  >
                    Right to Repair
                  </h1>
                  <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                    If you bought the machine, you should be able to keep it running. If you logged
                    the work in EquipQR, that history is yours. We will not hold your data hostage.
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Last reviewed {RIGHT_TO_REPAIR_REVIEWED_ON}. This page is a statement of
                    principles. It is not a contract and does not change the{' '}
                    <Link to="/terms-of-service" className="underline hover:text-foreground">
                      Terms of Service
                    </Link>{' '}
                    or{' '}
                    <Link to="/privacy-policy" className="underline hover:text-foreground">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="commitments-heading"
            className="border-y border-border/50 bg-muted/20 py-16"
          >
            <div className="container mx-auto px-4">
              <h2 id="commitments-heading" className="mb-10 text-center text-3xl font-bold">
                What we commit to
              </h2>
              <ul className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                {EQUIPQR_REPAIR_COMMITMENTS.map((commitment) => {
                  const Icon = COMMITMENT_ICONS[commitment.id];
                  return (
                    <li key={commitment.id}>
                      <Card className="h-full">
                        <CardHeader>
                          <Icon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                          <CardTitle className="text-xl">{commitment.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{commitment.body}</p>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <div className="container mx-auto px-4 py-16">
            <RightToRepairLandscape />
          </div>

          <section className="border-t border-border/50 bg-muted/20 py-16">
            <div className="container mx-auto max-w-3xl space-y-4 px-4">
              <h2 className="text-2xl font-bold">Why this sits with Legal</h2>
              <p className="text-muted-foreground">
                Repair shops live this problem. A tractor that needs a dealer login, a printer that
                rejects a legal cartridge, a hub that dies when a vendor cloud folds. EquipQR is
                software for those shops. Our job is the record of the work, not a second lock on
                the asset.
              </p>
              <p className="text-muted-foreground">
                The examples above are the pattern, not a catalog of every docket. We kept numbers
                and 2026 filings out unless they are well documented. If a fact here drifts, email{' '}
                <a
                  href="mailto:nicholas.king@columbiacloudworks.com"
                  className="underline hover:text-foreground"
                >
                  nicholas.king@columbiacloudworks.com
                </a>
                .
              </p>
            </div>
          </section>
        </main>
        <LegalFooter />
      </div>
    </>
  );
}
