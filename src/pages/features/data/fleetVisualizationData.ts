import { Map, MapPin, Route, BarChart2 } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Fleet Visualization?',
  benefitsDescription:
    "See where your equipment was last confirmed, what's due for PM, and where open work orders are clustered — all on a map. No GPS hardware required.",
  stepsTitle: 'How It Works',
  stepsDescription: 'The fleet map brings your equipment locations and status together in one view.',
  showcaseTitle: 'See the Fleet Map in Action',
  showcaseDescription:
    'Every piece of equipment with a stored location appears as a marker. No GPS hardware required — just the address or site name you already have on the record.',
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Visualize Your Fleet?',
  ctaDescription:
    'Start using Fleet Visualization today—completely free. Create your account, add locations to your equipment, and see your fleet on the map.',
  ctaPrimaryText: 'Start Using Fleet Map Free',
};

export const benefits: Benefit[] = [
  {
    icon: MapPin,
    iconColor: 'success',
    title: 'Last Confirmed Location',
    subtitle: 'Know where assets were last seen',
    description:
      'Plot equipment on an interactive map using the last confirmed location stored on each record — entered as an address, site name, or coordinates. Filter by team, status, or equipment type.',
    benefits: ['No GPS hardware required', 'Filter by team or status', 'Click markers for full details'],
    benefitColor: 'success',
  },
  {
    icon: Route,
    iconColor: 'info',
    title: 'Location-Aware Planning',
    subtitle: 'Plan routes from real location data',
    description:
      'Use the map to see clusters of equipment due for PM or with open work orders. Group by location to plan technician dispatch and reduce unnecessary travel between sites.',
    benefits: ['PM and WO clustering', 'Dispatch by area', 'Geographic context for scheduling'],
    benefitColor: 'info',
  },
  {
    icon: BarChart2,
    iconColor: 'warning',
    title: 'Geographic Analytics',
    subtitle: 'Insights by location',
    description:
      'Combine map data with fleet efficiency and utilization metrics. Identify high-use areas, maintenance hotspots, and underutilized regions to optimize fleet allocation.',
    benefits: ['Utilization by location', 'Maintenance hotspots', 'Fleet efficiency overlay'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Set Equipment Locations',
    description:
      'Set the last confirmed location for each piece of equipment — address, job site, or coordinates. Update it when assets move so the map reflects where they were last seen.',
  },
  {
    number: 2,
    title: 'View the Fleet Map',
    description:
      'Open the Fleet Map to see all equipment with locations on an interactive map. Pan, zoom, and filter by team, status, or type. Click markers to open equipment details.',
  },
  {
    number: 3,
    title: 'Plan Routes & Dispatch',
    description:
      'Use the map to identify equipment with due PMs or open work orders. Group by location to plan technician routes and reduce travel time.',
  },
  {
    number: 4,
    title: 'Analyze by Geography',
    description:
      'Combine map view with fleet efficiency and utilization. Spot patterns by region, optimize asset placement, and align maintenance capacity with demand.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('fleet-map-2026-04.png'),
    imageAlt:
      'Fleet map showing equipment markers across the United States with location panel and filter controls',
    title: 'Equipment at Their Last Confirmed Locations',
    description:
      'The fleet map plots all equipment that has a stored location — address, site name, or coordinates. The side panel lists each machine with its team, location, and quick-access links. Filter by team or status to focus your view.',
  },
];

export const heroIcon = Map;
