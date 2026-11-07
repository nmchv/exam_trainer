import { element } from './dom.js';

export function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function createTimer(deadline) {
  const display = element('span', { className: 'timer', role: 'timer', 'aria-live': 'off' });
  const update = () => {
    const remaining = Math.max(0, deadline - Date.now());
    display.textContent = formatTime(remaining);
    display.classList.toggle('is-low', remaining < 5 * 60_000);
    return remaining;
  };
  update();
  return { element: display, update };
}
