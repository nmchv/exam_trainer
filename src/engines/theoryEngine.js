export function getTheory(task, theory = []) {
  const ids = new Set([task?.theoryId, ...(task?.tags ?? [])].filter(Boolean));
  return theory.filter((item) => ids.has(item.id));
}
