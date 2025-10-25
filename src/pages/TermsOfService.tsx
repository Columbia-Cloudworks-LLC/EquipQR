import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <span aria-hidden="true" className="mr-2">←</span>
            Back to Dashboard
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last Updated: 10/24/2025
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Who We Are & How These Terms Work.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms of Service ("<strong>Terms</strong>") are a contract between <strong>Columbia Cloudworks LLC</strong>,
              a Delaware limited liability company ("<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"),
              and the person or entity that creates an account or otherwise uses <strong>EquipQR</strong> (the "<strong>Service</strong>")
              ("<strong>Customer</strong>", "<strong>you</strong>", or "<strong>your</strong>"). If you are using the Service on behalf of an entity,
              you represent that you have authority to bind that entity, and "you" refers to that entity. By accessing or using the Service, you agree to these Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1) The Service.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              The Service is a fleet equipment management platform enabling equipment records, QR codes, maintenance scheduling, work orders, reporting, and user management. We may modify features from time to time. The Service is not an OEM specification, repair manual, or professional advice, and is not designed for high-risk or safety-critical use.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2) Accounts & Organization Admins.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              You must provide accurate registration details and keep them current. You are responsible for all activities under your account and for maintaining the confidentiality of credentials. Organization administrators control user access and may view, restrict, or remove users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3) Acceptable Use.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>You will not (and will not allow anyone to):</p>
            <ul className="list-disc pl-5">
              <li>use the Service in violation of law or third-party rights (including IP and privacy rights);</li>
              <li>upload malicious code;</li>
              <li>probe, scan, or test the vulnerability of the Service;</li>
              <li>access the Service to build a competing product;</li>
              <li>scrape, bulk-export, or rate-limit-evade our APIs;</li>
              <li>submit unlawful, harmful, or <strong>regulated</strong> data without our prior written consent (e.g., PCI cardholder data, PHI under HIPAA, or data of children under 13);</li>
              <li>use the Service for <strong>high-risk activities</strong> where failure could lead to death, personal injury, or catastrophic damage (e.g., life support, nuclear facilities).</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4) Customer Data & Privacy.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              "<strong>Customer Data</strong>" means data, files, content, and information you (or your users) submit to the Service. As between the parties, <strong>you own Customer Data</strong>. You grant us a non-exclusive, worldwide, royalty-free license to host, copy, process, transmit, and display Customer Data <strong>solely as necessary</strong> to provide and improve the Service and to comply with law.
            </p>
            <p>
              We process personal data in accordance with our <Link to="/privacy-policy" className="underline">Privacy Policy</Link>. If you require a data processing agreement (DPA), you may request one at any time.
            </p>
            <p>
              Upon termination or expiration, you may export Customer Data for <strong>30 days</strong>. After that, we may delete or de-identify Customer Data from active systems, except where retention is required by law or for legitimate business records.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5) Third-Party Services.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              The Service may interoperate with or depend on third-party products and services (e.g., hosting, databases, payments). We do not control third-party services and are not responsible for their acts or omissions. Your use of any third-party service is subject to that provider’s terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6) Subscriptions; Billing; Taxes.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Paid plans bill in advance and <strong>auto-renew</strong> for the same term unless canceled. You authorize us (and our payment processor) to charge all fees using your selected payment method. <strong>Fees are non-refundable</strong> except where required by law. You are responsible for all applicable <strong>taxes</strong> and government charges, excluding our U.S. income taxes.
            </p>
            <p>
              We may change prices with <strong>30 days’ prior notice</strong>; new prices take effect on the <strong>next renewal</strong>. If you disagree, cancel before renewal. Downgrades take effect on the next term. Trials may be limited and may be ended at any time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7) Security; Availability; No SLA.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We implement commercially reasonable administrative, technical, and physical safeguards. The Service may be unavailable from time to time for maintenance, upgrades, or events beyond our reasonable control. <strong>No service-level agreement</strong> applies unless otherwise agreed in a signed writing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8) Suspension & Termination.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may suspend or terminate your access if: (a) you materially breach these Terms and fail to cure within <strong>10 days</strong> after notice; (b) you fail to pay fees; or (c) we reasonably believe your use presents legal, security, or operational risk. You may terminate at any time by canceling your subscription; termination is effective at the end of the current term. We will provide a <strong>30-day</strong> window post-termination for data export (except in cases of unlawful activity or significant security risk).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9) Intellectual Property; License; Feedback.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We and our licensors own the Service, its software, and all related IP. Subject to these Terms and payment of fees, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Service during your subscription term for your internal business purposes.
            </p>
            <p>
              You will not (and will not permit anyone to): (a) copy, modify, translate, or create derivative works of the Service; (b) reverse engineer, decompile, disassemble, or attempt to discover the source code of the Service; (c) bypass, remove, or defeat any security or usage controls; or (d) use the Service for timesharing or service bureau purposes.
            </p>
            <p>
              <strong>Feedback.</strong> If you provide ideas or suggestions about the Service ("<strong>Feedback</strong>"), you grant us a nonexclusive, perpetual, irrevocable, royalty-free license to use the Feedback for any purpose.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10) Indemnification.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              <strong>Our IP Indemnity.</strong> We will defend you against third-party claims alleging that the Service infringes a U.S. patent, copyright, or trademark, and pay damages and costs finally awarded, provided you promptly notify us and cooperate. We may (at our option) <strong>modify or replace</strong> the Service to avoid infringement or <strong>refund</strong> prepaid fees for the remaining term and terminate your access. We have no obligation for claims based on combinations, modifications not made by us, or use after we notify you to stop.
            </p>
            <p>
              <strong>Your Indemnity.</strong> You will defend and indemnify us from third-party claims arising from Customer Data, your use of the Service in violation of these Terms, or your violation of law or third-party rights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11) Disclaimers.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12) Limitation of Liability.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              To the fullest extent permitted by law, <strong>our total liability</strong> for any claim arising out of or relating to the Service or these Terms will not exceed the <strong>amounts you actually paid</strong> for the Service in the <strong>12 months</strong> before the event giving rise to liability. We will not be liable for any indirect, incidental, special, consequential, or punitive damages, or lost profits or revenues. These limits apply even if a remedy fails of its essential purpose.
            </p>
            <p>
              <strong>Exclusions:</strong> The foregoing cap does <strong>not</strong> limit your payment obligations or either party’s liability for violation of the other party’s IP rights, or for willful, unlawful conduct.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13) Changes to These Terms.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may update these Terms from time to time. For <strong>material</strong> changes, we will provide <strong>30 days’ prior notice</strong> by email or in-app notice. Changes apply <strong>prospectively</strong> and take effect on the <strong>next renewal</strong>. If you do not agree, you may cancel before the effective date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14) Governing Law; Venue; Notices; Miscellaneous.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms are governed by the laws of <strong>Delaware</strong>, without regard to conflicts of laws. The parties consent to the <strong>exclusive jurisdiction and venue</strong> of the state and federal courts located in <strong>Delaware</strong>.
            </p>
            <p>
              <strong>Notices.</strong> Notices will be sent to the contacts in your account and to <a href="mailto:legal@columbiacloudworks.com" className="underline">legal@columbiacloudworks.com</a> (or another posted address).
            </p>
            <p>
              <strong>Assignment.</strong> You may not assign these Terms without our prior written consent; we may assign to an affiliate or in connection with a merger, acquisition, or sale of assets.
            </p>
            <p>
              <strong>Export & Sanctions.</strong> You will comply with U.S. export control and economic sanctions laws.
            </p>
            <p>
              <strong>U.S. Government End-Users.</strong> The Service is “commercial computer software” subject to restricted rights.
            </p>
            <p>
              <strong>Waiver; Severability; Order of Precedence; Survival.</strong> A waiver must be in writing; unenforceable terms are severed; order of precedence is: an executed order form (if any), then these Terms, then online policies; provisions that by their nature survive, do survive.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>15) Entire Agreement.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms are the entire agreement between you and us regarding the Service and supersede all prior or contemporaneous agreements on that subject.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>16) Contact.</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              <strong>Columbia Cloudworks LLC</strong> • Email: <a href="mailto:nicholas.king@columbiacloudworks.com" className="underline">nicholas.king@columbiacloudworks.com</a> • Website: <a href="https://equipqr.app" target="_blank" rel="noopener noreferrer" className="underline">https://equipqr.app</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
