// fallow-ignore-file unused-file
// Invoked by Invoke-PrEvidenceCapture.ps1 via npx tsx, not imported.
import { resetFreshStartOnboardingFixture } from '../../e2e/user/shared/fresh-start-reset';

await resetFreshStartOnboardingFixture();
console.log('[PR evidence] Fresh Start onboarding fixture reset complete.');
