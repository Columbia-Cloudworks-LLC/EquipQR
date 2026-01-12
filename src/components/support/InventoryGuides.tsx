import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Users,
  Layers,
  Plus,
  Settings2,
  QrCode,
  CheckCircle2,
  Tag,
  Link2,
  Star,
  Shield,
  History,
  ArrowRight,
  MousePointer,
} from 'lucide-react';

/**
 * Step component for consistent step formatting with optional screenshot
 * Displays actual screenshot if it exists, otherwise shows a placeholder
 */
interface GuideStepProps {
  step: number;
  title: string;
  description: React.ReactNode;
  screenshotId?: string;
  screenshotAlt?: string;
  highlight?: 'info' | 'warning' | 'success';
}

const GuideStep: React.FC<GuideStepProps> = ({
  step,
  title,
  description,
  screenshotId,
  screenshotAlt,
  highlight,
}) => {
  const [imageExists, setImageExists] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const imagePath = screenshotId ? `/${screenshotId}.png` : null;

  React.useEffect(() => {
    if (!imagePath) return;
    
    const img = new Image();
    img.onload = () => {
      setImageExists(true);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageExists(false);
    };
    img.src = imagePath;
  }, [imagePath]);

  const bgClass = highlight === 'info' 
    ? 'bg-info/5 border-info/20' 
    : highlight === 'warning' 
    ? 'bg-warning/5 border-warning/20'
    : highlight === 'success'
    ? 'bg-success/5 border-success/20'
    : 'bg-card';

  return (
    <div className={`rounded-lg border p-4 ${bgClass}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {step}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-medium">{title}</h4>
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </div>
          {screenshotId && (
            <div className="rounded-lg border bg-muted/30 overflow-hidden">
              {imageExists && imageLoaded ? (
                <img
                  src={imagePath!}
                  alt={screenshotAlt || `Step ${step} screenshot`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              ) : (
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/30 rounded-md">
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">Screenshot Placeholder</p>
                      <p className="mt-1">{screenshotAlt || `Step ${step} screenshot`}</p>
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded mt-2 block">
                        {screenshotId}.png
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Feature highlight component for key UI elements
 */
interface FeatureHighlightProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureHighlight: React.FC<FeatureHighlightProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3 p-3 rounded-md border bg-card">
    <div className="mt-0.5 text-primary">{icon}</div>
    <div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

const InventoryGuides: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management Guides
          </CardTitle>
          <CardDescription>
            Step-by-step guides for managing parts, setting up permissions, and organizing 
            interchangeable components. Follow these guides to get the most out of EquipQR's 
            inventory features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureHighlight
              icon={<Users className="h-4 w-4" />}
              title="Parts Managers"
              description="Delegate inventory permissions to trusted team members"
            />
            <FeatureHighlight
              icon={<Package className="h-4 w-4" />}
              title="Inventory Items"
              description="Track parts with stock levels, compatibility, and QR codes"
            />
            <FeatureHighlight
              icon={<Layers className="h-4 w-4" />}
              title="Alternate Groups"
              description="Define interchangeable parts for flexible ordering"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guide 1: Setting Up Parts Managers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Guide 1: Setting Up Parts Managers
                <Badge variant="secondary">Permissions</Badge>
              </CardTitle>
              <CardDescription>
                Learn how to delegate inventory management permissions to team members
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Who Can Manage Inventory?
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Owners & Admins</strong> – Always have full inventory access</li>
                <li>• <strong>Parts Managers</strong> – Members granted inventory permissions</li>
                <li>• <strong>Regular Members</strong> – View-only access by default</li>
              </ul>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="open-managers-sheet">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Opening the Parts Managers Panel
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Navigate to Inventory"
                      description={
                        <span>
                          Click <strong>Inventory</strong> in the main sidebar to open the inventory list page.
                        </span>
                      }
                      screenshotId="guides/inventory/01-nav-inventory"
                      screenshotAlt="Sidebar with Inventory highlighted"
                    />
                    <GuideStep
                      step={2}
                      title="Click Parts Managers"
                      description={
                        <span>
                          In the page header, click the <strong>"Parts Managers"</strong> button 
                          (next to "Add Item"). This opens the management panel.
                        </span>
                      }
                      screenshotId="guides/inventory/02-parts-managers-button"
                      screenshotAlt="Inventory page header with Parts Managers button"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-manager">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adding a Parts Manager
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Click Add Manager"
                      description={
                        <span>
                          In the Parts Managers panel, click the <strong>"Add Manager"</strong> button.
                        </span>
                      }
                      screenshotId="guides/inventory/03-managers-empty"
                      screenshotAlt="Empty parts managers panel with Add Manager button"
                    />
                    <GuideStep
                      step={2}
                      title="Search and Select Members"
                      description={
                        <span>
                          Use the search field to find team members by name or email. 
                          Check the box next to each person you want to grant inventory permissions to.
                          You can select multiple members at once.
                        </span>
                      }
                      screenshotId="guides/inventory/04-select-members"
                      screenshotAlt="Member selection dialog with checkboxes"
                    />
                    <GuideStep
                      step={3}
                      title="Confirm Selection"
                      description={
                        <span>
                          Click <strong>"Add Managers"</strong> to grant permissions. 
                          The selected members will immediately be able to create and edit inventory items.
                        </span>
                      }
                      screenshotId="guides/inventory/05-managers-added"
                      screenshotAlt="Parts managers panel showing added members"
                      highlight="success"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="remove-manager">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Removing a Parts Manager
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Find the Manager"
                      description="Locate the person in the Parts Managers list."
                    />
                    <GuideStep
                      step={2}
                      title="Click the Remove Icon"
                      description={
                        <span>
                          Click the <strong>trash icon</strong> on the right side of their entry.
                        </span>
                      }
                    />
                    <GuideStep
                      step={3}
                      title="Confirm Removal"
                      description="Confirm in the dialog that appears. The user will revert to view-only access."
                      highlight="warning"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* Guide 2: Creating Inventory Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Guide 2: Creating Inventory Items
                <Badge variant="secondary">Parts & Stock</Badge>
              </CardTitle>
              <CardDescription>
                Add parts to your inventory with stock tracking, compatibility rules, and QR codes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="create-first-item">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Creating Your First Inventory Item
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-2">
                  <GuideStep
                    step={1}
                    title="Click Add Item"
                    description={
                      <span>
                        From the Inventory page, click <strong>"Add Item"</strong> in the page header.
                      </span>
                    }
                    screenshotId="guides/inventory/10-add-item-button"
                    screenshotAlt="Inventory page with Add Item button highlighted"
                  />
                  <GuideStep
                    step={2}
                    title="Enter Basic Information"
                    description={
                      <div className="space-y-2">
                        <p>Fill in the required and optional fields:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong>Name</strong> – Descriptive name (e.g., "Oil Filter - CAT 320")</li>
                          <li><strong>SKU</strong> – Your internal part number</li>
                          <li><strong>External ID</strong> – Manufacturer barcode/UPC for scanning</li>
                          <li><strong>Description</strong> – Details about the part</li>
                        </ul>
                      </div>
                    }
                    screenshotId="guides/inventory/11-form-basic-info"
                    screenshotAlt="Inventory form showing basic information fields"
                  />
                  <GuideStep
                    step={3}
                    title="Set Stock Levels"
                    description={
                      <div className="space-y-2">
                        <p>Configure inventory tracking:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong>Quantity on Hand</strong> – Current stock count</li>
                          <li><strong>Low Stock Threshold</strong> – Alert when stock drops below this</li>
                          <li><strong>Default Unit Cost</strong> – For work order cost tracking</li>
                          <li><strong>Location</strong> – Where the part is stored (e.g., "Shelf A-3")</li>
                        </ul>
                      </div>
                    }
                    screenshotId="guides/inventory/12-form-stock-info"
                    screenshotAlt="Inventory form showing quantity and threshold fields"
                  />
                  <GuideStep
                    step={4}
                    title="Save the Item"
                    description={
                      <span>
                        Click <strong>"Create Item"</strong> to save. The item will appear in your 
                        inventory list with its current stock status.
                      </span>
                    }
                    screenshotId="guides/inventory/13-item-created"
                    screenshotAlt="Inventory list showing newly created item"
                    highlight="success"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="compatibility-rules">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Setting Up Compatibility Rules
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-2">
                  <div className="rounded-md bg-info/10 p-3 text-sm mb-4">
                    <p className="font-medium flex items-center gap-2 text-info">
                      <CheckCircle2 className="h-4 w-4" />
                      What are Compatibility Rules?
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Rules automatically match parts to equipment based on manufacturer and model. 
                      When a technician views equipment, compatible parts are shown automatically.
                    </p>
                  </div>

                  <GuideStep
                    step={1}
                    title="Open the Compatibility Rules Section"
                    description={
                      <span>
                        In the item form, scroll to the <strong>"Compatibility Rules"</strong> card. 
                        Click <strong>"Add Rule"</strong> to create a new rule.
                      </span>
                    }
                    screenshotId="guides/inventory/20-rules-empty"
                    screenshotAlt="Empty compatibility rules section"
                  />
                  <GuideStep
                    step={2}
                    title="Select a Manufacturer"
                    description="Choose the equipment manufacturer from the dropdown (e.g., Caterpillar, John Deere)."
                    screenshotId="guides/inventory/21-rules-manufacturer"
                    screenshotAlt="Manufacturer dropdown selection"
                  />
                  <GuideStep
                    step={3}
                    title="Choose a Match Type"
                    description={
                      <div className="space-y-2">
                        <p>Select how the rule should match equipment models:</p>
                        <div className="grid gap-2 mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">Any Model</Badge>
                            <span className="text-muted-foreground">Matches all models from this manufacturer</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">Exact</Badge>
                            <span className="text-muted-foreground">Matches a specific model (e.g., "320 GC")</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">Starts With</Badge>
                            <span className="text-muted-foreground">Matches models starting with pattern (e.g., "320" matches 320, 320 GC, 320D)</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">Pattern</Badge>
                            <span className="text-muted-foreground">Use wildcards (e.g., "D*T" matches D6T, D8T)</span>
                          </div>
                        </div>
                      </div>
                    }
                    screenshotId="guides/inventory/22-rules-match-types"
                    screenshotAlt="Match type selection dropdown"
                  />
                  <GuideStep
                    step={4}
                    title="Set Verification Status"
                    description={
                      <div className="space-y-2">
                        <p>Mark the rule's confidence level:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Unverified</Badge>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>
                          <Badge variant="secondary">Deprecated</Badge>
                        </div>
                      </div>
                    }
                    screenshotId="guides/inventory/23-rules-status"
                    screenshotAlt="Rule status selection"
                  />
                  <GuideStep
                    step={5}
                    title="View Match Count"
                    description={
                      <span>
                        The badge shows how many equipment items match your rules. 
                        For example: <Badge variant="secondary">Matches 5 equipment</Badge>
                      </span>
                    }
                    screenshotId="guides/inventory/24-rules-complete"
                    screenshotAlt="Complete compatibility rule with match count"
                    highlight="success"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="adjust-quantity">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Adjusting Quantity & Viewing History
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-2">
                  <GuideStep
                    step={1}
                    title="Open the Item Detail Page"
                    description="Click on any inventory item in the list to view its details."
                    screenshotId="guides/inventory/30-item-detail"
                    screenshotAlt="Inventory item detail page overview"
                  />
                  <GuideStep
                    step={2}
                    title="Click Adjust Quantity"
                    description={
                      <span>
                        Click the <strong>"Adjust Quantity"</strong> button in the header to open the 
                        adjustment dialog.
                      </span>
                    }
                    screenshotId="guides/inventory/31-adjust-button"
                    screenshotAlt="Item detail page with Adjust Quantity button"
                  />
                  <GuideStep
                    step={3}
                    title="Add or Take Stock"
                    description={
                      <div className="space-y-2">
                        <p>Use the quick buttons or enter a custom amount:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong>Add 1 / Take 1</strong> – Quick single-unit adjustment</li>
                          <li><strong>Add More / Take More</strong> – Enter custom quantities</li>
                          <li><strong>Reason</strong> – Optional note for audit trail</li>
                        </ul>
                      </div>
                    }
                    screenshotId="guides/inventory/32-adjust-dialog"
                    screenshotAlt="Quantity adjustment dialog"
                  />
                  <GuideStep
                    step={4}
                    title="View Transaction History"
                    description={
                      <span>
                        Click the <strong>"Transaction History"</strong> tab to see all quantity 
                        changes with timestamps, users, and reasons.
                      </span>
                    }
                    screenshotId="guides/inventory/33-transactions"
                    screenshotAlt="Transaction history tab showing adjustments"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="qr-codes">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Using Inventory QR Codes
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pl-2">
                  <GuideStep
                    step={1}
                    title="Access the QR Code"
                    description={
                      <span>
                        On the item detail page, click the <strong>QR code icon</strong> button to display 
                        the item's unique QR code.
                      </span>
                    }
                    screenshotId="guides/inventory/40-qr-button"
                    screenshotAlt="QR code button on item detail page"
                  />
                  <GuideStep
                    step={2}
                    title="Print or Download"
                    description="Print the QR code and attach it to the storage location or bin for easy scanning."
                    screenshotId="guides/inventory/41-qr-display"
                    screenshotAlt="QR code display dialog"
                  />
                  <GuideStep
                    step={3}
                    title="Scan to Access"
                    description="Technicians can scan the QR code with any smartphone camera to instantly view item details and adjust quantities."
                    highlight="info"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Guide 3: Alternate Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Guide 3: Creating Alternate Part Groups
                <Badge variant="secondary">Interchangeability</Badge>
              </CardTitle>
              <CardDescription>
                Define groups of interchangeable parts so technicians can find alternatives when primary parts are out of stock
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4" />
                What are Alternate Groups?
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Alternate groups let you define which parts can substitute for each other. 
                For example, an oil filter from WIX might be interchangeable with Caterpillar OEM 
                and Baldwin aftermarket filters.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-xs">
                  <Tag className="h-3.5 w-3.5 mt-0.5 text-primary" />
                  <span><strong>Part Numbers</strong> – OEM, aftermarket, cross-references</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Package className="h-3.5 w-3.5 mt-0.5 text-primary" />
                  <span><strong>Inventory Items</strong> – Link to your actual stock</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Star className="h-3.5 w-3.5 mt-0.5 text-primary" />
                  <span><strong>Primary Part</strong> – Mark the preferred option</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary" />
                  <span><strong>Verification</strong> – Track confidence level</span>
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-group">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Creating an Alternate Group
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Navigate to Part Alternates"
                      description={
                        <span>
                          Click <strong>Part Alternates</strong> in the sidebar under the Navigation section.
                        </span>
                      }
                      screenshotId="guides/inventory/50-nav-groups"
                      screenshotAlt="Sidebar showing Part Alternates link"
                    />
                    <GuideStep
                      step={2}
                      title="Click New Group"
                      description={
                        <span>
                          Click the <strong>"New Group"</strong> button in the page header.
                        </span>
                      }
                      screenshotId="guides/inventory/51-groups-page"
                      screenshotAlt="Alternate Groups page with New Group button"
                    />
                    <GuideStep
                      step={3}
                      title="Enter Group Details"
                      description={
                        <div className="space-y-2">
                          <p>Fill in the group information:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Name</strong> – Descriptive name (e.g., "Oil Filter - CAT D6T Compatible")</li>
                            <li><strong>Description</strong> – What equipment or use case this group covers</li>
                            <li><strong>Status</strong> – Unverified, Verified, or Deprecated</li>
                            <li><strong>Notes</strong> – Verification details or sources</li>
                            <li><strong>Evidence URL</strong> – Link to cross-reference documentation</li>
                          </ul>
                        </div>
                      }
                      screenshotId="guides/inventory/52-create-group-dialog"
                      screenshotAlt="Create group dialog with form fields"
                    />
                    <GuideStep
                      step={4}
                      title="Save the Group"
                      description="Click Create to save the group. It will appear in the groups grid."
                      screenshotId="guides/inventory/53-group-created"
                      screenshotAlt="Groups page showing newly created group card"
                      highlight="success"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-items-to-group">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Adding Inventory Items to a Group
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Open the Group Detail Page"
                      description="Click on a group card to view its details."
                      screenshotId="guides/inventory/60-group-detail-empty"
                      screenshotAlt="Empty group detail page"
                    />
                    <GuideStep
                      step={2}
                      title="Click Add Item"
                      description={
                        <span>
                          In the <strong>"Inventory Items"</strong> section, click <strong>"Add Item"</strong>.
                        </span>
                      }
                    />
                    <GuideStep
                      step={3}
                      title="Search and Select"
                      description="Search for the inventory item you want to add. Click to select it."
                      screenshotId="guides/inventory/61-add-item-dialog"
                      screenshotAlt="Add inventory item dialog with search"
                    />
                    <GuideStep
                      step={4}
                      title="Mark as Primary (Optional)"
                      description={
                        <span>
                          Check <strong>"Mark as primary part"</strong> if this is the preferred option in the group. 
                          Primary parts are highlighted in search results.
                        </span>
                      }
                    />
                    <GuideStep
                      step={5}
                      title="Confirm Addition"
                      description="Click Add Item. The item now appears in the group with its current stock level."
                      screenshotId="guides/inventory/62-item-added"
                      screenshotAlt="Group detail showing added inventory item"
                      highlight="success"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-part-numbers">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Adding Part Numbers (OEM/Aftermarket)
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <div className="rounded-md bg-info/10 p-3 text-sm mb-4">
                      <p className="text-muted-foreground">
                        <strong>Why add part numbers?</strong> Part numbers let technicians search 
                        by OEM or aftermarket codes even if you don't stock that specific brand. 
                        The search will show available alternatives from the same group.
                      </p>
                    </div>

                    <GuideStep
                      step={1}
                      title="Click Add Part Number"
                      description={
                        <span>
                          In the <strong>"Part Numbers"</strong> section, click <strong>"Add Part Number"</strong>.
                        </span>
                      }
                      screenshotId="guides/inventory/70-add-part-number"
                      screenshotAlt="Group detail with Add Part Number button"
                    />
                    <GuideStep
                      step={2}
                      title="Select the Type"
                      description={
                        <div className="space-y-2">
                          <p>Choose the identifier type:</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline">OEM Part Number</Badge>
                            <Badge variant="outline">Aftermarket</Badge>
                            <Badge variant="outline">Manufacturer PN</Badge>
                            <Badge variant="outline">UPC Code</Badge>
                            <Badge variant="outline">Cross-Reference</Badge>
                          </div>
                        </div>
                      }
                      screenshotId="guides/inventory/71-part-number-type"
                      screenshotAlt="Part number type selection dropdown"
                    />
                    <GuideStep
                      step={3}
                      title="Enter the Part Number"
                      description={
                        <div className="space-y-2">
                          <p>Fill in the identifier details:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Part Number</strong> – The actual identifier (e.g., "CAT-1R-0750")</li>
                            <li><strong>Manufacturer</strong> – The brand (e.g., "Caterpillar")</li>
                          </ul>
                        </div>
                      }
                      screenshotId="guides/inventory/72-part-number-form"
                      screenshotAlt="Part number form with value and manufacturer"
                    />
                    <GuideStep
                      step={4}
                      title="Save the Part Number"
                      description="Click Add Part Number. Technicians can now search for this code to find the group and its alternatives."
                      screenshotId="guides/inventory/73-part-numbers-list"
                      screenshotAlt="Group detail showing added part numbers"
                      highlight="success"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="verify-group">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Verifying an Alternate Group
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    <GuideStep
                      step={1}
                      title="Click Edit Group"
                      description={
                        <span>
                          On the group detail page, click <strong>"Edit Group"</strong> in the header.
                        </span>
                      }
                    />
                    <GuideStep
                      step={2}
                      title="Change Status to Verified"
                      description={
                        <span>
                          Set the status dropdown to <Badge className="bg-green-600">Verified</Badge>.
                        </span>
                      }
                      screenshotId="guides/inventory/80-edit-group-status"
                      screenshotAlt="Edit group dialog with status dropdown"
                    />
                    <GuideStep
                      step={3}
                      title="Add Verification Notes"
                      description={
                        <div className="space-y-2">
                          <p>Document how the interchangeability was verified:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Manufacturer cross-reference guide</li>
                            <li>Field testing results</li>
                            <li>OEM specification comparison</li>
                          </ul>
                        </div>
                      }
                    />
                    <GuideStep
                      step={4}
                      title="Save Changes"
                      description={
                        <span>
                          Click Save. The group now shows a green <Badge className="bg-green-600">Verified</Badge> badge, 
                          indicating technicians can trust the interchangeability.
                        </span>
                      }
                      screenshotId="guides/inventory/81-group-verified"
                      screenshotAlt="Group detail page with verified badge"
                      highlight="success"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            You're Ready!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You now know how to set up parts managers, create inventory items with compatibility rules, 
            and organize interchangeable parts into alternate groups.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-success" />
              <span>Delegate permissions with Parts Managers</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-success" />
              <span>Track stock with smart low-level alerts</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-success" />
              <span>Find alternatives with Alternate Groups</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryGuides;
