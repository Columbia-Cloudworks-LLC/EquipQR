import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              By accessing and using EquipQR ("the Service"), developed by{' '}
              <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                COLUMBIA CLOUDWORKS LLC
              </ExternalLink>
              , you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR is a fleet equipment management platform designed to help organizations efficiently manage their
              equipment, track maintenance, and improve overall operational efficiency. The Service may include, but is
              not limited to, features such as equipment tracking, maintenance scheduling, reporting, and user
              management.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              To access certain features of the Service, you may be required to create a user account. You agree to
              provide accurate, current, and complete information during the registration process and to update such
              information to keep it accurate, current, and complete. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms of Service. You
              agree not to:
            </p>
            <ul className="list-disc pl-5">
              <li>Use the Service in any way that violates any applicable laws or regulations.</li>
              <li>
                Engage in any conduct that could damage, disable, overburden, or impair the Service or interfere with
                any other party's use of the Service.
              </li>
              <li>Attempt to gain unauthorized access to any portion of the Service or any other systems or networks.</li>
              <li>Use the Service to transmit any viruses, malware, or other harmful code.</li>
              <li>
                Collect or harvest any information about other users of the Service without their consent.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment and Subscription</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Certain features of the Service may require payment of subscription fees. You agree to pay all fees and
              charges associated with your subscription in accordance with the pricing and payment terms presented to
              you. Subscriptions may be billed on a recurring basis, and you authorize us to automatically charge your
              payment method for the applicable subscription fees.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may terminate or suspend your access to the Service at any time, with or without cause, and without
              prior notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL
              WARRANTIES, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
              INCURRED DIRECTLY OR INDIRECTLY, ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of Delaware, without
              regard to its conflict of law principles.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive property 
              of{' '}
              <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                COLUMBIA CLOUDWORKS LLC
              </ExternalLink>
              {' '}and its licensors. The Service is protected by copyright, trademark, and other laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We reserve the right to modify or revise these Terms of Service at any time. We will notify you of any
              changes by posting the new Terms of Service on this page. Your continued use of the Service after the
              effective date of any changes constitutes your acceptance of the new Terms of Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entire Agreement</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms of Service constitute the entire agreement between you and us regarding your use of the
              Service and supersede all prior and contemporaneous agreements and understandings, whether written or
              oral.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              Email: nicholas.king@columbiacloudworks.com<br />
              Website: https://equipqr.app<br />
              <a 
                href="https://columbiacloudworks.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline"
              >
                COLUMBIA CLOUDWORKS LLC
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
