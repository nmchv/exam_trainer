function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function stableDependencyOrder(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ordered = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(task) {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) throw new Error(`Обнаружен цикл зависимостей заданий: ${task.id}.`);
    visiting.add(task.id);
    for (const dependencyId of task.dependsOn ?? []) {
      const dependency = byId.get(dependencyId);
      if (!dependency) throw new Error(`Для задания ${task.id} отсутствует зависимость ${dependencyId}.`);
      visit(dependency);
    }
    visiting.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  }

  tasks.forEach(visit);
  return ordered;
}

export function generateExam(tasks, specification, options = {}) {
  if (!specification || !Array.isArray(specification.sections)) {
    throw new TypeError('Конфигурация экзамена должна содержать sections.');
  }
  const random = options.random ?? Math.random;
  const available = new Map(tasks.map((task) => [task.id, task]));
  const selected = [];
  const selectedIds = new Set();

  const add = (task, maxScore) => {
    if (!task) throw new Error('В конфигурации экзамена указан несуществующий тип или id задания.');
    if (selectedIds.has(task.id)) return;
    selectedIds.add(task.id);
    selected.push({ ...task, maxScore: maxScore ?? task.maxScore });
  };

  if (Array.isArray(specification.fixedTaskIds)) {
    if (specification.fixedTaskIds.length === 0) throw new RangeError('Фиксированный вариант не содержит заданий.');
    specification.fixedTaskIds.forEach((id) => add(available.get(id)));
  } else {
    for (const section of specification.sections) {
      if (typeof section.type !== 'string' || !Number.isInteger(section.count) || section.count < 1) {
        throw new TypeError('Каждая позиция экзамена должна содержать type и положительный count.');
      }
      let candidates = tasks.filter((task) => task.type === section.type);
      if (section.tags?.length) candidates = candidates.filter((task) => section.tags.every((tag) => task.tags?.includes(tag)));
      if (section.difficulty) candidates = candidates.filter((task) => task.difficulty === section.difficulty);
      if (section.taskIds) {
        candidates = section.taskIds.map((id) => available.get(id));
        if (candidates.some((task) => !task || task.type !== section.type)) {
          throw new Error('Позиция экзамена содержит несуществующий taskId или задание другого типа.');
        }
      }

      const groups = new Map();
      for (const task of candidates) {
        const key = task.groupId ? `group:${task.groupId}` : `task:${task.id}`;
        if (!groups.has(key)) {
          groups.set(key, task.groupId
            ? tasks.filter((candidate) => candidate.groupId === task.groupId)
            : [task]);
        }
      }
      const bundles = shuffle([...groups.values()], random);
      let selectedForSection = 0;
      for (const bundle of bundles) {
        const newItems = bundle.filter((task) => !selectedIds.has(task.id));
        const sectionItems = newItems.filter((task) => task.type === section.type);
        if (sectionItems.length === 0 || selectedForSection + sectionItems.length > section.count) continue;
        newItems.forEach((task) => add(task, task.type === section.type ? section.maxScore : task.maxScore));
        selectedForSection += sectionItems.length;
        if (selectedForSection === section.count) break;
      }
      if (selectedForSection !== section.count) {
        throw new RangeError(`Для позиции «${section.type}» найдено ${selectedForSection} из ${section.count} заданий без повторов.`);
      }
    }
  }

  for (let index = 0; index < selected.length; index += 1) {
    const groupId = selected[index].groupId;
    if (groupId) {
      for (const related of tasks.filter((task) => task.groupId === groupId)) {
        if (!selectedIds.has(related.id)) add(related, related.maxScore);
      }
    }
    for (const dependencyId of selected[index].dependsOn ?? []) {
      if (selectedIds.has(dependencyId)) continue;
      const dependency = available.get(dependencyId);
      if (!dependency) throw new Error(`Для задания ${selected[index].id} отсутствует зависимость ${dependencyId}.`);
      add(dependency, dependency.maxScore);
    }
  }
  const orderedTasks = stableDependencyOrder(selected);
  return {
    id: options.attemptId ?? globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}`,
    examId: specification.examId,
    mode: 'exam',
    durationMinutes: specification.durationMinutes,
    tasks: orderedTasks,
    startedAt: options.startedAt ?? new Date().toISOString()
  };
}
