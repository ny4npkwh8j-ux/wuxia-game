(function () {
  const SUPABASE = window.supabaseClient;

  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authCloseBtn = document.getElementById('auth-close-btn');
  const authMessage = document.getElementById('auth-message');
  const logoutBtn = document.getElementById('logout-btn');

  let mode = 'sign_in';

  function setMessage(text, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = text || '';
    authMessage.style.color = isError ? '#ff8f8f' : '#dfeaff';
    authMessage.style.display = text ? 'block' : 'none';
  }

  function setLoading(isLoading) {
    if (!authSubmitBtn) return;
    authSubmitBtn.disabled = isLoading;
    authSubmitBtn.textContent = isLoading ? 'Обработка...' : (mode === 'sign_in' ? 'Войти' : 'Зарегистрироваться');
  }

  function syncAuthMode() {
    if (!authToggleBtn || !authSubmitBtn) return;
    const isSignIn = mode === 'sign_in';
    authToggleBtn.textContent = isSignIn ? 'Зарегистрироваться' : 'У меня уже есть аккаунт';
    authSubmitBtn.textContent = isSignIn ? 'Войти' : 'Зарегистрироваться';
  }

  function showAuthModal(show = true) {
    if (!authModal) return;
    authModal.style.display = show ? 'flex' : 'none';
  }

  function updateAuthUI(session) {
    const user = session && session.user ? session.user : null;

    if (logoutBtn) {
      logoutBtn.style.display = user ? 'inline-flex' : 'none';
    }

    if (authCloseBtn) {
      authCloseBtn.style.display = user ? 'none' : 'inline-flex';
    }

    if (!user) {
      showAuthModal(true);
      return;
    }

    showAuthModal(false);
    setMessage('Вы вошли как: ' + user.email, false);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!SUPABASE) {
      setMessage('Supabase не инициализирован. Проверьте URL и anon key.', true);
      return;
    }

    const email = authEmail ? authEmail.value.trim() : '';
    const password = authPassword ? authPassword.value : '';

    if (!email || !password) {
      setMessage('Заполните email и пароль.', true);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let result;

      if (mode === 'sign_in') {
        result = await SUPABASE.auth.signInWithPassword({ email, password });
      } else {
        result = await SUPABASE.auth.signUp({ email, password });
      }

      if (result.error) {
        throw result.error;
      }

      if (mode === 'sign_up') {
        setMessage('Проверка почты: регистрация создана. Проверьте inbox.', false);
        authForm.reset();
      }
    } catch (error) {
      setMessage(error.message || 'Ошибка авторизации.', true);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!SUPABASE) return;

    const { error } = await SUPABASE.auth.signOut();
    if (error) {
      setMessage(error.message || 'Ошибка выхода.', true);
      return;
    }

    authForm && authForm.reset();
    setMessage('Вы вышли.', false);
    updateAuthUI(null);
  }

  function initAuth() {
    if (!authForm) return;

    authToggleBtn && authToggleBtn.addEventListener('click', () => {
      mode = mode === 'sign_in' ? 'sign_up' : 'sign_in';
      syncAuthMode();
      setMessage('');
    });

    authForm.addEventListener('submit', handleAuthSubmit);
    authCloseBtn && authCloseBtn.addEventListener('click', () => showAuthModal(false));
    logoutBtn && logoutBtn.addEventListener('click', handleLogout);

    syncAuthMode();
    setMessage('');

    if (!SUPABASE) {
      setMessage('Supabase не инициализирован. Проверьте url/anon key в js/supabase-client.js', true);
      return;
    }

    SUPABASE.auth.getSession().then(({ data }) => {
      updateAuthUI(data.session);
    }).catch(() => {
      setMessage('Не удалось получить сессию.', true);
    });

    SUPABASE.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        updateAuthUI(null);
      } else {
        updateAuthUI(session);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initAuth);
})();
