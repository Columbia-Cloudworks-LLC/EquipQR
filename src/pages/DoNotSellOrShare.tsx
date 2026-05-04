import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSEO } from '@/components/seo/PageSEO';

const EFFECTIVE_DATE = 'May 3, 2026';
const CONTACT_EMAIL = 'mailto:nicholas.king@columbiacloudworks.com';

export default function DoNotSellOrShare() {
  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Do Not Sell or Share — EquipQR"
        description="How EquipQR handles requests related to sale or sharing of personal information."
        path="/do-not-sell-or-share"
      />
      <div className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Do Not Sell or Share My Personal Information</CardTitle>
            <p className="text-sm text-muted-foreground pt-2">Effective date: {EFFECTIVE_DATE}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
            <p>
              EquipQR is operated by <strong>Columbia Cloudworks LLC</strong>. We do{' '}
              <strong>not</strong> sell your personal information and we do <strong>not</strong>{' '}
              share it for cross-context behavioral advertising as those terms are commonly understood
              under California privacy laws.
            </p>
            <p>
              If you wish to exercise privacy rights available in your jurisdiction — including
              California opt-out of sale/share, access, deletion, or correction requests — use our
              privacy request intake so we can verify and fulfill your request:
            </p>
            <p>
              <Button asChild>
                <Link to="/privacy-request">Submit a privacy request</Link>
              </Button>
            </p>
            <p>
              For questions, contact{' '}
              <a href={CONTACT_EMAIL} className="underline">
                nicholas.king@columbiacloudworks.com
              </a>
              .
            </p>
            <p>
              See also our{' '}
              <Link to="/privacy-policy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
