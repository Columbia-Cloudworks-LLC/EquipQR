import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Truck, 
  ClipboardList, 
  UserPlus, 
  Mail, 
  Shield, 
  Wrench, 
  Eye, 
  MessageSquarePlus,
  QrCode,
  Clock,
  CheckCircle2
} from "lucide-react";

const OnboardingGuide = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Welcome to EquipQR™</CardTitle>
          <CardDescription>
            This guide will take you from account creation to full operation. Follow these steps to set up your organization, invite your team, and start managing your fleet efficiently.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Phase 1: Building Your Team */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Phase 1: Building Your Team
                <Badge variant="secondary">Invitations & Roles</Badge>
              </CardTitle>
              <CardDescription>
                Get your personnel into the system with the right access levels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="org-invitations">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  1. Sending Organization Invitations
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-6">
                  <p className="text-muted-foreground">
                    First, invite users to join your EquipQR™ Organization. This gives them a login and access to the app.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Navigate to the <strong>Organization</strong> section in the main sidebar.</li>
                    <li>Select the <strong>Members</strong> tab.</li>
                    <li>Click <strong>"Invite Member"</strong>.</li>
                    <li><strong>Enter Email</strong>: Input the person's professional email address.</li>
                    <li>
                      <strong>Select Organization Role</strong>:
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li><Badge variant="secondary" className="mr-1">Admin</Badge> Full access to organization settings, billing, and all records.</li>
                        <li><Badge variant="outline" className="mr-1">Member</Badge> General access. <em>Note: "Members" cannot see or touch equipment until they are assigned to a Team.</em></li>
                      </ul>
                    </li>
                    <li>Click <strong>Send Invitation</strong>.</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="team-roles">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  2. Assigning Team Roles
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-6">
                  <p className="text-muted-foreground">
                    Once a user has joined your organization as a "Member," you must assign them to a <strong>Team</strong>. Teams are scoped to specific equipment groups.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Navigate to the <strong>Teams</strong> page.</li>
                    <li>Select the specific team (e.g., "Heavy Machinery Team") or create a new one.</li>
                    <li>Click <strong>"Add Member"</strong> and select the user you previously invited.</li>
                    <li>
                      <strong>Select Team Role</strong>:
                      <div className="mt-3 grid gap-2">
                        <div className="flex items-start gap-2 rounded-md border p-3">
                          <Shield className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <p className="font-medium">Manager</p>
                            <p className="text-sm text-muted-foreground">Can manage team members, assign work orders, and edit equipment details.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-md border p-3">
                          <Wrench className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <p className="font-medium">Technician</p>
                            <p className="text-sm text-muted-foreground">Can view assignments, complete work orders, upload images, and record maintenance.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-md border p-3">
                          <Eye className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Viewer</p>
                            <p className="text-sm text-muted-foreground">Read-only access. Good for clients who want to check machine stats without calling the shop.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-md border bg-accent/50 p-3">
                          <MessageSquarePlus className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              Requestor
                              <Badge variant="default" className="text-xs">Premium</Badge>
                            </p>
                            <p className="text-sm text-muted-foreground">Designed for recurring customers. A Requestor can scan a machine's QR code to submit a new Work Order Request directly.</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="communication">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  3. Communicating with Your Team
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-6">
                  <p className="text-muted-foreground">
                    Your team members will receive an automated email. To ensure they find it, please inform them of the following details:
                  </p>
                  <div className="rounded-md border p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Sender:</strong> EquipQR™ &lt;invite@equipqr.app&gt;</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Subject Line:</strong> "You're invited to join [Your Organization Name] on EquipQR™"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span><strong>Link Expiration:</strong> The invitation link is valid for <strong>7 days</strong>.</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Phase 2: Building Your Fleet */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Phase 2: Building Your Fleet
                <Badge variant="secondary">Equipment</Badge>
              </CardTitle>
              <CardDescription>
                Populate the system with your equipment assets
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Once your team structure is set, populate the system with your equipment assets.
            </p>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Navigate to the <strong>Equipment</strong> page.</li>
              <li>Click <strong>"Create Equipment"</strong>.</li>
              <li>
                <strong>Fill in Basic Information:</strong>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Name:</strong> A descriptive name (e.g., "Excavator #42").</li>
                  <li><strong>Make/Model:</strong> (e.g., "Caterpillar", "336F").</li>
                  <li><strong>Serial Number:</strong> Critical for tracking and warranty.</li>
                </ul>
              </li>
              <li>
                <strong>Team Assignment:</strong>
                <span className="ml-1 text-muted-foreground">
                  <Badge variant="destructive" className="mr-1">Crucial</Badge>
                  Assign the equipment to the specific Team that manages it. Only users in that team (Managers/Technicians) will be able to service it.
                </span>
              </li>
              <li><strong>Status & Location:</strong> Set the initial status (e.g., "Available") and physical location.</li>
              <li>Click <strong>Create Equipment</strong>.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Phase 3: The Requestor Workflow */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Phase 3: The Requestor Workflow
                <Badge variant="default">Premium Service</Badge>
              </CardTitle>
              <CardDescription>
                Offer a "Zero-Phone-Call" service level to trusted customers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              The <strong>Requestor</strong> role allows you to offer a premium "Zero-Phone-Call" service level to trusted customers.
            </p>
            <div className="space-y-3">
              <h4 className="font-medium">How it works:</h4>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">The Setup</p>
                    <p className="text-sm text-muted-foreground">You invite the client's point-of-contact to your Organization as a <em>Member</em>, then add them to a specific Team as a <em>Requestor</em>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">The Scan</p>
                    <p className="text-sm text-muted-foreground">The client walks up to the machine and scans the EquipQR tag.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">The Request</p>
                    <p className="text-sm text-muted-foreground">Instead of a read-only view, they see a <strong>"Submit Request"</strong> form. They enter the issue and hit submit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium">The Queue</p>
                    <p className="text-sm text-muted-foreground">The request appears immediately in that Team's queue with a status of <Badge variant="outline">Submitted</Badge>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">5</div>
                  <div>
                    <p className="font-medium">The Resolution</p>
                    <p className="text-sm text-muted-foreground">Your Manager or Technician sees the request, assigns it, and begins work—all without a single phone call.</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Note: Use this role primarily for high-value relationships. It streamlines the process significantly but requires the customer to be part of your digital ecosystem.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase 4: Getting to Work */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Phase 4: Getting to Work
                <Badge variant="secondary">Work Orders</Badge>
              </CardTitle>
              <CardDescription>
                Execute repairs with People, Equipment, and Requests in place
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Now that you have People, Equipment, and Requests, you can execute repairs.
            </p>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Navigate to <strong>Work Orders</strong>.</li>
              <li><strong>Creating a Job:</strong> Click <strong>"Create Work Order"</strong> for internal jobs (e.g., "500 Hour Service").</li>
              <li>
                <strong>Handling Requests:</strong> Look for items with the <Badge variant="outline">Submitted</Badge> status (incoming from Requestors).
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li>Open the request.</li>
                  <li>Review the customer's description.</li>
                  <li><strong>Assign:</strong> Select a Technician or Team to handle the job.</li>
                  <li><strong>Schedule:</strong> Set a Due Date and Priority.</li>
                </ul>
              </li>
              <li>
                <strong>Execution:</strong> The assigned Technician will see this job in their "My Work Orders" view, where they can log time, upload photos, and use inventory parts.
              </li>
            </ol>
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">You're all set! Your repair shop is now fully operational.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingGuide;

