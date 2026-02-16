import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QRCodeIntegration from '../QRCodeIntegration';
import { TestProviders } from '@/test/utils/TestProviders';
import { benefits, steps, screenshots } from '../data/qrCodeIntegrationData';

// Mock the feature page components to focus on QRCodeIntegration logic
vi.mock('@/components/landing/features/FeaturePageLayout', () => ({
  FeaturePageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="feature-page-layout">{children}</div>
  ),
}));

vi.mock('@/components/landing/features/FeatureHero', () => ({
  FeatureHero: ({ title, description, ctaText }: { title: string; description: string; ctaText: string }) => (
    <div data-testid="feature-hero">
      <h1>{title}</h1>
      <p>{description}</p>
      <button>{ctaText}</button>
    </div>
  ),
}));

vi.mock('@/components/landing/features/FeatureSection', () => ({
  FeatureSection: ({ 
    title, 
    description, 
    children 
  }: { 
    title: string; 
    description: string; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <section data-testid="feature-section">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock('@/components/landing/features/BenefitCard', () => ({
  BenefitCard: ({ title, subtitle, description, benefits: benefitList }: {
    title: string;
    subtitle: string;
    description: string;
    benefits: string[];
    icon?: React.ComponentType;
    iconColor?: string;
    benefitColor?: string;
  }) => (
    <div data-testid="benefit-card">
      <h3>{title}</h3>
      <h4>{subtitle}</h4>
      <p>{description}</p>
      <ul>
        {benefitList.map((benefit, index) => (
          <li key={index}>{benefit}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock('@/components/landing/features/StepList', () => ({
  StepList: ({ steps: stepList }: { steps: Array<{ number: number; title: string; description: string }> }) => (
    <div data-testid="step-list">
      {stepList.map((step) => (
        <div key={step.number} data-testid={`step-${step.number}`}>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/landing/features/ScreenshotBlock', () => ({
  ScreenshotBlock: ({ title, description }: { title: string; description: string; imageUrl?: string; imageAlt?: string }) => (
    <div data-testid="screenshot-block">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/landing/features/FeatureCTA', () => ({
  FeatureCTA: ({ title, description, primaryCtaText }: { title: string; description: string; primaryCtaText: string }) => (
    <div data-testid="feature-cta">
      <h2>{title}</h2>
      <p>{description}</p>
      <button>{primaryCtaText}</button>
    </div>
  ),
}));

describe('QRCodeIntegration Feature Page', () => {
  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByTestId('feature-page-layout')).toBeInTheDocument();
    });

    it('renders the feature hero with correct content', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('QR Code Integration')).toBeInTheDocument();
      expect(screen.getByText(/Instantly access equipment details, work orders, and maintenance history with QR code scanning/)).toBeInTheDocument();
      expect(screen.getByText('Start Using QR Codes Free')).toBeInTheDocument();
    });
  });

  describe('Benefits Section', () => {
    it('renders all benefit cards with correct data', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      // Check section title
      expect(screen.getByText('Why Use QR Code Integration?')).toBeInTheDocument();
      expect(screen.getByText(/Eliminate manual lookup and data entry/)).toBeInTheDocument();

      // Check all benefits are rendered
      const benefitCards = screen.getAllByTestId('benefit-card');
      expect(benefitCards).toHaveLength(benefits.length);

      // Verify each benefit's content
      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit.title)).toBeInTheDocument();
        expect(screen.getByText(benefit.subtitle)).toBeInTheDocument();
        expect(screen.getByText(benefit.description)).toBeInTheDocument();
        
        // Check benefit list items
        benefit.benefits.forEach((benefitItem) => {
          expect(screen.getByText(benefitItem)).toBeInTheDocument();
        });
      });
    });

    it('renders correct benefit titles', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('Instant Equipment Access')).toBeInTheDocument();
      expect(screen.getByText('Automated Tracking')).toBeInTheDocument();
      expect(screen.getByText('Generate Labels')).toBeInTheDocument();
    });
  });

  describe('Steps Section', () => {
    it('renders the steps section with correct title', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByText(/QR codes connect your physical assets to EquipQR™ in seconds/)).toBeInTheDocument();
    });

    it('renders all steps with correct data', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      const stepList = screen.getByTestId('step-list');
      expect(stepList).toBeInTheDocument();

      // Verify each step is rendered
      steps.forEach((step) => {
        expect(screen.getByTestId(`step-${step.number}`)).toBeInTheDocument();
        expect(screen.getByText(step.title)).toBeInTheDocument();
        expect(screen.getByText(step.description)).toBeInTheDocument();
      });
    });

    it('renders correct step titles in order', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('Generate QR Labels')).toBeInTheDocument();
      expect(screen.getByText('Scan in the Field')).toBeInTheDocument();
      expect(screen.getByText('View Details & History')).toBeInTheDocument();
      expect(screen.getByText('Streamline Operations')).toBeInTheDocument();
    });
  });

  describe('Screenshots Section', () => {
    it('renders the screenshots section with correct title', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('See QR Code Integration in Action')).toBeInTheDocument();
      expect(screen.getByText(/Here's what QR scanning and label generation look like in the EquipQR™ app/)).toBeInTheDocument();
    });

    it('renders all screenshot blocks with correct data', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      const screenshotBlocks = screen.getAllByTestId('screenshot-block');
      expect(screenshotBlocks).toHaveLength(screenshots.length);

      // Verify each screenshot's content
      screenshots.forEach((screenshot) => {
        expect(screen.getByText(screenshot.title)).toBeInTheDocument();
        expect(screen.getByText(screenshot.description)).toBeInTheDocument();
      });
    });

    it('renders correct screenshot titles', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('Equipment QR Codes')).toBeInTheDocument();
      expect(screen.getByText('Generate & Print Labels')).toBeInTheDocument();
      expect(screen.getByText('Quick Access from Equipment List')).toBeInTheDocument();
      expect(screen.getByText('Equipment Details at a Glance')).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('renders the CTA section with correct content', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText('Ready to Speed Up Field Operations?')).toBeInTheDocument();
      expect(screen.getByText(/Start using QR Code Integration today—completely free/)).toBeInTheDocument();
      expect(screen.getByText('Create Free Account')).toBeInTheDocument();
    });
  });

  describe('Data Integrity', () => {
    it('uses correct data from qrCodeIntegrationData', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      // Verify the data structure matches what's expected
      expect(benefits).toHaveLength(3);
      expect(steps).toHaveLength(4);
      expect(screenshots).toHaveLength(4);

      // Verify benefits have required properties
      benefits.forEach((benefit) => {
        expect(benefit).toHaveProperty('title');
        expect(benefit).toHaveProperty('subtitle');
        expect(benefit).toHaveProperty('description');
        expect(benefit).toHaveProperty('benefits');
        expect(Array.isArray(benefit.benefits)).toBe(true);
      });

      // Verify steps have required properties
      steps.forEach((step) => {
        expect(step).toHaveProperty('number');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
      });

      // Verify screenshots have required properties
      screenshots.forEach((screenshot) => {
        expect(screenshot).toHaveProperty('title');
        expect(screenshot).toHaveProperty('description');
        expect(screenshot).toHaveProperty('imageUrl');
        expect(screenshot).toHaveProperty('imageAlt');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      // Main title should be h1
      const mainTitle = screen.getByText('QR Code Integration');
      expect(mainTitle.tagName).toBe('H1');

      // Section titles should be h2
      const sectionTitles = [
        'Why Use QR Code Integration?',
        'How It Works',
        'See QR Code Integration in Action',
        'Ready to Speed Up Field Operations?',
      ];

      sectionTitles.forEach((title) => {
        const element = screen.getByText(title);
        expect(element.tagName).toBe('H2');
      });
    });

    it('has accessible button text', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      const ctaButton = screen.getByText('Start Using QR Codes Free');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton.tagName).toBe('BUTTON');

      const finalCtaButton = screen.getByText('Create Free Account');
      expect(finalCtaButton).toBeInTheDocument();
      expect(finalCtaButton.tagName).toBe('BUTTON');
    });
  });
});
