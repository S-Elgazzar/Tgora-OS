/* ==========================================================
   Tgora Internal Operations — app.js
   Vanilla JS + Supabase
   ========================================================== */

// ---------- Supabase Configuration ----------
const SUPABASE_URL = 'https://iqocsnzrwzshaqztryfv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PeCwkxLcIc1r5z9IkbMhqw_Glxu0KvW';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- App State ----------
const state = {
  projects: [],
  tasks: [],
  view: 'dashboard',
  filters: {
    projects: 'all',
    tasks: 'all',
  },
  search: '',
  pendingDelete: null, // { type: 'project' | 'task', id }
};

// ---------- DOM Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Utilities ----------
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    });
  } catch {
    return '—';
  }
};

const deadlineClass = (d) => {
  if (!d) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = (target - today) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'deadline-overdue';
  if (diff <= 3) return 'deadline-soon';
  return '';
};

const labelize = (s) => {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const avatarColor = (str) => {
  const palette = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
    'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
    'bg-teal-500', 'bg-blue-500',
  ];
  if (!str) return palette[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};

const initials = (str) => {
  if (!str) return '?';
  return str
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

const refreshIcons = () => {
  if (window.lucide) window.lucide.createIcons();
};

// ---------- Toasts ----------
const toast = (msg, type = 'info') => {
  const container = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const iconMap = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
  el.innerHTML = `
    <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
    <span>${escapeHtml(msg)}</span>
  `;
  container.appendChild(el);
  refreshIcons();
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  }, 3200);
};

// ---------- Supabase Data Layer ----------
async function fetchProjects() {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('id', { ascending: false });
  if (error) {
    console.error('fetchProjects', error);
    toast('Could not load projects', 'error');
    return [];
  }
  return data || [];
}

async function fetchTasks() {
  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .order('id', { ascending: false });
  if (error) {
    console.error('fetchTasks', error);
    toast('Could not load tasks', 'error');
    return [];
  }
  return data || [];
}

async function insertProject(payload) {
  const { data, error } = await supabaseClient.from('projects').insert([payload]).select().single();
  if (error) {
    console.error('insertProject', error);
    toast(error.message || 'Failed to create project', 'error');
    return null;
  }
  return data;
}

async function insertTask(payload) {
  const { data, error } = await supabaseClient.from('tasks').insert([payload]).select().single();
  if (error) {
    console.error('insertTask', error);
    toast(error.message || 'Failed to create task', 'error');
    return null;
  }
  return data;
}

async function deleteProject(id) {
  // Best-effort cascade: tasks tied to this project
  await supabaseClient.from('tasks').delete().eq('project_id', id);
  const { error } = await supabaseClient.from('projects').delete().eq('id', id);
  if (error) {
    console.error('deleteProject', error);
    toast('Failed to delete project', 'error');
    return false;
  }
  return true;
}

async function deleteTask(id) {
  const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
  if (error) {
    console.error('deleteTask', error);
    toast('Failed to delete task', 'error');
    return false;
  }
  return true;
}

// ---------- Rendering ----------
function renderStats() {
  const totalProjects = state.projects.length;
  const activeProjects = state.projects.filter((p) =>
    ['active', 'planning'].includes((p.status || '').toLowerCase())
  ).length;
  const completedTasks = state.tasks.filter((t) => (t.status || '').toLowerCase() === 'completed').length;
  const inProgress = state.tasks.filter((t) =>
    ['in_progress', 'review'].includes((t.status || '').toLowerCase())
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = state.tasks.filter((t) => {
    if (!t.deadline) return false;
    if ((t.status || '').toLowerCase() === 'completed') return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }).length;

  $('#stat-total-projects').textContent = totalProjects;
  $('#stat-active-projects').textContent = activeProjects;
  $('#stat-completed-tasks').textContent = completedTasks;
  $('#stat-in-progress').textContent = inProgress;
  $('#stat-overdue').textContent = overdue;

  $('#nav-projects-count').textContent = totalProjects;
  $('#nav-tasks-count').textContent = state.tasks.length;
}

function renderRecentProjects() {
  const container = $('#recent-projects-list');
  const recent = [...state.projects].slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="px-5 py-12 text-center text-sm text-gray-500">
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
          <i data-lucide="folder" class="w-5 h-5 text-gray-400"></i>
        </div>
        No projects yet. Create one to get started.
      </div>`;
    refreshIcons();
    return;
  }
  container.innerHTML = recent
    .map((p) => {
      const status = (p.status || 'planning').toLowerCase();
      const priority = (p.priority || 'medium').toLowerCase();
      return `
      <div class="recent-row">
        <div class="client-avatar ${avatarColor(p.client)}">${initials(p.client || p.project_name)}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(p.project_name || 'Untitled')}</p>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(p.client || 'No client')}</p>
        </div>
        <span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span>
        <span class="badge priority-${priority} hidden sm:inline-flex"><span class="dot"></span>${labelize(priority)}</span>
        <span class="text-xs text-gray-500 hidden md:inline-block ${deadlineClass(p.deadline)}">${fmtDate(p.deadline)}</span>
      </div>`;
    })
    .join('');
  refreshIcons();
}

function renderRecentTasks() {
  const container = $('#recent-tasks-list');
  const upcoming = [...state.tasks]
    .filter((t) => (t.status || '').toLowerCase() !== 'completed')
    .sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline) : new Date(8640000000000000);
      const db = b.deadline ? new Date(b.deadline) : new Date(8640000000000000);
      return da - db;
    })
    .slice(0, 5);

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="px-5 py-12 text-center text-sm text-gray-500">
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
          <i data-lucide="check-check" class="w-5 h-5 text-gray-400"></i>
        </div>
        All clear. No upcoming tasks.
      </div>`;
    refreshIcons();
    return;
  }
  container.innerHTML = upcoming
    .map((t) => {
      const priority = (t.priority || 'medium').toLowerCase();
      return `
      <div class="recent-row">
        <div class="client-avatar ${avatarColor(t.assigned_to)}">${initials(t.assigned_to)}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(t.task_info || 'Untitled task')}</p>
          <p class="text-xs text-gray-500 truncate">
            ${escapeHtml(t.assigned_to || 'Unassigned')} ·
            <span class="${deadlineClass(t.deadline)}">${fmtDate(t.deadline)}</span>
          </p>
        </div>
        <span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span>
      </div>`;
    })
    .join('');
  refreshIcons();
}

function getFilteredProjects() {
  const q = state.search.toLowerCase();
  return state.projects.filter((p) => {
    // filter
    const f = state.filters.projects;
    const s = (p.status || '').toLowerCase();
    if (f === 'active' && !['active', 'planning'].includes(s)) return false;
    if (f === 'completed' && s !== 'completed') return false;
    // search
    if (q) {
      const hay = `${p.project_name || ''} ${p.client || ''} ${p.status || ''} ${p.priority || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function getFilteredTasks() {
  const q = state.search.toLowerCase();
  return state.tasks.filter((t) => {
    const f = state.filters.tasks;
    const s = (t.status || '').toLowerCase();
    if (f !== 'all' && s !== f) return false;
    if (q) {
      const projectName = state.projects.find((p) => p.id === t.project_id)?.project_name || '';
      const hay = `${t.task_info || ''} ${t.assigned_to || ''} ${projectName} ${t.status || ''} ${t.priority || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderProjects() {
  const tbody = $('#projects-table-body');
  const empty = $('#projects-empty');
  const data = getFilteredProjects();

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = data
    .map((p) => {
      const status = (p.status || 'planning').toLowerCase();
      const priority = (p.priority || 'medium').toLowerCase();
      const link = p.project_link
        ? `<a href="${escapeHtml(p.project_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
        : '';
      return `
        <tr>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <div class="client-avatar ${avatarColor(p.client || p.project_name)}">${initials(p.client || p.project_name)}</div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(p.project_name || 'Untitled')}</p>
                <p class="text-[11px] text-gray-500">${fmtDate(p.start_date)} → ${fmtDate(p.deadline)}</p>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(p.client || '—')}</td>
          <td class="px-5 py-3.5"><span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span></td>
          <td class="px-5 py-3.5"><span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span></td>
          <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(p.deadline)}">${fmtDate(p.deadline)}</td>
          <td class="px-5 py-3.5 text-right">
            <div class="inline-flex items-center gap-1">
              ${link}
              <button class="icon-btn danger" data-action="delete-project" data-id="${p.id}" title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
  refreshIcons();
}

function renderTasks() {
  const tbody = $('#tasks-table-body');
  const empty = $('#tasks-empty');
  const data = getFilteredTasks();

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = data
    .map((t) => {
      const status = (t.status || 'todo').toLowerCase();
      const priority = (t.priority || 'medium').toLowerCase();
      const project = state.projects.find((p) => p.id === t.project_id);
      const link = t.task_link
        ? `<a href="${escapeHtml(t.task_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
        : '';
      return `
        <tr>
          <td class="px-5 py-3.5 max-w-sm">
            <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(t.task_info || 'Untitled task')}</p>
            <p class="text-[11px] text-gray-500">Start ${fmtDate(t.start_date)}</p>
          </td>
          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${
              project
                ? `<span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>${escapeHtml(project.project_name)}</span>`
                : '<span class="text-gray-400">—</span>'
            }
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-2">
              <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">${initials(t.assigned_to)}</div>
              <span class="text-sm text-gray-700">${escapeHtml(t.assigned_to || '—')}</span>
            </div>
          </td>
          <td class="px-5 py-3.5"><span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span></td>
          <td class="px-5 py-3.5"><span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span></td>
          <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(t.deadline)}">${fmtDate(t.deadline)}</td>
          <td class="px-5 py-3.5 text-right">
            <div class="inline-flex items-center gap-1">
              ${link}
              <button class="icon-btn danger" data-action="delete-task" data-id="${t.id}" title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
  refreshIcons();
}

function renderAll() {
  renderStats();
  renderRecentProjects();
  renderRecentTasks();
  renderProjects();
  renderTasks();
  syncTaskProjectSelect();
}

function syncTaskProjectSelect() {
  const select = $('#task-project-select');
  const current = select.value;
  select.innerHTML =
    '<option value="">— No project —</option>' +
    state.projects
      .map((p) => `<option value="${p.id}">${escapeHtml(p.project_name)}</option>`)
      .join('');
  if (current) select.value = current;
}

// ---------- View Switching ----------
function setView(view) {
  state.view = view;
  $$('.view').forEach((el) => el.classList.add('hidden'));
  const target = $(`#view-${view}`);
  if (target) target.classList.remove('hidden');

  $$('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // close mobile sidebar
  closeSidebar();
}

// ---------- Modal Helpers ----------
function openModal(id) {
  $(`#${id}`).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  refreshIcons();
  // Autofocus first input
  setTimeout(() => {
    const firstInput = $(`#${id} input, #${id} textarea, #${id} select`);
    if (firstInput) firstInput.focus();
  }, 50);
}
function closeModal() {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  document.body.style.overflow = '';
}

function openConfirm(type, id, label) {
  state.pendingDelete = { type, id };
  $('#confirm-msg').textContent = `${label} will be permanently removed.${
    type === 'project' ? ' Tasks under this project will also be deleted.' : ''
  }`;
  openModal('confirm-modal');
}
function closeConfirm() {
  state.pendingDelete = null;
  $('#confirm-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ---------- Sidebar Mobile ----------
function openSidebar() {
  $('#sidebar').classList.remove('-translate-x-full');
  $('#sidebar-overlay').classList.remove('hidden');
}
function closeSidebar() {
  $('#sidebar').classList.add('-translate-x-full');
  $('#sidebar-overlay').classList.add('hidden');
}

// ---------- Form Handlers ----------
function normalizePayload(formData) {
  const payload = {};
  for (const [k, v] of formData.entries()) {
    if (v === '' || v === null) {
      payload[k] = null;
    } else {
      payload[k] = v;
    }
  }
  return payload;
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving…`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));
  const created = await insertProject(payload);

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create project`;
  refreshIcons();

  if (created) {
    state.projects = [created, ...state.projects];
    renderAll();
    toast('Project created successfully', 'success');
    form.reset();
    closeModal();
  }
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving…`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));
  if (payload.project_id) payload.project_id = Number(payload.project_id);

  const created = await insertTask(payload);

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create task`;
  refreshIcons();

  if (created) {
    state.tasks = [created, ...state.tasks];
    renderAll();
    toast('Task created successfully', 'success');
    form.reset();
    closeModal();
  }
}

// ---------- Delete Handlers ----------
async function confirmDelete() {
  if (!state.pendingDelete) return;
  const { type, id } = state.pendingDelete;
  const btn = $('#confirm-delete-btn');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Deleting…`;
  refreshIcons();

  let ok = false;
  if (type === 'project') {
    ok = await deleteProject(id);
    if (ok) {
      state.projects = state.projects.filter((p) => p.id !== id);
      state.tasks = state.tasks.filter((t) => t.project_id !== id);
    }
  } else if (type === 'task') {
    ok = await deleteTask(id);
    if (ok) state.tasks = state.tasks.filter((t) => t.id !== id);
  }

  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i> Delete`;
  refreshIcons();

  if (ok) {
    toast(`${labelize(type)} deleted`, 'success');
    renderAll();
  }
  closeConfirm();
}

// ---------- Event Wiring ----------
function wireEvents() {
  // Nav
  $$('.nav-item[data-view]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setView(a.dataset.view);
    });
  });

  // Dashboard "View all" links
  $$('[data-action="goto-view"]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      setView(b.dataset.view);
    });
  });

  // Sidebar mobile
  $('#sidebar-toggle').addEventListener('click', openSidebar);
  $('#sidebar-overlay').addEventListener('click', closeSidebar);

  // Topbar new -> open project modal by default
  $('#topbar-new').addEventListener('click', () => {
    if (state.view === 'tasks') openModal('task-modal');
    else openModal('project-modal');
  });

  // Open / close modals via delegated events
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;

    if (action === 'open-project-modal') openModal('project-modal');
    if (action === 'open-task-modal') openModal('task-modal');
    if (action === 'close-modal') closeModal();
    if (action === 'close-confirm') closeConfirm();

    if (action === 'delete-project') {
      const id = Number(trigger.dataset.id);
      const project = state.projects.find((p) => p.id === id);
      openConfirm('project', id, project ? `Project “${project.project_name}”` : 'This project');
    }
    if (action === 'delete-task') {
      const id = Number(trigger.dataset.id);
      const task = state.tasks.find((t) => t.id === id);
      openConfirm('task', id, task ? `Task “${task.task_info}”` : 'This task');
    }
  });

  // Forms
  $('#project-form').addEventListener('submit', handleProjectSubmit);
  $('#task-form').addEventListener('submit', handleTaskSubmit);
  $('#confirm-delete-btn').addEventListener('click', confirmDelete);

  // Filters
  $$('[data-projects-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      state.filters.projects = b.dataset.projectsFilter;
      $$('[data-projects-filter]').forEach((x) => x.classList.toggle('active', x === b));
      renderProjects();
    });
  });
  $$('[data-tasks-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      state.filters.tasks = b.dataset.tasksFilter;
      $$('[data-tasks-filter]').forEach((x) => x.classList.toggle('active', x === b));
      renderTasks();
    });
  });

  // Search
  $('#global-search').addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    renderProjects();
    renderTasks();
    renderRecentProjects();
    renderRecentTasks();
  });

  // Esc to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeConfirm();
      closeSidebar();
    }
  });
}

// ---------- Init ----------
async function init() {
  $('#year').textContent = new Date().getFullYear();
  refreshIcons();
  wireEvents();

  // Show skeleton placeholders for stat numbers initially
  ['stat-total-projects', 'stat-completed-tasks', 'stat-in-progress', 'stat-overdue'].forEach((id) => {
    const el = $(`#${id}`);
    if (el) el.innerHTML = '<span class="skeleton inline-block h-6 w-10"></span>';
  });

  try {
    const [projects, tasks] = await Promise.all([fetchProjects(), fetchTasks()]);
    state.projects = projects;
    state.tasks = tasks;
  } catch (err) {
    console.error(err);
    toast('Could not connect to supabaseClient. Check your credentials.', 'error');
  }

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
