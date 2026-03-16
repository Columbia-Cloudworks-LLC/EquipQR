import Page from '@/components/layout/Page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Database, AlertTriangle } from 'lucide-react';

export default function Security() {
  return (
    <Page maxWidth="4xl" padding="responsive">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Security
          </h1>
          <p className="text-muted-foreground mt-2">
            EquipQR security controls and trust posture overview.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication and Access Control</CardTitle>
            <CardDescription>Identity, tenant isolation, and least-privilege access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Google Workspace OAuth is supported for sign-in and can inherit MFA enforcement at Google.</p>
            <p>Organization and team access are role-based, with tenant isolation enforced through PostgreSQL RLS.</p>
            <p>New users have no effective team access until explicitly assigned.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Data is protected in transit with TLS and stored in managed Supabase/PostgreSQL infrastructure.</p>
            <p>Audit logs are append-only and designed for traceability of critical data changes.</p>
            <p>Organization-level privacy settings control optional collection of QR scan location data.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Monitoring and Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Security-relevant events (member changes, role updates, audit exports) are available in notifications and audit history.</p>
            <p>Session controls include inactivity timeout and support for global sign-out.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Responsible Disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            To report security concerns, contact <a className="text-primary underline" href="mailto:security@equipqr.app">security@equipqr.app</a>.
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
