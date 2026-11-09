/**
 * Which slots of a nutrition program still need a task.
 *
 * A slot is covered by a task of the same recipe that sits on it, that still
 * carries its title — a program task is named "<racikan> · HST <n>" and keeps
 * that name when postponed — or that was pushed later inside the slot's own
 * stretch, before the next one starts. Matching on the HST alone stopped
 * working once Tunda could move a task: running the program again found the
 * original HST empty and scheduled the same spray twice.
 */
export function uncoveredSlots({
  fromHst,
  toHst,
  intervalDays,
  recipeName,
  existing,
}: {
  fromHst: number;
  toHst: number;
  intervalDays: number;
  recipeName: string;
  existing: { hst: number | null; title: string }[];
}): number[] {
  const titles = new Set(existing.map((task) => task.title));
  const hsts = existing.flatMap((task) => (task.hst === null ? [] : [task.hst]));

  const open: number[] = [];
  for (let hst = fromHst; hst <= toHst; hst += intervalDays) {
    const covered =
      titles.has(programTaskTitle(recipeName, hst)) ||
      hsts.some((taken) => taken >= hst && taken < hst + intervalDays);
    if (!covered) open.push(hst);
  }
  return open;
}

export function programTaskTitle(recipeName: string, hst: number): string {
  return `${recipeName} · HST ${hst}`;
}
