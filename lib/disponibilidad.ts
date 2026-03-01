const DISPONIBLE_WINDOW_MS = 45 * 60 * 1000;

export function isDisponibleAhora(
  disponible: boolean | undefined,
  ultimaActividad: string | null | undefined
): boolean {
  if (!disponible) return false;
  if (!ultimaActividad) return false;
  const diff = Date.now() - new Date(ultimaActividad).getTime();
  return diff <= DISPONIBLE_WINDOW_MS;
}

export function getActivityLabel(
  ultimaActividad: string | null | undefined
): string | null {
  if (!ultimaActividad) return null;
  const diffMs = Date.now() - new Date(ultimaActividad).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Activa ahora";
  if (diffMin <= 45) return `Activa hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Ultima conexion hace ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Ultima conexion hace ${diffDays}d`;
}
