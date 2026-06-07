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
  teamMembers: [],
  view: localStorage.getItem('tgora_current_view') || 'dashboard',
  currentUser: null,
  currentRole: null,
  editingMemberId: null,
  editingTaskId: null,
  editingProjectId: null,
  filters: {
    projects: 'all',
    tasks: 'all',
    selectedProjectId: null,
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

  const labels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'In Review',
    completed: 'Completed',
    on_hold: 'On Hold',
    active: 'Active',
    inactive: 'Inactive',
    part_time: 'Part-time',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    qa_review: 'QA Review',
    content_creation: 'Content Creation',
  };

  const key = String(s).toLowerCase();

  return labels[key] || String(s)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

async function fetchTeamMembers() {
  const { data, error } = await supabaseClient
    .from('team_members')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchTeamMembers', error);
    toast('Could not load team members', 'error');
    return [];
  }

  return data || [];
}

async function insertTeamMember(payload) {
  const { data, error } = await supabaseClient
    .from('team_members')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('insertTeamMember', error);
    toast(error.message || 'Failed to create team member', 'error');
    return null;
  }

  return data;
}

async function updateTeamMember(id, payload) {
  const { data, error } = await supabaseClient
    .from('team_members')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateTeamMember', error);
    toast(error.message || 'Failed to update team member', 'error');
    return null;
  }

  return data;
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

async function updateProject(id, payload) {
  const { data, error } = await supabaseClient
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateProject', error);
    toast(error.message || 'Failed to update project', 'error');
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

async function updateTask(id, payload) {
  const { data, error } = await supabaseClient
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateTask', error);
    toast(error.message || 'Failed to update task', 'error');
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

async function deleteTeamMember(id) {
  const { error } = await supabaseClient
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteTeamMember', error);
    toast('Failed to delete team member', 'error');
    return false;
  }

  return true;
}

// ---------- Rendering ----------
function populateTeamMembers() {
  const select = $('#assigned-to-select');

  if (!select) return;

  const activeMembers = state.teamMembers.filter(
    (m) => (m.status || '').toLowerCase() !== 'inactive'
  );

  select.innerHTML = `
    <option value="">Select Team Member</option>
    ${activeMembers
      .map(
        (member) => `
        <option value="${escapeHtml(member.name)}">
          ${escapeHtml(member.name)} — ${escapeHtml(member.job_title || '')}
        </option>
      `
      )
      .join('')}
  `;
}

function renderStats() {
  const totalProjects = state.projects.length;

  const activeProjects = state.projects.filter(
    (p) => (p.status || '').toLowerCase() === 'active'
  ).length;

  const onHoldProjects = state.projects.filter(
    (p) => (p.status || '').toLowerCase() === 'on_hold'
  ).length;

  const urgentProjects = state.projects.filter(
    (p) => (p.priority || '').toLowerCase() === 'urgent'
  ).length;

  const totalTasks = state.tasks.length;

  const completedTasks = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  ).length;

  const inProgress = state.tasks.filter(
    (t) => ['in_progress', 'review'].includes((t.status || '').toLowerCase())
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
  $('#stat-onhold-projects').textContent = onHoldProjects;
  $('#stat-urgent-projects').textContent = urgentProjects;

  $('#stat-total-tasks').textContent = totalTasks;
  $('#stat-completed-tasks').textContent = completedTasks;
  $('#stat-in-progress').textContent = inProgress;
  $('#stat-overdue').textContent = overdue;

  $('#nav-projects-count').textContent = totalProjects;
  $('#nav-tasks-count').textContent = totalTasks;
  
  const teamCount = state.teamMembers.length;
const teamCountEl = $('#nav-team-count');

if (teamCountEl) {
  teamCountEl.textContent = teamCount;
}
}

let projectsChartInstance = null;
let tasksChartInstance = null;
let teamChartInstance = null;

function renderCharts() {

  // -------- Projects Chart --------

  const activeProjects = state.projects.filter(
    (p) => (p.status || '').toLowerCase() === 'active'
  ).length;

  const onHoldProjects = state.projects.filter(
    (p) => (p.status || '').toLowerCase() === 'on_hold'
  ).length;

  const completedProjects = state.projects.filter(
    (p) => (p.status || '').toLowerCase() === 'completed'
  ).length;

  const projectsCtx = document
    .getElementById('projectsChart')
    ?.getContext('2d');

  if (projectsChartInstance) {
    projectsChartInstance.destroy();
  }

  if (projectsCtx) {
    projectsChartInstance = new Chart(projectsCtx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'On Hold', 'Completed'],
        datasets: [
          {
            data: [
              activeProjects,
              onHoldProjects,
              completedProjects
            ],
            backgroundColor: [
              '#10B981',
              '#F59E0B',
              '#6366F1'
            ],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // -------- Tasks Chart --------

  const todoTasks = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'todo'
  ).length;

  const inProgressTasks = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'in_progress'
  ).length;

  const reviewTasks = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'review'
  ).length;

  const completedTasks = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  ).length;

  const tasksCtx = document
    .getElementById('tasksChart')
    ?.getContext('2d');

  if (tasksChartInstance) {
    tasksChartInstance.destroy();
  }

  if (tasksCtx) {
    tasksChartInstance = new Chart(tasksCtx, {
      type: 'bar',
      data: {
        labels: [
          'To Do',
          'In Progress',
          'Review',
          'Completed'
        ],
        datasets: [
          {
            data: [
              todoTasks,
              inProgressTasks,
              reviewTasks,
              completedTasks
            ],
            backgroundColor: [
              '#CBD5E1',
              '#F59E0B',
              '#8B5CF6',
              '#10B981'
            ],
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }
// -------- Team Workload Chart --------

const workloadMap = {};

state.tasks
  .filter((task) => (task.status || '').toLowerCase() !== 'completed')
  .forEach((task) => {
    const member = task.assigned_to || 'Unassigned';

    if (!workloadMap[member]) {
      workloadMap[member] = 0;
    }

    workloadMap[member]++;
  });

const memberLabels = Object.keys(workloadMap);
const workloadData = Object.values(workloadMap);

const teamCtx = document
  .getElementById('teamChart')
  ?.getContext('2d');

if (teamChartInstance) {
  teamChartInstance.destroy();
}

if (teamCtx) {
  teamChartInstance = new Chart(teamCtx, {
    type: 'polarArea',

    data: {
      labels: memberLabels,

      datasets: [
        {
          data: workloadData,

          backgroundColor: [
            '#6366F1',
            '#10B981',
            '#F59E0B',
            '#EC4899',
            '#8B5CF6',
            '#06B6D4',
            '#EF4444'
          ]
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}
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
          <button class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 text-left" data-action="open-project-details" data-id="${p.id}">
  ${escapeHtml(p.project_name || 'Untitled')}
</button>
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
  let data = [...state.projects];

  if (state.filters.projects !== 'all') {
    data = data.filter(
      (p) => (p.status || '').toLowerCase() === state.filters.projects
    );
  }

  if (state.search) {
    const q = state.search.toLowerCase();

    data = data.filter((p) =>
      [
        p.project_name,
        p.client,
        p.status,
        p.priority
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  return data;
}

function getFilteredTasks() {
  let data = [...state.tasks];

  if (isMember()) {
    const currentMember = getCurrentMember();

    if (!currentMember) {
      return [];
    }

    data = data.filter(
      (t) =>
        (t.assigned_to || '').toLowerCase().trim() ===
        (currentMember.name || '').toLowerCase().trim()
    );
  }

  if (state.filters.tasks !== 'all') {
    data = data.filter(
      (t) => (t.status || '').toLowerCase() === state.filters.tasks
    );
  }

  if (state.search) {
    const q = state.search.toLowerCase();

    data = data.filter((t) =>
      [
        t.task_info,
        t.assigned_to,
        t.status,
        t.priority
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  return data;
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
              <div class="client-avatar ${avatarColor(p.client || p.project_name)}">
                ${initials(p.client || p.project_name)}
              </div>

              <div class="min-w-0">
                ${
                  p.project_code
                    ? `<p class="text-[11px] font-medium text-gray-500 mb-0.5">${escapeHtml(p.project_code)}</p>`
                    : ''
                }

                <button
                  class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 text-left"
                  data-action="open-project-details"
                  data-id="${p.id}"
                >
                  ${escapeHtml(p.project_name || 'Untitled')}
                </button>

                <p class="text-[11px] text-gray-500">
                  ${fmtDate(p.start_date)} → ${fmtDate(p.deadline)}
                </p>
              </div>
            </div>
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${escapeHtml(p.client || '—')}
          </td>

          <td class="px-5 py-3.5">
            <span class="badge badge-${status}">
              <span class="dot"></span>
              ${labelize(status)}
            </span>
          </td>

          <td class="px-5 py-3.5">
            <span class="badge priority-${priority}">
              <span class="dot"></span>
              ${labelize(priority)}
            </span>
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(p.deadline)}">
            ${fmtDate(p.deadline)}
          </td>

          <td class="px-5 py-3.5 text-right">
            <div class="inline-flex items-center gap-1">
              ${link}

              ${
                isAdmin() || isManager()
                  ? `
                    <button
                      class="icon-btn"
                      data-action="edit-project"
                      data-id="${p.id}"
                      title="Edit project"
                    >
                      <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                  `
                  : ''
              }

              ${
                isAdmin()
                  ? `
                    <button
                      class="icon-btn danger"
                      data-action="delete-project"
                      data-id="${p.id}"
                      title="Delete project"
                    >
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  `
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
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

      const taskNotesIcon = t.notes
        ? `
          <span class="relative inline-flex items-center group shrink-0">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-500 cursor-help"></i>

            <span class="absolute left-0 top-6 z-50 hidden group-hover:block w-72 p-3 text-xs text-white bg-gray-900 rounded-lg shadow-xl whitespace-normal leading-relaxed">
              ${escapeHtml(t.notes)}
            </span>
          </span>
        `
        : '';

      const materialsLink = t.materials_link
        ? `<a href="${escapeHtml(t.materials_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open materials"><i data-lucide="paperclip" class="w-4 h-4"></i></a>`
        : '';

      const link = t.task_link
        ? `<a href="${escapeHtml(t.task_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open task link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
        : '';

      return `
        <tr>
          <td class="px-5 py-3.5 max-w-sm overflow-visible">
            <div class="text-sm font-medium text-gray-900 flex items-center gap-1.5 overflow-visible">
              <button
                type="button"
                class="truncate text-left hover:text-indigo-600"
                data-action="open-task-details"
                data-id="${t.id}"
              >
                ${escapeHtml(t.task_info || 'Untitled task')}
              </button>
              ${taskNotesIcon}
            </div>

            <p class="text-[11px] text-gray-500">Start ${fmtDate(t.start_date)}</p>
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${
              project
                ? `
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-left hover:text-indigo-600 transition"
                    data-action="open-project-details"
                    data-id="${project.id}"
                    title="Open project details"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span class="truncate">
                      ${escapeHtml(project.project_name)}
                    </span>
                  </button>
                `
                : '<span class="text-gray-400">—</span>'
            }
          </td>

          <td class="px-5 py-3.5">
            <div class="flex items-center gap-2">
              <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                ${initials(t.assigned_to)}
              </div>

              <span class="text-sm text-gray-700">${escapeHtml(t.assigned_to || '—')}</span>
            </div>
          </td>

          <td class="px-5 py-3.5">
            <span class="badge badge-${status}">
              <span class="dot"></span>
              ${labelize(status)}
            </span>
          </td>

          <td class="px-5 py-3.5">
            <span class="badge priority-${priority}">
              <span class="dot"></span>
              ${labelize(priority)}
            </span>
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(t.deadline)}">
            ${fmtDate(t.deadline)}
          </td>

          <td class="px-5 py-3.5 text-right">
            <div class="inline-flex items-center gap-1">
              ${materialsLink}
              ${link}

              <button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Edit task">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>

              ${
                isAdmin() || isManager()
                  ? `
                    <button class="icon-btn danger" data-action="delete-task" data-id="${t.id}" title="Delete task">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  `
                  : ''
              }
            </div>
          </td>
        </tr>`;
    })
    .join('');

  refreshIcons();
}

function openTaskDetailsModal(id) {
  const task = state.tasks.find((t) => Number(t.id) === Number(id));

  if (!task) {
    toast('Task not found', 'error');
    return;
  }

  const project = state.projects.find((p) => Number(p.id) === Number(task.project_id));
  const status = (task.status || 'todo').toLowerCase();
  const priority = (task.priority || 'medium').toLowerCase();

  const materialsLink = task.materials_link
    ? `
      <a href="${escapeHtml(task.materials_link)}" target="_blank" rel="noopener"
        class="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
        <i data-lucide="paperclip" class="w-4 h-4"></i>
        Open Materials
      </a>
    `
    : `<span class="text-sm text-gray-400">No materials link</span>`;

  const taskLink = task.task_link
    ? `
      <a href="${escapeHtml(task.task_link)}" target="_blank" rel="noopener"
        class="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
        <i data-lucide="external-link" class="w-4 h-4"></i>
        Open Task Link
      </a>
    `
    : `<span class="text-sm text-gray-400">No task link</span>`;

  $('#task-details-content').innerHTML = `
    <div class="space-y-5">
      <div class="pb-4 border-b border-gray-100">
        <p class="text-xs font-medium text-gray-500 mb-1">Task</p>
        <h4 class="text-xl font-semibold text-gray-900 leading-snug">
          ${escapeHtml(task.task_info || 'Untitled task')}
        </h4>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Project</p>
          <p class="text-sm font-medium text-gray-900">
            ${escapeHtml(project?.project_code ? `${project.project_code} - ${project.project_name}` : project?.project_name || '—')}
          </p>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Assigned To</p>
          <p class="text-sm font-medium text-gray-900">${escapeHtml(task.assigned_to || '—')}</p>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-2">Status</p>
          <span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-2">Priority</p>
          <span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Start Date</p>
          <p class="text-sm font-medium text-gray-900">${fmtDate(task.start_date)}</p>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Deadline</p>
          <p class="text-sm font-medium text-gray-900 ${deadlineClass(task.deadline)}">${fmtDate(task.deadline)}</p>
        </div>
      </div>

      <div>
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="message-square" class="w-4 h-4 text-amber-500"></i>
          <p class="text-sm font-semibold text-gray-900">Notes</p>
        </div>

        <div class="min-h-[96px] max-h-56 overflow-y-auto text-sm text-gray-800 bg-white border border-gray-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
          ${task.notes ? escapeHtml(task.notes) : '<span class="text-gray-400">No notes</span>'}
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-2">Materials Link</p>
          ${materialsLink}
        </div>

        <div>
          <p class="text-xs text-gray-500 mb-2">Task Link</p>
          ${taskLink}
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
        <button type="button" class="h-9 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg" data-action="close-modal">
          Close
        </button>

        <button type="button" class="h-9 px-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm" data-action="edit-task" data-id="${task.id}">
          <i data-lucide="pencil" class="w-4 h-4"></i>
          Edit Task
        </button>
      </div>
    </div>
  `;

  refreshIcons();
  openModal('task-details-modal');
}

function renderTeam() {
  const tbody = $('#team-table-body');

  if (!tbody) return;

  const data = [...state.teamMembers];

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-500">
          No team members yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data
    .map((member) => {
      const status = member.status || '—';

      return `
        <tr>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <div class="client-avatar ${avatarColor(member.name)}">
                ${initials(member.name)}
              </div>

              <div>
                <button
                  type="button"
                  class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left"
                  data-action="open-member-details"
                  data-id="${member.id}"
                >
                  ${escapeHtml(member.name || 'Unnamed Member')}
                </button>

                <p class="text-xs text-gray-500">
                  ${escapeHtml(member.email || 'No email')}
                </p>
              </div>
            </div>
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${escapeHtml(member.job_title || '—')}
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${escapeHtml(member.department || '—')}
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${labelize(member.role_type || 'member')}
          </td>

          <td class="px-5 py-3.5 text-sm text-gray-700">
            ${labelize(status)}
          </td>

          <td class="px-5 py-3.5 text-right">
            ${
              state.currentRole === 'admin'
                ? `
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      class="icon-btn"
                      title="View member details"
                      data-action="open-member-details"
                      data-id="${member.id}"
                    >
                      <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>

                    <button
                      type="button"
                      class="icon-btn"
                      title="Edit member"
                      data-action="edit-member"
                      data-id="${member.id}"
                    >
                      <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>

                    <button
                      type="button"
                      class="icon-btn danger"
                      title="Delete member"
                      data-action="delete-member"
                      data-id="${member.id}"
                    >
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                `
                : `<span class="text-xs text-gray-400">View only</span>`
            }
          </td>
        </tr>
      `;
    })
    .join('');

  refreshIcons();
}

function renderAll() {
  populateTeamMembers();
  renderStats();
  renderCharts();
  renderRecentProjects();
  renderRecentTasks();
  renderProjects();
  renderTasks();
  const savedView = localStorage.getItem('tgora_current_view');

if (savedView && $(`#view-${savedView}`)) {
  setView(savedView);
} else {
  setView(state.view || 'dashboard');
}
  syncTaskProjectSelect();
}

function syncTaskProjectSelect() {
  const select = $('#task-project-select');
  const current = select.value;

  select.innerHTML =
    '<option value="">— No project —</option>' +
    state.projects
      .map((p) => {
        const label = p.project_code
          ? `${p.project_code} - ${p.project_name}`
          : p.project_name;

        return `<option value="${p.id}">${escapeHtml(label)}</option>`;
      })
      .join('');

  if (current) {
    select.value = current;
  }
}

function isAdmin() {
  return state.currentRole === 'admin';
}

function isManager() {
  return state.currentRole === 'manager';
}

function isMember() {
  return state.currentRole === 'member';
}

function canEditTeamMember() {
  return isAdmin();
}

function canDeleteTeamMember() {
  return isAdmin();
}

function getCurrentMember() {
  if (!state.currentUser?.email) return null;

  return state.teamMembers.find(
    (member) =>
      (member.email || '').toLowerCase().trim() ===
      state.currentUser.email.toLowerCase().trim()
  );
}

function updateSidebarUserCard() {
  try {
    const currentMember = getCurrentMember();

    const displayName =
      currentMember?.name ||
      state.currentUser?.email ||
      'Tgora User';

    const displayEmail =
      state.currentUser?.email ||
      currentMember?.email ||
      'No email';

    const sidebar = document.querySelector('#sidebar');

    if (!sidebar) return;

    const nameEl = Array.from(sidebar.querySelectorAll('p'))
      .find((el) => el.textContent.trim() === 'Tgora Team');

    const emailEl = Array.from(sidebar.querySelectorAll('p'))
      .find((el) => el.textContent.trim() === 'hello@tgora.com');

    const avatarEl = Array.from(sidebar.querySelectorAll('div'))
      .find((el) => el.textContent.trim() === 'TG');

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = displayEmail;
    if (avatarEl) avatarEl.textContent = initials(displayName);

  } catch (err) {
    console.error('updateSidebarUserCard error:', err);
  }
}

function isOwnTask(task) {
  const currentMember = getCurrentMember();

  if (!currentMember) return false;

  return (task.assigned_to || '').toLowerCase().trim() ===
    (currentMember.name || '').toLowerCase().trim();
}

function canFullyEditTask() {
  return isAdmin() || isManager();
}

function canLimitedEditTask(task) {
  return isMember() && isOwnTask(task);
}

// ---------- View Switching ----------
function setView(view) {
  state.view = view;
  localStorage.setItem('tgora_current_view', view);

  $$('.view').forEach((el) => el.classList.add('hidden'));
  const target = $(`#view-${view}`);
  if (target) target.classList.remove('hidden');

  $$('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });

if (view === 'team') {
  const tbody = $('#team-table-body');

  if (tbody) {
    tbody.innerHTML = state.teamMembers.map((member) => `
      <tr>
        <td class="px-5 py-3.5">
          <div class="flex items-center gap-3">
            <div class="client-avatar ${avatarColor(member.name)}">
              ${initials(member.name)}
            </div>

            <div>
              <button
                type="button"
                class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left"
                data-action="open-member-details"
                data-id="${member.id}"
              >
                ${escapeHtml(member.name || 'Unnamed Member')}
              </button>

              <p class="text-xs text-gray-500">
                ${escapeHtml(member.email || 'No email')}
              </p>
            </div>
          </div>
        </td>

        <td class="px-5 py-3.5 text-sm text-gray-700">
          ${escapeHtml(member.job_title || '—')}
        </td>

        <td class="px-5 py-3.5 text-sm text-gray-700">
          ${escapeHtml(member.department || '—')}
        </td>

        <td class="px-5 py-3.5 text-sm text-gray-700">
          ${labelize(member.role_type || 'member')}
        </td>

        <td class="px-5 py-3.5 text-sm text-gray-700">
          ${labelize(member.status || '—')}
        </td>

        <td class="px-5 py-3.5 text-right text-xs text-gray-400">
          ${
  canEditTeamMember()
    ? `
      <div class="inline-flex items-center gap-1">
                  <button
                    type="button"
                    class="icon-btn"
                    title="View member details"
                    data-action="open-member-details"
                    data-id="${member.id}"
                  >
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>

                  <button
  type="button"
  class="icon-btn"
  title="Edit member"
  data-action="edit-member"
  data-id="${member.id}"
>
  <i data-lucide="pencil" class="w-4 h-4"></i>
</button>

${
  canDeleteTeamMember()
    ? `
      <button
        type="button"
        class="icon-btn danger"
        title="Delete member"
        data-action="delete-member"
        data-id="${member.id}"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    `
    : ''
}
                </div>
              `
              : '<span class="text-xs text-gray-400">View only</span>'
          }
        </td>
      </tr>
    `).join('');

    refreshIcons();
  }
}

  $$('[data-action="open-project-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !(isAdmin() || isManager()));
  });

  $$('[data-action="open-member-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !isAdmin());
  });

    $$('[data-action="open-task-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', isMember());
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

function openCreateProjectModal() {
  state.editingProjectId = null;

  const form = $('#project-form');

  if (form) {
    form.reset();
  }

  const codeField = $('#project-code-field');

  if (codeField) {
    codeField.classList.add('hidden');
  }

  if (form?.project_code) {
    form.project_code.value = '';
  }

  const title = $('#project-modal-title');

  if (title) {
    title.textContent = 'New Project';
  }

  const submitBtn = form?.querySelector('button[type=submit]');

  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create project`;
  }

  refreshIcons();
  openModal('project-modal');
}

function openEditProjectModal(id) {
  const project = state.projects.find((p) => p.id === id);

  if (!project) {
    toast('Project not found', 'error');
    return;
  }

  state.editingProjectId = id;

  const form = $('#project-form');

  form.project_name.value = project.project_name || '';
  form.client.value = project.client || '';
  form.project_link.value = project.project_link || '';
  form.status.value = project.status || 'active';
  form.priority.value = project.priority || 'medium';
  form.start_date.value = project.start_date || '';
  form.deadline.value = project.deadline || '';

  // Project Code
  const codeField = $('#project-code-field');

  if (codeField) {
    codeField.classList.remove('hidden');
  }

  if (form.project_code) {
    form.project_code.value = project.project_code || '';
  }

  const title = $('#project-modal-title');

  if (title) {
    title.textContent = 'Edit Project';
  }

  const submitBtn = form.querySelector('button[type=submit]');

  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Update project`;
  }

  openModal('project-modal');
}

async function handleMemberSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');

  const isEditing = state.editingMemberId !== null;

  submitBtn.disabled = true;
  submitBtn.innerHTML =
    `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
    ${isEditing ? 'Updating...' : 'Saving...'}`;

  refreshIcons();

  const payload = normalizePayload(new FormData(form));

  let result = null;

  if (isEditing) {
    result = await updateTeamMember(
      state.editingMemberId,
      payload
    );
  } else {
    result = await insertTeamMember(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML =
    `<i data-lucide="check" class="w-4 h-4"></i>
    Save Member`;

  refreshIcons();

  if (result) {

    if (isEditing) {

      state.teamMembers = state.teamMembers.map((member) =>
        Number(member.id) === Number(state.editingMemberId)
          ? result
          : member
      );

      toast('Member updated successfully', 'success');

    } else {

      state.teamMembers = [...state.teamMembers, result];

      toast('Team member added successfully', 'success');
    }

    state.editingMemberId = null;

    form.reset();
    closeModal();

    setView('team');
    renderAll();
  }
}

function generateProjectCode() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const prefix = `TG-${year}${month}`;

  const existingCodes = state.projects
    .map((project) => project.project_code)
    .filter(Boolean)
    .filter((code) => code.startsWith(prefix));

  const numbers = existingCodes
    .map((code) => Number(code.split('-').pop()))
    .filter((num) => !isNaN(num));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

async function handleProjectSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingProjectId !== null;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));

  if (!isEditing) {
  payload.project_code = generateProjectCode();
}

  let result = null;

  if (isEditing) {
    result = await updateProject(state.editingProjectId, payload);
  } else {
    result = await insertProject(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create project`;
  refreshIcons();

  if (result) {
    if (isEditing) {
      state.projects = state.projects.map((project) =>
  Number(project.id) === Number(state.editingProjectId) ? result : project
);
      toast('Project updated successfully', 'success');
    } else {
      state.projects = [result, ...state.projects];
      toast('Project created successfully', 'success');
    }

    state.editingProjectId = null;
    form.reset();
    renderAll();
    closeModal();
  }
}

function openEditMemberModal(id) {
  const member = state.teamMembers.find((m) => Number(m.id) === Number(id));

  if (!member) {
    toast('Member not found', 'error');
    return;
  }

  state.editingMemberId = id;

  const form = $('#member-form');

  form.name.value = member.name || '';
  form.email.value = member.email || '';
  form.job_title.value = member.job_title || '';
  form.department.value = member.department || '';
  form.role_type.value = member.role_type || 'member';
  form.status.value = member.status || 'Active';

  const title = $('#member-modal-title');
  if (title) title.textContent = 'Edit Team Member';

  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Update Member`;
  }

  openModal('member-modal');
}

function openEditTaskModal(id) {
  const task = state.tasks.find((t) => Number(t.id) === Number(id));

  if (!task) {
    toast('Task not found', 'error');
    return;
  }

  if (!canFullyEditTask() && !canLimitedEditTask(task)) {
    toast('You do not have permission to edit this task', 'error');
    return;
  }

  state.editingTaskId = id;

  const form = $('#task-form');

  form.task_info.value = task.task_info || '';
  form.assigned_to.value = task.assigned_to || '';
  form.status.value = task.status || 'todo';
  form.priority.value = task.priority || 'medium';
  form.start_date.value = task.start_date || '';
  form.deadline.value = task.deadline || '';
  form.notes.value = task.notes || '';
  form.materials_link.value = task.materials_link || '';
  form.task_link.value = task.task_link || '';
  form.project_id.value = task.project_id || '';

  const isLimited = canLimitedEditTask(task) && !canFullyEditTask();

  form.task_info.disabled = isLimited;
  form.assigned_to.disabled = isLimited;
  form.priority.disabled = isLimited;
  form.start_date.disabled = isLimited;
  form.deadline.disabled = isLimited;
  form.project_id.disabled = isLimited;

  form.status.disabled = false;
  form.notes.disabled = false;
  form.materials_link.disabled = false;
  form.task_link.disabled = false;

  const title = $('#task-modal-title');
  if (title) {
    title.textContent = isLimited ? 'Update Task Status' : 'Edit Task';
  }

  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> ${
      isLimited ? 'Update Status' : 'Update Task'
    }`;
  }

  openModal('task-modal');
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingTaskId !== null;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  let payload = normalizePayload(new FormData(form));

  if (isEditing) {
    const existingTask = state.tasks.find(
      (task) => Number(task.id) === Number(state.editingTaskId)
    );

    if (!existingTask) {
      toast('Task not found', 'error');
      submitBtn.disabled = false;
      return;
    }

    const limitedEdit = canLimitedEditTask(existingTask) && !canFullyEditTask();

    if (limitedEdit) {
      payload = {
        status: form.status.value,
        task_link: form.task_link.value || null
      };
    }
  }

  if (payload.project_id) payload.project_id = Number(payload.project_id);

  let result = null;

  if (isEditing) {
    result = await updateTask(state.editingTaskId, payload);
  } else {
    result = await insertTask(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create task`;
  refreshIcons();

  if (result) {
    if (isEditing) {
      state.tasks = state.tasks.map((task) =>
        Number(task.id) === Number(state.editingTaskId) ? result : task
      );
      toast('Task updated successfully', 'success');
    } else {
      state.tasks = [result, ...state.tasks];
      toast('Task created successfully', 'success');
    }

    state.editingTaskId = null;
    form.reset();

    Array.from(form.elements).forEach((field) => {
      field.disabled = false;
    });

    renderAll();
    closeModal();
  }
}

// ---------- Delete Handlers ----------
async function confirmDelete() {
  if (!state.pendingDelete) return;

  const { type, id } = state.pendingDelete;
  const currentView = state.view;
  const btn = $('#confirm-delete-btn');

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Deleting…`;
  refreshIcons();

  let ok = false;

  if (type === 'project') {
    ok = await deleteProject(id);

    if (ok) {
      state.projects = state.projects.filter((p) => Number(p.id) !== Number(id));
      state.tasks = state.tasks.filter((t) => Number(t.project_id) !== Number(id));
    }
  }

  if (type === 'task') {
    ok = await deleteTask(id);

    if (ok) {
      state.tasks = state.tasks.filter((t) => Number(t.id) !== Number(id));
    }
  }

  if (type === 'member') {
    ok = await deleteTeamMember(id);

    if (ok) {
      state.teamMembers = state.teamMembers.filter(
        (member) => Number(member.id) !== Number(id)
      );
    }
  }

  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i> Delete`;
  refreshIcons();

  closeConfirm();

  if (ok) {
    toast(`${labelize(type)} deleted`, 'success');

    if (currentView === 'projects') {
      renderProjects();
    } else if (currentView === 'tasks') {
      renderTasks();
    } else if (currentView === 'team') {
      setView('team');
    } else {
      renderAll();
    }
  }
}

// ---------- Event Wiring ----------
function renderProjectDetails() {
  const project = state.projects.find(
    (p) => Number(p.id) === Number(state.selectedProjectId)
  );

  if (!project) return;

  $('#details-project-name').textContent = project.project_name || 'Untitled';
  $('#details-project-code').textContent = project.project_code || '—';
  $('#details-client').textContent = project.client || '—';
  $('#details-start-date').textContent = fmtDate(project.start_date);
  $('#details-deadline').textContent = fmtDate(project.deadline);

  const status = (project.status || 'planning').toLowerCase();
  const priority = (project.priority || 'medium').toLowerCase();

  const tasks = state.tasks.filter(
    (t) => Number(t.project_id) === Number(project.id)
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  ).length;

  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  $('#details-total-tasks').textContent = totalTasks;
  $('#details-completed-tasks').textContent = completedTasks;
  $('#project-progress-text').textContent = `${progress}%`;
  $('#project-progress-bar').style.width = `${progress}%`;

  $('#details-status').className = `badge badge-${status}`;
  $('#details-status').innerHTML = `<span class="dot"></span>${labelize(status)}`;

  $('#details-priority').className = `badge priority-${priority}`;
  $('#details-priority').innerHTML = `<span class="dot"></span>${labelize(priority)}`;

  const linkEl = $('#details-project-link');

  if (project.project_link) {
    linkEl.href = project.project_link;
    linkEl.textContent = 'Open Project Link';
    linkEl.classList.remove('hidden');
  } else {
    linkEl.classList.add('hidden');
  }

  $('#details-tasks-list').innerHTML = tasks.length
    ? `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th class="px-5 py-3">Task</th>
              <th class="px-5 py-3">Assigned</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Priority</th>
              <th class="px-5 py-3">Deadline</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            ${tasks
              .map((t) => {
                const taskStatus = (t.status || 'todo').toLowerCase();
                const taskPriority = (t.priority || 'medium').toLowerCase();

                const materialsLink = t.materials_link
                  ? `<a href="${escapeHtml(t.materials_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open materials"><i data-lucide="paperclip" class="w-4 h-4"></i></a>`
                  : '';

                const taskLink = t.task_link
                  ? `<a href="${escapeHtml(t.task_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open task link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
                  : '';

                return `
                  <tr class="hover:bg-gray-50 transition">
                    <td class="px-5 py-3.5 max-w-sm">
                      <button
                        type="button"
                        class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 text-left"
                        data-action="open-task-details"
                        data-id="${t.id}"
                      >
                        ${escapeHtml(t.task_info || 'Untitled Task')}
                      </button>

                      <p class="text-[11px] text-gray-500">
                        Start ${fmtDate(t.start_date)}
                      </p>
                    </td>

                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-2">
                        <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                          ${initials(t.assigned_to)}
                        </div>

                        <span class="text-sm text-gray-700">
                          ${escapeHtml(t.assigned_to || '—')}
                        </span>
                      </div>
                    </td>

                    <td class="px-5 py-3.5">
                      <span class="badge badge-${taskStatus}">
                        <span class="dot"></span>
                        ${labelize(taskStatus)}
                      </span>
                    </td>

                    <td class="px-5 py-3.5">
                      <span class="badge priority-${taskPriority}">
                        <span class="dot"></span>
                        ${labelize(taskPriority)}
                      </span>
                    </td>

                    <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(t.deadline)}">
                      ${fmtDate(t.deadline)}
                    </td>

                    <td class="px-5 py-3.5 text-right">
                      <div class="inline-flex items-center gap-1">
                        ${materialsLink}
                        ${taskLink}

                        <button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Edit task">
                          <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>

                        ${
                          isAdmin() || isManager()
                            ? `
                              <button class="icon-btn danger" data-action="delete-task" data-id="${t.id}" title="Delete task">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                              </button>
                            `
                            : ''
                        }
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="p-10 text-center text-gray-500 text-sm">
        No tasks linked to this project yet.
      </div>
    `;

  refreshIcons();
}

function openMemberDetails(memberId) {
  const member = state.teamMembers.find(
    (m) => Number(m.id) === Number(memberId)
  );
  
  if (!member) return;

  const memberTasks = state.tasks.filter(
    (t) => t.assigned_to === member.name
  );

  const completedTasks = memberTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  );

  const progressTasks = memberTasks.filter(
    (t) => ['in_progress', 'review'].includes((t.status || '').toLowerCase())
  );

  const overdueTasks = memberTasks.filter((t) => {
    if (!t.deadline) return false;
    if ((t.status || '').toLowerCase() === 'completed') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline < today;
  });

  const totalTasks = memberTasks.length;
  const completedCount = completedTasks.length;
  const overdueCount = overdueTasks.length;

  let performanceScore =
    Math.round((completedCount * 100) / Math.max(totalTasks, 1)) -
    overdueCount * 10;

  performanceScore = Math.max(performanceScore, 0);

  let performanceLabel = 'Needs Improvement';

  if (performanceScore >= 90) {
    performanceLabel = 'Excellent';
  } else if (performanceScore >= 75) {
    performanceLabel = 'Very Good';
  } else if (performanceScore >= 60) {
    performanceLabel = 'Good';
  } else if (performanceScore >= 40) {
    performanceLabel = 'Average';
  }

  $('#member-details-name').textContent =
    member.name || 'Unknown Member';

  $('#member-details-role').textContent =
  member.job_title || 'No Job Title';

  $('#member-details-status').innerHTML = `
    <span class="dot"></span>
    ${escapeHtml(member.status || '—')}
  `;

  $('#member-total-tasks').textContent = totalTasks;
  $('#member-completed-tasks').textContent = completedCount;
  $('#member-progress-tasks').textContent = progressTasks.length;
  $('#member-overdue-tasks').textContent = overdueCount;

  const performanceScoreEl = $('#member-performance-score');
  const performanceLabelEl = $('#member-performance-label');

  if (performanceScoreEl) {
    performanceScoreEl.textContent = `${performanceScore}%`;
  }

if (performanceLabelEl) {

  let emoji = '🔴';

  if (performanceScore >= 90) {
    emoji = '🟢';
  } else if (performanceScore >= 75) {
    emoji = '🟢';
  } else if (performanceScore >= 60) {
    emoji = '🟡';
  } else if (performanceScore >= 40) {
    emoji = '🟠';
  }

  performanceLabelEl.textContent =
    `${emoji} ${performanceLabel}`;
}

  const tbody = $('#member-tasks-table-body');

  tbody.innerHTML = memberTasks
    .map((task) => {
      const project = state.projects.find(
        (p) => p.id === task.project_id
      );

      return `
        <tr>
          <td class="px-5 py-3">
            ${escapeHtml(task.task_info || '')}
          </td>

<td class="px-5 py-3">
  ${
    project
      ? `
        <button
          class="text-brand-600 hover:text-brand-700 hover:underline font-medium"
          data-action="open-project-details"
          data-id="${project.id}"
        >
          ${escapeHtml(project.project_name)}
        </button>
      `
      : '—'
  }
</td>

          <td class="px-5 py-3">
            ${labelize(task.status || '—')}
          </td>

          <td class="px-5 py-3">
            ${labelize(task.priority || '—')}
          </td>

          <td class="px-5 py-3">
            ${fmtDate(task.deadline)}
          </td>
        </tr>
      `;
    })
    .join('');

  setView('team-member');
}

function wireEvents() {
  // Nav
  $$('.nav-item[data-view]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();

    const view = a.dataset.view;

    window.history.pushState(
      { view },
      '',
      `#${view}`
    );

    setView(view);
  });
});

window.addEventListener('popstate', () => {
  const viewFromHash = window.location.hash.replace('#', '');

  if (viewFromHash && $(`#view-${viewFromHash}`)) {
    setView(viewFromHash);
  } else {
    setView('dashboard');
  }
});

  // Dashboard "View all" links
  $$('[data-action="goto-view"]').forEach((b) => {
  b.addEventListener('click', (e) => {
    e.preventDefault();

    const view = b.dataset.view;

    window.history.pushState(
      { view },
      '',
      `#${view}`
    );

    setView(view);
  });
});

  // Sidebar mobile
  $('#sidebar-toggle').addEventListener('click', openSidebar);
  $('#sidebar-overlay').addEventListener('click', closeSidebar);

  // Topbar new -> open project modal by default
  $('#topbar-new')?.addEventListener('click', () => {
  if (state.view === 'tasks') {
    openModal('task-modal');
  } else {
    openCreateProjectModal();
  }
});

  // Open / close modals via delegated events
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  console.log('CLICK ACTION:', action, trigger.dataset);

  if (action === 'open-project-details') {
    const id = Number(trigger.dataset.id);
    state.selectedProjectId = id;
    setView('project-details');
    renderProjectDetails();
    return;
  }

  if (action === 'open-member-details') {
  const memberId = Number(trigger.dataset.id);

  if (!memberId) {
    toast('Member ID is missing', 'error');
    return;
  }

  openMemberDetails(memberId);
  return;
}

  if (action === 'back-to-team') {
    setView('team');
    return;
  }

  if (action === 'open-project-modal') {
  openCreateProjectModal();
  return;
}

  if (action === 'open-task-modal') {
    openModal('task-modal');
    return;
  }

  if (action === 'open-member-modal') {
    openModal('member-modal');
    return;
  }

  if (action === 'close-modal') {
    closeModal();
    return;
  }

  if (action === 'close-confirm') {
    closeConfirm();
    return;
  }

  if (action === 'back-to-projects') {
    state.selectedProjectId = null;
    setView('projects');
    return;
  }

  if (action === 'edit-project') {
  const id = Number(trigger.dataset.id);
  openEditProjectModal(id);
  return;
}

if (action === 'delete-project') {
  const id = Number(trigger.dataset.id);
  const project = state.projects.find((p) => p.id === id);
  openConfirm('project', id, project ? `Project “${project.project_name}”` : 'This project');
  return;
}

if (action === 'open-task-details') {
  const id = Number(trigger.dataset.id);

  console.log('OPEN TASK DETAILS CLICKED:', id);

  openTaskDetailsModal(id);
  return;
}

if (action === 'edit-task') {
  const id = Number(trigger.dataset.id);

  closeModal();
  openEditTaskModal(id);

  return;
}

if (action === 'delete-task') {
  const id = Number(trigger.dataset.id);
  const task = state.tasks.find((t) => t.id === id);
  openConfirm('task', id, task ? `Task “${task.task_info}”` : 'This task');
  return;
}

if (action === 'edit-member') {
  const id = Number(trigger.dataset.id);
  openEditMemberModal(id);
  return;
}

if (action === 'delete-member') {
  const id = Number(trigger.dataset.id);
  const member = state.teamMembers.find((m) => Number(m.id) === id);
  openConfirm('member', id, member ? `Member “${member.name}”` : 'This member');
  return;
}
});

  // Forms
  $('#logout-btn')?.addEventListener('click', handleLogout);
  $('#project-form').addEventListener('submit', handleProjectSubmit);
  $('#member-form').addEventListener('submit', handleMemberSubmit);
  $('#task-form').addEventListener('submit', handleTaskSubmit);
  $('#confirm-delete-btn').addEventListener('click', confirmDelete);

  // Filters
  $$('[data-projects-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.filters.projects = btn.dataset.projectsFilter;

    $$('[data-projects-filter]').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });

    renderProjects();
  });
});

$$('[data-tasks-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.filters.tasks = btn.dataset.tasksFilter;

    $$('[data-tasks-filter]').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });

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
async function handleLogin(e) {
  e.preventDefault();

  const email = $('#login-email').value;
  const password = $('#login-password').value;
  const errorEl = $('#login-error');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errorEl.textContent = error.message || 'Login failed';
    errorEl.classList.remove('hidden');
    return;
  }

  $('#auth-screen').classList.add('hidden');

  await init();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

async function init() {
  const {
  data: { user },
} = await supabaseClient.auth.getUser();

state.currentUser = user || null;

if (user?.email) {
  const matchedMember = state.teamMembers.find(
    (member) => (member.email || '').toLowerCase() === user.email.toLowerCase()
  );

  state.currentRole = matchedMember?.role_type || 'member';
}

  $('#year').textContent = new Date().getFullYear();
  refreshIcons();
  wireEvents();

  // Show skeleton placeholders for stat numbers initially
  ['stat-total-projects', 'stat-completed-tasks', 'stat-in-progress', 'stat-overdue'].forEach((id) => {
    const el = $(`#${id}`);
    if (el) el.innerHTML = '<span class="skeleton inline-block h-6 w-10"></span>';
  });

  try {
    const [projects, tasks, teamMembers] = await Promise.all([
  fetchProjects(),
  fetchTasks(),
  fetchTeamMembers()
]);

state.projects = projects;
state.tasks = tasks;
state.teamMembers = teamMembers;

const {
  data: { user },
} = await supabaseClient.auth.getUser();

state.currentUser = user || null;

if (user?.email) {
  const matchedMember = state.teamMembers.find(
    (member) =>
      (member.email || '').toLowerCase().trim() === user.email.toLowerCase().trim()
  );

  state.currentRole = matchedMember?.role_type || 'member';
} else {
  state.currentRole = null;
}

  } catch (err) {
    console.error(err);
    toast('Could not connect to supabaseClient. Check your credentials.', 'error');
  }

  console.log('Current User:', state.currentUser);
console.log('Current Role:', state.currentRole);

  renderAll();
updateSidebarUserCard();
}

document.addEventListener('DOMContentLoaded', async () => {
  $('#login-form')?.addEventListener('submit', handleLogin);

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    $('#auth-screen').classList.add('hidden');
    await init();
  }
});
