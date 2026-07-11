import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { EquipmentPMTemplateField } from './EquipmentPMTemplateField';

type Equipment = Tables<'equipment'>;

interface EquipmentPMTemplateCardProps {
  equipment: Equipment;
}

/** Standalone card wrapper kept for focused unit tests (#1169). */
const EquipmentPMTemplateCard = ({ equipment }: EquipmentPMTemplateCardProps) => (
  <Card>
    <CardContent className="pt-4 pb-4">
      <EquipmentPMTemplateField equipment={equipment} />
    </CardContent>
  </Card>
);

export default EquipmentPMTemplateCard;
