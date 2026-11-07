# JSON-формат банков (schema 1.0.0)

Все JSON-форматы проверяются файлами из `schemas/`. Экзамен задаётся реестром, его спецификацией и одним или несколькими банками заданий. Демонстрационные fixtures хранятся отдельно в `public/database/oge/geography/tasks/demo.json` и явно включают `demoOnly: true`.

## Реестр

`public/database/registry.json` содержит `schemaVersion` и массив экзаменов с уникальными `id`, `title`, `examType`, `subject`, `year`, относительным `path`, `enabled` и необязательным `demoOnly`.

## Конфигурация экзамена

Файл `exam.json` содержит `schemaVersion`, `examId`, `title`, `year`, `durationMinutes`, `taskFiles`, `taskSelection` и `scoring`. `taskFiles` перечисляет относительные пути к банкам внутри каталога экзамена.

Пример позиции случайного варианта:

```json
{
  "type": "single_choice",
  "count": 2,
  "maxScore": 1,
  "tags": ["topic-id"]
}
```

Фиксированный вариант задаётся `taskSelection.fixedTaskIds` и точным порядком ID. В задании `groupId` включает связанные позиции одним блоком; `dependsOn` указывает ID, которые должны присутствовать раньше зависимого задания. Случайный подбор не использует задание повторно в пределах одной попытки.

`scoring.gradeScale` — список `{ "min": number, "max": number, "grade": number }`. Шкала в реальном экзамене также должна быть загружена в приватную таблицу `exam_scoring_rules`, поскольку клиентская конфигурация не является доверенной.

## Банк заданий

Корень содержит `schemaVersion`, `examId`, `tasks` и необязательную `theory`. Задание включает:

- обязательные `id`, `type`, `prompt`;
- необязательные `number`, `typeLabel`, `image`, `imageAlt`, `table`, `choices`, `rows`, `items`;
- фильтры `tags`, `difficulty` (`basic`, `medium`, `advanced`), `groupId`, `dependsOn`;
- `maxScore`, `manualCheck`, `theoryId`, `explanation`.

Допустимые типы ответов: `single_choice`, `multiple_choice`, `text`, `number`, `matching`, `ordering`, `short_answer`, `table`, `map`. Формат ответа зависит от типа: строка, массив или объект соответствий. `checkRules` поддерживает альтернативы, регистр, пробелы, знаки препинания, числовой `tolerance`, порядок массива и частичный балл для массивов/объектов. Неавтоматизируемые ответы отмечаются `manualCheck: true`.

В открытом банке реального экзамена **нельзя указывать поле `answer`**: загрузчик завершится понятной ошибкой. Для настоящего экзамена ключи, `checkRules`, `max_score`, объяснение и шкала оценивания хранятся в закрытых Supabase-таблицах и доступны только Edge Functions. Поле `answer` допустимо только в искусственном тестовом fixture с `demoOnly: true`.

Теория задаётся отдельными объектами с `id`, `title`, `summary`, `algorithm`, `commonMistakes`, `examples`. Задание связывается с материалом через `theoryId` или тематические теги.

## Добавление типа ответа

Добавьте представление/считывание ответа в `src/components/answerInput.js`, проверку в `src/engines/answerChecker.js` и `supabase/functions/_shared/http.ts`, тесты в `tests/answerChecker.test.js` и значение в `schemas/task.schema.json`. Для типов, которые невозможно проверить надёжно, используйте `manualCheck`.
