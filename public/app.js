// SDK modular, sem framework ou etapa de compilação.
const $ = (id) => document.getElementById(id);
const ui = {
  auth: $('auth-view'), dashboard: $('dashboard'), message: $('message'),
  authForm: $('auth-form'), authFields: $('auth-fields'), taskForm: $('task-form'),
  taskFields: $('task-fields'), list: $('task-list'), empty: $('empty')
};
let auth, db, authAPI, dbAPI;
let user = null;
let tasks = [];
let unsubscribe = null;
let session = 0;
let signingUp = false;
let authBusy = false;
let taskBusy = false;
let ready = false;
let filter = 'all';
let editingId = null;

function message(text = '', error = false) {
  ui.message.textContent = text;
  ui.message.hidden = !text;
  ui.message.classList.toggle('error', error);
}

function errorMessage(error) {
  const messages = {
    'auth/invalid-email': 'Confira o formato do e-mail.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já possui uma conta. Use a opção Entrar.',
    'auth/weak-password': 'A senha não atende à política do projeto. Use uma senha mais forte.',
    'auth/password-does-not-meet-requirements': 'A senha não atende à política definida no Firebase.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/network-request-failed': 'Não foi possível conectar. Confira sua internet.',
    'auth/operation-not-allowed': 'Ative o provedor E-mail/senha no Firebase Authentication.',
    'auth/user-disabled': 'Esta conta está desativada.',
    'auth/unauthorized-domain': 'Autorize este domínio nas configurações do Firebase Authentication.',
    'auth/invalid-api-key': 'Confira a apiKey no arquivo firebase-config.js.',
    'permission-denied': 'Acesso negado ao banco. Confira as regras do Firestore e a conta conectada.',
    'failed-precondition': 'Confira se o banco Cloud Firestore padrão foi criado e está disponível.',
    'unavailable': 'O banco está indisponível. Confira sua conexão e tente novamente.',
    'not-found': 'Esta tarefa não existe mais. Ela pode ter sido excluída em outra aba.',
    'resource-exhausted': 'O limite de uso do serviço foi atingido. Confira o console Firebase.'
  };
  return messages[error.code] || 'Não foi possível concluir. Confira a configuração, a conexão e tente novamente.';
}

function setAuthMode(signup) {
  if (authBusy) return;
  signingUp = signup;
  $('login-tab').setAttribute('aria-pressed', String(!signup));
  $('signup-tab').setAttribute('aria-pressed', String(signup));
  $('confirm-group').hidden = !signup;
  $('confirm-password').disabled = !signup;
  $('confirm-password').required = signup;
  $('password').autocomplete = signup ? 'new-password' : 'current-password';
  $('password').minLength = signup ? 6 : 1;
  $('auth-heading').textContent = signup ? 'Crie sua conta' : 'Vamos começar?';
  $('auth-description').textContent = signup ? 'Preencha os campos abaixo para começar.' : 'Entre com seu e-mail e senha para acessar suas tarefas.';
  $('auth-submit').textContent = signup ? 'Criar minha conta →' : 'Entrar na minha conta →';
  $('password').value = '';
  $('confirm-password').value = '';
}

$('login-tab').addEventListener('click', () => setAuthMode(false));
$('signup-tab').addEventListener('click', () => setAuthMode(true));
ui.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth || authBusy) return;
  const email = $('email').value.trim();
  const password = $('password').value;
  if (signingUp && password !== $('confirm-password').value) {
    message('As senhas precisam ser iguais.', true);
    $('confirm-password').focus();
    return;
  }
  authBusy = true;
  ui.authFields.disabled = true;
  $('login-tab').disabled = $('signup-tab').disabled = true;
  message(signingUp ? 'Criando sua conta…' : 'Entrando…');
  try {
    if (signingUp) await authAPI.createUserWithEmailAndPassword(auth, email, password);
    else await authAPI.signInWithEmailAndPassword(auth, email, password);
    ui.authForm.reset();
  } catch (error) {
    message(errorMessage(error), true);
  } finally {
    authBusy = false;
    ui.authFields.disabled = false;
    $('login-tab').disabled = $('signup-tab').disabled = false;
  }
});

$('logout').addEventListener('click', async () => {
  $('logout').disabled = true;
  try { await authAPI.signOut(auth); }
  catch (error) { message(errorMessage(error), true); }
  finally { $('logout').disabled = taskBusy; }
});

function resetEditor() {
  editingId = null;
  ui.taskForm.reset();
  $('editor-heading').textContent = 'Adicionar tarefa';
  $('save-task').textContent = 'Adicionar tarefa +';
  $('cancel-edit').hidden = true;
}
$('cancel-edit').addEventListener('click', resetEditor);

function syncControls() {
  ui.taskFields.disabled = taskBusy || !ready;
  $('logout').disabled = taskBusy;
}

function taskReference(id) {
  return dbAPI.doc(db, 'users', user.uid, 'tasks', id);
}

// Só confirma sucesso depois que a escrita é aceita pelo Firestore.
async function mutate(operation, successText, afterSuccess = () => {}) {
  if (!user || !ready || taskBusy) return;
  const currentSession = session;
  taskBusy = true;
  syncControls();
  render();
  message('Salvando no Firebase… Se estiver sem conexão, aguarde a internet retornar.');
  try {
    await operation();
    if (session !== currentSession) return;
    afterSuccess();
    message(successText);
  } catch (error) {
    if (session === currentSession) message(errorMessage(error), true);
  } finally {
    if (session === currentSession) {
      taskBusy = false;
      syncControls();
      render();
    }
  }
}

ui.taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('task-title').value.trim();
  if (!title) { message('Escreva um título para a tarefa.', true); return; }
  if (!user) return;
  const data = {
    title,
    description: $('task-description').value.trim(),
    priority: $('task-priority').value,
    updatedAt: dbAPI.serverTimestamp()
  };
  const id = editingId;
  const target = id ? taskReference(id) : dbAPI.collection(db, 'users', user.uid, 'tasks');
  void mutate(
    () => id ? dbAPI.updateDoc(target, data) : dbAPI.addDoc(target, { ...data, done: false, createdAt: dbAPI.serverTimestamp() }),
    id ? 'Tarefa atualizada.' : 'Tarefa adicionada.',
    resetEditor
  );
});

function startEditing(task) {
  editingId = task.id;
  $('task-title').value = task.title;
  $('task-description').value = task.description;
  $('task-priority').value = task.priority;
  $('editor-heading').textContent = 'Editar tarefa';
  $('save-task').textContent = 'Salvar alterações';
  $('cancel-edit').hidden = false;
  $('task-title').focus();
  $('editor-heading').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// Conteúdo do usuário usa textContent, nunca HTML interpretado.
function render() {
  const completed = tasks.filter((task) => task.done).length;
  $('total').textContent = tasks.length;
  $('pending').textContent = tasks.length - completed;
  $('completed').textContent = completed;
  const search = $('search').value.trim().toLocaleLowerCase('pt-BR');
  const visible = tasks.filter((task) =>
    (filter === 'all' || (filter === 'done' ? task.done : !task.done)) &&
    `${task.title} ${task.description}`.toLocaleLowerCase('pt-BR').includes(search)
  );
  $('visible-count').textContent = `${visible.length} ${visible.length === 1 ? 'tarefa' : 'tarefas'}`;
  ui.empty.hidden = visible.length > 0;
  ui.empty.textContent = !ready ? 'Conectando ao banco de dados…' : tasks.length ? 'Nenhuma tarefa corresponde a este filtro.' : 'Seu planejamento começa aqui. Adicione sua primeira tarefa ao lado.';
  const fragment = document.createDocumentFragment();
  for (const task of visible) {
    const item = makeElement('li', `task${task.done ? ' done' : ''}`);
    const checkbox = makeElement('input', 'task-check');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.disabled = taskBusy || !ready;
    checkbox.setAttribute('aria-label', `${task.done ? 'Reabrir' : 'Concluir'} tarefa: ${task.title}`);
    checkbox.addEventListener('change', () => {
      const target = taskReference(task.id);
      const done = checkbox.checked;
      void mutate(() => dbAPI.updateDoc(target, { done, updatedAt: dbAPI.serverTimestamp() }), done ? 'Tarefa concluída!' : 'Tarefa reaberta.');
    });
    const body = makeElement('div', 'task-body');
    body.append(makeElement('h3', 'task-title', task.title));
    if (task.description) body.append(makeElement('p', 'task-description', task.description));
    body.append(makeElement('span', `badge ${task.priority}`, `Prioridade ${task.priority}`));
    const actions = makeElement('div', 'task-actions');
    const edit = makeElement('button', '', 'Editar');
    edit.type = 'button';
    edit.disabled = taskBusy || !ready;
    edit.setAttribute('aria-label', `Editar tarefa: ${task.title}`);
    edit.addEventListener('click', () => startEditing(task));
    const remove = makeElement('button', 'delete', 'Excluir');
    remove.type = 'button';
    remove.disabled = taskBusy || !ready;
    remove.setAttribute('aria-label', `Excluir tarefa: ${task.title}`);
    remove.addEventListener('click', () => {
      if (!window.confirm(`Excluir a tarefa “${task.title}”? Esta ação não pode ser desfeita.`)) return;
      const target = taskReference(task.id);
      void mutate(() => dbAPI.deleteDoc(target), 'Tarefa excluída.', () => { if (editingId === task.id) resetEditor(); });
    });
    actions.append(edit, remove);
    body.append(actions);
    item.append(checkbox, body);
    fragment.append(item);
  }
  ui.list.replaceChildren(fragment);
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
});
$('search').addEventListener('input', render);

function onSessionChanged(currentUser) {
  session += 1;
  const currentSession = session;
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  user = currentUser;
  tasks = [];
  ready = false;
  taskBusy = false;
  resetEditor();
  $('search').value = '';
  filter = 'all';
  document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.filter === 'all')));
  ui.auth.hidden = !!user;
  ui.dashboard.hidden = !user;
  $('logout').hidden = !user;
  $('account').textContent = user ? `Conectado como ${user.email}` : '';
  syncControls();
  render();
  message();
  if (!user) return;
  $('sync-status').textContent = 'Conectando…';
  const query = dbAPI.query(dbAPI.collection(db, 'users', user.uid, 'tasks'), dbAPI.orderBy('createdAt', 'desc'));
  unsubscribe = dbAPI.onSnapshot(query, { includeMetadataChanges: true }, (snapshot) => {
    if (currentSession !== session) return;
    ready = true;
    tasks = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    if (editingId && !tasks.some((task) => task.id === editingId)) resetEditor();
    $('sync-status').textContent = snapshot.metadata.hasPendingWrites ? 'Aguardando gravação…' : snapshot.metadata.fromCache ? 'Aguardando conexão…' : 'Sincronizado com Firebase';
    syncControls();
    render();
  }, (error) => {
    if (currentSession !== session) return;
    ready = false;
    tasks = [];
    syncControls();
    render();
    ui.empty.textContent = 'Não foi possível carregar as tarefas. Corrija a configuração e atualize a página.';
    $('sync-status').textContent = 'Falha na conexão';
    message(errorMessage(error), true);
  });
}

async function initialize() {
  try {
    const { firebaseConfig } = await import('./firebase-config.js');
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    if (required.some((key) => typeof firebaseConfig[key] !== 'string' || !firebaseConfig[key].trim() || /COLE_|SEU_PROJETO/.test(firebaseConfig[key]))) {
      $('setup').hidden = false;
      message('Configuração pendente: siga o README para conectar seu projeto Firebase.');
      return;
    }
    const [appAPI, authentication, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
    ]);
    authAPI = authentication;
    dbAPI = firestore;
    const app = appAPI.initializeApp(firebaseConfig);
    auth = authAPI.getAuth(app);
    db = dbAPI.getFirestore(app);
    // Sessão por aba: ao fechar a aba, será necessário entrar novamente.
    await authAPI.setPersistence(auth, authAPI.browserSessionPersistence);
    authAPI.onAuthStateChanged(auth, onSessionChanged, (error) => message(errorMessage(error), true));
    ui.authFields.disabled = false;
  } catch (error) {
    console.error('Falha ao iniciar a aplicação:', error.code || error.name);
    message('Não foi possível iniciar. Confira a internet, os valores e a sintaxe de firebase-config.js. Abra a aplicação por http://localhost, conforme o README.', true);
  }
}
void initialize();
