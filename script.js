/* ================= CONFIG & STATE ================= */
const API = 'http://localhost:3000/api';

const state = {
  token: localStorage.getItem('token'),
  user: localStorage.getItem('currentUser'),
  tasks: []
};

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);

function saveAuth(email, token) {
  Object.assign(state, { user: email, token });
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', email);
}

function clearAuth() {
  Object.assign(state, { user: null, token: null });
  localStorage.clear();
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token && { Authorization: `Bearer ${state.token}` })
  };

  const res = await fetch(API + path, { ...options, headers });

  if (res.status === 401) {
    alert('Phiên đăng nhập đã hết hạn');
    clearAuth();
    location.reload();
    throw new Error('Unauthorized');
  }

  return res.json();
}

/* ================= AUTH ================= */
$('btn-login').onclick = async () => {
  const email = $('auth-email').value;
  const password = $('auth-pass').value;
  if (!email || !password) return alert('Nhập email và mật khẩu');

  const data = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data.error) return alert(data.error);
  saveAuth(data.email, data.token);
  showApp();
};

$('btn-register').onclick = async () => {
  const email = $('reg-email').value;
  const password = $('reg-pass').value;
  if (!email || !password) return alert('Nhập email và mật khẩu');

  const data = await apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data.error) return alert(data.error);
  alert('Đăng ký thành công');
  $('switch-login').click();
};

/* ================= UI ================= */
$('switch-login').onclick = () => toggleAuth(true);
$('switch-register').onclick = () => toggleAuth(false);

function toggleAuth(showLogin) {
  $('auth-container').classList.toggle('hidden', !showLogin);
  $('register-container').classList.toggle('hidden', showLogin);
}

function showApp() {
  $('auth-container').classList.add('hidden');
  $('register-container').classList.add('hidden');
  $('app').classList.remove('hidden');
  fetchTasks();
}

if (state.token && state.user) showApp();

/* ================= TASK API ================= */
async function fetchTasks() {
  const data = await apiFetch('/tasks');
  state.tasks = data.tasks || [];
  render();
}

$('add-btn').onclick = async () => {
  const title = $('task-input').value.trim();
  const deadline = $('deadline-input').value;
  if (!title) return alert('Nhập công việc');

  await apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, deadline })
  });

  $('task-input').value = '';
  $('deadline-input').value = '';
  fetchTasks();
};

/* ================= NLP ================= */
$('nlp-btn').onclick = async () => {
  const text = $('nlp-input').value.trim();
  if (!text) return;

  const data = await apiFetch('/nlp', {
    method: 'POST',
    body: JSON.stringify({ text })
  });

  await apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  $('nlp-input').value = '';
  fetchTasks();
};

/* ================= RENDER ================= */
$('filter').onchange = $('filter-date').onchange = render;

function formatDeadline(d) {
  if (!d) return 'Không có';
  const [date, time] = d.split('T');
  if (!time || time === '00:00') return date;
  let [h, m] = time.split(':');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${date} ${h}:${m} ${ampm}`;
}

function render() {
  const status = $('filter').value;
  const date = $('filter-date').value;

  $('task-list').innerHTML = state.tasks
    .filter(t =>
      status === 'completed' ? t.completed :
      status === 'pending' ? !t.completed : true
    )
    .filter(t => !date || (t.deadline || '').startsWith(date))
    .map(t => `
      <div class="task-card">
        <div class="task-left">
          <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="toggle(${t.id})">
          <div>
            <div class="${t.completed ? 'completed' : ''}">${t.title}</div>
            <small>⌛ ${formatDeadline(t.deadline)}</small>
          </div>
        </div>
        <div class="icons">
          <i class="fa-solid fa-pen-to-square" onclick="editTask(${t.id})"></i>
          <i class="fa-solid fa-trash-can" onclick="del(${t.id})"></i>
        </div>
      </div>
    `).join('');
}

/* ================= TASK OPS ================= */
async function toggle(id) {
  const t = state.tasks.find(x => x.id === id);
  await apiFetch(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...t, completed: !t.completed })
  });
  fetchTasks();
}

async function del(id) {
  await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
  fetchTasks();
}

/* ================= LOGOUT ================= */
$('logout-btn').onclick = () => {
  clearAuth();
  location.reload();
};

/* expose for inline html */
Object.assign(window, { toggle, del, editTask });
