export type DocGroupId = "engine" | "habits" | "balance" | "system"

export type DocGroup = {
  id: DocGroupId
  blockIds: string[]
}

export const implGroups: DocGroup[] = [
  { id: "engine", blockIds: ["engine", "scoring", "progress"] },
  { id: "habits", blockIds: ["streak", "repeat", "habitCap"] },
  { id: "balance", blockIds: ["penalty", "level"] },
  { id: "system", blockIds: ["settlement", "audit", "data"] },
]

export const theoryToc: Record<"ru" | "en", { id: string; title: string }[]> = {
  ru: [
    { id: "существующие-подходы-к-геймификации-задач", title: "Геймификация задач" },
    { id: "формула-оценки-задач-прогресс-и-вес-цели", title: "Формула оценки задач" },
    { id: "отрицательные-баллы-и-антиинфляция", title: "Штрафы и антиинфляция" },
    { id: "визуализация-прогресса-и-честность-системы", title: "Визуализация прогресса" },
    { id: "примеры-и-шаблоны", title: "Примеры и шаблоны" },
  ],
  en: [
    { id: "existing-approaches-to-task-gamification", title: "Task Gamification" },
    { id: "task-scoring-formula-progress-and-goal-weight", title: "Task Scoring Formula" },
    { id: "negative-points-and-anti-inflation", title: "Penalties & Anti-Inflation" },
    { id: "visualizing-progress-and-system-fairness", title: "Visualizing Progress" },
    { id: "examples-and-templates", title: "Examples & Templates" },
  ],
}

export const moduleToc: Record<"ru" | "en", { id: string; title: string }[]> = {
  ru: [
    { id: "что-это", title: "Что это" },
    { id: "семья-и-версии", title: "Семья и версии" },
    { id: "метрики", title: "Метрики" },
    { id: "baseline", title: "Baseline" },
    { id: "чек-ин", title: "Чек-ин" },
    { id: "жизненный-цикл-версии", title: "Жизненный цикл версии" },
    { id: "результаты-и-вердикт", title: "Результаты и вердикт" },
    { id: "сравнение-версий", title: "Сравнение версий" },
  ],
  en: [
    { id: "concept", title: "Concept" },
    { id: "family-and-versions", title: "Family and versions" },
    { id: "metrics", title: "Metrics" },
    { id: "baseline", title: "Baseline" },
    { id: "check-in", title: "Check-in" },
    { id: "version-lifecycle", title: "Version lifecycle" },
    { id: "results-and-verdict", title: "Results and verdict" },
    { id: "comparing-versions", title: "Comparing versions" },
  ],
}
