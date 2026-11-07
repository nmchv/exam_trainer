import { element } from './dom.js';

export function createAnswerInput(task, value, disabled = false) {
  const group = element('div', { className: 'answer-control' });
  const current = value ?? (task.type === 'multiple_choice' || task.type === 'ordering' ? [] : '');
  const choices = task.choices ?? [];
  const name = `answer-${task.id}`;

  if (task.type === 'single_choice' || task.type === 'map') {
    choices.forEach((choice, index) => {
      const id = `${name}-${index}`;
      const input = element('input', {
        id, name, type: 'radio', value: choice.value,
        checked: String(current) === String(choice.value), disabled
      });
      group.append(element('label', { className: 'choice-option', for: id }, [
        input, element('span', { className: 'choice-key' }, [choice.key ?? String.fromCharCode(65 + index)]),
        element('span', {}, [choice.label])
      ]));
    });
  } else if (task.type === 'multiple_choice') {
    choices.forEach((choice, index) => {
      const id = `${name}-${index}`;
      const input = element('input', {
        id, name, type: 'checkbox', value: choice.value,
        checked: current.map(String).includes(String(choice.value)), disabled
      });
      group.append(element('label', { className: 'choice-option', for: id }, [
        input, element('span', { className: 'choice-key' }, [choice.key ?? String.fromCharCode(65 + index)]),
        element('span', {}, [choice.label])
      ]));
    });
  } else if (task.type === 'matching' || task.type === 'table') {
    const rows = task.rows ?? [];
    rows.forEach((row) => {
      const control = element('input', {
        className: 'text-control', name: `${name}-${row.id}`, value: current[row.id] ?? '',
        placeholder: 'Введите ответ', disabled, 'aria-label': row.label
      });
      control.dataset.rowId = row.id;
      group.append(element('label', { className: 'form-row' }, [
        element('span', {}, [row.label]), control
      ]));
    });
  } else if (task.type === 'ordering') {
    const ordered = Array.isArray(current) ? current : [];
    (task.items ?? []).forEach((item, index) => {
      const select = element('select', {
        className: 'text-control', 'aria-label': `Позиция для ${item.label}`, disabled
      }, [
        element('option', { value: '' }, ['Выбрать позицию']),
        ...task.items.map((_, optionIndex) => element('option', {
          value: optionIndex + 1,
          selected: String(ordered[index] ?? '') === String(optionIndex + 1)
        }, [String(optionIndex + 1)]))
      ]);
      select.dataset.itemId = item.id;
      group.append(element('label', { className: 'form-row' }, [item.label, select]));
    });
  } else {
    const isNumber = task.type === 'number';
    const input = element('input', {
      className: 'text-control text-answer', type: isNumber ? 'text' : 'text',
      inputmode: isNumber ? 'decimal' : 'text',
      value: String(current ?? ''), disabled,
      placeholder: isNumber ? 'Введите число' : 'Введите ответ',
      autocomplete: 'off', 'aria-label': 'Ваш ответ'
    });
    group.append(input);
  }
  return group;
}

export function readAnswer(task, control) {
  if (task.type === 'single_choice' || task.type === 'map') {
    return control.querySelector('input[type="radio"]:checked')?.value ?? '';
  }
  if (task.type === 'multiple_choice') {
    return [...control.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  }
  if (task.type === 'matching' || task.type === 'table') {
    return Object.fromEntries([...control.querySelectorAll('[data-row-id]')].map((input) => [input.dataset.rowId, input.value.trim()]));
  }
  if (task.type === 'ordering') {
    const values = [...control.querySelectorAll('[data-item-id]')].map((select) => ({
      itemId: select.dataset.itemId,
      position: Number(select.value)
    }));
    return values.some((value) => !value.position)
      ? values.map((value) => value.position)
      : values.sort((left, right) => left.position - right.position).map((value) => value.itemId);
  }
  return control.querySelector('.text-answer')?.value.trim() ?? '';
}
