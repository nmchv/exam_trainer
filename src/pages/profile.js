import { element } from '../components/dom.js';

export function renderProfile({ user, configured, onSignIn, onSignUp, onSignOut }) {
  const authForm = element('form', { className: 'stack', onSubmit: (event) => {
    event.preventDefault();
    const data = new FormData(authForm);
    const action = event.submitter?.value;
    const details = {
      email: String(data.get('email') ?? '').trim(),
      password: String(data.get('password') ?? ''),
      displayName: String(data.get('displayName') ?? '').trim()
    };
    if (action === 'signup') onSignUp(details);
    else onSignIn(details);
  } }, [
    configured ? element('label', { className: 'form-label' }, ['Имя для профиля', element('input', { className: 'text-control', type: 'text', name: 'displayName', autocomplete: 'name' })]) : null,
    element('label', { className: 'form-label' }, ['Электронная почта', element('input', { className: 'text-control', type: 'email', name: 'email', autocomplete: 'email', required: true })]),
    element('label', { className: 'form-label' }, ['Пароль', element('input', { className: 'text-control', type: 'password', name: 'password', autocomplete: 'current-password', minlength: '6', required: true })]),
    element('div', { className: 'hero-actions' }, [
      element('button', { className: 'button button-primary', type: 'submit', name: 'action', value: 'signin' }, ['Войти']),
      element('button', { className: 'button', type: 'submit', name: 'action', value: 'signup' }, ['Создать аккаунт'])
    ])
  ]);
  return element('main', { className: 'page-shell page-enter', id: 'main' }, [
    element('div', { className: 'page-heading' }, [
      element('div', {}, [
        element('span', { className: 'eyebrow' }, ['Аккаунт']),
        element('h1', {}, ['Профиль']),
        element('p', {}, ['Войдите, чтобы сохранять прогресс между устройствами.'])
      ])
    ]),
    user ? element('section', { className: 'card stack' }, [
      element('span', { className: 'profile-badge' }, [(user.email ?? 'У').slice(0, 1).toUpperCase()]),
      element('h2', {}, [user.user_metadata?.display_name || user.email]),
      element('p', {}, ['Синхронизация подключена через Supabase Auth.']),
      element('button', { className: 'button button-danger', onClick: onSignOut }, ['Выйти'])
    ]) : element('div', { className: 'two-column' }, [
      element('section', { className: 'card stack' }, [
        element('h2', {}, ['Вход и регистрация']),
        configured ? authForm : element('div', { className: 'notice-banner' }, [
          'Подключение Supabase не настроено. Локальные тренировки работают, но аккаунт и синхронизация будут доступны после заполнения public/config.js. Сервис не имитирует вход в аккаунт.'
        ])
      ]),
      element('aside', { className: 'card' }, [
        element('h2', {}, ['О локальном режиме']),
        element('p', {}, ['До настройки Supabase результаты хранятся только в этом браузере. Очистка данных браузера удалит локальную историю.'])
      ])
    ])
  ]);
}
