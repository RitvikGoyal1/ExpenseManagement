import { LegalScreen } from '@/components/legal/LegalScreen';
import { EFFECTIVE_DATE, termsSections } from '@/constants/legalContent';

export default function TermsScreen() {
  return <LegalScreen title="Terms of Service" effectiveDate={EFFECTIVE_DATE} sections={termsSections} />;
}
