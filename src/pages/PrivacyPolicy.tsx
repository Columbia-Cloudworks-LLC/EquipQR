import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageSEO
        title="Privacy Policy"
        description="Learn how EquipQR collects, uses, and protects your data. Our privacy policy covers information collection, data security, your rights, and contact details."
        path="/privacy-policy"
      />
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR™ ("we," "our," or "us"), developed by{' '}
              <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                COLUMBIA CLOUDWORKS LLC
              </ExternalLink>
              , is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our fleet equipment 
              management platform and services.
            </p>
            <p>
              Your use of the Service is subject to our <Link to="/terms-of-service" className="underline">Terms of Service</Link>. Capitalized terms not defined here have the meanings given in the Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We collect several types of information from and about users of our Services, including:
            </p>
            <ul>
              <li>
                <strong>Personal Information:</strong> This includes your name, email address, phone number,
                organization name, and billing information, which you provide when you register for an account,
                subscribe to our services, or contact us.
              </li>
              <li>
                <strong>Equipment Data:</strong> Information about the equipment you manage using our platform,
                such as equipment names, models, serial numbers, locations, maintenance schedules, and
                performance data.
              </li>
              <li>
                <strong>Usage Data:</strong> Details of your interactions with our Services, including the pages
                you visit, the features you use, and the dates and times of your visits.
              </li>
              <li>
                <strong>Log Data:</strong> Information automatically collected and stored in our server logs,
                including your IP address, browser type, operating system, and referring website.
              </li>
              <li>
                <strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar
                technologies to track your activity on our Services and collect certain information about your
                device and browsing behavior.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We use the information we collect for various purposes, including:
            </p>
            <ul>
              <li>
                To provide, maintain, and improve our Services.
              </li>
              <li>
                To personalize your experience and deliver content and features that match your interests and
                preferences.
              </li>
              <li>
                To process transactions and manage your account.
              </li>
              <li>
                To communicate with you about updates, promotions, and other news and information.
              </li>
              <li>
                To monitor and analyze usage trends and patterns.
              </li>
              <li>
                To detect, investigate, and prevent fraudulent or illegal activities.
              </li>
              <li>
                To comply with legal obligations and protect our rights and interests.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Share Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may share your information with third parties in the following circumstances:
            </p>
            <ul>
              <li>
                <strong>Service Providers:</strong> We may share your information with third-party service providers
                who assist us in providing and maintaining our Services, such as hosting providers, payment
                processors, and analytics providers.
              </li>
              <li>
                <strong>Subprocessors:</strong> We may engage vetted subprocessors to help operate the Service. If we publish a subprocessor list, we will link it from this policy.
              </li>
              <li>
                <strong>Business Partners:</strong> We may share your information with our business partners who
                offer products or services that may be of interest to you.
              </li>
              <li>
                <strong>Legal Compliance:</strong> We may disclose your information if required to do so by law or
                in response to a valid legal request, such as a subpoena or court order.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a
                portion of our assets, your information may be transferred as part of the transaction.
              </li>
              <li>
                <strong>With Your Consent:</strong> We may share your information with third parties when we have
                your consent to do so.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We take reasonable measures to protect your information from unauthorized access, use, or disclosure.
              These measures include encryption, firewalls, and regular security assessments. However, no method
              of transmission over the Internet or method of electronic storage is completely secure, so we cannot
              guarantee absolute security.
            </p>
            <p>
              For more on our security posture and availability commitments, see the <Link to="/terms-of-service" className="underline">Terms of Service</Link>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Retention; Export & Deletion</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy
              Policy, unless a longer retention period is required or permitted by law.
            </p>
            <p>
              Upon termination or expiration of your subscription, you may export Customer Data for <strong>30 days</strong>. After that window, we may delete or de-identify Customer Data from active systems, except where retention is required by law or for legitimate business records, as further described in the <Link to="/terms-of-service" className="underline">Terms of Service</Link>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              You have certain rights regarding your information, including the right to access, correct, or delete
              your information. You may also have the right to object to or restrict certain processing of your
              information. To exercise these rights, please contact us using the contact information provided below.
            </p>
            <p>
              If your organization requires a Data Processing Agreement (DPA), you can request one at any time by contacting us. We will provide our standard DPA for review and execution.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the new Privacy Policy on our website. You are advised to review this Privacy Policy
              periodically for any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              Email: nicholas.king@columbiacloudworks.com<br />
              Website: https://equipqr.app<br />
              <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                COLUMBIA CLOUDWORKS LLC
              </ExternalLink><br />
              Address: Contact us for business address information
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
