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
  notifications: [],
  view: localStorage.getItem('tgora_current_view') || 'dashboard',
  currentUser: null,
  currentMember: null,
  currentRole: null,
  selectedMemberId: Number(localStorage.getItem('tgora_selected_member_id')) || null,
  selectedProjectId: Number(localStorage.getItem('tgora_selected_project_id')) || null,
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
  alertsFilter: 'all', // 'all' | 'overdue' | 'due_today'
  teamPerformanceRanking: [],
  teamPerformanceNotEnoughData: [],
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

const timeAgo = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return fmtDate(d);
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

async function insertNotification(payload) {
  const { data, error } = await supabaseClient
    .from('notifications')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('insertNotification', error);
    return null;
  }

  return data;
}

function getAdminMembers() {
  return state.teamMembers.filter(
    (member) =>
      (member.role_type || '').toLowerCase() === 'admin' &&
      member.auth_user_id
  );
}

function getMemberByName(name) {
  if (!name) return null;

  return state.teamMembers.find(
    (member) =>
      (member.name || '').toLowerCase().trim() ===
      String(name).toLowerCase().trim()
  );
}

function getActorName() {
  return getCurrentMember()?.name || state.currentUser?.email || 'Someone';
}

const NOTIFICATION_ICONS = {
  task_created: { icon: 'list-plus', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  task_updated: { icon: 'pencil', bg: 'bg-blue-100', color: 'text-blue-600' },
  task_deleted: { icon: 'trash-2', bg: 'bg-red-100', color: 'text-red-600' },
  task_assigned: { icon: 'user-check', bg: 'bg-indigo-100', color: 'text-indigo-600' },
  task_completed: { icon: 'check-circle-2', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  task_status_updated: { icon: 'refresh-cw', bg: 'bg-blue-100', color: 'text-blue-600' },
  task_deadline_updated: { icon: 'calendar-clock', bg: 'bg-amber-100', color: 'text-amber-600' },
  project_created: { icon: 'folder-plus', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  project_updated: { icon: 'folder-cog', bg: 'bg-blue-100', color: 'text-blue-600' },
  project_deleted: { icon: 'folder-x', bg: 'bg-red-100', color: 'text-red-600' },
  team_member_created: { icon: 'user-plus', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  team_member_updated: { icon: 'user-cog', bg: 'bg-blue-100', color: 'text-blue-600' },
  team_member_deleted: { icon: 'user-minus', bg: 'bg-red-100', color: 'text-red-600' },
};

function getNotificationIcon(type) {
  return NOTIFICATION_ICONS[type] || { icon: 'bell', bg: 'bg-gray-100', color: 'text-gray-500' };
}

const ALERT_TYPE_STYLES = {
  overdue: { icon: 'alert-circle', bg: 'bg-red-100', color: 'text-red-600', label: 'Overdue' },
  due_today: { icon: 'clock', bg: 'bg-orange-100', color: 'text-orange-600', label: 'Due Today' },
  project_overdue: { icon: 'folder-x', bg: 'bg-red-100', color: 'text-red-600', label: 'Project Overdue' },
  project_due_today: { icon: 'folder-clock', bg: 'bg-orange-100', color: 'text-orange-600', label: 'Project Due Today' },
};

function getAlertStyle(alertType) {
  return ALERT_TYPE_STYLES[alertType] || { icon: 'triangle-alert', bg: 'bg-gray-100', color: 'text-gray-500', label: 'Alert' };
}

async function notifyAdmins({
  title,
  message,
  type,
  entityType,
  entityId,
}) {
  const admins = getAdminMembers();

  if (admins.length === 0) return;

  const notifications = admins.map((admin) => ({
    user_id: admin.auth_user_id,
    title,
    message,
    type,
    entity_type: entityType,
    entity_id: entityId || null,
    is_read: false,
  }));

  const { error } = await supabaseClient
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('notifyAdmins', error);
  }
}

async function notifyAssignedMember({
  assignedTo,
  title,
  message,
  type,
  entityType,
  entityId,
}) {
  const member = getMemberByName(assignedTo);

  if (!member?.auth_user_id) return;

  await insertNotification({
    user_id: member.auth_user_id,
    title,
    message,
    type,
    entity_type: entityType,
    entity_id: entityId || null,
    is_read: false,
  });
}

async function fetchNotifications() {
  if (!state.currentUser?.id) return [];

  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', state.currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchNotifications', error);
    return [];
  }

  return data || [];
}

async function markNotificationAsRead(id) {
  const { error } = await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('markNotificationAsRead', error);
  }
}

async function markAllNotificationsAsRead() {
  if (!state.currentUser?.id) return;

  const { error } = await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', state.currentUser.id)
    .eq('is_read', false);

  if (error) {
    console.error('markAllNotificationsAsRead', error);
  }
}

async function deleteNotification(id) {
  if (!state.currentUser?.id) return;

  const { error } = await supabaseClient
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', state.currentUser.id);

  if (error) {
    console.error('deleteNotification', error);
  }
}

async function clearReadNotifications() {
  if (!state.currentUser?.id) return;

  const { error } = await supabaseClient
    .from('notifications')
    .delete()
    .eq('user_id', state.currentUser.id)
    .eq('is_read', true);

  if (error) {
    console.error('clearReadNotifications', error);
  }
}

async function cleanupOldNotifications() {
  if (!state.currentUser?.id) return;

  const cutoff = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseClient
    .from('notifications')
    .delete()
    .eq('user_id', state.currentUser.id)
    .lt('created_at', cutoff);

  if (error) {
    console.error('cleanupOldNotifications', error);
  }
}

async function refreshNotifications() {
  state.notifications = await fetchNotifications();
  renderNotifications();
}

function renderNotifications() {
  const list = $('#notifications-list');
  const badge = $('#notifications-count');
  const markAllBtn = $('#notifications-mark-all-read');
  const clearReadBtn = $('#notifications-clear-read');

  if (!list || !badge) return;

  const unreadCount = state.notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const readCount = state.notifications.length - unreadCount;

  if (unreadCount > 0) {
    badge.classList.remove('hidden');
    badge.textContent = unreadCount;
  } else {
    badge.classList.add('hidden');
  }

  if (markAllBtn) {
    markAllBtn.classList.toggle('hidden', unreadCount === 0);
  }

  if (clearReadBtn) {
    clearReadBtn.classList.toggle('hidden', readCount === 0);
  }

  if (state.notifications.length === 0) {
    list.innerHTML = `
      <div class="px-6 py-10 text-center text-sm text-gray-500">
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
          <i data-lucide="bell-off" class="w-5 h-5 text-gray-400"></i>
        </div>
        No notifications yet
      </div>
    `;
    refreshIcons();
    return;
  }

  list.innerHTML = state.notifications
    .slice(0, 20)
    .map((notification) => {
      const { icon, bg, color } = getNotificationIcon(notification.type);

      return `
      <div
        class="notification-item group px-4 py-3 border-b border-gray-100 cursor-pointer flex items-start gap-3 transition ${
          !notification.is_read
            ? 'bg-brand-50/60 border-l-2 border-l-brand-500 hover:bg-brand-50'
            : 'bg-white hover:bg-gray-50'
        }"
        data-id="${notification.id}"
        data-entity-type="${notification.entity_type || ''}"
        data-entity-id="${notification.entity_id || ''}"
      >
        <div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4 ${color}"></i>
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-900">
            ${escapeHtml(notification.title)}
          </div>

          <div class="text-xs text-gray-600 mt-0.5">
            ${escapeHtml(notification.message || '')}
          </div>

          <div class="text-[11px] text-gray-400 mt-1.5">
            ${timeAgo(notification.created_at)}
          </div>
        </div>

        <span class="mt-1.5 w-2 h-2 rounded-full shrink-0 ${
          !notification.is_read ? 'bg-brand-600' : 'bg-transparent'
        }"></span>

        <button
          type="button"
          class="notification-delete-btn shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition"
          data-id="${notification.id}"
          title="Delete notification"
        >
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    })
    .join('');

  refreshIcons();
}

function getAlertVisibleTasks() {
  if (isAdmin() || isManager()) return state.tasks;

  const currentMember = getCurrentMember();

  if (!currentMember) return [];

  return state.tasks.filter(
    (t) =>
      (t.assigned_to || '').toLowerCase().trim() ===
      (currentMember.name || '').toLowerCase().trim()
  );
}

const ALERT_GROUP_LABELS = {
  mine: 'My Tasks',
  other: 'Team Tasks',
  project: 'Projects',
};

function getAlertGroup(alert) {
  if (alert.kind === 'project') return 'project';
  return alert.isMine ? 'mine' : 'other';
}

function computeAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts = [];
  const currentMemberName = (getCurrentMember()?.name || '').toLowerCase().trim();

  getAlertVisibleTasks().forEach((task) => {
    if ((task.status || '').toLowerCase() === 'completed') return;
    if (!task.deadline) return;

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24));

    let alertType = null;
    if (diffDays < 0) alertType = 'overdue';
    else if (diffDays === 0) alertType = 'due_today';

    if (!alertType) return;

    const project = state.projects.find((p) => p.id === task.project_id);
    const isMine = (task.assigned_to || '').toLowerCase().trim() === currentMemberName;

    alerts.push({
      id: `task-${task.id}`,
      kind: 'task',
      entityId: task.id,
      alertType,
      title: task.task_info || 'Untitled task',
      subtitle: project?.project_name || '',
      deadline: task.deadline,
      priority: task.priority,
      assignedTo: task.assigned_to || '',
      isMine,
    });
  });

  if (isAdmin() || isManager()) {
    state.projects.forEach((project) => {
      if ((project.status || '').toLowerCase() === 'completed') return;
      if (!project.deadline) return;

      const deadline = new Date(project.deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24));

      let alertType = null;
      if (diffDays < 0) alertType = 'project_overdue';
      else if (diffDays === 0) alertType = 'project_due_today';

      if (!alertType) return;

      alerts.push({
        id: `project-${project.id}`,
        kind: 'project',
        entityId: project.id,
        alertType,
        title: project.project_name || 'Untitled project',
        subtitle: project.client || '',
        deadline: project.deadline,
        priority: project.priority,
        isMine: false,
      });
    });
  }

  const groupOrder = { mine: 0, other: 1, project: 2 };
  const severityOrder = {
    overdue: 0,
    project_overdue: 0,
    due_today: 1,
    project_due_today: 1,
  };

  alerts.sort((a, b) => {
    const groupDiff = groupOrder[getAlertGroup(a)] - groupOrder[getAlertGroup(b)];
    if (groupDiff !== 0) return groupDiff;

    const sevDiff = (severityOrder[a.alertType] ?? 99) - (severityOrder[b.alertType] ?? 99);
    if (sevDiff !== 0) return sevDiff;

    const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aTime - bTime;
  });

  return alerts;
}

function renderAlerts() {
  const list = $('#alerts-list');
  const badge = $('#alerts-count');
  const overdueCountEl = $('#alerts-overdue-count');
  const dueTodayCountEl = $('#alerts-due-today-count');
  const tabs = document.querySelectorAll('.alerts-filter-tab');

  if (!list || !badge) return;

  const alerts = computeAlerts();

  const overdueCount = alerts.filter((a) => a.alertType === 'overdue' || a.alertType === 'project_overdue').length;
  const dueTodayCount = alerts.filter((a) => a.alertType === 'due_today' || a.alertType === 'project_due_today').length;
  const totalCount = overdueCount + dueTodayCount;

  if (totalCount > 0) {
    badge.classList.remove('hidden');
    badge.textContent = totalCount;
  } else {
    badge.classList.add('hidden');
  }

  if (overdueCountEl) overdueCountEl.textContent = overdueCount;
  if (dueTodayCountEl) dueTodayCountEl.textContent = dueTodayCount;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.filter === state.alertsFilter;
    tab.classList.toggle('bg-brand-600', isActive);
    tab.classList.toggle('text-white', isActive);
    tab.classList.toggle('bg-gray-100', !isActive);
    tab.classList.toggle('text-gray-600', !isActive);
  });

  const filteredAlerts = alerts.filter((alert) => {
    if (state.alertsFilter === 'overdue') {
      return alert.alertType === 'overdue' || alert.alertType === 'project_overdue';
    }
    if (state.alertsFilter === 'due_today') {
      return alert.alertType === 'due_today' || alert.alertType === 'project_due_today';
    }
    return true;
  });

  if (filteredAlerts.length === 0) {
    list.innerHTML = `
      <div class="px-6 py-10 text-center text-sm text-gray-500">
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-gray-400"></i>
        </div>
        No alerts right now
      </div>
    `;
    refreshIcons();
    return;
  }

  let lastGroup = null;

  list.innerHTML = filteredAlerts
    .map((alert) => {
      const { icon, bg, color, label } = getAlertStyle(alert.alertType);

      const assignedLine = ((isAdmin() || isManager()) && alert.kind === 'task')
        ? `<div class="text-[11px] text-gray-400 mt-1">Assigned to: ${escapeHtml(alert.assignedTo || 'Unassigned')}</div>`
        : '';

      const group = getAlertGroup(alert);
      let groupHeader = '';
      if (group !== lastGroup) {
        groupHeader = `
        <div class="px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          ${ALERT_GROUP_LABELS[group]}
        </div>
      `;
        lastGroup = group;
      }

      return `
      ${groupHeader}
      <div
        class="alert-item px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 flex items-start gap-3 transition"
        data-kind="${alert.kind}"
        data-id="${alert.entityId}"
      >
        <div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4 ${color}"></i>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-gray-900 truncate">${escapeHtml(alert.title)}</span>
            <span class="text-[10px] font-semibold uppercase tracking-wide ${color}">${label}</span>
          </div>

          ${alert.subtitle ? `<div class="text-xs text-gray-500 mt-0.5 truncate">${escapeHtml(alert.subtitle)}</div>` : ''}

          <div class="text-[11px] text-gray-400 mt-1.5">
            Deadline: ${fmtDate(alert.deadline)}
          </div>

          ${assignedLine}
        </div>
      </div>
    `;
    })
    .join('');

  refreshIcons();
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

  await notifyAdmins({
    title: `${getActorName()} added a team member`,
    message: `${data.name || 'A team member'} was added to the team.`,
    type: 'team_member_created',
    entityType: 'team_member',
    entityId: data.id,
  });

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

  await notifyAdmins({
    title: `${getActorName()} updated a team member`,
    message: `${data.name || 'A team member'} profile was updated.`,
    type: 'team_member_updated',
    entityType: 'team_member',
    entityId: data.id,
  });

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
  const { data, error } = await supabaseClient
    .from('projects')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('insertProject', error);
    toast(error.message || 'Failed to create project', 'error');
    return null;
  }

  await notifyAdmins({
    title: `${getActorName()} created a project`,
    message: `${data.project_name || 'A project'} was created.`,
    type: 'project_created',
    entityType: 'project',
    entityId: data.id,
  });

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

  await notifyAdmins({
    title: `${getActorName()} updated a project`,
    message: `${data.project_name || 'A project'} was updated.`,
    type: 'project_updated',
    entityType: 'project',
    entityId: data.id,
  });

  return data;
}

async function insertTask(payload) {
  const { data, error } = await supabaseClient
    .from('tasks')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('insertTask', error);
    toast(error.message || 'Failed to create task', 'error');
    return null;
  }

  await notifyAdmins({
    title: `${getActorName()} created a task`,
    message: `${data.task_info || 'A task'} was created and assigned to ${data.assigned_to || 'someone'}.`,
    type: 'task_created',
    entityType: 'task',
    entityId: data.id,
  });

  await notifyAssignedMember({
    assignedTo: data.assigned_to,
    title: `${getActorName()} assigned you a task`,
    message: data.task_info || 'You have a new task.',
    type: 'task_assigned',
    entityType: 'task',
    entityId: data.id,
  });

  return data;
}

async function updateTask(id, payload) {
  const oldTask = state.tasks.find(
    (task) => Number(task.id) === Number(id)
  );

  if (payload.status !== undefined && oldTask) {
    const oldStatus = (oldTask.status || '').toLowerCase();
    const newStatus = (payload.status || '').toLowerCase();

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      if (!oldTask.completed_at) {
        payload.completed_at = new Date().toISOString();
      }
    } else if (oldStatus === 'completed' && newStatus !== 'completed') {
      payload.completed_at = null;
    }
  }

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

  const actor = getActorName();

  const assignedToChanged =
    payload.assigned_to &&
    oldTask &&
    (oldTask.assigned_to || '') !== (payload.assigned_to || '');

  const statusChanged =
    payload.status &&
    oldTask &&
    (oldTask.status || '') !== (payload.status || '');

  const becameCompleted =
    statusChanged && (data.status || '').toLowerCase() === 'completed';

  if (assignedToChanged) {
    await notifyAdmins({
      title: `${actor} reassigned a task`,
      message: `${data.task_info || 'A task'} was assigned to ${data.assigned_to || 'someone'}.`,
      type: 'task_assigned',
      entityType: 'task',
      entityId: data.id,
    });
  }

  if (becameCompleted) {
    await notifyAdmins({
      title: `${actor} completed a task`,
      message: `${data.task_info || 'A task'} was marked as completed.`,
      type: 'task_completed',
      entityType: 'task',
      entityId: data.id,
    });
  }

  if (assignedToChanged) {
    await notifyAssignedMember({
      assignedTo: payload.assigned_to,
      title: `${actor} assigned you a task`,
      message: data.task_info || 'A task was assigned to you.',
      type: 'task_assigned',
      entityType: 'task',
      entityId: data.id,
    });
  }

  if (statusChanged) {
    await notifyAssignedMember({
      assignedTo: data.assigned_to,
      title: `${actor} updated task status`,
      message: `${data.task_info || 'A task'} status changed to ${labelize(data.status)}.`,
      type: 'task_status_updated',
      entityType: 'task',
      entityId: data.id,
    });
  }

  if (
    payload.deadline &&
    oldTask &&
    String(oldTask.deadline || '') !== String(payload.deadline || '')
  ) {
    await notifyAssignedMember({
      assignedTo: data.assigned_to,
      title: `${actor} changed task deadline`,
      message: `${data.task_info || 'A task'} deadline changed to ${fmtDate(data.deadline)}.`,
      type: 'task_deadline_updated',
      entityType: 'task',
      entityId: data.id,
    });
  }

  return data;
}

async function deleteProject(id) {
  const project = state.projects.find(
    (p) => Number(p.id) === Number(id)
  );

  await supabaseClient.from('tasks').delete().eq('project_id', id);

  const { error } = await supabaseClient
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteProject', error);
    toast('Failed to delete project', 'error');
    return false;
  }

  await notifyAdmins({
    title: `${getActorName()} deleted a project`,
    message: `${project?.project_name || 'A project'} was deleted.`,
    type: 'project_deleted',
    entityType: 'project',
    entityId: id,
  });

  return true;
}

async function deleteTask(id) {
  const task = state.tasks.find(
    (t) => Number(t.id) === Number(id)
  );

  const { error } = await supabaseClient
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteTask', error);
    toast('Failed to delete task', 'error');
    return false;
  }

  await notifyAdmins({
    title: `${getActorName()} deleted a task`,
    message: `${task?.task_info || 'A task'} was deleted.`,
    type: 'task_deleted',
    entityType: 'task',
    entityId: id,
  });

  return true;
}

async function deleteTeamMember(id) {
  const member = state.teamMembers.find(
    (m) => Number(m.id) === Number(id)
  );

  const { error } = await supabaseClient
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteTeamMember', error);
    toast('Failed to delete team member', 'error');
    return false;
  }

  await notifyAdmins({
    title: `${getActorName()} deleted a team member`,
    message: `${member?.name || 'A team member'} was deleted.`,
    type: 'team_member_deleted',
    entityType: 'team_member',
    entityId: id,
  });

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

      const assignedMember = state.teamMembers.find(
        (m) =>
          (m.name || '').toLowerCase().trim() ===
          (t.assigned_to || '').toLowerCase().trim()
      );

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
            ${
              assignedMember
                ? `
                  <button
                    type="button"
                    class="flex items-center gap-2 group"
                    data-action="open-member-details"
                    data-id="${assignedMember.id}"
                    title="Open member details"
                  >
                    <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                      ${initials(t.assigned_to)}
                    </div>

                    <span class="text-sm text-gray-700 group-hover:text-indigo-600 transition">
                      ${escapeHtml(t.assigned_to || '—')}
                    </span>
                  </button>
                `
                : `
                  <div class="flex items-center gap-2">
                    <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                      ${initials(t.assigned_to)}
                    </div>

                    <span class="text-sm text-gray-700">${escapeHtml(t.assigned_to || '—')}</span>
                  </div>
                `
            }
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

async function refreshDataAndRender() {
  console.log('refreshDataAndRender started');

  const [
    projects,
    tasks,
    teamMembers,
    notifications
  ] = await Promise.all([
    fetchProjects(),
    fetchTasks(),
    fetchTeamMembers(),
    fetchNotifications()
  ]);

  state.projects = projects;
  state.tasks = tasks;
  state.teamMembers = teamMembers;
  state.notifications = notifications;

  renderAll();
  renderNotifications();
  renderAlerts();
  updateSidebarUserCard();

  console.log('refreshDataAndRender completed');
}

function renderAll() {
  populateTeamMembers();
  renderStats();
  renderCharts();
  renderRecentProjects();
  renderRecentTasks();
  renderProjects();
  renderTasks();
  renderMyPerformance();
  renderTeamLeaderboard();
  renderMyPerformanceTrend();

  const savedView = localStorage.getItem('tgora_current_view');

  if (
    savedView === 'team-member' &&
    state.selectedMemberId
  ) {
    openMemberDetails(state.selectedMemberId);
  } else if (
    savedView === 'project-details' &&
    state.selectedProjectId
  ) {
    state.selectedProjectId = Number(state.selectedProjectId);
    setView('project-details');
    renderProjectDetails();
  } else if (savedView && $(`#view-${savedView}`)) {
    setView(savedView);
  } else {
    setView(state.view || 'dashboard');
  }
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
  return state.currentMember || null;
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

  renderTeamPerformance();
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

  const formData = new FormData(form);
  const password = formData.get('password');

  formData.delete('password');

  const payload = normalizePayload(formData);

  let result = null;

  if (isEditing) {
    result = await updateTeamMember(
      state.editingMemberId,
      payload
    );
  } else {
    if (!payload.email || !password) {
      toast('Email and password are required to create a member account', 'error');

      submitBtn.disabled = false;
      submitBtn.innerHTML =
        `<i data-lucide="check" class="w-4 h-4"></i>
        Save Member`;

      refreshIcons();
      return;
    }

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const response = await fetch('/api/create-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...payload,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast(data.error || 'Failed to create member account', 'error');

      submitBtn.disabled = false;
      submitBtn.innerHTML =
        `<i data-lucide="check" class="w-4 h-4"></i>
        Save Member`;

      refreshIcons();
      return;
    }

    result = data.member;
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

      toast('Team member account created successfully', 'success');
    }

    state.editingMemberId = null;

    form.reset();
    closeModal();

    await refreshDataAndRender();
setView('team');
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
    toast(
      isEditing
        ? 'Project updated successfully'
        : 'Project created successfully',
      'success'
    );

    state.editingProjectId = null;
    form.reset();
    closeModal();

    await refreshDataAndRender();
    setView('projects');
  }
}

function openCreateMemberModal() {
  state.editingMemberId = null;

  const form = $('#member-form');

  if (form) {
    form.reset();

    if (form.password) {
      form.password.disabled = false;
      form.password.required = true;
      form.password.placeholder = 'Enter password';
      form.password.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
    }
  }

  const title = $('#member-modal-title');
  if (title) title.textContent = 'New Team Member';

  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Save Member`;
  }

  openModal('member-modal');
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

  syncTaskProjectSelect();

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

  form.materials_link.disabled = isLimited;
  form.task_link.disabled = false;

  if (isLimited) {
    form.materials_link.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
    form.materials_link.title = 'Members can view this link but cannot edit it';
  } else {
    form.materials_link.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
    form.materials_link.title = '';
  }

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
      submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Create task`;
      refreshIcons();
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
    toast(
      isEditing
        ? 'Task updated successfully'
        : 'Task created successfully',
      'success'
    );

    state.editingTaskId = null;
    form.reset();

    Array.from(form.elements).forEach((field) => {
      field.disabled = false;
    });

    closeModal();

    await refreshDataAndRender();
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
  }

  if (type === 'task') {
    ok = await deleteTask(id);
  }

  if (type === 'member') {
    ok = await deleteTeamMember(id);
  }

  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i> Delete`;
  refreshIcons();

  closeConfirm();

  if (ok) {
    toast(`${labelize(type)} deleted`, 'success');

    await refreshDataAndRender();

    if (currentView === 'projects') {
      setView('projects');
    } else if (currentView === 'tasks') {
      setView('tasks');
    } else if (currentView === 'team') {
      setView('team');
    } else {
      setView(currentView || 'dashboard');
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

                const assignedMember = state.teamMembers.find(
                  (m) =>
                    (m.name || '').toLowerCase().trim() ===
                    (t.assigned_to || '').toLowerCase().trim()
                );

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
                      ${
                        assignedMember
                          ? `
                            <button
                              type="button"
                              class="flex items-center gap-2 group"
                              data-action="open-member-details"
                              data-id="${assignedMember.id}"
                              title="Open member details"
                            >
                              <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                                ${initials(t.assigned_to)}
                              </div>

                              <span class="text-sm text-gray-700 group-hover:text-indigo-600 transition">
                                ${escapeHtml(t.assigned_to || '—')}
                              </span>
                            </button>
                          `
                          : `
                            <div class="flex items-center gap-2">
                              <div class="client-avatar ${avatarColor(t.assigned_to)}" style="width:1.75rem;height:1.75rem;">
                                ${initials(t.assigned_to)}
                              </div>

                              <span class="text-sm text-gray-700">
                                ${escapeHtml(t.assigned_to || '—')}
                              </span>
                            </div>
                          `
                      }
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

function calculateMemberPerformance(memberTasks) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  };

  const isOverdueIncomplete = (task) => {
    if (!task.deadline) return false;
    if ((task.status || '').toLowerCase() === 'completed') return false;

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline < today;
  };

  const monthlyTasks = memberTasks.filter((t) => {
    const status = (t.status || '').toLowerCase();

    if (status === 'completed' && isSameMonth(t.completed_at)) return true;
    if (isSameMonth(t.deadline)) return true;
    if (isOverdueIncomplete(t)) return true;

    return false;
  });

  const breakdown = {
    completedEarly: [],
    completedOnTime: [],
    completedLate: [],
    completedNoDeadline: [],
    overdueIncomplete: [],
    inReview: [],
    inProgress: [],
    todo: [],
  };

  let totalPoints = 0;

  const taskDetails = monthlyTasks.map((t) => {
    const status = (t.status || '').toLowerCase();
    let category;
    let points;
    let reason;

    if (status === 'completed') {
      if (t.deadline && t.completed_at) {
        const deadline = new Date(t.deadline);
        deadline.setHours(0, 0, 0, 0);

        const completedAt = new Date(t.completed_at);
        completedAt.setHours(0, 0, 0, 0);

        if (completedAt < deadline) {
          category = 'completedEarly';
          points = 120;
          reason = 'Completed before deadline';
        } else if (completedAt.getTime() === deadline.getTime()) {
          category = 'completedOnTime';
          points = 100;
          reason = 'Completed on deadline';
        } else {
          category = 'completedLate';
          points = 60;
          reason = 'Completed after deadline';
        }
      } else {
        category = 'completedNoDeadline';
        points = 80;
        reason = 'Completed with no deadline set';
      }
    } else if (isOverdueIncomplete(t)) {
      category = 'overdueIncomplete';
      points = -40;
      reason = 'Overdue and not completed';
    } else if (status === 'review') {
      category = 'inReview';
      points = 20;
      reason = 'In review, not overdue';
    } else if (status === 'in_progress') {
      category = 'inProgress';
      points = 10;
      reason = 'In progress, not overdue';
    } else {
      category = 'todo';
      points = 0;
      reason = 'To do, counted for this month';
    }

    totalPoints += points;
    breakdown[category].push(t);

    return { task: t, category, points, reason };
  });

  const maxPoints = monthlyTasks.length * 120;

  let performanceScore = maxPoints > 0
    ? Math.round((totalPoints / maxPoints) * 100)
    : 0;

  performanceScore = Math.min(Math.max(performanceScore, 0), 100);

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

  return {
    currentYear,
    currentMonth,
    monthlyTasks,
    taskDetails,
    breakdown,
    totalPoints,
    maxPoints,
    performanceScore,
    performanceLabel,
  };
}

function getPerformanceRankingBadge(rank, performanceScore) {
  if (performanceScore < 40) return 'Needs Attention';

  if (rank === 1) return '🥇 Top Performer';
  if (rank === 2) return '🥈 Strong Performer';
  if (rank === 3) return '🥉 Good Progress';

  return `Rank #${rank}`;
}

function isPerformanceEligibleMember(member) {
  return (member.role_type || '').toLowerCase() !== 'admin';
}

async function generatePerformanceSnapshot() {
  const period = getCurrentPerformancePeriod();

  const confirmed = window.confirm(
    `Generate performance snapshot for ${period.label}? This will update existing records for this month.`
  );

  if (!confirmed) return;

  const allPerf = state.teamMembers
    .filter(isPerformanceEligibleMember)
    .map((member) => {
      const memberTasks = state.tasks.filter(
        (t) =>
          (t.assigned_to || '').toLowerCase().trim() ===
          (member.name || '').toLowerCase().trim()
      );

      const perf = calculateMemberPerformance(memberTasks);

      return { member, perf };
    });

  const eligible = allPerf
    .filter(({ perf }) => perf.monthlyTasks.length >= 3)
    .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore);

  if (eligible.length === 0) {
    toast('Not enough data to generate snapshot.', 'error');
    return;
  }

  const now = new Date().toISOString();

  const rows = eligible.map(({ member, perf }, index) => ({
    member_id: member.id,
    month: period.month + 1,
    year: period.year,
    total_tasks: perf.monthlyTasks.length,
    completed_early: perf.breakdown.completedEarly.length,
    completed_on_time: perf.breakdown.completedOnTime.length,
    completed_late: perf.breakdown.completedLate.length,
    completed_no_deadline: perf.breakdown.completedNoDeadline.length,
    overdue_tasks: perf.breakdown.overdueIncomplete.length,
    total_points: perf.totalPoints,
    max_points: perf.maxPoints,
    score: perf.performanceScore,
    rank: index + 1,
    is_winner: index === 0,
    calculated_at: now,
    updated_at: now,
  }));

  const { error } = await supabaseClient
    .from('monthly_performance')
    .upsert(rows, { onConflict: 'member_id,month,year' });

  if (error) {
    console.error('generatePerformanceSnapshot', error);
    toast(error.message || 'Failed to save snapshot', 'error');
    return;
  }

  toast('Monthly performance snapshot saved.', 'success');
}

function getPerformanceLabelForScore(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';

  return 'Needs Improvement';
}

async function openMonthlyHistoryModal() {
  const content = $('#monthly-history-content');
  if (!content) return;

  const { data, error } = await supabaseClient
    .from('monthly_performance')
    .select('*, team_members(name, job_title, role_type)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('rank', { ascending: true });

  if (error) {
    console.error('openMonthlyHistoryModal', error);
    toast(error.message || 'Failed to load monthly history', 'error');
    return;
  }

  const eligibleData = (data || []).filter(
    (row) => (row.team_members?.role_type || '').toLowerCase() !== 'admin'
  );

  if (eligibleData.length === 0) {
    content.innerHTML = `
      <div class="px-6 py-10 text-center text-sm text-gray-500">
        No monthly performance snapshots yet.
      </div>
    `;
    openModal('monthly-history-modal');
    return;
  }

  const groups = new Map();

  eligibleData.forEach((row) => {
    const key = `${row.year}-${row.month}`;

    if (!groups.has(key)) {
      groups.set(key, { year: row.year, month: row.month, rows: [] });
    }

    groups.get(key).rows.push(row);
  });

  const sections = Array.from(groups.values()).map((group) => {
    const monthLabel = `${PERFORMANCE_MONTH_NAMES[group.month - 1]} ${group.year}`;
    const winner = group.rows.find((row) => row.is_winner);

    const winnerLine = winner
      ? `Winner: ${escapeHtml(winner.team_members?.name || 'Unknown Member')} — ${winner.score}%`
      : 'No winner recorded';

    const rows = group.rows
      .map((row) => `
        <tr class="border-b border-gray-100">
          <td class="px-4 py-2.5 text-sm font-semibold text-gray-900">#${row.rank}</td>
          <td class="px-4 py-2.5 text-sm font-medium text-gray-900">
            ${escapeHtml(row.team_members?.name || 'Unknown Member')}
            ${row.is_winner ? '<span class="badge badge-completed ml-1">🏆 Winner</span>' : ''}
          </td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${escapeHtml(row.team_members?.job_title || '—')}</td>
          <td class="px-4 py-2.5 text-sm font-semibold text-brand-700">${row.score}%</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${escapeHtml(getPerformanceLabelForScore(row.score))}</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${row.total_tasks}</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${row.total_points} / ${row.max_points}</td>
        </tr>
      `)
      .join('');

    return `
      <div class="mb-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">${escapeHtml(monthLabel)}</h3>
        <p class="text-xs text-gray-500 mb-3">${winnerLine}</p>
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="px-4 py-2.5">Rank</th>
                <th class="px-4 py-2.5">Member</th>
                <th class="px-4 py-2.5">Job Title</th>
                <th class="px-4 py-2.5">Score</th>
                <th class="px-4 py-2.5">Label</th>
                <th class="px-4 py-2.5">Total Tasks</th>
                <th class="px-4 py-2.5">Points</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  content.innerHTML = sections.join('');

  refreshIcons();
  openModal('monthly-history-modal');
}

async function openHallOfFameModal() {
  const content = $('#hall-of-fame-content');
  if (!content) return;

  const { data, error } = await supabaseClient
    .from('monthly_performance')
    .select('*, team_members(name, job_title, role_type)')
    .eq('is_winner', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('openHallOfFameModal', error);
    toast(error.message || 'Failed to load hall of fame', 'error');
    return;
  }

  const eligibleData = (data || []).filter(
    (row) => (row.team_members?.role_type || '').toLowerCase() !== 'admin'
  );

  if (eligibleData.length === 0) {
    content.innerHTML = `
      <div class="px-6 py-10 text-center text-sm text-gray-500">
        No monthly winners yet.
      </div>
    `;
    openModal('hall-of-fame-modal');
    return;
  }

  const winCounts = new Map();

  eligibleData.forEach((row) => {
    const name = row.team_members?.name || 'Unknown Member';
    winCounts.set(name, (winCounts.get(name) || 0) + 1);
  });

  let mostWinsName = '';
  let mostWinsCount = 0;

  winCounts.forEach((count, name) => {
    if (count > mostWinsCount) {
      mostWinsCount = count;
      mostWinsName = name;
    }
  });

  const latest = eligibleData[0];
  const latestLabel = `${PERFORMANCE_MONTH_NAMES[latest.month - 1]} ${latest.year}`;
  const latestName = latest.team_members?.name || 'Unknown Member';

  const summary = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <p class="text-xs text-gray-500 font-medium mb-1">Total Months Recorded</p>
        <h4 class="text-base font-semibold text-gray-900">${eligibleData.length}</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500 font-medium mb-1">Most Wins</p>
        <h4 class="text-base font-semibold text-gray-900">${escapeHtml(mostWinsName)} (${mostWinsCount})</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500 font-medium mb-1">Latest Winner</p>
        <h4 class="text-base font-semibold text-gray-900">${escapeHtml(latestName)}</h4>
        <p class="text-xs text-gray-500 mt-1">${escapeHtml(latestLabel)}</p>
      </div>
    </div>
  `;

  const entries = eligibleData
    .map((row) => {
      const monthLabel = `${PERFORMANCE_MONTH_NAMES[row.month - 1]} ${row.year}`;

      return `
        <div class="stat-card flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🏆</span>
            <div>
              <h4 class="text-sm font-semibold text-gray-900">${escapeHtml(row.team_members?.name || 'Unknown Member')}</h4>
              <p class="text-xs text-gray-500">${escapeHtml(row.team_members?.job_title || '—')}</p>
              <p class="text-xs text-gray-500 mt-1">${escapeHtml(monthLabel)} • <span class="badge badge-completed">Rank #1</span></p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-brand-700">${row.score}%</p>
            <p class="text-xs text-gray-500 mt-1">${row.total_tasks} tasks</p>
            <p class="text-xs text-gray-500 mt-1">${row.total_points} / ${row.max_points} pts</p>
          </div>
        </div>
      `;
    })
    .join('');

  content.innerHTML = summary + entries;

  refreshIcons();
  openModal('hall-of-fame-modal');
}

function renderTeamPerformance() {
  const nameEl = $('#team-best-performer-name');
  const metaEl = $('#team-best-performer-meta');
  const attentionNameEl = $('#team-needs-attention-name');
  const attentionMetaEl = $('#team-needs-attention-meta');

  if (!nameEl || !metaEl || !attentionNameEl || !attentionMetaEl) return;

  const period = getCurrentPerformancePeriod();

  const bestPeriodEl = $('#team-best-performer-period');
  const attentionPeriodEl = $('#team-needs-attention-period');
  const rankingTitleEl = $('#team-ranking-card-title');

  if (bestPeriodEl) bestPeriodEl.textContent = period.label;
  if (attentionPeriodEl) attentionPeriodEl.textContent = period.label;
  if (rankingTitleEl) rankingTitleEl.textContent = `${period.label} Performance Ranking`;

  const snapshotBtn = $('#generate-snapshot-btn');
  const snapshotLabelEl = $('#generate-snapshot-label');

  if (snapshotBtn) snapshotBtn.classList.toggle('hidden', !isAdmin());
  if (snapshotLabelEl) snapshotLabelEl.textContent = `Generate ${period.label} Snapshot`;

  const historyBtn = $('#monthly-history-btn');

  if (historyBtn) historyBtn.classList.toggle('hidden', !(isAdmin() || isManager()));

  const hallOfFameBtn = $('#hall-of-fame-btn');

  if (hallOfFameBtn) hallOfFameBtn.classList.toggle('hidden', !(isAdmin() || isManager()));

  const allPerf = state.teamMembers
    .filter(isPerformanceEligibleMember)
    .map((member) => {
      const memberTasks = state.tasks.filter(
        (t) =>
          (t.assigned_to || '').toLowerCase().trim() ===
          (member.name || '').toLowerCase().trim()
      );

      const perf = calculateMemberPerformance(memberTasks);

      return { member, perf };
    });

  const ranking = allPerf
    .filter(({ perf }) => perf.monthlyTasks.length >= 3)
    .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore);

  const notEnoughData = allPerf.filter(
    ({ perf }) => perf.monthlyTasks.length > 0 && perf.monthlyTasks.length < 3
  );

  state.teamPerformanceRanking = ranking;
  state.teamPerformanceNotEnoughData = notEnoughData;

  if (ranking.length === 0) {
    nameEl.textContent = 'Not enough data';
    metaEl.textContent = '';
    attentionNameEl.textContent = 'Not enough data';
    attentionMetaEl.textContent = '';
    return;
  }

  const best = ranking[0];
  const attention = ranking[ranking.length - 1];

  nameEl.textContent = best.member.name || 'Unknown Member';
  metaEl.textContent = `${best.perf.performanceScore}% • ${best.perf.performanceLabel}`;

  attentionNameEl.textContent = attention.member.name || 'Unknown Member';
  attentionMetaEl.textContent = `${attention.perf.performanceScore}% • ${attention.perf.performanceLabel}`;
}

function renderMyPerformance() {
  const widget = $('#my-performance-widget');
  if (!widget) return;

  const member = getCurrentMember();

  if (isAdmin() || !member) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');

  const period = getCurrentPerformancePeriod();
  const periodEl = $('#my-performance-period');
  if (periodEl) periodEl.textContent = period.label;

  const body = $('#my-performance-body');
  if (!body) return;

  const allPerf = state.teamMembers
    .filter(isPerformanceEligibleMember)
    .map((m) => {
      const memberTasks = state.tasks.filter(
        (t) =>
          (t.assigned_to || '').toLowerCase().trim() ===
          (m.name || '').toLowerCase().trim()
      );

      const perf = calculateMemberPerformance(memberTasks);

      return { member: m, perf };
    });

  const ranking = allPerf
    .filter(({ perf }) => perf.monthlyTasks.length >= 3)
    .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore);

  const mine = allPerf.find(({ member: m }) => Number(m.id) === Number(member.id));

  if (!mine || mine.perf.monthlyTasks.length < 3) {
    body.innerHTML = `<p class="text-sm text-gray-500">Not enough data this month</p>`;
    return;
  }

  const rank = ranking.findIndex(({ member: m }) => Number(m.id) === Number(member.id)) + 1;

  body.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div>
        <p class="text-xs text-gray-500">Score</p>
        <p class="text-base font-semibold text-gray-900">${mine.perf.performanceScore}%</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">Label</p>
        <p class="text-base font-semibold text-gray-900">${escapeHtml(mine.perf.performanceLabel)}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">Rank</p>
        <p class="text-base font-semibold text-gray-900">#${rank} of ${ranking.length}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">Counted Tasks</p>
        <p class="text-base font-semibold text-gray-900">${mine.perf.monthlyTasks.length}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">Points</p>
        <p class="text-base font-semibold text-gray-900">${mine.perf.totalPoints} / ${mine.perf.maxPoints}</p>
      </div>
    </div>
  `;
}

function renderTeamLeaderboard() {
  const widget = $('#team-leaderboard-widget');
  if (!widget) return;

  const member = getCurrentMember();

  if (isAdmin() || !member) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');

  const period = getCurrentPerformancePeriod();
  const periodEl = $('#team-leaderboard-period');
  if (periodEl) periodEl.textContent = period.label;

  const body = $('#team-leaderboard-body');
  if (!body) return;

  const allPerf = state.teamMembers
    .filter(isPerformanceEligibleMember)
    .map((m) => {
      const memberTasks = state.tasks.filter(
        (t) =>
          (t.assigned_to || '').toLowerCase().trim() ===
          (m.name || '').toLowerCase().trim()
      );

      const perf = calculateMemberPerformance(memberTasks);

      return { member: m, perf };
    });

  const ranking = allPerf
    .filter(({ perf }) => perf.monthlyTasks.length >= 3)
    .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore);

  if (ranking.length === 0) {
    body.innerHTML = `
      <div class="px-4 py-8 text-center text-sm text-gray-500">
        No leaderboard data yet for this month.
      </div>
    `;
    return;
  }

  const medalConfig = [
    { medal: '🥇', label: 'Rank #1', card: 'bg-amber-50 border-amber-300' },
    { medal: '🥈', label: 'Rank #2', card: 'bg-gray-50 border-gray-300' },
    { medal: '🥉', label: 'Rank #3', card: 'bg-orange-50 border-orange-200' },
  ];

  const podium = ranking
    .slice(0, 3)
    .map(({ member: m, perf }, index) => {
      const cfg = medalConfig[index];
      const isMe = Number(m.id) === Number(member.id);

      return `
        <div class="rounded-xl border ${cfg.card} p-3 text-center ${isMe ? 'ring-2 ring-brand-500' : ''}">
          <div class="text-2xl mb-1">${cfg.medal}</div>
          <p class="text-xs font-medium text-gray-500">${cfg.label}</p>
          <p class="text-sm font-semibold text-gray-900 mt-1 truncate">${escapeHtml(m.name || 'Unknown Member')}${isMe ? ' (You)' : ''}</p>
          <p class="text-lg font-bold text-brand-700 mt-1">${perf.performanceScore}%</p>
          <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(perf.performanceLabel)}</p>
          <p class="text-xs text-gray-400 mt-0.5">${perf.monthlyTasks.length} counted tasks</p>
        </div>
      `;
    })
    .join('');

  const mine = allPerf.find(({ member: m }) => Number(m.id) === Number(member.id));
  const myRankIndex = ranking.findIndex(({ member: m }) => Number(m.id) === Number(member.id));

  let myPositionHtml;
  let gapHtml = '';

  if (!mine || mine.perf.monthlyTasks.length < 3) {
    myPositionHtml = `<p class="text-sm text-gray-500">Not enough data this month</p>`;
  } else {
    const myRank = myRankIndex + 1;

    myPositionHtml = `
      <div class="grid grid-cols-3 gap-3">
        <div>
          <p class="text-xs text-gray-500">My Rank</p>
          <p class="text-base font-semibold text-gray-900">#${myRank} of ${ranking.length}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">My Score</p>
          <p class="text-base font-semibold text-gray-900">${mine.perf.performanceScore}%</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Label</p>
          <p class="text-base font-semibold text-gray-900">${escapeHtml(mine.perf.performanceLabel)}</p>
        </div>
      </div>
    `;

    if (myRank === 1) {
      gapHtml = `<p class="text-xs text-emerald-600 font-medium mt-3">You are currently leading this month.</p>`;
    } else {
      const aboveScore = ranking[myRankIndex - 1].perf.performanceScore;
      const gap = aboveScore - mine.perf.performanceScore;

      gapHtml = `<p class="text-xs text-gray-500 mt-3">Need ${gap} point${gap === 1 ? '' : 's'} to pass Rank #${myRank - 1}</p>`;
    }
  }

  body.innerHTML = `
    <div class="grid grid-cols-3 gap-2">
      ${podium}
    </div>
    <div class="mt-4 pt-4 border-t border-gray-100">
      <p class="text-xs font-medium text-gray-500 mb-2">My Position</p>
      ${myPositionHtml}
      ${gapHtml}
    </div>
  `;
}

async function renderMyPerformanceTrend() {
  const widget = $('#my-performance-trend-widget');
  if (!widget) return;

  const member = getCurrentMember();

  if (isAdmin() || !member) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');

  const body = $('#my-performance-trend-body');
  if (!body) return;

  const { data, error } = await supabaseClient
    .from('monthly_performance')
    .select('year, month, score')
    .eq('member_id', member.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(6);

  if (error) {
    console.error('renderMyPerformanceTrend', error);
    body.innerHTML = `<p class="text-sm text-gray-500">Unable to load performance history.</p>`;
    return;
  }

  const rows = (data || []).slice().reverse();

  if (rows.length === 0) {
    body.innerHTML = `<p class="text-sm text-gray-500">No performance history yet.</p>`;
    return;
  }

  if (rows.length === 1) {
    const only = rows[0];

    body.innerHTML = `
      <p class="text-2xl font-bold text-gray-900">${only.score}%</p>
      <p class="text-xs text-gray-500 mt-1">${PERFORMANCE_MONTH_NAMES[only.month - 1]} ${only.year}</p>
      <p class="text-xs text-gray-500 mt-3">Not enough history to show trend.</p>
    `;
    return;
  }

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const diff = latest.score - previous.score;

  let trendIcon = '➡️';
  let trendLabel = 'Stable';
  let trendClass = 'text-gray-500';

  if (diff > 0) {
    trendIcon = '⬆️';
    trendLabel = 'Up';
    trendClass = 'text-emerald-600';
  } else if (diff < 0) {
    trendIcon = '⬇️';
    trendLabel = 'Down';
    trendClass = 'text-rose-600';
  }

  const diffLabel = diff > 0 ? `+${diff}%` : `${diff}%`;

  const maxScore = Math.max(...rows.map((r) => r.score), 1);

  const bars = rows
    .map((row) => {
      const heightPct = Math.max((row.score / maxScore) * 100, 4);
      const monthLabel = PERFORMANCE_MONTH_NAMES[row.month - 1].slice(0, 3);

      return `
        <div class="flex flex-col items-center gap-1 flex-1">
          <p class="text-xs font-semibold text-gray-700">${row.score}%</p>
          <div class="w-full bg-gray-100 rounded-md flex items-end" style="height: 80px;">
            <div class="w-full bg-brand-500 rounded-md" style="height: ${heightPct}%;"></div>
          </div>
          <p class="text-xs text-gray-500">${escapeHtml(monthLabel)} ${row.year}</p>
        </div>
      `;
    })
    .join('');

  body.innerHTML = `
    <div class="mb-3">
      <p class="text-xs text-gray-500">Latest vs Previous</p>
      <p class="text-base font-semibold ${trendClass}">${trendIcon} ${trendLabel} (${diffLabel})</p>
    </div>
    <div class="flex items-end gap-2">
      ${bars}
    </div>
  `;
}

function openPerformanceRankingModal() {
  const content = $('#performance-ranking-content');
  if (!content) return;

  const ranking = state.teamPerformanceRanking;
  const notEnoughData = state.teamPerformanceNotEnoughData || [];

  const period = getCurrentPerformancePeriod();
  const monthTitle = `${period.label} Ranking`;
  const periodSubtitle = `<p class="text-xs text-gray-500 mb-3">Performance period: ${escapeHtml(period.rangeLabel)}</p>`;

  const notEnoughDataSection = notEnoughData.length
    ? `
      <div class="mt-5">
        <h4 class="text-sm font-semibold text-gray-900 mb-2">Not Enough Data</h4>
        <p class="text-xs text-gray-500 mb-2">These members have fewer than 3 counted tasks this month and are not ranked yet.</p>
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="px-4 py-2.5">Member</th>
                <th class="px-4 py-2.5">Job Title</th>
                <th class="px-4 py-2.5">Counted Tasks</th>
              </tr>
            </thead>
            <tbody>
              ${notEnoughData
                .map(
                  ({ member, perf }) => `
                    <tr class="border-b border-gray-100">
                      <td class="px-4 py-2.5 text-sm font-medium text-gray-900">${escapeHtml(member.name || 'Unknown Member')}</td>
                      <td class="px-4 py-2.5 text-sm text-gray-600">${escapeHtml(member.job_title || '—')}</td>
                      <td class="px-4 py-2.5 text-sm text-gray-600">${perf.monthlyTasks.length}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
    : '';

  if (!ranking.length) {
    content.innerHTML = `
      <h3 class="text-base font-semibold text-gray-900 mb-3">${escapeHtml(monthTitle)}</h3>
      ${periodSubtitle}
      <div class="px-6 py-10 text-center text-sm text-gray-500">
        Not enough data to show a ranking yet.
      </div>
      ${notEnoughDataSection}
    `;
    refreshIcons();
    openModal('performance-ranking-modal');
    return;
  }

  const rows = ranking
    .map(({ member, perf }, index) => {
      const rank = index + 1;
      const badge = getPerformanceRankingBadge(rank, perf.performanceScore);

      return `
        <tr class="border-b border-gray-100">
          <td class="px-4 py-2.5 text-sm font-semibold text-gray-900">#${rank}</td>
          <td class="px-4 py-2.5 text-sm text-gray-700">${escapeHtml(badge)}</td>
          <td class="px-4 py-2.5 text-sm font-medium text-gray-900">${escapeHtml(member.name || 'Unknown Member')}</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${escapeHtml(member.job_title || '—')}</td>
          <td class="px-4 py-2.5 text-sm font-semibold text-brand-700">${perf.performanceScore}%</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${escapeHtml(perf.performanceLabel)}</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${perf.monthlyTasks.length}</td>
          <td class="px-4 py-2.5 text-sm text-gray-600">${perf.totalPoints} / ${perf.maxPoints}</td>
        </tr>
      `;
    })
    .join('');

  content.innerHTML = `
    <h3 class="text-base font-semibold text-gray-900 mb-3">${escapeHtml(monthTitle)}</h3>
    ${periodSubtitle}
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th class="px-4 py-2.5">Rank</th>
            <th class="px-4 py-2.5">Badge</th>
            <th class="px-4 py-2.5">Member</th>
            <th class="px-4 py-2.5">Job Title</th>
            <th class="px-4 py-2.5">Score</th>
            <th class="px-4 py-2.5">Label</th>
            <th class="px-4 py-2.5">Counted Tasks</th>
            <th class="px-4 py-2.5">Points</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    ${notEnoughDataSection}
  `;

  refreshIcons();
  openModal('performance-ranking-modal');
}

function openMemberDetails(memberId) {
  const member = state.teamMembers.find(
    (m) => Number(m.id) === Number(memberId)
  );

  if (!member) return;

state.selectedMemberId = Number(memberId);

localStorage.setItem(
  'tgora_selected_member_id',
  memberId
);

  const memberTasks = state.tasks.filter(
    (t) =>
      (t.assigned_to || '').toLowerCase().trim() ===
      (member.name || '').toLowerCase().trim()
  );

  const todoTasks = memberTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'todo'
  );

  const inProgressTasks = memberTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'in_progress'
  );

  const reviewTasks = memberTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'review'
  );

  const completedTasks = memberTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
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

  const { performanceScore, performanceLabel } = calculateMemberPerformance(memberTasks);

  $('#member-details-name').textContent = member.name || 'Unknown Member';
  $('#member-details-role').textContent = member.job_title || 'No Job Title';

  $('#member-details-status').innerHTML = `
    <span class="dot"></span>
    ${escapeHtml(member.status || '—')}
  `;

  $('#member-total-tasks').textContent = totalTasks;
  $('#member-todo-tasks').textContent = todoTasks.length;
  $('#member-progress-tasks').textContent = inProgressTasks.length;
  $('#member-review-tasks').textContent = reviewTasks.length;
  $('#member-completed-tasks').textContent = completedCount;
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

    performanceLabelEl.textContent = `${emoji} ${performanceLabel}`;
  }

  const tbody = $('#member-tasks-table-body');

  function renderMemberTasksTable(tasks) {
    if (!tbody) return;

    if (tasks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-400">
            No tasks found for this filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tasks
      .map((task) => {
        const project = state.projects.find(
          (p) => Number(p.id) === Number(task.project_id)
        );

        const taskStatus = (task.status || 'todo').toLowerCase();
        const taskPriority = (task.priority || 'medium').toLowerCase();

        const materialsLink = task.materials_link
          ? `<a href="${escapeHtml(task.materials_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open materials"><i data-lucide="paperclip" class="w-4 h-4"></i></a>`
          : '';

        const taskLink = task.task_link
          ? `<a href="${escapeHtml(task.task_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open task link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
          : '';

        return `
          <tr class="hover:bg-gray-50 transition">
            <td class="px-5 py-3.5 max-w-sm">
              <button
                type="button"
                class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 text-left"
                data-action="open-task-details"
                data-id="${task.id}"
              >
                ${escapeHtml(task.task_info || 'Untitled Task')}
              </button>

              <p class="text-[11px] text-gray-500">
                Start ${fmtDate(task.start_date)}
              </p>
            </td>

            <td class="px-5 py-3.5">
              ${
                project
                  ? `
                    <button
                      type="button"
                      class="text-brand-600 hover:text-brand-700 hover:underline font-medium text-left"
                      data-action="open-project-details"
                      data-id="${project.id}"
                    >
                      ${escapeHtml(project.project_name)}
                    </button>
                  `
                  : '—'
              }
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

            <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(task.deadline)}">
              ${fmtDate(task.deadline)}
            </td>

            <td class="px-5 py-3.5 text-right">
              <div class="inline-flex items-center gap-1">
                ${materialsLink}
                ${taskLink}

                <button class="icon-btn" data-action="edit-task" data-id="${task.id}" title="Edit task">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>

                ${
                  isAdmin() || isManager()
                    ? `
                      <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" title="Delete task">
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


  function activateCard(cardEl) {
    const cards = [
      $('#member-total-tasks'),
      $('#member-todo-tasks'),
      $('#member-progress-tasks'),
      $('#member-review-tasks'),
      $('#member-completed-tasks'),
      $('#member-overdue-tasks')
    ]
      .map((el) => el?.closest('.stat-card'))
      .filter(Boolean);

    cards.forEach((card) => {
      card.classList.remove('ring-2', 'ring-brand-500', 'border-brand-500');
    });

    if (cardEl) {
      cardEl.classList.add('ring-2', 'ring-brand-500', 'border-brand-500');
    }
  }

  const totalCard = $('#member-total-tasks')?.closest('.stat-card');
  const todoCard = $('#member-todo-tasks')?.closest('.stat-card');
  const progressCard = $('#member-progress-tasks')?.closest('.stat-card');
  const reviewCard = $('#member-review-tasks')?.closest('.stat-card');
  const completedCard = $('#member-completed-tasks')?.closest('.stat-card');
  const overdueCard = $('#member-overdue-tasks')?.closest('.stat-card');

  if (totalCard) {
    totalCard.classList.add('cursor-pointer');
    totalCard.onclick = () => {
      activateCard(totalCard);
      renderMemberTasksTable(memberTasks);
    };
  }

  if (todoCard) {
    todoCard.classList.add('cursor-pointer');
    todoCard.onclick = () => {
      activateCard(todoCard);
      renderMemberTasksTable(todoTasks);
    };
  }

  if (progressCard) {
    progressCard.classList.add('cursor-pointer');
    progressCard.onclick = () => {
      activateCard(progressCard);
      renderMemberTasksTable(inProgressTasks);
    };
  }

  if (reviewCard) {
    reviewCard.classList.add('cursor-pointer');
    reviewCard.onclick = () => {
      activateCard(reviewCard);
      renderMemberTasksTable(reviewTasks);
    };
  }

  if (completedCard) {
    completedCard.classList.add('cursor-pointer');
    completedCard.onclick = () => {
      activateCard(completedCard);
      renderMemberTasksTable(completedTasks);
    };
  }

  if (overdueCard) {
    overdueCard.classList.add('cursor-pointer');
    overdueCard.onclick = () => {
      activateCard(overdueCard);
      renderMemberTasksTable(overdueTasks);
    };
  }

  const performanceCard = $('#member-performance-score')?.closest('.stat-card');

  if (performanceCard) {
    performanceCard.classList.add('cursor-pointer');
    performanceCard.onclick = () => {
      openPerformanceDetailsModal();
    };
  }

  renderMemberTasksTable(memberTasks);
  activateCard(totalCard);

  setView('team-member');
}

const PERFORMANCE_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentPerformancePeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = PERFORMANCE_MONTH_NAMES[month];
  const lastDay = new Date(year, month + 1, 0).getDate();

  return {
    year,
    month,
    monthName,
    label: `${monthName} ${year}`,
    rangeLabel: `${monthName} 1–${lastDay}, ${year}`,
  };
}

function openPerformanceDetailsModal() {
  const member = state.teamMembers.find(
    (m) => Number(m.id) === Number(state.selectedMemberId)
  );

  if (!member) return;

  const memberTasks = state.tasks.filter(
    (t) =>
      (t.assigned_to || '').toLowerCase().trim() ===
      (member.name || '').toLowerCase().trim()
  );

  const perf = calculateMemberPerformance(memberTasks);

  const titleEl = $('#performance-details-title');
  if (titleEl) {
    titleEl.textContent = `Performance Details — ${member.name || 'Unknown Member'}`;
  }

  const content = $('#performance-details-content');
  if (!content) return;

  const period = getCurrentPerformancePeriod();

  const breakdownItems = [
    { label: 'Completed Early', count: perf.breakdown.completedEarly.length, points: '+120' },
    { label: 'Completed On Time', count: perf.breakdown.completedOnTime.length, points: '+100' },
    { label: 'Completed Late', count: perf.breakdown.completedLate.length, points: '+60' },
    { label: 'Completed (No Deadline)', count: perf.breakdown.completedNoDeadline.length, points: '+80' },
    { label: 'Overdue Incomplete', count: perf.breakdown.overdueIncomplete.length, points: '-40' },
    { label: 'In Review', count: perf.breakdown.inReview.length, points: '+20' },
    { label: 'In Progress', count: perf.breakdown.inProgress.length, points: '+10' },
    { label: 'To Do', count: perf.breakdown.todo.length, points: '0' },
  ];

  const tableRows = perf.taskDetails.length
    ? perf.taskDetails
      .map(({ task, points, reason }) => {
        const taskStatus = (task.status || 'todo').toLowerCase();
        const pointsClass = points > 0 ? 'text-green-600' : (points < 0 ? 'text-red-600' : 'text-gray-500');
        const pointsLabel = points > 0 ? `+${points}` : `${points}`;

        return `
          <tr class="border-b border-gray-100">
            <td class="px-4 py-2.5 text-sm text-gray-900">${escapeHtml(task.task_info || 'Untitled Task')}</td>
            <td class="px-4 py-2.5">
              <span class="badge badge-${taskStatus}">
                <span class="dot"></span>
                ${labelize(taskStatus)}
              </span>
            </td>
            <td class="px-4 py-2.5 text-sm text-gray-600">${fmtDate(task.deadline)}</td>
            <td class="px-4 py-2.5 text-sm text-gray-600">${task.completed_at ? fmtDate(task.completed_at) : '—'}</td>
            <td class="px-4 py-2.5 text-sm font-semibold ${pointsClass}">${pointsLabel}</td>
            <td class="px-4 py-2.5 text-sm text-gray-500">${escapeHtml(reason)}</td>
          </tr>
        `;
      })
      .join('')
    : `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-sm text-gray-400">
          No tasks counted for this month.
        </td>
      </tr>
    `;

  content.innerHTML = `
    <div class="text-xs text-gray-500 mb-4">Performance period: ${escapeHtml(period.label)}</div>

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      <div class="stat-card">
        <p class="text-xs text-gray-500">Score</p>
        <h4 class="text-xl font-bold text-brand-700 mt-1">${perf.performanceScore}%</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500">Label</p>
        <h4 class="text-sm font-semibold text-gray-900 mt-1">${escapeHtml(perf.performanceLabel)}</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500">Counted Tasks</p>
        <h4 class="text-xl font-bold text-gray-900 mt-1">${perf.monthlyTasks.length}</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500">Total Points</p>
        <h4 class="text-xl font-bold text-gray-900 mt-1">${perf.totalPoints}</h4>
      </div>
      <div class="stat-card">
        <p class="text-xs text-gray-500">Max Points</p>
        <h4 class="text-xl font-bold text-gray-900 mt-1">${perf.maxPoints}</h4>
      </div>
    </div>

    <h4 class="text-sm font-semibold text-gray-900 mb-2">Breakdown</h4>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      ${breakdownItems
        .map(
          (item) => `
            <div class="stat-card">
              <p class="text-xs text-gray-500">${item.label}</p>
              <h4 class="text-lg font-semibold text-gray-900 mt-1">${item.count}</h4>
              <p class="text-[11px] text-gray-400 mt-0.5">${item.points} pts each</p>
            </div>
          `
        )
        .join('')}
    </div>

    <h4 class="text-sm font-semibold text-gray-900 mb-2">Points Explanation</h4>
    <ul class="text-xs text-gray-600 space-y-1 mb-5 list-disc pl-5">
      <li>Completed before deadline: <strong>+120</strong></li>
      <li>Completed on deadline: <strong>+100</strong></li>
      <li>Completed after deadline: <strong>+60</strong></li>
      <li>Completed with no deadline: <strong>+80</strong></li>
      <li>Overdue and not completed: <strong>-40</strong></li>
      <li>In Review (not overdue): <strong>+20</strong></li>
      <li>In Progress (not overdue): <strong>+10</strong></li>
      <li>To Do: <strong>0</strong></li>
    </ul>

    <h4 class="text-sm font-semibold text-gray-900 mb-2">Counted Tasks</h4>
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th class="px-4 py-2.5">Task</th>
            <th class="px-4 py-2.5">Status</th>
            <th class="px-4 py-2.5">Deadline</th>
            <th class="px-4 py-2.5">Completed At</th>
            <th class="px-4 py-2.5">Points</th>
            <th class="px-4 py-2.5">Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  refreshIcons();
  openModal('performance-details-modal');
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
    state.editingTaskId = null;

    const form = $('#task-form');

    if (form) {
      form.reset();

      Array.from(form.elements).forEach((field) => {
        field.disabled = false;
      });
    }

    syncTaskProjectSelect();
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

  localStorage.setItem(
    'tgora_selected_project_id',
    id
  );

  window.history.pushState(
    { view: 'project-details', projectId: id },
    '',
    `#project-details-${id}`
  );

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

  window.history.pushState(
    { view: 'team-member', memberId },
    '',
    `#team-member-${memberId}`
  );

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
  state.editingTaskId = null;

  const form = $('#task-form');

  if (form) {
    form.reset();

    Array.from(form.elements).forEach((field) => {
      field.disabled = false;
    });
  }

  syncTaskProjectSelect();
  openModal('task-modal');
  return;
}

  if (action === 'open-member-modal') {
  openCreateMemberModal();
  return;
}

  if (action === 'open-performance-ranking') {
    openPerformanceRankingModal();
    return;
  }

  if (action === 'generate-performance-snapshot') {
    generatePerformanceSnapshot();
    return;
  }

  if (action === 'open-monthly-history') {
    openMonthlyHistoryModal();
    return;
  }

  if (action === 'open-hall-of-fame') {
    openHallOfFameModal();
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

document.addEventListener('click', async (e) => {
  const notificationsBtn = e.target.closest('#notifications-btn');
  const notificationsDropdown = $('#notifications-dropdown');
  const alertsBtn = e.target.closest('#alerts-btn');
  const alertsDropdown = $('#alerts-dropdown');

  if (notificationsBtn) {
    e.stopPropagation();

    alertsDropdown?.classList.add('hidden');
    notificationsDropdown?.classList.toggle('hidden');
    return;
  }

  if (alertsBtn) {
    e.stopPropagation();

    notificationsDropdown?.classList.add('hidden');
    alertsDropdown?.classList.toggle('hidden');
    return;
  }

  const alertsFilterTab = e.target.closest('.alerts-filter-tab');

  if (alertsFilterTab) {
    e.stopPropagation();

    state.alertsFilter = alertsFilterTab.dataset.filter;
    renderAlerts();
    return;
  }

  const alertItem = e.target.closest('.alert-item');

  if (alertItem) {
    const kind = alertItem.dataset.kind;
    const entityId = Number(alertItem.dataset.id);

    alertsDropdown?.classList.add('hidden');

    if (kind === 'task' && entityId) {
      openTaskDetailsModal(entityId);
      return;
    }

    if (kind === 'project' && entityId) {
      state.selectedProjectId = entityId;

      localStorage.setItem(
        'tgora_selected_project_id',
        entityId
      );

      setView('project-details');
      renderProjectDetails();
      return;
    }

    return;
  }

  const markAllReadBtn = e.target.closest('#notifications-mark-all-read');

  if (markAllReadBtn) {
    e.stopPropagation();

    await markAllNotificationsAsRead();
    await refreshNotifications();
    return;
  }

  const clearReadBtn = e.target.closest('#notifications-clear-read');

  if (clearReadBtn) {
    e.stopPropagation();

    await clearReadNotifications();
    await refreshNotifications();
    return;
  }

  const deleteBtn = e.target.closest('.notification-delete-btn');

  if (deleteBtn) {
    e.stopPropagation();

    const id = Number(deleteBtn.dataset.id);

    await deleteNotification(id);
    await refreshNotifications();
    return;
  }

  const item = e.target.closest('.notification-item');

if (item) {
  const id = Number(item.dataset.id);
  const entityType = item.dataset.entityType;
  const entityId = Number(item.dataset.entityId);

  await markNotificationAsRead(id);
  await refreshNotifications();

  $('#notifications-dropdown')?.classList.add('hidden');

  if (entityType === 'task' && entityId) {
    openTaskDetailsModal(entityId);
    return;
  }

  if (entityType === 'project' && entityId) {
    state.selectedProjectId = entityId;

    localStorage.setItem(
      'tgora_selected_project_id',
      entityId
    );

    setView('project-details');
    renderProjectDetails();
    return;
  }

  if (entityType === 'team_member' && entityId) {
    openMemberDetails(entityId);
    return;
  }

  return;
}

  if (!e.target.closest('#notifications-dropdown')) {
    notificationsDropdown?.classList.add('hidden');
  }

  if (!e.target.closest('#alerts-dropdown')) {
    alertsDropdown?.classList.add('hidden');
  }
});

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
  
  console.log('LOGIN BUTTON CLICKED');

  const email = $('#login-email').value;
  const password = $('#login-password').value;
  const errorEl = $('#login-error');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorEl.textContent = error.message || 'Login failed';
      errorEl.classList.remove('hidden');
      return;
    }

    console.log('Login success:', data);

    $('#auth-screen').classList.add('hidden');

    await init();

  } catch (err) {
    console.error('Login/init error:', err);

    errorEl.textContent = err.message || 'Something went wrong after login';
    errorEl.classList.remove('hidden');

    $('#auth-screen').classList.remove('hidden');
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

function subscribeToRealtimeChanges() {
  
  const channel = supabaseClient.channel(
    'tgora-os-realtime',
    {
      config: {
        broadcast: {
          self: true
        }
      }
    }
  );

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      async (payload) => {
        console.log('Realtime tasks change:', payload);
        
        await refreshDataAndRender();

        console.log('Tasks realtime refresh completed');
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
      },
      async (payload) => {
        console.log('Realtime projects change:', payload);
        console.log('Refreshing data after projects change...');

        await refreshDataAndRender();

        console.log('Projects realtime refresh completed');
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'team_members',
      },
      async (payload) => {
        console.log('Realtime team_members change:', payload);
        console.log('Refreshing data after team_members change...');

        await refreshDataAndRender();

        console.log('Team members realtime refresh completed');
      }
    );

  if (state.currentUser?.id) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${state.currentUser.id}`,
      },
      async (payload) => {
        console.log('Realtime notifications change:', payload);

        await refreshNotifications();

        console.log('Notifications realtime refresh completed');
      }
    );
  }

  channel.subscribe((status) => {
    console.log('Realtime status:', status);
  });
}

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

    if (user?.id) {
      const matchedMember = state.teamMembers.find(
        (member) => String(member.auth_user_id || '') === String(user.id)
      );

      state.currentMember = matchedMember || null;
      state.currentRole = matchedMember?.role_type || 'member';
    } else {
      state.currentMember = null;
      state.currentRole = null;
    }

    await cleanupOldNotifications();
    state.notifications = await fetchNotifications();

  } catch (err) {
    console.error(err);
    toast('Could not connect to supabaseClient. Check your credentials.', 'error');
  }

  console.log('Current User:', state.currentUser);
  console.log('Current Member:', state.currentMember);
  console.log('Current Role:', state.currentRole);

  renderAll();
renderAlerts();
renderNotifications();
updateSidebarUserCard();
subscribeToRealtimeChanges();
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = $('#login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('Login form listener attached');
  } else {
    console.error('Login form not found');
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    $('#auth-screen').classList.add('hidden');
    await init();
  }
});