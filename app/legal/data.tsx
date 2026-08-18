import { LegalScreen } from '@/components/legal/LegalScreen';
import { dataCollectionSections, EFFECTIVE_DATE } from '@/constants/legalContent';

export default function DataCollectionScreen() {
  return <LegalScreen title="Data Collection & Permissions" effectiveDate={EFFECTIVE_DATE} sections={dataCollectionSections} />;
}
