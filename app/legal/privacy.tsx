import { LegalScreen } from '@/components/legal/LegalScreen';
import { EFFECTIVE_DATE, privacySections } from '@/constants/legalContent';

export default function PrivacyScreen() {
  return <LegalScreen title="Privacy Policy" effectiveDate={EFFECTIVE_DATE} sections={privacySections} />;
}
