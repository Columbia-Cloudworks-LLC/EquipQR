/** Optional machine_hours column for note inserts when the user entered a positive value. */
export function noteMachineHoursInsertFields(
  machineHours?: number | null,
): { machine_hours: number } | Record<string, never> {
  return Number.isFinite(Number(machineHours)) && Number(machineHours) > 0
    ? { machine_hours: Number(machineHours) }
    : {};
}
