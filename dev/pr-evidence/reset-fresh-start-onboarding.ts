// fallow-ignore-file unused-file
// Invoked by bash dev/linux/pr-evidence.sh capture via npx tsx, not imported.
import { resetFreshStartOnboardingFixture } from '../../e2e/user/shared/fresh-start-reset';

await resetFreshStartOnboardingFixture();
console.log('[PR evidence] Fresh Start onboarding fixture reset complete.');
