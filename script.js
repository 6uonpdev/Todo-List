/* ================= CONFIG & STATE ================= */
const API = `${location.origin}/api`;

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

function formatDeadline(iso) {
  if (!iso) return "Không có";

  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour12: false
  });
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
      <div class="task-card" data-id="${t.id}">
        <div class="task-left">
          <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="toggle(${t.id})">
          <div>
            <div class="task-title ${t.completed ? 'completed' : ''}">
              ${t.title}
            </div>
            <small class="task-deadline">⌛ ${formatDeadline(t.deadline)}</small>
          </div>
        </div>
        <div class="icons">
          <i class="fa-solid fa-pen-to-square" onclick="editTask(this)"></i>
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

/* ================= INLINE EDIT ================= */
function editTask(icon) {
  const card = icon.closest('.task-card');
  const id = Number(card.dataset.id);

  const titleDiv = card.querySelector('.task-title');
  const deadlineDiv = card.querySelector('.task-deadline');

  const oldTitle = titleDiv.innerText;
  const oldDeadlineText = deadlineDiv.innerText.replace('⌛', '').trim();

  const task = state.tasks.find(t => t.id === id);

  /* ===== title input ===== */
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = oldTitle;
  titleInput.className = 'edit-input';

  titleDiv.replaceWith(titleInput);

  /* ===== deadline input ===== */
  const deadlineInput = document.createElement('input');
  deadlineInput.type = 'datetime-local';
  deadlineInput.className = 'edit-input';

  if (task.deadline) {
  const d = new Date(task.deadline);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  deadlineInput.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}


  deadlineDiv.replaceWith(deadlineInput);

  titleInput.focus();

  /* ===== icon save ===== */
  icon.classList.remove('fa-pen-to-square');
  icon.classList.add('fa-floppy-disk');

  icon.onclick = () =>
    saveEdit(icon, id, titleInput, deadlineInput, oldTitle, oldDeadlineText);

  /* ===== keyboard ===== */
  titleInput.onkeydown = deadlineInput.onkeydown = e => {
    if (e.key === 'Enter')
      saveEdit(icon, id, titleInput, deadlineInput, oldTitle, oldDeadlineText);
    if (e.key === 'Escape')
      cancelEdit(icon, titleInput, deadlineInput, oldTitle, oldDeadlineText);
  };
}

async function saveEdit(icon, id, titleInput, deadlineInput, oldTitle, oldDeadlineText) {
  const newTitle = titleInput.value.trim();
  if (!newTitle) return alert('Tiêu đề không được rỗng');

  const newDeadline = deadlineInput.value || null;

  const task = state.tasks.find(t => t.id === id);

  await apiFetch(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...task,
      title: newTitle,
      deadline: newDeadline
    })
  });

  fetchTasks();
}


function cancelEdit(icon, titleInput, deadlineInput, oldTitle, oldDeadline) {
  const titleDiv = document.createElement('div');
  titleDiv.className = 'task-title';
  titleDiv.innerText = oldTitle;

  const deadlineDiv = document.createElement('small');
  deadlineDiv.className = 'task-deadline';
  deadlineDiv.innerText = `⌛ ${oldDeadline}`;

  titleInput.replaceWith(titleDiv);
  deadlineInput.replaceWith(deadlineDiv);

  icon.classList.remove('fa-floppy-disk');
  icon.classList.add('fa-pen-to-square');
  icon.onclick = () => editTask(icon);
}


/* ================= LOGOUT ================= */
$('logout-btn').onclick = () => {
  clearAuth();
  location.reload();
};

/* expose for inline html */
Object.assign(window, { toggle, del, editTask });
