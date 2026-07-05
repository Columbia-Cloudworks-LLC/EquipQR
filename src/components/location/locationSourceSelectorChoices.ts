import {
  getLocationSourceLabel,
  type EquipmentLocationOption,
  type LocationDisplayMode,
  type LocationSource,
} from '@/utils/effectiveLocation';

export const EFFECTIVE_LOCATION_OPTION_LABEL = 'Effective location';

const HIERARCHY_MODES: LocationSource[] = ['team', 'manual', 'scan'];

export type LocationSelectorChoice = {
  value: LocationDisplayMode;
  label: string;
  disabled?: boolean;
};

export function getLocationSelectorChoices(
  options: EquipmentLocationOption[],
): LocationSelectorChoice[] {
  const availableModes = new Set(options.map((option) => option.mode));
  const choices: LocationSelectorChoice[] = [
    { value: 'effective', label: EFFECTIVE_LOCATION_OPTION_LABEL, disabled: false },
  ];

  for (const mode of HIERARCHY_MODES) {
    choices.push({
      value: mode,
      label: getLocationSourceLabel(mode),
      disabled: !availableModes.has(mode),
    });
  }

  if (availableModes.has('legacy')) {
    choices.push({
      value: 'legacy',
      label: getLocationSourceLabel('legacy'),
      disabled: false,
    });
  }

  return choices;
}
