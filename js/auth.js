let authInitialized = false;

function setAuthMessage(message) {
  document.getElementById('auth-message').textContent = message || '';
}

function authErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.status);

  if(code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'La cuenta existe, pero el correo aún no está confirmado. En Supabase → Authentication → Users, confirma la cuenta y vuelve a intentar.';
  }
  if(code === 'user_banned' || message.includes('user is banned')) {
    return 'La cuenta está deshabilitada en Supabase. Solicita al administrador que revise su estado.';
  }
  if(code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Supabase rechazó esta combinación de correo y contraseña. Que el correo aparezca confirmado solo valida la dirección, no la contraseña. Si el usuario existe en este proyecto, restablece su contraseña en Supabase y vuelve a intentarlo.';
  }
  if(code === 'over_request_rate_limit' || status === 429) {
    return 'Se hicieron demasiados intentos. Espera unos minutos antes de volver a iniciar sesión.';
  }
  if(code === 'invalid_api_key' || status === 401 && message.includes('api key')) {
    return 'Supabase rechazó la clave pública configurada. El administrador debe revisar SUPABASE_URL y SUPABASE_KEY en js/config.js.';
  }
  if(error instanceof TypeError || message.includes('failed to fetch') || message.includes('network')) {
    return 'No fue posible conectar con Supabase. Revisa la conexión a internet, la URL del proyecto y que el proyecto esté activo.';
  }

  const diagnostic = [code, status ? `HTTP ${status}` : ''].filter(Boolean).join(' · ');
  return `No se pudo iniciar sesión.${diagnostic ? ` Diagnóstico: ${diagnostic}.` : ''} Revisa la cuenta en Authentication → Users y vuelve a intentar.`;
}

function renderAuthSession(session) {
  const gate = document.getElementById('auth-gate');
  const app = document.getElementById('app-layout');
  const email = document.getElementById('auth-user-email');

  if(!session) {
    app.hidden = true;
    gate.hidden = false;
    email.textContent = '';
    authInitialized = false;
    return;
  }

  gate.hidden = true;
  app.hidden = false;
  email.textContent = session.user.email || 'Sesión activa';
  if(!authInitialized) {
    authInitialized = true;
    loadDashboard();
    initShipmentModule();
  }
}

async function initAuth() {
  if(SUPABASE_KEY === 'https://iwbxedqhuswsgjsfwppe.supabase.co/rest/v1/') {
    setAuthMessage('Falta configurar la clave pública anon de Supabase en js/config.js. No uses aquí el correo ni la contraseña del usuario.');
    return;
  }

  sb.auth.onAuthStateChange((event, session) => {
    if(event === 'INITIAL_SESSION') return;
    window.setTimeout(() => renderAuthSession(session), 0);
  });

  try {
    const {data, error} = await sb.auth.getSession();
    if(error) {
      setAuthMessage('No se pudo validar la sesión. ' + authErrorMessage(error));
      return;
    }
    renderAuthSession(data.session);
  } catch(error) {
    setAuthMessage('No se pudo validar la sesión. ' + authErrorMessage(error));
  }
}

document.getElementById('auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('auth-submit');
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  setAuthMessage('');
  button.disabled = true;
  button.textContent = 'Validando...';

  try {
    if(SUPABASE_KEY === 'https://iwbxedqhuswsgjsfwppe.supabase.co/rest/v1/') {
      setAuthMessage('Falta configurar la clave pública anon de Supabase en js/config.js. No uses aquí el correo ni la contraseña del usuario.');
      return;
    }
    const {error} = await sb.auth.signInWithPassword({email, password});
    if(error) {
      setAuthMessage(authErrorMessage(error));
      document.getElementById('auth-password').value = '';
    }
  } catch(error) {
    setAuthMessage(authErrorMessage(error));
    document.getElementById('auth-password').value = '';
  } finally {
    button.disabled = false;
    button.textContent = 'Iniciar sesión';
  }
});

async function signOut() {
  const {error} = await sb.auth.signOut();
  if(error) toast('No se pudo cerrar la sesión: ' + error.message, 'error');
}
