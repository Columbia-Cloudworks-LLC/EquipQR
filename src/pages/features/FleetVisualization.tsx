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

const FleetVisualizationFeature = () => {
  return (
    <>
      <PageSEO
        title="Fleet Visualization - EquipQR"
        description="Interactive maps showing equipment locations, status, and maintenance routes. Optimize operations with geographic insights."
        path="/features/fleet-visualization"
        keywords="fleet visualization, equipment maps, fleet tracking, GPS fleet management, equipment location tracking, fleet mapping"
      />
      <FeaturePageLayout>
      <FeatureHero
        icon={Map}
        title="Fleet Visualization"
        description="Interactive maps showing equipment locations, status, and maintenance routes. Optimize operations with geographic insights."
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
                See where your equipment is, how it’s used, and where maintenance is due—all on a map. Make smarter dispatch and routing decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <MapPin className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Real-Time Tracking</CardTitle>
                  <CardDescription className="text-base">
                    Know where assets are
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Plot equipment on an interactive map using stored locations. Filter by team, status, or equipment type. Click a marker to open details, work orders, and PM status.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Location-based view
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Filter by team or status
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Quick access to details
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Route className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Route Optimization</CardTitle>
                  <CardDescription className="text-base">
                    Plan maintenance routes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Use the map to see clusters of equipment due for PM or with open work orders. Plan technician routes and prioritize by location to minimize drive time and maximize completed work.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      PM and WO clustering
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Dispatch planning
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Geographic context
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
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
                      Store location data for equipment—address, site, or coordinates. Locations can be updated when assets move so the map stays current.
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
                  <Link to="/landing#features">Explore More Features</Link>
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
