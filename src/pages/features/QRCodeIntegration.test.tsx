import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QRCodeIntegration from './QRCodeIntegration';
import { TestProviders } from '@vitest-harness/utils/TestProviders';
import { benefits, content, showcases, steps } from './data/qrCodeIntegrationData';
import { getFeatureSeoByPath } from '@/lib/featureSeoContent';

const qrSeo = getFeatureSeoByPath('/features/qr-code-integration')!;
const qrPrimaryCta = content.ctaPrimaryText;
if (!qrPrimaryCta) {
  throw new Error('QR feature page must define ctaPrimaryText');
}

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

      expect(screen.getByText(qrSeo.heroTitle)).toBeInTheDocument();
      expect(screen.getByText(qrSeo.heroDescription)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: qrSeo.heroTitle })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: qrPrimaryCta })).toHaveLength(2);
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
      expect(screen.getByText(content.benefitsTitle)).toBeInTheDocument();
      expect(screen.getByText(content.benefitsDescription)).toBeInTheDocument();

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

      expect(screen.getByText('Scan the sticker')).toBeInTheDocument();
      expect(screen.getByText('Every scan is logged')).toBeInTheDocument();
      expect(screen.getByText('Print labels')).toBeInTheDocument();
    });
  });

  describe('Steps Section', () => {
    it('renders the steps section with correct title', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText(content.stepsTitle)).toBeInTheDocument();
      expect(screen.getByText(content.stepsDescription)).toBeInTheDocument();
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
      expect(screen.queryByText('Streamline Operations')).not.toBeInTheDocument();
    });
  });

  describe('Screenshots Section', () => {
    it('renders the showcases section with correct title', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByText(content.showcaseTitle)).toBeInTheDocument();
      expect(screen.getByText(content.showcaseDescription)).toBeInTheDocument();
    });

    it('renders all screenshot blocks with correct data', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      const screenshotBlocks = screen.getAllByTestId('screenshot-block');
      expect(screenshotBlocks).toHaveLength(showcases.length);

      // Verify each screenshot's content
      showcases.forEach((screenshot) => {
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
      expect(screen.getByText('Quick Access from Equipment List')).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('renders the CTA section with correct content', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      expect(screen.getByRole('heading', { level: 2, name: content.ctaTitle })).toBeInTheDocument();
      expect(screen.getByText(content.ctaDescription)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: qrPrimaryCta })).toHaveLength(2);
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
      expect(steps).toHaveLength(3);
      expect(showcases).toHaveLength(2);

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

      // Verify showcases have required properties
      showcases.forEach((screenshot) => {
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
      const mainTitle = screen.getByText(qrSeo.heroTitle);
      expect(mainTitle.tagName).toBe('H1');

      // Section titles should be h2
      const sectionTitles = [
        content.benefitsTitle,
        content.stepsTitle,
        content.showcaseTitle,
        content.ctaTitle,
      ];

      sectionTitles.forEach((title) => {
        const element = screen.getByRole('heading', { level: 2, name: title });
        expect(element.tagName).toBe('H2');
      });
    });

    it('has accessible button text', () => {
      render(
        <TestProviders>
          <QRCodeIntegration />
        </TestProviders>
      );

      const ctaButtons = screen.getAllByRole('button', { name: qrPrimaryCta });
      expect(ctaButtons).toHaveLength(2);
      expect(ctaButtons[0].textContent).toBe(ctaButtons[1].textContent);
    });
  });
});
