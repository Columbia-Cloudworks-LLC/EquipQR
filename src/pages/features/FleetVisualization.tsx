import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Map,
  MapPin,
  Route,
  BarChart2,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { landingImage } from '@/lib/landingImage';

const FleetVisualizationFeature = () => {
  return (
    <>
      <PageSEO
        title="Fleet Visualization"
        description="Interactive map showing equipment last confirmed locations, status, and PM clusters. Plan maintenance routes and see your fleet at a glance."
        path="/features/fleet-visualization"
        keywords="fleet visualization, equipment map, fleet location tracking, equipment location, fleet mapping, location-aware maintenance planning"
      />
      <FeaturePageLayout>
      <FeatureHero
        icon={Map}
        title="Fleet Visualization"
        description="Interactive map showing each machine's last confirmed location, status, and open work. Plan maintenance routes and dispatch technicians where they're needed most."
        ctaText="Start Using Fleet Map Free"
      />

        {/* Key Benefits Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Why Use Fleet Visualization?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                See where your equipment was last confirmed, what's due for PM, and where open work orders are clustered — all on a map. No GPS hardware required.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <MapPin className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Last Confirmed Location</CardTitle>
                  <CardDescription className="text-base">
                    Know where assets were last seen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Plot equipment on an interactive map using the last confirmed location stored on each record — entered as an address, site name, or coordinates. Filter by team, status, or equipment type.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      No GPS hardware required
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Filter by team or status
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Click markers for full details
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Route className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Location-Aware Planning</CardTitle>
                  <CardDescription className="text-base">
                    Plan routes from real location data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Use the map to see clusters of equipment due for PM or with open work orders. Group by location to plan technician dispatch and reduce unnecessary travel between sites.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      PM and WO clustering
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Dispatch by area
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Geographic context for scheduling
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <BarChart2 className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Geographic Analytics</CardTitle>
                  <CardDescription className="text-base">
                    Insights by location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Combine map data with fleet efficiency and utilization metrics. Identify high-use areas, maintenance hotspots, and underutilized regions to optimize fleet allocation.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Utilization by location
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Maintenance hotspots
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Fleet efficiency overlay
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The fleet map brings your equipment locations and status together in one view.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Set Equipment Locations</h3>
                    <p className="text-muted-foreground">
                      Set the last confirmed location for each piece of equipment — address, job site, or coordinates. Update it when assets move so the map reflects where they were last seen.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">View the Fleet Map</h3>
                    <p className="text-muted-foreground">
                      Open the Fleet Map to see all equipment with locations on an interactive map. Pan, zoom, and filter by team, status, or type. Click markers to open equipment details.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Plan Routes & Dispatch</h3>
                    <p className="text-muted-foreground">
                      Use the map to identify equipment with due PMs or open work orders. Group by location to plan technician routes and reduce travel time.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Analyze by Geography</h3>
                    <p className="text-muted-foreground">
                      Combine map view with fleet efficiency and utilization. Spot patterns by region, optimize asset placement, and align maintenance capacity with demand.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshot Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                See the Fleet Map in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Every piece of equipment with a stored location appears as a marker. No GPS hardware required — just the address or site name you already have on the record.
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src={landingImage('fleet-map-2026-04.png')}
                    alt="Fleet map showing equipment markers across the United States with location panel and filter controls"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Equipment at Their Last Confirmed Locations</h3>
                <p className="text-muted-foreground">
                  The fleet map plots all equipment that has a stored location — address, site name, or coordinates. The side panel lists each machine with its team, location, and quick-access links. Filter by team or status to focus your view.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Visualize Your Fleet?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Fleet Visualization today—completely free. Create your account, add locations to your equipment, and see your fleet on the map.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/#features">Explore More Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </FeaturePageLayout>
    </>
  );
};

export default FleetVisualizationFeature;
