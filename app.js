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
  selectedLeadId: Number(localStorage.getItem('tgora_selected_lead_id')) || null,
  editingMemberId: null,
  editingTaskId: null,
  editingProjectId: null,
  editingPaymentScheduleItemId: null,
  reviewingPaymentScheduleItemId: null, // Sprint Project Commercial C2 — open Review Differences modal target
  collectingPaymentItemId: null, // Finance Completion Sprint — open Collect Payment modal target
  filters: {
    projects: {
      status: 'all',
      search: '',
      priority: 'all',
      client: null,
      deadline: null,
      archiveView: 'active', // 'active' | 'archived' | 'all'
    },
    tasks: {
      status: 'all',
      search: '',
      priority: 'all',
      project: null,
      assignee: null,
      deadline: null,
      archiveView: 'active', // 'active' | 'archived' | 'all'
    },
    team: {
      search: '',
    },
    projectDetails: {
      status: 'all',
      search: '',
      priority: 'all',
      assignee: null,
      deadline: null,
    },
    memberTasks: {
      status: 'all',
      priority: 'all',
      project: null,
      deadline: null,
    },
    selectedProjectId: null,
    crmLeads: {
      archived: 'active',
      search: '',
      source: 'all',
      priority: 'all',
      status: 'all',
      owner: null,
      client: null, // Sprint CRM-4.5A — Company filter
      lead: null, // Sprint CRM-4.5A fix pass
      lastActivity: null, // Sprint CRM-4.5A fix pass
    },
    crmClients: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      industry: null, // Sprint CRM-4.5A
      company: null, // Sprint CRM-4.5A fix pass
      // Sprint CRM-4.5B — Owner filter removed along with the Owner column;
      // owner_id itself is untouched in the database.
    },
    crmContacts: {
      archived: 'active',
      search: '',
      status: 'all',
      client: null,
      name: null, // Sprint CRM-4.5A fix pass
      phone: null, // Sprint CRM-4.5A fix pass
      email: null, // Sprint CRM-4.5A fix pass
    },
    // Sprint CRM-4.5A — crm_deals has no `status` column; this field predates
    // this sprint, is never set by any form, and is left untouched/unused
    // rather than removed (out of scope: filter cleanup, not a data-model fix).
    crmDeals: {
      archived: 'active',
      search: '',
      stage: 'all',
      status: 'all',
      client: null,
      owner: null,
      deal: null, // Sprint CRM-4.5A fix pass
      value: null, // Sprint CRM-4.5A fix pass
      closeDate: null, // Sprint CRM-4.5A fix pass
    },
    crmActivities: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      client: null,
      owner: null,
      activity: null, // Sprint CRM-4.5A fix pass
      date: null, // Sprint CRM-4.5A fix pass
    },
    crmProposals: {
      archived: 'active',
      search: '',
      status: 'all',
      client: null,
      proposal: null, // Sprint CRM-4.5A fix pass
      amount: null, // Sprint CRM-4.5A fix pass
      sentDate: null, // Sprint CRM-4.5A fix pass
      owner: null, // Sprint CRM-4.5A fix pass
    },
    financeTransactions: { search: '', type: 'all', account: '', archived: 'active' },
    financeAccounts:     { search: '' },
    financeForecasts:    { search: '', type: 'all', status: 'all', archived: 'active', source: 'all', component: 'all' },
  },
  pendingDelete: null, // { type: 'project' | 'task', id }
  projectCommercialTerms: [],
  projectPaymentScheduleItems: [],
  crmLeads: [],
  crmClients: [],
  crmContacts: [],
  crmDeals: [],
  crmActivities: [],
  crmNotes: [],
  crmProposals: [],
  crmServiceTypes: [],
  crmTab: 'dashboard',
  selectedClientId: Number(localStorage.getItem('tgora_selected_client_id')) || null,
  selectedDealId: Number(localStorage.getItem('tgora_selected_deal_id')) || null,
  selectedContactId: Number(localStorage.getItem('tgora_selected_contact_id')) || null,
  editingLeadId: null,
  editingClientId: null,
  editingContactId: null,
  editingDealId: null,
  editingActivityId: null,
  editingNoteId: null,
  editingProposalId: null,
  // Sprint CRM-4 — set while the Deal modal is open in "Create Deal from
  // Lead" mode, so handleDealSubmit() knows to return the user to that
  // Lead's details page instead of the generic Deals tab. Always reset to
  // null by openNewDealModal()/openEditDealModal() so a cancelled or
  // unrelated deal creation never leaks a stale redirect target.
  dealCreationSourceLeadId: null,
  // Sprint CRM-5 — set while the New Project modal is open in "Create
  // Project from Deal" mode, so handleProjectSubmit() knows to attach
  // deal_id to the new Project and return the user to that Deal's
  // details instead of the generic Projects view. Always reset to null
  // by openCreateProjectModal()/openEditProjectModal() and cleared after
  // submit so a cancelled or unrelated project creation never leaks a
  // stale link.
  projectCreationSourceDealId: null,
  financeAccounts: [],
  financeCategories: [],
  financeTransactions: [],
  financeForecasts: [],
  financeSettings: [],
  financeFixedCosts: [],
  financeChartOfAccounts: [],
  accountingJournal: [], // in-memory General Journal (Sprint 4.3D) — posted entries only, no persistence
  accountingReportTab: 'trialBalance', // Accounting Reports statement selector (Sprint 4.5A)
  financeTab: 'dashboard',
  financeDateRange:   localStorage.getItem('tgora_finance_date_range')   || 'this_month',
  financeCustomStart: localStorage.getItem('tgora_finance_custom_start') || '',
  financeCustomEnd:   localStorage.getItem('tgora_finance_custom_end')   || '',
  editingFinanceAccountId: null,
  editingFinanceTransactionId: null,
  editingFinanceForecastId: null,
  memberTasksBase: [],       // all tasks for the currently viewed member (set in openMemberDetails)
  memberTasksCardBase: null, // card-filtered subset; null = show all member tasks
  leadEditReturnView: null,
  alertsFilter: 'all', // 'all' | 'overdue' | 'due_today'
  teamPerformanceRanking: [],
  teamPerformanceNotEnoughData: [],
  tasksViewMode: localStorage.getItem('tgora_tasks_view_mode') || 'table',
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

// ---------- Table Cell & Action Renderers ----------
// First layer of the reusable Table System (Sprint 2.8.1A). Pure, presentation-only
// helpers extracted from renderTasks(). They take plain data/flags and return markup
// fragments — no role checks, no DOM lookups, no side effects.
const renderStatusBadge = (status) => `
  <span class="badge badge-${status}">
    <span class="dot"></span>
    ${labelize(status)}
  </span>
`;

const renderPriorityBadge = (priority) => `
  <span class="badge priority-${priority}">
    <span class="dot"></span>
    ${labelize(priority)}
  </span>
`;

const renderDeadlineCell = (deadline) => `
  <td class="px-5 py-3.5 text-sm text-gray-700 ${deadlineClass(deadline)}">
    ${fmtDate(deadline)}
  </td>
`;

const renderTaskLinkIcons = (task) => {
  const materialsLink = task.materials_link
    ? `<a href="${escapeHtml(task.materials_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open materials"><i data-lucide="paperclip" class="w-4 h-4"></i></a>`
    : '';

  const taskLink = task.task_link
    ? `<a href="${escapeHtml(task.task_link)}" target="_blank" rel="noopener" class="icon-btn" title="Open task link"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
    : '';

  return `${materialsLink}\n${taskLink}`;
};

// canDelete/canEdit must be computed by the caller (e.g. isAdmin() || isManager(),
// or canFullyEditTask() || canLimitedEditTask(task)) — this helper deliberately
// does not contain role logic. canEdit defaults to true so existing call sites
// that never gated the Edit button keep their current behavior unchanged.
// canRestore defaults to false so the two existing call sites that don't pass
// it (project details, member tasks) are unaffected — Sprint 3.1C.2 only
// wires it up from the main Tasks table's Archived view.
const renderTaskActionsCell = (task, options = {}) => {
  const { canDelete = false, canEdit = true, canRestore = false } = options;

  return `
    <td class="px-5 py-3.5 text-right">
      <div class="inline-flex items-center gap-1">
        ${renderTaskLinkIcons(task)}

        ${
          canRestore
            ? `
              <button class="icon-btn" data-action="restore-task" data-id="${task.id}" title="Restore to Active">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              </button>
            `
            : ''
        }

        ${
          canEdit
            ? `
              <button class="icon-btn" data-action="edit-task" data-id="${task.id}" title="Edit task">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
            `
            : ''
        }

        ${
          canDelete
            ? `
              <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" title="Delete task">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            `
            : ''
        }
      </div>
    </td>
  `;
};

// canManage/canDelete must be computed by the caller (e.g. isAdmin(),
// canEditTeamMember(), canDeleteTeamMember()) — this helper deliberately
// does not contain role logic, matching renderTaskActionsCell() above.
// Unlike renderTaskActionsCell(), this does NOT include the surrounding
// <td> — its two call sites (renderTeam(), setView()) use different <td>
// classes, so each keeps its own wrapper and only delegates the inner
// actions/"View only" markup that was previously duplicated between them
// (Sprint 2.10B).
const renderMemberActionsCell = (member, options = {}) => {
  const { canManage = false, canDelete = false } = options;

  if (!canManage) {
    return '<span class="text-xs text-gray-400">View only</span>';
  }

  return `
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
        canDelete
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
  `;
};

// Row-level deadline highlight for the Tasks table only (Sprint 2.8.1A-fix).
// Deliberately separate from deadlineClass() — that helper stays cell/text-only
// and status-blind; this one is row-level and status-aware (excludes
// completed/on_hold tasks from the overdue/soon warning).
const renderTaskDeadlineRowClass = (task) => {
  if (!task) return '';

  const status = (task.status || '').toLowerCase();
  if (status === 'completed' || status === 'on_hold') return '';

  if (!task.deadline) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(task.deadline);
  target.setHours(0, 0, 0, 0);
  const diff = (target - today) / (1000 * 60 * 60 * 24);

  if (diff < 0) return 'task-row-overdue';
  if (diff <= 3) return 'task-row-soon';
  return '';
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

// ---------- UI Component: Button ----------
// Foundation layer only (Sprint 2.9F.1): Contract + Validator + Normalizer.
// Per Tgora Button Specification v1.0. No renderer, DOM adapter, state
// manager, or CSS exists yet, and nothing in the app calls this yet.

const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'destructive',
  'ghost',
  'text',
  'success',
  'warning',
  'info',
  'icon',
];

const BUTTON_SIZES = ['xs', 'sm', 'md', 'lg'];

// Throws on contract violations — validation is a hard gate, not a warning,
// per the Component Blueprint (Sprint 2.9C.2).
function validateButtonConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Button: config must be an object');
  }

  if (!config.variant) {
    throw new Error('Button: variant is required');
  }
  if (!BUTTON_VARIANTS.includes(config.variant)) {
    throw new Error(`Button: invalid variant "${config.variant}"`);
  }

  if (config.size !== undefined && !BUTTON_SIZES.includes(config.size)) {
    throw new Error(`Button: invalid size "${config.size}"`);
  }

  if (config.text !== undefined && config.html !== undefined) {
    throw new Error('Button: text and html cannot both be set');
  }

  if (config.iconPosition === 'only' && !config.ariaLabel && !config.text) {
    throw new Error('Button: iconPosition "only" requires ariaLabel or text');
  }

  if ((config.target !== undefined || config.download !== undefined) && !config.href) {
    throw new Error('Button: target/download require href');
  }

  if ((config.type === 'submit' || config.type === 'reset') && config.href) {
    throw new Error('Button: submit/reset type cannot be combined with href');
  }
}

// Fills every unset optional field with its documented default. Assumes
// config has already passed validateButtonConfig — does not re-validate.
function normalizeButtonConfig(config) {
  const normalized = { ...config };

  normalized.size = normalized.size || 'md';

  if (normalized.type === undefined) {
    normalized.type = normalized.href ? undefined : 'button';
  }

  normalized.disabled = normalized.disabled || false;
  normalized.loading = normalized.loading || false;
  if (normalized.loading) {
    normalized.disabled = true;
  }

  normalized.selected = normalized.selected || false;
  normalized.fullWidth = normalized.fullWidth || false;

  if (normalized.icon && normalized.iconPosition === undefined) {
    normalized.iconPosition = 'left';
  }

  normalized.dataset = normalized.dataset || {};
  normalized.attributes = normalized.attributes || {};
  normalized.className = normalized.className || '';

  let resolvedAriaLabel = normalized.ariaLabel;
  if (resolvedAriaLabel === undefined && normalized.iconPosition === 'only' && normalized.text) {
    resolvedAriaLabel = normalized.text;
  }
  normalized.ariaLabel = resolvedAriaLabel;

  if (normalized.iconPosition === 'only' && normalized.tooltip === undefined) {
    normalized.tooltip = resolvedAriaLabel;
  }

  return normalized;
}

// Validate + normalize -> a resolved descriptor. No DOM, no rendering.
function createButtonDescriptor(config) {
  validateButtonConfig(config);
  return normalizeButtonConfig(config);
}

// ---------- Button Renderer (Sprint 2.9F.2) ----------
// Pure markup layer on top of the Sprint 2.9F.1 Contract/Validator/Normalizer.
// Every function here returns a string only — no DOM access, no event
// listeners, no side effects. Nothing in the app calls renderButton yet.

// ---------- UI Class Resolver (Sprint 2.9F.3) ----------
// Generic class-list utility, factored out of the Button renderer so any
// future component can reuse it. Accepts strings, arrays (nested any depth),
// and falsy values (null/undefined/false/''); returns a deduped array of
// individual class names in first-occurrence order. Does not join.
function resolveClasses(...parts) {
  const result = [];
  const seen = new Set();

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value) return;

    String(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((cls) => {
        if (seen.has(cls)) return;
        seen.add(cls);
        result.push(cls);
      });
  };

  parts.forEach(visit);

  return result;
}

// Button-specific class rules, expressed as resolveClasses() inputs.
function resolveButtonClasses(descriptor) {
  return resolveClasses(
    'tg-btn',
    `tg-btn-${descriptor.variant}`,
    `tg-btn-${descriptor.size}`,
    descriptor.fullWidth && 'tg-btn-full',
    descriptor.iconPosition === 'only' && 'tg-btn-icon-only',
    descriptor.loading && 'tg-btn-loading',
    descriptor.className
  );
}

function createButtonClassList(descriptor) {
  return resolveButtonClasses(descriptor).join(' ');
}

// iconName is passed explicitly (rather than read from descriptor.icon) so
// the loading spinner ('loader-2') can reuse this without faking a config.
function renderButtonIcon(iconName, descriptor) {
  if (!iconName) return '';

  const isSpinner = Boolean(descriptor.loading) && iconName === 'loader-2';
  const classAttr = isSpinner ? ' class="animate-spin"' : '';

  return `<i data-lucide="${escapeHtml(iconName)}"${classAttr} aria-hidden="true"></i>`;
}

function renderButtonContent(descriptor) {
  const iconName = descriptor.loading ? 'loader-2' : descriptor.icon;
  const iconHtml = renderButtonIcon(iconName, descriptor);

  if (descriptor.iconPosition === 'only') {
    return iconHtml;
  }

  const bodyHtml = descriptor.html !== undefined
    ? descriptor.html
    : (descriptor.text !== undefined ? escapeHtml(descriptor.text) : '');

  return descriptor.iconPosition === 'right'
    ? `${bodyHtml}${iconHtml}`
    : `${iconHtml}${bodyHtml}`;
}

function renderButtonAttributes(descriptor) {
  const isLink = Boolean(descriptor.href);
  const isDisabled = Boolean(descriptor.disabled) || Boolean(descriptor.loading);
  const attrs = [];

  if (descriptor.id) attrs.push(`id="${escapeHtml(descriptor.id)}"`);

  if (!isLink && descriptor.type) {
    attrs.push(`type="${escapeHtml(descriptor.type)}"`);
  }

  if (isLink && !isDisabled) {
    attrs.push(`href="${escapeHtml(descriptor.href)}"`);
    if (descriptor.target) attrs.push(`target="${escapeHtml(descriptor.target)}"`);
    if (descriptor.download !== undefined) {
      attrs.push(
        descriptor.download === true || descriptor.download === ''
          ? 'download'
          : `download="${escapeHtml(descriptor.download)}"`
      );
    }
  }

  if (isDisabled) {
    if (!isLink) attrs.push('disabled');
    attrs.push('aria-disabled="true"');
  }

  if (descriptor.loading) attrs.push('aria-busy="true"');

  if (descriptor.ariaLabel) attrs.push(`aria-label="${escapeHtml(descriptor.ariaLabel)}"`);
  if (descriptor.tooltip) attrs.push(`title="${escapeHtml(descriptor.tooltip)}"`);
  if (descriptor.tabindex !== undefined) attrs.push(`tabindex="${escapeHtml(descriptor.tabindex)}"`);
  if (descriptor.testId) attrs.push(`data-testid="${escapeHtml(descriptor.testId)}"`);

  Object.entries(descriptor.dataset || {}).forEach(([key, value]) => {
    attrs.push(`data-${escapeHtml(key)}="${escapeHtml(value)}"`);
  });

  Object.entries(descriptor.attributes || {}).forEach(([key, value]) => {
    attrs.push(`${escapeHtml(key)}="${escapeHtml(value)}"`);
  });

  return attrs.join(' ');
}

// Renders an HTML string only. No DOM access, no event listeners, no side
// effects. descriptor is expected to already be validated/normalized via
// createButtonDescriptor() — this function does not re-validate.
function renderButton(descriptor) {
  const tag = descriptor.href ? 'a' : 'button';
  const classList = createButtonClassList(descriptor);
  const attributes = renderButtonAttributes(descriptor);
  const content = renderButtonContent(descriptor);

  return `<${tag} class="${classList}"${attributes ? ` ${attributes}` : ''}>${content}</${tag}>`;
}

// Dev-only smoke test for this layer. Never called during normal app
// runtime — invoke manually from the console if you need to sanity-check
// the renderer after editing it.
function __buttonRendererSelfCheck() {
  const basic = renderButton(createButtonDescriptor({ variant: 'primary', text: 'Save' }));
  console.assert(basic.startsWith('<button'), 'basic button should render a <button> tag');
  console.assert(basic.includes('tg-btn-primary'), 'basic button should carry its variant class');

  const link = renderButton(createButtonDescriptor({ variant: 'text', text: 'Open', href: 'https://example.com', target: '_blank' }));
  console.assert(link.startsWith('<a'), 'href descriptor should render an <a> tag');
  console.assert(link.includes('href="https://example.com"'), 'link should include href');

  const iconOnly = renderButton(createButtonDescriptor({ variant: 'icon', icon: 'pencil', iconPosition: 'only', ariaLabel: 'Edit' }));
  console.assert(iconOnly.includes('tg-btn-icon-only'), 'icon-only button should carry the icon-only class');
  console.assert(!/>\s*Edit\s*</.test(iconOnly), 'icon-only button should not render visible text');

  const loadingDisabled = renderButton(createButtonDescriptor({ variant: 'primary', text: 'Save', loading: true }));
  console.assert(loadingDisabled.includes('disabled'), 'loading button should be disabled');
  console.assert(loadingDisabled.includes('aria-busy="true"'), 'loading button should set aria-busy');
  console.assert(loadingDisabled.includes('loader-2'), 'loading button should render the loader icon');

  return true;
}

// ---------- Button Theme (Sprint 2.9F.4) ----------
// Maps a button descriptor to *token names* describing visual intent —
// never raw colors or CSS. Every non-null string below is a real --tg-*
// custom property already defined in style.css's :root design-token
// foundation (Sprint 2.9B) — verified against style.css directly, not
// guessed. Nothing in the app calls resolveButtonTheme() yet; renderButton()
// is untouched.
//
// `null` means "no token" (e.g. a transparent background/border, or no
// shadow) — it is intentionally NOT a fake tg-* string like
// 'tg-color-transparent' or 'tg-shadow-none', since those don't exist as
// CSS variables. Consumers should treat a null token as "omit this
// declaration" rather than looking it up.

const BUTTON_VARIANT_THEME_TOKENS = {
  primary: {
    backgroundToken: 'tg-color-action-primary',
    textToken: 'tg-color-surface',
    borderToken: 'tg-color-action-primary',
    hoverBackgroundToken: 'tg-color-action-primary-hover',
    hoverBorderToken: 'tg-color-action-primary-hover',
  },
  secondary: {
    backgroundToken: 'tg-color-surface',
    textToken: 'tg-color-text-primary',
    borderToken: 'tg-color-border-default',
    hoverBackgroundToken: 'tg-color-surface-muted',
    hoverBorderToken: 'tg-color-border-hover',
  },
  destructive: {
    backgroundToken: 'tg-color-danger',
    textToken: 'tg-color-surface',
    borderToken: 'tg-color-danger',
    hoverBackgroundToken: 'tg-color-danger-700',
    hoverBorderToken: 'tg-color-danger-700',
  },
  ghost: {
    backgroundToken: null,
    textToken: 'tg-color-text-primary',
    borderToken: null,
    hoverBackgroundToken: 'tg-color-surface-muted',
    hoverBorderToken: null,
  },
  text: {
    backgroundToken: null,
    textToken: 'tg-color-action-primary',
    borderToken: null,
    hoverBackgroundToken: null,
    hoverBorderToken: null,
  },
  success: {
    backgroundToken: 'tg-color-success',
    textToken: 'tg-color-surface',
    borderToken: 'tg-color-success',
    hoverBackgroundToken: 'tg-color-success-700',
    hoverBorderToken: 'tg-color-success-700',
  },
  warning: {
    backgroundToken: 'tg-color-warning',
    textToken: 'tg-color-surface',
    borderToken: 'tg-color-warning',
    hoverBackgroundToken: 'tg-color-warning-800',
    hoverBorderToken: 'tg-color-warning-800',
  },
  info: {
    backgroundToken: 'tg-color-info',
    textToken: 'tg-color-surface',
    borderToken: 'tg-color-info',
    hoverBackgroundToken: 'tg-color-info-700',
    hoverBorderToken: 'tg-color-info-700',
  },
  icon: {
    backgroundToken: null,
    textToken: 'tg-color-text-secondary',
    borderToken: null,
    hoverBackgroundToken: 'tg-color-surface-muted',
    hoverBorderToken: null,
  },
};

const BUTTON_SIZE_THEME_TOKENS = {
  xs: {
    paddingToken: 'tg-space-1-5',
    fontToken: 'tg-font-size-small',
    iconSizeToken: 'tg-size-icon-sm',
    radiusToken: 'tg-radius-sm',
  },
  sm: {
    paddingToken: 'tg-space-2',
    fontToken: 'tg-font-size-small',
    iconSizeToken: 'tg-size-icon-sm',
    radiusToken: 'tg-radius-md',
  },
  md: {
    paddingToken: 'tg-space-3',
    fontToken: 'tg-font-size-body',
    iconSizeToken: 'tg-size-icon-base',
    radiusToken: 'tg-radius-md',
  },
  lg: {
    paddingToken: 'tg-space-4',
    fontToken: 'tg-font-size-body',
    iconSizeToken: 'tg-size-icon-md',
    radiusToken: 'tg-radius-lg',
  },
};

// Filled variants (solid background) read an elevation shadow; flat
// variants (ghost/text/icon) stay shadow-less (null — no fake
// 'tg-shadow-none' token, since style.css only defines elevation-1..4).
const BUTTON_FLAT_VARIANTS = ['ghost', 'text', 'icon'];

// Returns a plain object of token NAMES (strings) or null describing visual
// intent for this descriptor — never colors, never CSS, never DOM. Purely
// data.
function resolveButtonTheme(descriptor) {
  const variantTokens = BUTTON_VARIANT_THEME_TOKENS[descriptor.variant] || {};
  const sizeTokens = BUTTON_SIZE_THEME_TOKENS[descriptor.size] || {};

  return {
    variant: descriptor.variant,
    size: descriptor.size,

    backgroundToken: variantTokens.backgroundToken,
    textToken: variantTokens.textToken,
    borderToken: variantTokens.borderToken,

    hoverBackgroundToken: variantTokens.hoverBackgroundToken,
    hoverBorderToken: variantTokens.hoverBorderToken,

    disabledBackgroundToken: 'tg-color-neutral-100',
    disabledTextToken: 'tg-color-neutral-disabled-muted',

    radiusToken: sizeTokens.radiusToken,
    paddingToken: sizeTokens.paddingToken,
    fontToken: sizeTokens.fontToken,
    iconSizeToken: sizeTokens.iconSizeToken,

    shadowToken: BUTTON_FLAT_VARIANTS.includes(descriptor.variant)
      ? null
      : 'tg-shadow-elevation-1',
  };
}

// Dev-only helper: flattens every non-null token name referenced across all
// variant/size combinations into a deduped, sorted list — for manually
// diff-ing against style.css's :root block. Never called during normal app
// runtime.
function listButtonThemeTokens() {
  const tokens = new Set();

  BUTTON_VARIANTS.forEach((variant) => {
    BUTTON_SIZES.forEach((size) => {
      const theme = resolveButtonTheme({ variant, size });
      Object.entries(theme).forEach(([key, value]) => {
        if (key === 'variant' || key === 'size') return;
        if (value) tokens.add(value);
      });
    });
  });

  return Array.from(tokens).sort();
}

// Dev-only smoke test: confirms every token resolveButtonTheme() returns is
// either null or a string matching the real --tg-* names defined in
// style.css's :root block (checked here as a hardcoded snapshot list — keep
// it in sync if style.css's tokens change). Never called during normal app
// runtime; run manually from the console after editing the theme tables.
function __buttonThemeSelfCheck() {
  const DEFINED_STYLE_CSS_TOKENS = new Set([
    'tg-color-action-primary', 'tg-color-action-primary-hover',
    'tg-color-surface', 'tg-color-surface-muted',
    'tg-color-text-primary', 'tg-color-text-secondary',
    'tg-color-border-default', 'tg-color-border-hover',
    'tg-color-danger', 'tg-color-danger-700',
    'tg-color-success', 'tg-color-success-700',
    'tg-color-warning', 'tg-color-warning-800',
    'tg-color-info', 'tg-color-info-700',
    'tg-color-neutral-100', 'tg-color-neutral-disabled-muted',
    'tg-color-action-primary',
    'tg-radius-sm', 'tg-radius-md', 'tg-radius-lg',
    'tg-space-1-5', 'tg-space-2', 'tg-space-3', 'tg-space-4',
    'tg-font-size-small', 'tg-font-size-body',
    'tg-size-icon-sm', 'tg-size-icon-base', 'tg-size-icon-md',
    'tg-shadow-elevation-1',
  ]);

  const referenced = listButtonThemeTokens();
  const unknown = referenced.filter((token) => !DEFINED_STYLE_CSS_TOKENS.has(token));

  console.assert(unknown.length === 0, 'resolveButtonTheme references undefined tokens:', unknown);

  return unknown.length === 0;
}

// ---------- Button Intent Helpers (Sprint 2.9G.5, descriptors as of 2.9G.5A) ----------
// Thin, opinionated wrappers around createButtonDescriptor() for the
// handful of generic, repeated button intents (Close/Cancel/Back) seen
// across modals. Each one returns a ButtonDescriptor — NOT rendered HTML —
// so callers must still pass the result to renderButton() themselves
// (renderButton(createCloseButtonDescriptor())). Keeping the Intent layer
// decoupled from the Renderer means a descriptor can also be inspected,
// composed, or fed into something other than renderButton() later.
// variant/size are intentionally fixed per intent (not overridable); only
// text/className/dataset/attributes/disabled/loading can be overridden.
// Not wired into any existing button yet — this sprint only renamed/
// refactored the helpers, it does not migrate anything.

function createCloseButtonDescriptor(options = {}) {
  const { text = 'Close', className, dataset, attributes, disabled, loading } = options;

  return createButtonDescriptor({
    variant: 'ghost',
    size: 'md',
    text,
    className,
    // 'close-modal' is the sensible default action; callers can still
    // override it (or add more dataset keys) via options.dataset.
    dataset: { action: 'close-modal', ...dataset },
    attributes,
    disabled,
    loading,
  });
}

function createCancelButtonDescriptor(options = {}) {
  const { text = 'Cancel', className, dataset, attributes, disabled, loading } = options;

  return createButtonDescriptor({
    variant: 'secondary',
    size: 'md',
    text,
    className,
    dataset,
    attributes,
    disabled,
    loading,
  });
}

function createBackButtonDescriptor(options = {}) {
  const { text = 'Back', className, dataset, attributes, disabled, loading } = options;

  return createButtonDescriptor({
    variant: 'ghost',
    size: 'md',
    text,
    className,
    dataset,
    attributes,
    disabled,
    loading,
  });
}

// Unlike Close/Cancel/Back, there is no single safe default label or
// data-action for a "create" button (New Member, New Project, New Task,
// ... each says something different and triggers a different modal), so
// both text and dataset.action are entirely caller-supplied — text is
// required (no safe default to fall back to), and dataset is passed
// through as-is rather than merged with an invented default action.
function createCreateButtonDescriptor(options = {}) {
  const { id, text, className, dataset, attributes, disabled, loading } = options;

  if (text === undefined) {
    throw new Error('createCreateButtonDescriptor: text is required');
  }

  return createButtonDescriptor({
    id,
    variant: 'primary',
    size: 'md',
    icon: 'plus',
    text,
    className,
    dataset,
    attributes,
    disabled,
    loading,
  });
}

// ---------- Static Button Mounts (Sprint 2.9G.9) ----------
// index.html is static and can't call renderButton() itself, so a handful
// of buttons there are replaced with empty `[data-button-mount="..."]`
// containers. This hydrates those mount points with real Button System
// markup at startup. Safe to call more than once (each call just
// re-renders the same descriptor into the same container) and a no-op for
// any mount point that isn't present in the DOM.
function renderStaticButtonMounts() {
  const projectCancelMount = document.querySelector('[data-button-mount="project-modal-cancel"]');
  if (projectCancelMount) {
    projectCancelMount.innerHTML = renderButton(createCloseButtonDescriptor({ text: 'Cancel' }));
  }

  const taskCancelMount = document.querySelector('[data-button-mount="task-modal-cancel"]');
  if (taskCancelMount) {
    taskCancelMount.innerHTML = renderButton(createCloseButtonDescriptor({ text: 'Cancel' }));
  }

  const newMemberMount = document.querySelector('[data-button-mount="new-member-toolbar"]');
  if (newMemberMount) {
    newMemberMount.innerHTML = renderButton(createCreateButtonDescriptor({
      id: 'new-member-btn',
      text: 'New Member',
      dataset: { action: 'open-member-modal' },
    }));
  }

  const dashboardNewProjectMount = document.querySelector('[data-button-mount="dashboard-new-project"]');
  if (dashboardNewProjectMount) {
    dashboardNewProjectMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Project',
      dataset: { action: 'open-project-modal' },
    }));
  }

  const projectsNewProjectMount = document.querySelector('[data-button-mount="projects-new-project"]');
  if (projectsNewProjectMount) {
    projectsNewProjectMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Project',
      dataset: { action: 'open-project-modal' },
    }));
  }

  const projectsEmptyNewProjectMount = document.querySelector('[data-button-mount="projects-empty-new-project"]');
  if (projectsEmptyNewProjectMount) {
    projectsEmptyNewProjectMount.innerHTML = renderButton(createCreateButtonDescriptor({
      id: 'projects-empty-new-project-btn',
      text: 'New Project',
      dataset: { action: 'open-project-modal' },
    }));
  }

  const tasksNewTaskMount = document.querySelector('[data-button-mount="tasks-new-task"]');
  if (tasksNewTaskMount) {
    tasksNewTaskMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Task',
      dataset: { action: 'open-task-modal' },
    }));
  }

  const tasksEmptyNewTaskMount = document.querySelector('[data-button-mount="tasks-empty-new-task"]');
  if (tasksEmptyNewTaskMount) {
    tasksEmptyNewTaskMount.innerHTML = renderButton(createCreateButtonDescriptor({
      id: 'tasks-empty-new-task-btn',
      text: 'New Task',
      dataset: { action: 'open-task-modal' },
    }));
  }

  const crmNewLeadMount = document.querySelector('[data-button-mount="crm-new-lead"]');
  if (crmNewLeadMount) {
    crmNewLeadMount.innerHTML = renderButton(createCreateButtonDescriptor({
      id: 'crm-new-lead-btn',
      text: 'New Lead',
      dataset: { action: 'open-lead-modal' },
    }));
  }

  const crmNewClientMount = document.querySelector('[data-button-mount="crm-new-client"]');
  if (crmNewClientMount) {
    crmNewClientMount.innerHTML = renderButton(createCreateButtonDescriptor({
      id: 'crm-new-client-btn',
      text: 'New Company',
      dataset: { action: 'open-client-modal' },
    }));
  }

  const crmNewContactMount = document.querySelector('[data-button-mount="crm-new-contact"]');
  if (crmNewContactMount) {
    crmNewContactMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Contact',
      dataset: { action: 'open-contact-modal' },
    }));
  }

  const crmNewDealMount = document.querySelector('[data-button-mount="crm-new-deal"]');
  if (crmNewDealMount) {
    crmNewDealMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Deal',
      dataset: { action: 'open-deal-modal' },
    }));
  }

  const crmNewActivityMount = document.querySelector('[data-button-mount="crm-new-activity"]');
  if (crmNewActivityMount) {
    crmNewActivityMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Activity',
      dataset: { action: 'open-activity-modal' },
    }));
  }

  const crmNewProposalMount = document.querySelector('[data-button-mount="crm-new-proposal"]');
  if (crmNewProposalMount) {
    crmNewProposalMount.innerHTML = renderButton(createCreateButtonDescriptor({
      text: 'New Proposal',
      dataset: { action: 'open-proposal-modal' },
    }));
  }
}

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

// ---------- Project Commercial Data Layer (Sprint Project Commercial B) ----------
// Admin-only, same fail-soft pattern as Finance: returns [] on error/no access
// rather than throwing, so a missing table or a non-admin session never
// blocks the rest of the app from loading.
async function fetchProjectCommercialTerms() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('project_commercial_terms')
    .select('*');
  if (error) { console.error('fetchProjectCommercialTerms', error); return []; }
  return data || [];
}

async function fetchProjectPaymentScheduleItems() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('project_payment_schedule_items')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) { console.error('fetchProjectPaymentScheduleItems', error); return []; }
  return data || [];
}

async function createProjectCommercialTerms(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('project_commercial_terms').insert([payload]).select().single();
  if (error) { console.error('createProjectCommercialTerms', error); toast(error.message || 'Failed to save commercial terms', 'error'); return null; }
  return data;
}

async function updateProjectCommercialTerms(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('project_commercial_terms').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateProjectCommercialTerms', error); toast(error.message || 'Failed to update commercial terms', 'error'); return null; }
  return data;
}

async function createProjectPaymentScheduleItem(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('project_payment_schedule_items').insert([payload]).select().single();
  if (error) { console.error('createProjectPaymentScheduleItem', error); toast(error.message || 'Failed to add payment item', 'error'); return null; }
  return data;
}

async function updateProjectPaymentScheduleItem(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('project_payment_schedule_items').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateProjectPaymentScheduleItem', error); toast(error.message || 'Failed to update payment item', 'error'); return null; }
  return data;
}

async function cancelProjectPaymentScheduleItem(id) {
  return updateProjectPaymentScheduleItem(id, { is_cancelled: true, updated_at: new Date().toISOString() });
}

async function restoreProjectPaymentScheduleItem(id) {
  return updateProjectPaymentScheduleItem(id, { is_cancelled: false, updated_at: new Date().toISOString() });
}

// ---------- Forecast Schedule Linkage Data Layer (Sprint Project Commercial C2) ----------
// Generates/synchronizes Finance Forecasts from Payment Schedule Items, on
// top of the C1 linkage columns (payment_schedule_item_id, forecast_component,
// generated_from_schedule, source_snapshot_*, generated_by). Deliberately
// separate from createFinanceForecast()/updateFinanceForecast() (the manual
// Forecast modal's data path), which remain untouched — see the C2
// architecture amendment report for the reasoning.

// One multi-row insert per call so a Mixed Payment Item's revenue + client
// funds components are created atomically together (both succeed or neither
// does), rather than as two independent single-row inserts.
async function createFinanceForecastsBatch(payloads) {
  if (!isAdmin()) return null;
  if (!payloads || payloads.length === 0) return [];
  const { data, error } = await supabaseClient.from('finance_forecasts').insert(payloads).select();
  if (error) { console.error('createFinanceForecastsBatch', error); toast(error.message || 'Failed to generate forecast(s)', 'error'); return null; }
  await Promise.all((data || []).map(d => insertFinanceAuditLog({ entityType: 'forecast', entityId: d.id, action: 'generated', newData: d })));
  return data;
}

// Narrow write path for syncing a generated Forecast to its Payment Schedule
// Item — touches only amount/expected_date/source_snapshot_* fields, never
// probability, status, or any manually-owned field. Refuses to write to a
// Received or transaction-linked Forecast (immutable from schedule), a
// deleted Forecast, or a Forecast that was never generated from a schedule
// in the first place. auditAction lets the caller distinguish a soft
// "Update Forecast from Schedule" (Source Changed) from an explicit
// "Reset Forecast to Schedule" (Source & Forecast Changed) in the audit log,
// even though the underlying write is identical.
async function updateGeneratedForecastFromSchedule(forecastId, item, component, auditAction) {
  if (!isAdmin()) return null;
  const fc = state.financeForecasts.find(f => Number(f.id) === forecastId);
  if (!fc || !fc.generated_from_schedule || fc.is_deleted || fc.status === 'received' || fc.linked_transaction_id) return null;

  const amount = getComponentAmount(item, component);
  const payload = {
    amount,
    expected_date:              item.due_date,
    source_snapshot_amount:     amount,
    source_snapshot_due_date:   item.due_date,
    // The snapshot timestamp records the Payment Schedule Item's own version
    // time, not the moment of this sync — Forecast.updated_at already covers
    // "when was this Forecast last synchronized/modified".
    source_snapshot_updated_at: item.updated_at,
    updated_at:                 new Date().toISOString(),
  };
  const result = await updateFinanceForecast(forecastId, payload);
  if (result) await insertFinanceAuditLog({ entityType: 'forecast', entityId: forecastId, action: auditAction, oldData: fc, newData: result });
  return result;
}

// ---------- CRM Leads Data Layer ----------
// Architecture note (Sprint CRM-1/CRM-2): crm_leads.status currently still
// includes 'won'/'lost' values (new, contacted, qualified, proposal_sent,
// won, lost). Per the Sprint CRM-1 decision, Deal — not Lead — is now the
// canonical owner of Won/Lost/stage/value/probability/service type. Lead
// should eventually be simplified to qualification-only statuses (new,
// contacted, qualified, disqualified, converted). This is NOT changed in
// Sprint CRM-2 (no destructive status changes, no UI changes to the Lead
// status list) — it's left as a documented follow-up for a future sprint
// once teams have migrated off relying on Lead.status for Won/Lost.
//
// Sprint CRM-3A follow-up: the Lead status UI (form + badges + filters) now
// offers 'converted'/'disqualified' instead of 'won'/'lost' going forward.
// Existing rows still stored as 'won'/'lost' are NOT migrated — this helper
// maps them to their new display-only equivalent so old and new rows read
// consistently. It never writes back to the database.
function normalizeCrmLeadStatusForDisplay(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'won') return 'converted';
  if (key === 'lost') return 'disqualified';
  return key;
}

// Sprint CRM-4.5A Fix Pass 2 — crm_contacts.status is nullable and the
// New/Edit Contact form never wrote to it, so existing rows are null/empty.
// The table badge already fell back to 'active' for display, but the status
// filter compared the raw (unfallback'd) value, so it never matched — this
// is the single source of truth both call sites now share. It never writes
// back to the database; existing null rows stay null until edited/saved.
function getCrmContactStatus(contact) {
  return (contact?.status || 'active').toLowerCase();
}

async function fetchCrmLeads() {
  const { data, error } = await supabaseClient
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchCrmLeads', error);
    toast('Could not load leads', 'error');
    return [];
  }
  return data || [];
}

async function createCrmLead(payload) {
  const { data, error } = await supabaseClient
    .from('crm_leads')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('createCrmLead', error);
    toast(error.message || 'Failed to create lead', 'error');
    return null;
  }
  return data;
}

async function updateCrmLead(id, payload) {
  const { data, error } = await supabaseClient
    .from('crm_leads')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateCrmLead', error);
    toast(error.message || 'Failed to update lead', 'error');
    return null;
  }
  return data;
}

async function archiveCrmLead(id) {
  return updateCrmLead(id, {
    is_archived: true,
    updated_at: new Date().toISOString(),
  });
}

async function restoreCrmLead(id) {
  return updateCrmLead(id, {
    is_archived: false,
    updated_at: new Date().toISOString(),
  });
}

// ---------- CRM Clients Data Layer ----------
async function fetchCrmClients() {
  const { data, error } = await supabaseClient
    .from('crm_clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchCrmClients', error);
    toast('Could not load clients', 'error');
    return [];
  }
  return data || [];
}

async function createCrmClient(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient
    .from('crm_clients')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('createCrmClient', error);
    toast(error.message || 'Failed to create client', 'error');
    return null;
  }
  return data;
}

async function updateCrmClient(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient
    .from('crm_clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateCrmClient', error);
    toast(error.message || 'Failed to update client', 'error');
    return null;
  }
  return data;
}

// C1: archive/restore must never touch the business `status` field — only
// is_archived is the source of truth for archived-ness (every filter/KPI in
// this file already reads is_archived, never status==='archived'). Writing
// status here used to silently overwrite and then guess-restore the real
// status (e.g. active/inactive), permanently losing it.
async function archiveCrmClient(id) {
  return updateCrmClient(id, {
    is_archived: true,
    updated_at: new Date().toISOString(),
  });
}

async function restoreCrmClient(id) {
  return updateCrmClient(id, {
    is_archived: false,
    updated_at: new Date().toISOString(),
  });
}

// ---------- CRM Contacts Data Layer ----------
async function fetchCrmContacts() {
  const { data, error } = await supabaseClient.from('crm_contacts').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmContacts', error); return []; }
  return data || [];
}
async function createCrmContact(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_contacts').insert([payload]).select().single();
  if (error) { console.error('createCrmContact', error); toast(error.message || 'Failed to create contact', 'error'); return null; }
  return data;
}
async function updateCrmContact(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_contacts').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateCrmContact', error); toast(error.message || 'Failed to update contact', 'error'); return null; }
  return data;
}
// C1: see archiveCrmClient/restoreCrmClient above — status is never written here.
async function archiveCrmContact(id) {
  return updateCrmContact(id, { is_archived: true, updated_at: new Date().toISOString() });
}
async function restoreCrmContact(id) {
  return updateCrmContact(id, { is_archived: false, updated_at: new Date().toISOString() });
}

// ---------- CRM Deals Data Layer ----------
async function fetchCrmDeals() {
  const { data, error } = await supabaseClient.from('crm_deals').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmDeals', error); return []; }
  return data || [];
}
async function createCrmDeal(payload) {
  if (!isAdmin()) return null;
  // A Deal must always have a Company — mirrors the same hard requirement
  // already enforced on Lead. A create always represents the full intended
  // row, so this is a plain presence check.
  if (!payload.client_id) {
    toast('Select a company before creating this deal.', 'error');
    return null;
  }
  const { data, error } = await supabaseClient.from('crm_deals').insert([payload]).select().single();
  if (error) { console.error('createCrmDeal', error); toast(error.message || 'Failed to create deal', 'error'); return null; }
  return data;
}
async function updateCrmDeal(id, payload) {
  if (!isAdmin()) return null;
  // Same requirement as createCrmDeal, but an update payload can legitimately
  // omit client_id entirely (e.g. archiveCrmDeal/restoreCrmDeal below only
  // touch is_archived) — only block when the caller explicitly tries to save
  // the Deal with no Company, not every partial update.
  if ('client_id' in payload && !payload.client_id) {
    toast('A deal must have a company — this cannot be cleared.', 'error');
    return null;
  }
  const { data, error } = await supabaseClient.from('crm_deals').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateCrmDeal', error); toast(error.message || 'Failed to update deal', 'error'); return null; }
  return data;
}
async function archiveCrmDeal(id) {
  return updateCrmDeal(id, { is_archived: true, updated_at: new Date().toISOString() });
}
async function restoreCrmDeal(id) {
  return updateCrmDeal(id, { is_archived: false, updated_at: new Date().toISOString() });
}

// ---------- CRM Activities Data Layer ----------
async function fetchCrmActivities() {
  const { data, error } = await supabaseClient.from('crm_activities').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmActivities', error); return []; }
  return data || [];
}
async function createCrmActivity(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_activities').insert([payload]).select().single();
  if (error) { console.error('createCrmActivity', error); toast(error.message || 'Failed to create activity', 'error'); return null; }
  return data;
}
async function updateCrmActivity(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_activities').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateCrmActivity', error); toast(error.message || 'Failed to update activity', 'error'); return null; }
  return data;
}
async function archiveCrmActivity(id) {
  return updateCrmActivity(id, { is_archived: true, updated_at: new Date().toISOString() });
}
async function restoreCrmActivity(id) {
  return updateCrmActivity(id, { is_archived: false, updated_at: new Date().toISOString() });
}

// ---------- CRM Notes Data Layer ----------
async function fetchCrmNotes() {
  const { data, error } = await supabaseClient.from('crm_notes').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmNotes', error); return []; }
  return data || [];
}
async function createCrmNote(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_notes').insert([payload]).select().single();
  if (error) { console.error('createCrmNote', error); toast(error.message || 'Failed to create note', 'error'); return null; }
  return data;
}
async function archiveCrmNote(id) {
  if (!isAdmin()) return false;
  const { error } = await supabaseClient.from('crm_notes').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.error('archiveCrmNote', error); return false; }
  return true;
}

// ---------- CRM Proposals Data Layer ----------
async function fetchCrmProposals() {
  const { data, error } = await supabaseClient.from('crm_proposals').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmProposals', error); return []; }
  return data || [];
}
async function createCrmProposal(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_proposals').insert([payload]).select().single();
  if (error) { console.error('createCrmProposal', error); toast(error.message || 'Failed to create proposal', 'error'); return null; }
  return data;
}
async function updateCrmProposal(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_proposals').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateCrmProposal', error); toast(error.message || 'Failed to update proposal', 'error'); return null; }
  return data;
}
// C1: see archiveCrmClient/restoreCrmClient above — status is never written
// here either, so an Accepted/Rejected/Sent Proposal keeps that status
// through an archive/restore cycle instead of reverting to 'draft'.
async function archiveCrmProposal(id) {
  return updateCrmProposal(id, { is_archived: true, updated_at: new Date().toISOString() });
}
async function restoreCrmProposal(id) {
  return updateCrmProposal(id, { is_archived: false, updated_at: new Date().toISOString() });
}

// ---------- CRM Service Types Data Layer ----------
// Sprint CRM-2: crm_service_types is a new lookup table (see
// crm_data_model_completion_migration.sql). Fails soft — older databases
// that haven't run the migration yet should not crash app load.
async function fetchCrmServiceTypes() {
  try {
    const { data, error } = await supabaseClient
      .from('crm_service_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.warn('fetchCrmServiceTypes', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('fetchCrmServiceTypes', err);
    return [];
  }
}

// ---------- Finance Data Layer ----------
async function fetchFinanceAccounts() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_accounts').select('*').order('account_name');
  if (error) { console.error('fetchFinanceAccounts', error); return []; }
  return data || [];
}
async function fetchFinanceCategories() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_categories').select('*').order('category_type').order('category_name');
  if (error) { console.error('fetchFinanceCategories', error); return []; }
  return data || [];
}
async function fetchFinanceTransactions() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchFinanceTransactions', error); return []; }
  return data || [];
}

// Sprint 4.5B: the single choke point every standalone (non-batch) Finance
// transaction mutation path already funnels through — create, edit, split
// receipt, forecast conversion, restore all fetch a fresh
// state.financeTransactions and then re-render. Wiring the Accounting
// Journal sync in exactly here (rather than at each call site) means every
// current and future caller of this helper gets automatic posting for
// free. See syncAccountingJournal() (Journal Posting Engine section) for
// the reconciliation/idempotency logic itself — this is only the fetch+sync
// pairing, no posting logic lives here.
async function loadFinanceTransactionsAndSync() {
  state.financeTransactions = await fetchFinanceTransactions();
  syncAccountingJournal();
}

async function createFinanceAccount(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_accounts').insert([payload]).select().single();
  if (error) { console.error('createFinanceAccount', error); toast(error.message || 'Failed to create account', 'error'); return null; }
  return data;
}
async function updateFinanceAccount(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_accounts').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateFinanceAccount', error); toast(error.message || 'Failed to update account', 'error'); return null; }
  return data;
}
async function insertFinanceAuditLog({ entityType, entityId, action, oldData = null, newData = null }) {
  const { error } = await supabaseClient.from('finance_audit_log').insert([{
    entity_type: entityType,
    entity_id:   Number(entityId),
    action,
    actor_id:    state.currentUser?.id || null,
    old_data:    oldData,
    new_data:    newData,
    created_at:  new Date().toISOString(),
  }]);
  if (error) console.error('insertFinanceAuditLog', error);
}

async function createFinanceTransaction(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_transactions').insert([payload]).select().single();
  if (error) { console.error('createFinanceTransaction', error); toast(error.message || 'Failed to create transaction', 'error'); return null; }
  await insertFinanceAuditLog({ entityType: 'transaction', entityId: data.id, action: 'created', newData: data });
  return data;
}

// One multi-row insert per call — a single INSERT statement is atomic at the
// database level (all rows land or none do), exactly the same guarantee
// createFinanceForecastsBatch() already relies on for a Mixed Payment Item's
// two generated forecasts. Used by Collect Payment so a Mixed item's
// revenue + client-funds transactions cannot land as one committed and one
// failed.
async function createFinanceTransactionsBatch(payloads) {
  if (!isAdmin()) return null;
  if (!payloads || payloads.length === 0) return [];
  const { data, error } = await supabaseClient.from('finance_transactions').insert(payloads).select();
  if (error) { console.error('createFinanceTransactionsBatch', error); toast(error.message || 'Failed to record collection', 'error'); return null; }
  await Promise.all((data || []).map(d => insertFinanceAuditLog({ entityType: 'transaction', entityId: d.id, action: 'created', newData: d })));
  return data;
}
async function updateFinanceTransaction(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_transactions').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateFinanceTransaction', error); toast(error.message || 'Failed to update transaction', 'error'); return null; }
  return data;
}
async function archiveFinanceTransaction(id) {
  const old = state.financeTransactions.find(t => Number(t.id) === id);
  const result = await updateFinanceTransaction(id, { is_archived: true, archived_by: state.currentUser?.id || null, updated_at: new Date().toISOString() });
  if (result) await insertFinanceAuditLog({ entityType: 'transaction', entityId: id, action: 'archived', oldData: old, newData: result });
  return result;
}
async function restoreFinanceTransaction(id) {
  const old = state.financeTransactions.find(t => Number(t.id) === id);
  const result = await updateFinanceTransaction(id, { is_archived: false, is_deleted: false, archived_by: null, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() });
  if (result) await insertFinanceAuditLog({ entityType: 'transaction', entityId: id, action: 'restored', oldData: old, newData: result });
  return result;
}
async function softDeleteFinanceTransaction(id) {
  const old = state.financeTransactions.find(t => Number(t.id) === id);
  const now = new Date().toISOString();
  const result = await updateFinanceTransaction(id, { is_deleted: true, deleted_at: now, deleted_by: state.currentUser?.id || null, updated_at: now });
  if (result) await insertFinanceAuditLog({ entityType: 'transaction', entityId: id, action: 'soft_deleted', oldData: old, newData: result });
  return result;
}
async function permanentDeleteFinanceTransaction(id) {
  if (!isAdmin()) return false;
  const old = state.financeTransactions.find(t => Number(t.id) === id);
  await insertFinanceAuditLog({ entityType: 'transaction', entityId: id, action: 'permanently_deleted', oldData: old, newData: null });
  const { error } = await supabaseClient.from('finance_transactions').delete().eq('id', id);
  if (error) { console.error('permanentDeleteFinanceTransaction', error); toast(error.message || 'Failed to permanently delete transaction', 'error'); return false; }
  return true;
}

async function fetchFinanceSettings() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_settings').select('*').eq('is_active', true);
  if (error) {
    // Table may not exist yet during development/rollout — do not break the app,
    // just fall back to whatever defaults the callers already use.
    console.warn('fetchFinanceSettings: falling back to defaults', error);
    return [];
  }
  return data || [];
}

async function fetchFinanceFixedCosts() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_fixed_costs').select('*').eq('is_active', true).order('cost_name');
  if (error) {
    // Table may not exist yet during development/rollout — do not break the app,
    // just fall back to finance_settings / the hardcoded default.
    console.warn('fetchFinanceFixedCosts: falling back to finance_settings/default', error);
    return [];
  }
  return data || [];
}

async function fetchFinanceChartOfAccounts() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_chart_of_accounts').select('*').eq('is_active', true).order('account_code');
  if (error) {
    // Table may not exist yet during development/rollout (Sprint 4.3B) — do
    // not break the app, just fall back to no Chart of Accounts. Nothing
    // reads state.financeChartOfAccounts yet, so an empty array is safe.
    console.warn('fetchFinanceChartOfAccounts: table not available yet', error);
    return [];
  }
  return data || [];
}

async function fetchFinanceForecasts() {
  if (!isAdmin()) return [];
  const { data, error } = await supabaseClient
    .from('finance_forecasts')
    .select('*')
    .order('expected_date', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchFinanceForecasts', error); return []; }
  return data || [];
}
async function createFinanceForecast(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_forecasts').insert([payload]).select().single();
  if (error) { console.error('createFinanceForecast', error); toast(error.message || 'Failed to create forecast', 'error'); return null; }
  await insertFinanceAuditLog({ entityType: 'forecast', entityId: data.id, action: 'created', newData: data });
  return data;
}
async function updateFinanceForecast(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('finance_forecasts').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateFinanceForecast', error); toast(error.message || 'Failed to update forecast', 'error'); return null; }
  return data;
}
async function archiveFinanceForecast(id) {
  const old = state.financeForecasts.find(f => Number(f.id) === id);
  const result = await updateFinanceForecast(id, { is_archived: true, archived_by: state.currentUser?.id || null, updated_at: new Date().toISOString() });
  if (result) await insertFinanceAuditLog({ entityType: 'forecast', entityId: id, action: 'archived', oldData: old, newData: result });
  return result;
}
async function restoreFinanceForecast(id) {
  const old = state.financeForecasts.find(f => Number(f.id) === id);
  const result = await updateFinanceForecast(id, { is_archived: false, is_deleted: false, archived_by: null, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() });
  if (result) await insertFinanceAuditLog({ entityType: 'forecast', entityId: id, action: 'restored', oldData: old, newData: result });
  return result;
}
async function softDeleteFinanceForecast(id) {
  const old = state.financeForecasts.find(f => Number(f.id) === id);
  const now = new Date().toISOString();
  const result = await updateFinanceForecast(id, { is_deleted: true, deleted_at: now, deleted_by: state.currentUser?.id || null, updated_at: now });
  if (result) await insertFinanceAuditLog({ entityType: 'forecast', entityId: id, action: 'soft_deleted', oldData: old, newData: result });
  return result;
}
async function permanentDeleteFinanceForecast(id) {
  if (!isAdmin()) return false;
  const old = state.financeForecasts.find(f => Number(f.id) === id);
  await insertFinanceAuditLog({ entityType: 'forecast', entityId: id, action: 'permanently_deleted', oldData: old, newData: null });
  const { error } = await supabaseClient.from('finance_forecasts').delete().eq('id', id);
  if (error) { console.error('permanentDeleteFinanceForecast', error); toast(error.message || 'Failed to permanently delete forecast', 'error'); return false; }
  return true;
}
async function convertForecastToTransaction(forecastId) {
  const fc = state.financeForecasts.find(f => Number(f.id) === forecastId);
  if (!fc) return;
  if (fc.linked_transaction_id) {
    toast('This forecast has already been converted to a transaction.', 'error');
    return;
  }
  const TX_TYPE_MAP = {
    expected_income:   'income',
    expected_expense:  'expense',
    expected_transfer: 'transfer',
    client_funds:      'pass_through_received',
  };
  const txType = TX_TYPE_MAP[fc.forecast_type] || 'income';
  const now = new Date().toISOString();
  const tx = await createFinanceTransaction({
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_type: txType,
    account_id:   fc.account_id   || null,
    client_id:    fc.client_id    || null,
    client_name:  fc.client_name  || null,
    category_id:  fc.category_id  || null,
    amount:       fc.amount,
    currency:     fc.currency || 'EGP',
    description:  fc.description  || null,
    project_name: fc.project_name || null,
    status:       'completed',
    created_by:   state.currentUser?.id || null,
    created_at: now, updated_at: now,
  });
  if (!tx) return;
  const fOk = await updateFinanceForecast(forecastId, {
    status: 'received',
    linked_transaction_id: tx.id,
    updated_at: now,
  });
  if (fOk) {
    await insertFinanceAuditLog({ entityType: 'forecast', entityId: forecastId, action: 'converted', oldData: fc, newData: { ...fc, status: 'received', linked_transaction_id: tx.id } });
    toast('Forecast converted to transaction.', 'success');
    const [txs, forecasts] = await Promise.all([fetchFinanceTransactions(), fetchFinanceForecasts()]);
    state.financeTransactions = txs;
    state.financeForecasts    = forecasts;
    syncAccountingJournal(); // Sprint 4.5B — reconcile Journal against the newly-created transaction
    renderFinanceView();
  }
}

async function insertNotification(payload) {
  // Dedup guard: do not insert if an identical notification already exists
  // (same user_id + type + entity_type + entity_id).
  const entityType = payload.entity_type ?? null;
  const entityId   = payload.entity_id   ?? null;

  let dedupQuery = supabaseClient
    .from('notifications')
    .select('id')
    .eq('user_id', payload.user_id)
    .eq('type', payload.type)
    .limit(1);

  dedupQuery = entityType != null
    ? dedupQuery.eq('entity_type', entityType)
    : dedupQuery.is('entity_type', null);

  dedupQuery = entityId != null
    ? dedupQuery.eq('entity_id', entityId)
    : dedupQuery.is('entity_id', null);

  const { data: existing } = await dedupQuery;
  if (existing?.length > 0) return null;

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
  achievement_unlocked: { icon: 'trophy', bg: 'bg-amber-100', color: 'text-amber-600' },
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

  const adminIds        = admins.map((a) => a.auth_user_id);
  const resolvedEType   = entityType ?? null;
  const resolvedEId     = entityId   ?? null;

  // Dedup: find which admin user_ids already have this notification so we
  // can exclude them from the bulk insert (one round-trip, no per-row query).
  let dedupQuery = supabaseClient
    .from('notifications')
    .select('user_id')
    .in('user_id', adminIds)
    .eq('type', type);

  dedupQuery = resolvedEType != null
    ? dedupQuery.eq('entity_type', resolvedEType)
    : dedupQuery.is('entity_type', null);

  dedupQuery = resolvedEId != null
    ? dedupQuery.eq('entity_id', resolvedEId)
    : dedupQuery.is('entity_id', null);

  const { data: existing } = await dedupQuery;
  const alreadyNotified = new Set((existing || []).map((n) => n.user_id));

  const notifications = admins
    .filter((admin) => !alreadyNotified.has(admin.auth_user_id))
    .map((admin) => ({
      user_id: admin.auth_user_id,
      title,
      message,
      type,
      entity_type: resolvedEType,
      entity_id: resolvedEId,
      is_read: false,
    }));

  if (notifications.length === 0) return;

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

  let query = supabaseClient.from('notifications').select('*');

  // Fail closed: only skip the user_id filter for EXPLICITLY elevated roles.
  // Any null, undefined, 'member', or unexpected value keeps the filter on.
  const elevated = state.currentRole === 'admin' || state.currentRole === 'manager';
  if (!elevated) {
    query = query.eq('user_id', state.currentUser.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('fetchNotifications', error);
    return [];
  }

  return data || [];
}

async function markNotificationAsRead(id) {
  if (!getVisibleNotifications().some((n) => Number(n.id) === Number(id))) return;

  const { error } = await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('markNotificationAsRead', error);
  }
}

async function markAllNotificationsAsRead() {
  const ids = getVisibleNotifications()
    .filter((n) => !n.is_read)
    .map((n) => n.id);
  if (ids.length === 0) return;

  const { error } = await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids);

  if (error) {
    console.error('markAllNotificationsAsRead', error);
  }
}

async function deleteNotification(id) {
  if (!getVisibleNotifications().some((n) => Number(n.id) === Number(id))) return;

  const { error } = await supabaseClient
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteNotification', error);
  }
}

async function clearReadNotifications() {
  const ids = getVisibleNotifications()
    .filter((n) => n.is_read)
    .map((n) => n.id);
  if (ids.length === 0) return;

  const { error } = await supabaseClient
    .from('notifications')
    .delete()
    .in('id', ids);

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

// Single source of truth for which notifications are visible to the current user.
// Admin/Manager: all notifications in state.notifications (server already
//   returns everything for them via fetchNotifications()).
// Member: only notifications owned by the current user (user_id === currentUser.id).
//   This mirrors the server-side filter in fetchNotifications() exactly.
//   The former task-visibility cross-check (condition b) was removed because it
//   did not guard user_id ownership, creating a leak path when state.notifications
//   was ever contaminated with rows belonging to other users.
function getVisibleNotifications() {
  if (isAdmin() || isManager()) {
    return state.notifications;
  }

  return state.notifications.filter(
    (n) => n.user_id === state.currentUser?.id
  );
}

function getNotificationDisplay(notification) {
  const isMine = notification.user_id === state.currentUser?.id;

  // Own notification: show exactly as stored.
  if (isMine) {
    return { title: notification.title || '', message: notification.message || '' };
  }

  // Admin/Manager viewing another user's task_assigned notification.
  // Only this type uses second-person wording ("assigned you", "You have a new task.").
  // All other types (task_created, task_completed, project_*, team_member_*) are
  // already in third-person and need no rewriting.
  if (notification.type === 'task_assigned') {
    const recipient = state.teamMembers.find(
      (m) => m.auth_user_id === notification.user_id
    );
    const recipientName = recipient?.name || 'another team member';

    const title = (notification.title || '').replace(
      /\bassigned you\b/gi,
      `assigned ${recipientName}`
    );

    let message = notification.message || '';
    message = message
      .replace(/^you have a new task\.?$/i,        `Task assigned to ${recipientName}.`)
      .replace(/^a task was assigned to you\.?$/i, `Task assigned to ${recipientName}.`);

    return { title, message };
  }

  // All other types are third-person already — show as stored.
  return { title: notification.title || '', message: notification.message || '' };
}

function renderNotifications() {
  const list = $('#notifications-list');
  const badge = $('#notifications-count');
  const markAllBtn = $('#notifications-mark-all-read');
  const clearReadBtn = $('#notifications-clear-read');

  if (!list || !badge) return;

  const visibleNotifications = getVisibleNotifications();

  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length;
  const readCount = visibleNotifications.filter((n) => n.is_read).length;

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

  if (visibleNotifications.length === 0) {
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

  list.innerHTML = visibleNotifications
    .slice(0, 20)
    .map((notification) => {
      const { icon, bg, color } = getNotificationIcon(notification.type);
      const { title: displayTitle, message: displayMessage } = getNotificationDisplay(notification);

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
            ${escapeHtml(displayTitle)}
          </div>

          <div class="text-xs text-gray-600 mt-0.5">
            ${escapeHtml(displayMessage)}
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
  if (isAdmin() || isManager()) return state.tasks.filter((t) => !t.is_archived);

  const currentMember = getCurrentMember();

  if (!currentMember) return [];

  return state.tasks.filter(
    (t) =>
      !t.is_archived &&
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

// C3 — Last Active Admin Protection. An active Admin is role_type==='admin'
// AND status !== 'inactive'. countActiveAdmins(excludeId) lets a caller ask
// "how many active Admins would remain if this one member were removed from
// the count" without needing two different code paths for update vs delete.
function isActiveAdmin(member) {
  return (member?.role_type || '').toLowerCase() === 'admin' &&
    (member?.status || '').toLowerCase() !== 'inactive';
}

function countActiveAdmins(excludeId = null) {
  return state.teamMembers.filter(
    (m) => isActiveAdmin(m) && Number(m.id) !== Number(excludeId)
  ).length;
}

async function insertTeamMember(payload) {
  // C6: only Admin may create Team Members.
  if (!canEditTeamMember()) {
    toast('You do not have permission to create team members', 'error');
    return null;
  }

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
  // C6: only Admin may edit Team Members (name/email/job_title/department,
  // and role_type/status — Manager/Member may never write any of these).
  if (!canEditTeamMember()) {
    toast('You do not have permission to edit team members', 'error');
    return null;
  }

  // C3: block a write that would demote, or deactivate, the last active Admin.
  const current = state.teamMembers.find((m) => Number(m.id) === Number(id));
  const wouldLoseActiveAdmin = current && isActiveAdmin(current) && (
    (payload.role_type !== undefined && (payload.role_type || '').toLowerCase() !== 'admin') ||
    (payload.status !== undefined && (payload.status || '').toLowerCase() === 'inactive')
  );
  if (wouldLoseActiveAdmin && countActiveAdmins(id) === 0) {
    toast('This is the last active Admin — promote another Admin before changing this.', 'error');
    return null;
  }

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
  // C6: only Admin/Manager may create Projects (same matrix already used to
  // hide/show the New Project button).
  if (!canCreateProject()) {
    toast('You do not have permission to create projects', 'error');
    return null;
  }

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
  // C6: only Admin/Manager may edit Projects (same matrix already used to
  // hide/show the Edit action).
  if (!canEditProject()) {
    toast('You do not have permission to edit projects', 'error');
    return null;
  }

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
  // C6: only Admin/Manager may create Tasks.
  if (!canCreateTask()) {
    toast('You do not have permission to create tasks', 'error');
    return null;
  }

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
    message: data.assigned_to
      ? `${data.task_info || 'A task'} was created and assigned to ${data.assigned_to}.`
      : `${data.task_info || 'A task'} was created.`,
    type: 'task_created',
    entityType: 'task',
    entityId: data.id,
  });

  return data;
}

async function updateTask(id, payload) {
  const oldTask = state.tasks.find(
    (task) => Number(task.id) === Number(id)
  );

  // C6: authorization guard mirroring the exact approved field matrix already
  // enforced in the UI (applyTaskFieldPermission/canEditTaskField) — Admin:
  // any field on any task. Manager: any field except
  // TASK_MANAGER_RESTRICTED_FIELDS (start_date/deadline), on any task.
  // Member: only TASK_MEMBER_EDITABLE_FIELDS (status/task_link/notes), and
  // only on their own task. Checked against the caller-supplied keys before
  // this function's own internal auto-fields (completed_at/is_archived/
  // archived_at, below) are added, since those are a system side effect of
  // an allowed status change, not something the caller chose to write.
  if (oldTask) {
    const requestedFields = Object.keys(payload);
    const allowed = isAdmin()
      ? true
      : isManager()
      ? requestedFields.every((f) => !TASK_MANAGER_RESTRICTED_FIELDS.includes(f))
      : isOwnTask(oldTask) && requestedFields.every((f) => TASK_MEMBER_EDITABLE_FIELDS.includes(f));
    if (!allowed) {
      toast('You do not have permission to make this change.', 'error');
      return null;
    }
  }

  if (payload.status !== undefined && oldTask) {
    const oldStatus = (oldTask.status || '').toLowerCase();
    const newStatus = (payload.status || '').toLowerCase();
    const wasTerminal = isTerminalTaskStatus(oldStatus);
    const nowTerminal = isTerminalTaskStatus(newStatus);

    // Sprint 3.1C.2: completed_at doubles as a general terminal-time signal
    // for both completed AND cancelled (there's no dedicated cancelled_at/
    // terminal_at column — see Architect Notes). Stamped the moment a task
    // first enters either terminal status, instead of only 'completed'.
    // Sprint 3.1C.3: this is now a LOW-priority fallback for
    // resolveTaskOperationalDate() — deadline/start_date/created_at all
    // outrank it, so archiving is driven by which month the task
    // operationally belongs to, not by when it happened to become terminal.
    if (nowTerminal && !wasTerminal) {
      if (!oldTask.completed_at) {
        payload.completed_at = new Date().toISOString();
      }
    } else if (wasTerminal && !nowTerminal) {
      payload.completed_at = null;
    }

    // Sprint 3.1C.2: an archived task edited back to a non-terminal status
    // must return to Active automatically, without a separate manual step.
    if (oldTask.is_archived && !nowTerminal) {
      payload.is_archived = false;
      payload.archived_at = null;
    } else if (!oldTask.is_archived && nowTerminal) {
      // Sprint 3.1C.4: keep the Active/Archived split in sync immediately on
      // save — don't make an admin/manager wait for the next monthly sweep
      // (or a full page reload) to see a task leave Active once it's both
      // terminal AND its operational month is already closed. Reuses the
      // exact same eligibility check the monthly job runs, against an
      // "effective" task that reflects this save's own field changes
      // (deadline, status, etc.), so this can never diverge from that rule
      // — a current-month terminal task correctly stays untouched here too.
      const effectiveTask = { ...oldTask, ...payload };
      const { end: closedMonthEnd } = getLastClosedMonthRange();
      if (shouldMonthlyArchiveTask(effectiveTask, closedMonthEnd)) {
        payload.is_archived = true;
        payload.archived_at = new Date().toISOString();
      }
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
    // Same guard as insertTask: skip task_assigned when the new assignee is
    // the current user — they already received task_assigned via notifyAdmins.
    const newAssigneeMember = getMemberByName(payload.assigned_to);
    if (newAssigneeMember?.auth_user_id !== state.currentUser?.id) {
      await notifyAssignedMember({
        assignedTo: payload.assigned_to,
        title: `${actor} assigned you a task`,
        message: data.task_info || 'A task was assigned to you.',
        type: 'task_assigned',
        entityType: 'task',
        entityId: data.id,
      });
    }
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

// Sprint 3.1C.2: manual restore for Admin/Manager from the Archived Tasks
// view. Deliberately narrow — only flips the archive flags, never touches
// status or any other field, and never deletes anything.
async function restoreTask(id) {
  // C6: matches this function's own documented scope — Admin/Manager only.
  if (!canFullyEditTask()) {
    toast('You do not have permission to restore this task', 'error');
    return null;
  }

  const { data, error } = await supabaseClient
    .from('tasks')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('restoreTask', error);
    toast(error.message || 'Failed to restore task', 'error');
    return null;
  }

  return data;
}

async function deleteProject(id) {
  // C6: only Admin may delete Projects (same matrix already used to
  // hide/show the Delete action).
  if (!canDeleteProject()) {
    toast('You do not have permission to delete projects', 'error');
    return false;
  }

  const project = state.projects.find(
    (p) => Number(p.id) === Number(id)
  );

  // C5: block deleting a Project that still has Commercial Terms, Payment
  // Schedule Items, or any linked Finance Transaction — deleting the Project
  // row would silently orphan real commercial/financial records, including
  // already-collected client money, with no recovery. Nothing is
  // cascade-deleted to make room for the delete; the Project itself is
  // simply not deletable while any of this exists.
  const terms = state.projectCommercialTerms.find(
    (ct) => Number(ct.project_id) === Number(id)
  );
  const scheduleItems = terms
    ? state.projectPaymentScheduleItems.filter((i) => Number(i.commercial_terms_id) === Number(terms.id))
    : [];
  const scheduleItemIds = new Set(scheduleItems.map((i) => Number(i.id)));
  const hasTransactions = state.financeTransactions.some(
    (t) => scheduleItemIds.has(Number(t.payment_schedule_item_id))
  );

  if (terms || scheduleItems.length > 0 || hasTransactions) {
    toast('This Project contains Commercial or Finance records and cannot be deleted. Archive or cancel the Project instead.', 'error');
    return false;
  }

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

  // C6: only Admin/Manager may delete Tasks.
  if (!canDeleteTask(task)) {
    toast('You do not have permission to delete this task', 'error');
    return false;
  }

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
  // C6: only Admin may delete Team Members.
  if (!canDeleteTeamMember()) {
    toast('You do not have permission to delete team members', 'error');
    return false;
  }

  const member = state.teamMembers.find(
    (m) => Number(m.id) === Number(id)
  );

  // C3: block deleting the last active Admin.
  if (member && isActiveAdmin(member) && countActiveAdmins(id) === 0) {
    toast('This is the last active Admin — promote another Admin before deleting this member.', 'error');
    return false;
  }

  // C4: block deleting a member who still owns Tasks — deleting them would
  // leave those Tasks pointing at a name that no longer resolves to anyone.
  // No auto-reassignment; the admin must reassign first.
  if (member) {
    const memberName = (member.name || '').toLowerCase().trim();
    const hasTasks = !!memberName && state.tasks.some(
      (t) => (t.assigned_to || '').toLowerCase().trim() === memberName
    );
    if (hasTasks) {
      toast('This member has Tasks assigned to them. Reassign those Tasks before deleting this member.', 'error');
      return false;
    }
  }

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
// C4: builds the Assigned To select. `currentAssignedTo` (passed only when
// opening Edit on an existing Task) is preserved as a selectable option even
// if that member is now inactive or no longer has a team_members row at all
// — so opening Edit never silently clears assigned_to just because the
// assignee became inactive since the Task was created. An inactive member is
// never offered for a NEW assignment: Create Task and the plain
// populateTeamMembers() call both omit currentAssignedTo, and an inactive
// member only ever appears when they are already the Task's current value.
function populateTaskAssigneeSelect(currentAssignedTo = '') {
  const select = $('#assigned-to-select');

  if (!select) return;

  const activeMembers = state.teamMembers.filter(
    (m) => (m.status || '').toLowerCase() !== 'inactive'
  );

  const trimmedCurrent = (currentAssignedTo || '').trim();
  const currentIsActive = activeMembers.some((m) => m.name === trimmedCurrent);
  const legacyOption = (trimmedCurrent && !currentIsActive)
    ? `<option value="${escapeHtml(trimmedCurrent)}">${escapeHtml(trimmedCurrent)} (Inactive)</option>`
    : '';

  select.innerHTML = `
    <option value="">Select Team Member</option>
    ${legacyOption}
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

function populateTeamMembers() {
  populateTaskAssigneeSelect();
}

function populateLeadOwnerSelect() {
  const select = $('#lead-owner-id');
  if (!select) return;
  const active = state.teamMembers.filter(
    (m) => (m.status || '').toLowerCase() !== 'inactive'
  );
  select.innerHTML =
    '<option value="">No owner</option>' +
    active
      .map(
        (m) =>
          `<option value="${m.id}">${escapeHtml(m.name)}${m.job_title ? ` — ${escapeHtml(m.job_title)}` : ''}</option>`
      )
      .join('');
}

function renderStats() {
  // "All Projects" is deliberately all-time inventory (active + archived) —
  // see its subtitle. Every other project KPI here (Operational/On Hold/
  // Urgent) is operational-only. Cancelled Projects is the other all-time
  // exception: cancelled projects are auto-archived (Sprint 3.1A), so that
  // card counts archived cancelled projects via visibleProjects.
  const operationalProjects = getOperationalProjects();
  const visibleProjects = getVisibleProjects();
  const visibleTasks = getVisibleTasks();

  const totalProjects = visibleProjects.length;

  const activeProjects = operationalProjects.filter(
    (p) => (p.status || '').toLowerCase() === 'active'
  ).length;

  const onHoldProjects = operationalProjects.filter(
    (p) => (p.status || '').toLowerCase() === 'on_hold'
  ).length;

  const urgentProjects = operationalProjects.filter(
    (p) => (p.priority || '').toLowerCase() === 'urgent'
  ).length;

  const cancelledProjects = visibleProjects.filter(
    (p) => (p.status || '').toLowerCase() === 'cancelled'
  ).length;

  // "Operational Tasks" — getVisibleTasks() already excludes archived
  // (monthly-cycle) tasks, so every card below is current-cycle only.
  const totalTasks = visibleTasks.length;

  const completedTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  ).length;

  const cancelledTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'cancelled'
  ).length;

  const inProgress = visibleTasks.filter(
    (t) => ['in_progress', 'review'].includes((t.status || '').toLowerCase())
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = visibleTasks.filter((t) => {
    if (!t.deadline) return false;
    if (['completed', 'cancelled'].includes((t.status || '').toLowerCase())) return false;

    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);

    return d < today;
  }).length;

  $('#stat-total-projects').textContent = totalProjects;
  $('#stat-active-projects').textContent = activeProjects;
  $('#stat-onhold-projects').textContent = onHoldProjects;
  $('#stat-urgent-projects').textContent = urgentProjects;
  $('#stat-cancelled-projects').textContent = cancelledProjects;

  $('#stat-total-tasks').textContent = totalTasks;
  $('#stat-completed-tasks').textContent = completedTasks;
  $('#stat-in-progress').textContent = inProgress;
  $('#stat-overdue').textContent = overdue;
  $('#stat-cancelled-tasks').textContent = cancelledTasks;

  $('#nav-projects-count').textContent = state.projects.length;
  $('#nav-tasks-count').textContent = totalTasks;

  const teamCount = state.teamMembers.length;
const teamCountEl = $('#nav-team-count');

if (teamCountEl) {
  teamCountEl.textContent = teamCount;
}

  // Role-aware copy and Projects Overview visibility
  const member = isMember();

  const projectsOverview = $('#dash-projects-overview');
  if (projectsOverview) {
    projectsOverview.classList.toggle('hidden', member);
  }

  const dashSubtitle = $('#dash-subtitle');
  if (dashSubtitle) {
    dashSubtitle.textContent = member
      ? "Here's your work and progress for today."
      : "Here's what's happening across your agency today.";
  }

  const tasksOverviewTitle = $('#tasks-overview-title');
  if (tasksOverviewTitle) {
    tasksOverviewTitle.textContent = member ? 'My Tasks' : 'Tasks Overview';
  }

  const tasksOverviewSubtitle = $('#tasks-overview-subtitle');
  if (tasksOverviewSubtitle) {
    tasksOverviewSubtitle.textContent = member
      ? 'Your assigned tasks and deadlines.'
      : 'Monitor tasks and deadlines.';
  }

  const totalTasksLabel = $('#stat-total-tasks-label');
  if (totalTasksLabel) {
    totalTasksLabel.textContent = member ? 'My Tasks' : 'Operational Tasks';
  }

  const totalTasksSub = $('#stat-total-tasks-sub');
  if (totalTasksSub) {
    totalTasksSub.textContent = member ? 'Assigned to you' : 'Active workload';
  }

  const recentProjectsSub = $('#recent-projects-subtitle');
  if (recentProjectsSub) {
    recentProjectsSub.textContent = member
      ? 'Projects with your tasks'
      : 'Latest agency engagements';
  }

  const headerLabel = $('#dash-header-label');
  if (headerLabel) {
    headerLabel.textContent = member ? 'My Dashboard' : 'Agency Overview';
  }

  const welcomeNameEl = $('#dash-welcome-name');
  if (welcomeNameEl) {
    const currentMember = getCurrentMember();
    const firstName = currentMember?.name
      ? currentMember.name.split(' ')[0]
      : (state.currentUser?.email?.split('@')[0] || 'Tgorian');
    welcomeNameEl.textContent = firstName;
  }

  const perfHeading = $('#dash-perf-heading');
  if (perfHeading) {
    perfHeading.classList.toggle('hidden', isAdmin());
  }
}

let projectsChartInstance = null;
let tasksChartInstance = null;
let teamChartInstance = null;
let financeIncomeExpenseChartInstance = null;
let financeExpenseCategoryChartInstance = null;
let financeProjectRevenueChartInstance = null;

// Draws the task count at the end of each Team Workload bar. Chart.js core
// has no built-in data-label support, so this is a minimal custom plugin
// rather than pulling in chartjs-plugin-datalabels.
const teamWorkloadValueLabelPlugin = {
  id: 'teamWorkloadValueLabel',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta) return;
    const values = chart.data.datasets[0].data;
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = '#374151';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      ctx.fillText(String(values[i]), bar.x + 6, bar.y);
    });
    ctx.restore();
  }
};

function renderCharts() {

  const memberView = isMember();

  // -------- Projects Chart --------

  const projectsCard = document
    .getElementById('projectsChart')
    ?.closest('.shadow-card');

  if (memberView) {
    if (projectsChartInstance) {
      projectsChartInstance.destroy();
      projectsChartInstance = null;
    }

    if (projectsCard) projectsCard.classList.add('hidden');
  } else {
    if (projectsCard) projectsCard.classList.remove('hidden');

    // Operational-only, same helper as renderStats() — completed projects
    // are auto-archived (Sprint 3.1A) so archived completions are historical
    // and excluded here rather than inflating the "Completed" slice.
    const operationalProjectsForChart = getOperationalProjects();

    const activeProjects = operationalProjectsForChart.filter(
      (p) => (p.status || '').toLowerCase() === 'active'
    ).length;

    const onHoldProjects = operationalProjectsForChart.filter(
      (p) => (p.status || '').toLowerCase() === 'on_hold'
    ).length;

    const completedProjects = operationalProjectsForChart.filter(
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
          layout: { padding: 0 },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 10, font: { size: 11 }, padding: 8 }
            }
          }
        }
      });
    }
  }

  // -------- Tasks Chart --------

  const visibleTasks = getVisibleTasks();

  const todoTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'todo'
  ).length;

  const inProgressTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'in_progress'
  ).length;

  const reviewTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'review'
  ).length;

  const onHoldTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'on_hold'
  ).length;

  const completedTasks = visibleTasks.filter(
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
          'On Hold',
          'Completed'
        ],
        datasets: [
          {
            data: [
              todoTasks,
              inProgressTasks,
              reviewTasks,
              onHoldTasks,
              completedTasks
            ],
            backgroundColor: [
              '#CBD5E1',
              '#F59E0B',
              '#8B5CF6',
              '#FB923C',
              '#10B981'
            ],
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, right: 0, bottom: 0, left: 0 } },
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

const teamCard = document
  .getElementById('teamChart')
  ?.closest('.shadow-card');

if (memberView) {
  if (teamChartInstance) {
    teamChartInstance.destroy();
    teamChartInstance = null;
  }

  if (teamCard) teamCard.classList.add('hidden');
} else {
  if (teamCard) teamCard.classList.remove('hidden');

  // Team roster is the source of truth for who appears — same "not inactive"
  // rule used by populateTeamMembers()/populateLeadOwnerSelect() elsewhere —
  // so members with zero current workload still show up with a 0 bar.
  const activeMembers = state.teamMembers.filter(
    (m) => (m.status || '').toLowerCase() !== 'inactive'
  );

  const workloadMap = {};

  // Same active/non-archived source as Tasks Overview / Upcoming Tasks —
  // keeps archived (monthly-cycle) tasks out of the workload counts.
  getVisibleTasks()
    .filter((task) => !['completed', 'cancelled'].includes((task.status || '').toLowerCase()))
    .forEach((task) => {
      const key = (task.assigned_to || '').toLowerCase().trim();
      if (!key) return;
      workloadMap[key] = (workloadMap[key] || 0) + 1;
    });

  const memberWorkload = activeMembers.map((m) => ({
    name: m.name || 'Unnamed',
    count: workloadMap[(m.name || '').toLowerCase().trim()] || 0
  }));

  // Highest workload first, 0-task members sink to the bottom, ties broken
  // alphabetically.
  memberWorkload.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const memberLabels = memberWorkload.map((m) => m.name);
  const workloadData = memberWorkload.map((m) => m.count);

  const teamCtx = document
    .getElementById('teamChart')
    ?.getContext('2d');

  if (teamChartInstance) {
    teamChartInstance.destroy();
  }

  if (teamCtx) {
    teamChartInstance = new Chart(teamCtx, {
      type: 'bar',

      data: {
        labels: memberLabels,

        datasets: [
          {
            data: workloadData,
            backgroundColor: '#6366F1',
            borderRadius: 6,
            maxBarThickness: 22
          }
        ]
      },

      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        // Right padding leaves room for the value label drawn past the bar end.
        layout: { padding: { top: 4, right: 28, bottom: 4, left: 0 } },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } }
          },
          y: {
            ticks: { autoSkip: false, font: { size: 11 } }
          }
        }
      },

      plugins: [teamWorkloadValueLabelPlugin]
    });
  }
}
}

function renderTodayFocus() {
  const widget = $('#today-focus-widget');
  const body = $('#today-focus-body');

  if (!widget || !body) return;

  if (isAdmin() || isManager()) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');

  const currentMember = getCurrentMember();
  const memberName = (currentMember?.name || '').toLowerCase().trim();

  const myTasks = state.tasks.filter((t) => {
    if (t.is_archived) return false;
    const status = (t.status || '').toLowerCase();
    if (status === 'completed' || status === 'on_hold') return false;
    return (t.assigned_to || '').toLowerCase().trim() === memberName;
  });

  if (myTasks.length === 0) {
    body.innerHTML = `
      <div class="text-center py-6">
        <div class="w-10 h-10 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-2">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>
        </div>
        <p class="text-sm font-semibold text-gray-800">All caught up!</p>
        <p class="text-xs text-gray-400 mt-0.5">No active tasks assigned to you.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDiffDays = (task) => {
    if (!task.deadline) return null;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return Math.round((deadline - today) / (1000 * 60 * 60 * 24));
  };

  const focusTask = [...myTasks].sort((a, b) => {
    const diffA = getDiffDays(a);
    const diffB = getDiffDays(b);

    const overdueA = diffA !== null && diffA < 0;
    const overdueB = diffB !== null && diffB < 0;
    if (overdueA !== overdueB) return overdueA ? -1 : 1;

    const dueTodayA = diffA === 0;
    const dueTodayB = diffB === 0;
    if (dueTodayA !== dueTodayB) return dueTodayA ? -1 : 1;

    const priorityA = (a.priority || '').toLowerCase();
    const priorityB = (b.priority || '').toLowerCase();

    const urgentA = priorityA === 'urgent';
    const urgentB = priorityB === 'urgent';
    if (urgentA !== urgentB) return urgentA ? -1 : 1;

    const highA = priorityA === 'high';
    const highB = priorityB === 'high';
    if (highA !== highB) return highA ? -1 : 1;

    const timeA = diffA === null ? Infinity : diffA;
    const timeB = diffB === null ? Infinity : diffB;
    if (timeA !== timeB) return timeA - timeB;

    return Number(a.id) - Number(b.id);
  })[0];

  const project = state.projects.find((p) => p.id === focusTask.project_id);
  const status = (focusTask.status || 'todo').toLowerCase();
  const priority = (focusTask.priority || 'medium').toLowerCase();

  body.innerHTML = `
    <div class="focus-task-card">
      <p class="text-base font-semibold text-gray-900 leading-snug mb-1">${escapeHtml(focusTask.task_info || 'Untitled task')}</p>
      <p class="text-xs font-medium text-brand-500">${escapeHtml(project?.project_name || 'No project')}</p>
    </div>

    <div class="flex items-center gap-1.5 mb-3">
      <span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span>
      <span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span>
    </div>

    <div class="flex items-center justify-between">
      <p class="text-xs text-gray-400">
        Due <span class="${deadlineClass(focusTask.deadline)} font-semibold">${fmtDate(focusTask.deadline)}</span>
      </p>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition"
        data-action="open-task-details"
        data-id="${focusTask.id}"
      >
        Open Task <i data-lucide="arrow-right" class="w-3 h-3"></i>
      </button>
    </div>
  `;

  refreshIcons();
}

function renderRecentProjects() {
  const container = $('#recent-projects-list');
  // Operational only — archived projects are historical and shouldn't
  // surface in the "latest engagements" widget by default.
  const recent = [...getOperationalProjects()].slice(0, 5);
  if (recent.length === 0) {
    const emptyMsg = isMember()
      ? 'No projects are linked to your tasks yet.'
      : 'No projects yet. Create one to get started.';
    container.innerHTML = `
      <div class="px-5 py-12 text-center">
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <i data-lucide="folder-open" class="w-5 h-5 text-gray-400"></i>
        </div>
        <p class="text-sm font-medium text-gray-700">${emptyMsg}</p>
      </div>`;
    refreshIcons();
    return;
  }
  container.innerHTML = recent
    .map((p) => {
      const status = (p.status || 'planning').toLowerCase();
      const priority = (p.priority || 'medium').toLowerCase();
      const dlClass = deadlineClass(p.deadline) || 'text-gray-400';
      return `
      <button type="button" class="recent-row flex-wrap sm:flex-nowrap" data-action="open-project-details" data-id="${p.id}">
        <div class="client-avatar ${avatarColor(p.client)} shrink-0">${initials(p.client || p.project_name)}</div>
        <div class="flex-1 min-w-0">
          <span class="row-title block w-full text-left text-sm font-semibold text-gray-900 truncate leading-snug">${escapeHtml(p.project_name || 'Untitled')}</span>
          <p class="text-xs text-gray-400 truncate mt-0.5">${escapeHtml(p.client || 'No client')}</p>
        </div>
        <div class="recent-row-meta">
          <div class="flex items-center gap-1.5">
            <span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span>
            <span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span>
          </div>
          <div class="text-[11px] text-right leading-snug">
            ${p.start_date ? `<p class="text-gray-400">Start ${fmtDate(p.start_date)}</p>` : ''}
            ${p.deadline ? `<p class="font-medium ${dlClass}">Due ${fmtDate(p.deadline)}</p>` : ''}
          </div>
        </div>
      </button>`;
    })
    .join('');
  refreshIcons();
}

// Bucket rank for Upcoming Tasks ordering: overdue, then due today, then
// everything else (future deadline or no deadline).
function upcomingTaskBucketRank(task, today) {
  if (!task.deadline) return 2;
  const d = new Date(task.deadline);
  d.setHours(0, 0, 0, 0);
  if (d < today) return 0;
  if (d.getTime() === today.getTime()) return 1;
  return 2;
}

const UPCOMING_TASK_PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

function renderRecentTasks() {
  const container = $('#recent-tasks-list');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [...getVisibleTasks()]
    .filter((t) => !['completed', 'cancelled'].includes((t.status || '').toLowerCase()))
    .sort((a, b) => {
      const bucketA = upcomingTaskBucketRank(a, today);
      const bucketB = upcomingTaskBucketRank(b, today);
      if (bucketA !== bucketB) return bucketA - bucketB;

      const priorityA = UPCOMING_TASK_PRIORITY_RANK[(a.priority || 'medium').toLowerCase()] ?? 2;
      const priorityB = UPCOMING_TASK_PRIORITY_RANK[(b.priority || 'medium').toLowerCase()] ?? 2;
      if (priorityA !== priorityB) return priorityA - priorityB;

      const da = a.deadline ? new Date(a.deadline) : new Date(8640000000000000);
      const db = b.deadline ? new Date(b.deadline) : new Date(8640000000000000);
      return da - db;
    })
    .slice(0, 5);

  if (upcoming.length === 0) {
    const emptyMsg = isMember()
      ? "You're all caught up — no upcoming tasks."
      : 'All clear. No upcoming tasks.';
    container.innerHTML = `
      <div class="px-5 py-12 text-center">
        <div class="w-10 h-10 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <i data-lucide="check-check" class="w-5 h-5 text-emerald-500"></i>
        </div>
        <p class="text-sm font-medium text-gray-700">${emptyMsg}</p>
      </div>`;
    refreshIcons();
    return;
  }
  const showAssignee = !isMember();
  container.innerHTML = upcoming
    .map((t) => {
      const priority = (t.priority || 'medium').toLowerCase();
      const status = (t.status || 'todo').toLowerCase();
      const project = state.projects.find((p) => p.id === t.project_id);
      const dlClass = deadlineClass(t.deadline) || 'text-gray-400';
      const subtitleParts = [];
      if (showAssignee) subtitleParts.push(escapeHtml(t.assigned_to || 'Unassigned'));
      if (project) subtitleParts.push(escapeHtml(project.project_name));
      const subtitle = subtitleParts.join(' · ') || '—';
      return `
      <button type="button" class="recent-row flex-wrap sm:flex-nowrap" data-action="open-task-details" data-id="${t.id}">
        ${showAssignee ? `<div class="client-avatar ${avatarColor(t.assigned_to)} shrink-0">${initials(t.assigned_to)}</div>` : ''}
        <div class="flex-1 min-w-0">
          <span class="row-title block w-full text-left text-sm font-semibold text-gray-900 truncate leading-snug">${escapeHtml(t.task_info || 'Untitled task')}</span>
          <p class="text-xs text-gray-400 truncate mt-0.5">${subtitle}</p>
        </div>
        <div class="recent-row-meta">
          <div class="flex items-center gap-1.5">
            <span class="badge badge-${status}"><span class="dot"></span>${labelize(status)}</span>
            <span class="badge priority-${priority}"><span class="dot"></span>${labelize(priority)}</span>
          </div>
          <div class="text-[11px] text-right leading-snug">
            ${t.start_date ? `<p class="text-gray-400">From ${fmtDate(t.start_date)}</p>` : ''}
            <p class="font-medium ${dlClass}">Due ${fmtDate(t.deadline)}</p>
          </div>
        </div>
      </button>`;
    })
    .join('');
  refreshIcons();
}

// Pure predicate for the deadline filter buckets (overdue/due_today/due_this_week/no_deadline)
// shared by getFilteredProjects(), getFilteredTasks(), and getFilteredProjectDetailsTasks().
// No DOM, no rendering, no role logic, no state mutation. `today` is passed in
// (computed once per filter pass by the caller) rather than read here, matching
// how each call site already computed it before this extraction.
function matchesDeadlineFilter(deadline, status, bucket, today) {
  if (bucket === 'no_deadline') {
    return !deadline;
  }

  if (!deadline) return false;

  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);

  if (bucket === 'overdue') {
    return d < today && !['completed', 'cancelled'].includes((status || '').toLowerCase());
  }

  if (bucket === 'due_today') {
    return d.getTime() === today.getTime();
  }

  if (bucket === 'due_this_week') {
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return d >= today && d < weekFromNow;
  }

  return true;
}

// Sprint CRM-4.5A fix pass — generic date-bucket predicate for the new CRM
// date header filters (Deals Close Date, Activities Date, Proposals Sent
// Date, Leads Last Activity). These fields aren't deadlines tied to a
// completion status, so this reuses the Past/Today/Next 7 Days/No Date
// bucket vocabulary of matchesDeadlineFilter() above without its
// overdue/not-completed exclusion — the smallest extension that keeps every
// CRM date filter behaviorally consistent with one another.
function matchesDateBucketFilter(dateValue, bucket, today) {
  if (bucket === 'no_date') return !dateValue;
  if (!dateValue) return false;

  const d = new Date(dateValue);
  d.setHours(0, 0, 0, 0);

  if (bucket === 'past') return d < today;
  if (bucket === 'today') return d.getTime() === today.getTime();

  if (bucket === 'next_7_days') {
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return d >= today && d < weekFromNow;
  }

  return true;
}

// Sprint CRM-4.5A fix pass — generic numeric-bucket predicate for the new CRM
// amount header filters (Deals Value, Proposals Amount). Fixed thresholds,
// not currency-aware — see the fix-pass delivery report for rationale/limits.
function matchesAmountBucketFilter(amount, bucket) {
  if (bucket === 'none') return amount === null || amount === undefined || amount === '';

  const n = Number(amount);
  if (Number.isNaN(n)) return false;

  if (bucket === 'under_10k') return n < 10000;
  if (bucket === '10k_50k') return n >= 10000 && n < 50000;
  if (bucket === '50k_100k') return n >= 50000 && n < 100000;
  if (bucket === 'over_100k') return n >= 100000;

  return true;
}

function getFilteredProjects() {
  // getProjectViewBase() applies the archiveView filter (active/archived/all).
  // Other filter predicates are applied on top.
  let data = [...getProjectViewBase()];

  if (state.filters.projects.search) {
    const q = state.filters.projects.search.toLowerCase();

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

  if (state.filters.projects.client) {
    const target = state.filters.projects.client.toLowerCase().trim();
    data = data.filter(
      (p) => (p.client || '').toLowerCase().trim() === target
    );
  }

  if (state.filters.projects.status !== 'all') {
    data = data.filter(
      (p) => (p.status || '').toLowerCase() === state.filters.projects.status
    );
  }

  if (state.filters.projects.priority !== 'all') {
    data = data.filter(
      (p) => (p.priority || 'medium').toLowerCase() === state.filters.projects.priority
    );
  }

  if (state.filters.projects.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data = data.filter((p) =>
      matchesDeadlineFilter(p.deadline, p.status, state.filters.projects.deadline, today)
    );
  }

  return data;
}

function getFilteredTasks() {
  // getTaskViewBase() applies role scoping and the archiveView filter
  // (active/archived/all). Other filter predicates are applied on top.
  let data = [...getTaskViewBase()];

  if (state.filters.tasks.status !== 'all') {
    data = data.filter(
      (t) => (t.status || '').toLowerCase() === state.filters.tasks.status
    );
  }

  if (state.filters.tasks.search) {
    const q = state.filters.tasks.search.toLowerCase();

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

  if (state.filters.tasks.priority !== 'all') {
    data = data.filter(
      (t) => (t.priority || 'medium').toLowerCase() === state.filters.tasks.priority
    );
  }

  if (state.filters.tasks.project) {
    data = data.filter(
      (t) => String(t.project_id) === String(state.filters.tasks.project)
    );
  }

  if (state.filters.tasks.assignee) {
    const target = state.filters.tasks.assignee.toLowerCase().trim();
    data = data.filter(
      (t) => (t.assigned_to || '').toLowerCase().trim() === target
    );
  }

  if (state.filters.tasks.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data = data.filter((t) =>
      matchesDeadlineFilter(t.deadline, t.status, state.filters.tasks.deadline, today)
    );
  }

  return data;
}

function renderProjects() {
  const tbody = $('#projects-table-body');
  const empty = $('#projects-empty');
  const data = getFilteredProjects();

  // Archive toggle active state
  $$('#projects-archive-toggle .archive-toggle-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.archiveView === (state.filters.projects.archiveView || 'active'));
  });

  const summaryEl = $('#projects-results-summary');
  if (summaryEl) {
    const total = getProjectViewBase().length;
    const filtered = data.length;

    summaryEl.textContent =
      filtered === total
        ? `Showing all ${total} Projects`
        : `Showing ${filtered} of ${total} Projects`;
  }

  const resetBtn = $('#projects-reset-filters');
  if (resetBtn) {
    const f = state.filters.projects;
    const hasActiveFilter =
      f.status !== 'all' ||
      f.priority !== 'all' ||
      !!f.client ||
      !!f.deadline ||
      !!f.search;
    resetBtn.classList.toggle('hidden', !hasActiveFilter);
  }

  renderActiveFilterChips('projects');
  renderHeaderFilters('projects');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');

    const isFilteredEmpty = getProjectViewBase().length > 0;

    const titleEl = $('#projects-empty-title');
    const messageEl = $('#projects-empty-message');
    if (titleEl) {
      titleEl.textContent = isFilteredEmpty
        ? 'No projects match your current filters.'
        : 'No projects yet';
    }
    if (messageEl) {
      messageEl.textContent = isFilteredEmpty
        ? 'Try adjusting or clearing your filters.'
        : 'Get started by creating your first project.';
    }

    $('#projects-empty-new-project-btn')?.classList.toggle('hidden', isFilteredEmpty);
    $('#projects-empty-reset-btn')?.classList.toggle('hidden', !isFilteredEmpty);

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

// ---------- Header Filter Engine ----------
// Generic popover/chip/reset plumbing shared by any module's table-header
// filters. Each module (e.g. "tasks") registers its DOM ids, its filter
// defaults, and the few bits of per-field logic (which options a popover
// shows, how a chip is labeled) that genuinely differ between modules.
const HEADER_FILTER_MODULES = {
  tasks: {
    stateKey: 'tasks',
    viewName: 'tasks',
    popoverIds: [
      'tasks-project-popover',
      'tasks-assignee-popover',
      'tasks-status-popover',
      'tasks-priority-popover',
      'tasks-deadline-popover',
    ],
    chipsContainerId: 'tasks-active-filters',
    // Filters that reset to 'all' instead of null when cleared/reset.
    allDefaultFilters: ['status', 'priority'],
    defaults: {
      status: 'all',
      priority: 'all',
      project: null,
      assignee: null,
      deadline: null,
      search: '',
      archiveView: 'active',
    },
    getChips: () => getTaskActiveFilterChips(),
    renderHeaderFilters: () => renderTasksHeaderFilters(),
    render: () => renderTasks(),
  },
  memberTasks: {
    stateKey: 'memberTasks',
    viewName: 'team-member',
    popoverIds: [
      'member-tasks-project-popover',
      'member-tasks-status-popover',
      'member-tasks-priority-popover',
      'member-tasks-deadline-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['status', 'priority'],
    defaults: {
      status: 'all',
      priority: 'all',
      project: null,
      deadline: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderMemberTasksHeaderFilters(),
    render: () => renderMemberTasksTable(),
  },
  projects: {
    stateKey: 'projects',
    viewName: 'projects',
    popoverIds: [
      'projects-client-popover',
      'projects-status-popover',
      'projects-priority-popover',
      'projects-deadline-popover',
    ],
    chipsContainerId: 'projects-active-filters',
    allDefaultFilters: ['status', 'priority'],
    defaults: {
      status: 'all',
      priority: 'all',
      client: null,
      deadline: null,
      search: '',
      archiveView: 'active',
    },
    getChips: () => getProjectActiveFilterChips(),
    renderHeaderFilters: () => renderProjectsHeaderFilters(),
    render: () => renderProjects(),
  },
  projectDetails: {
    stateKey: 'projectDetails',
    viewName: 'project-details',
    popoverIds: [
      'project-details-assignee-popover',
      'project-details-status-popover',
      'project-details-priority-popover',
      'project-details-deadline-popover',
    ],
    chipsContainerId: 'project-details-active-filters',
    allDefaultFilters: ['status', 'priority'],
    defaults: {
      status: 'all',
      priority: 'all',
      assignee: null,
      deadline: null,
      search: '',
    },
    getChips: () => getProjectDetailsActiveFilterChips(),
    renderHeaderFilters: () => renderProjectDetailsHeaderFilters(),
    render: () => renderProjectDetails(),
  },
  crmLeads: {
    stateKey: 'crmLeads',
    viewName: 'crm',
    popoverIds: [
      'crm-leads-lead-popover',
      'crm-leads-source-popover',
      'crm-leads-status-popover',
      'crm-leads-owner-popover',
      'crm-leads-client-popover',
      'crm-leads-last-activity-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['source', 'status', 'priority'],
    defaults: {
      archived: 'active',
      search: '',
      source: 'all',
      priority: 'all',
      status: 'all',
      owner: null,
      client: null,
      lead: null,
      lastActivity: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmLeadsHeaderFilters(),
    render: () => renderCrmLeads(),
  },
  crmClients: {
    stateKey: 'crmClients',
    viewName: 'crm',
    popoverIds: [
      'crm-clients-company-popover',
      'crm-clients-type-popover',
      'crm-clients-status-popover',
      'crm-clients-industry-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['type', 'status'],
    defaults: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      industry: null,
      company: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmClientsHeaderFilters(),
    render: () => renderCrmClients(),
  },
  // Sprint CRM-4.5A — Contacts/Deals/Activities/Proposals join the same
  // header-filter-popover system Leads/Clients already use, rather than a
  // new filter UI pattern. This reuses buildHeaderFilterOptions(),
  // resetModuleFilters(), and the generic popover click-delegation as-is.
  crmContacts: {
    stateKey: 'crmContacts',
    viewName: 'crm',
    popoverIds: [
      'crm-contacts-name-popover',
      'crm-contacts-client-popover',
      'crm-contacts-phone-popover',
      'crm-contacts-email-popover',
      'crm-contacts-status-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['status'],
    defaults: {
      archived: 'active',
      search: '',
      status: 'all',
      client: null,
      name: null,
      phone: null,
      email: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmContactsHeaderFilters(),
    render: () => renderCrmContacts(),
  },
  crmDeals: {
    stateKey: 'crmDeals',
    viewName: 'crm',
    popoverIds: [
      'crm-deals-deal-popover',
      'crm-deals-client-popover',
      'crm-deals-stage-popover',
      'crm-deals-value-popover',
      'crm-deals-owner-popover',
      'crm-deals-close-date-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['stage'],
    defaults: {
      archived: 'active',
      search: '',
      stage: 'all',
      status: 'all',
      client: null,
      owner: null,
      deal: null,
      value: null,
      closeDate: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmDealsHeaderFilters(),
    render: () => renderCrmDeals(),
  },
  crmActivities: {
    stateKey: 'crmActivities',
    viewName: 'crm',
    popoverIds: [
      'crm-activities-activity-popover',
      'crm-activities-client-popover',
      'crm-activities-type-popover',
      'crm-activities-status-popover',
      'crm-activities-date-popover',
      'crm-activities-owner-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['type', 'status'],
    defaults: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      client: null,
      owner: null,
      activity: null,
      date: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmActivitiesHeaderFilters(),
    render: () => renderCrmActivities(),
  },
  crmProposals: {
    stateKey: 'crmProposals',
    viewName: 'crm',
    popoverIds: [
      'crm-proposals-proposal-popover',
      'crm-proposals-client-popover',
      'crm-proposals-status-popover',
      'crm-proposals-amount-popover',
      'crm-proposals-sent-date-popover',
      'crm-proposals-owner-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['status'],
    defaults: {
      archived: 'active',
      search: '',
      status: 'all',
      client: null,
      proposal: null,
      amount: null,
      sentDate: null,
      owner: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmProposalsHeaderFilters(),
    render: () => renderCrmProposals(),
  },
};

function closeHeaderFilterPopovers(module) {
  HEADER_FILTER_MODULES[module]?.popoverIds.forEach((id) => {
    $(`#${id}`)?.classList.add('hidden');
  });
}

function closeAllHeaderFilterPopovers() {
  Object.keys(HEADER_FILTER_MODULES).forEach(closeHeaderFilterPopovers);
}

function openHeaderFilterPopover(module, popover) {
  closeHeaderFilterPopovers(module);
  popover.classList.remove('hidden');
}

function buildHeaderFilterOptions(popoverId, allLabel, items, activeValue) {
  const popover = $(`#${popoverId}`);
  if (!popover) return;

  const isActive = (value) => String(value) === String(activeValue ?? '');

  const options = [{ value: '', label: allLabel }, ...items];

  popover.innerHTML = options
    .map(
      (opt) => `
        <button type="button" class="task-th-popover-option${isActive(opt.value) ? ' active' : ''}" data-value="${escapeHtml(String(opt.value))}">
          ${escapeHtml(opt.label)}
        </button>
      `
    )
    .join('');
}

function syncHeaderFilterPopoverActive(popoverId, activeValue) {
  $$(`#${popoverId} .task-th-popover-option`).forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.value === String(activeValue ?? ''));
  });
}

function renderHeaderFilters(module) {
  HEADER_FILTER_MODULES[module]?.renderHeaderFilters();
}

function getActiveFilterChips(module) {
  return HEADER_FILTER_MODULES[module]?.getChips() || [];
}

function renderActiveFilterChips(module) {
  const config = HEADER_FILTER_MODULES[module];
  if (!config) return;

  const container = $(`#${config.chipsContainerId}`);
  if (!container) return;

  const chips = getActiveFilterChips(module);

  container.classList.toggle('hidden', chips.length === 0);

  container.innerHTML = chips
    .map(
      (chip) => `
        <span class="task-filter-chip">
          <span class="truncate max-w-[10rem]">${escapeHtml(chip.label)}</span>
          <button type="button" class="task-filter-chip-remove" data-filter-module="${module}" data-clear-filter="${chip.type}" aria-label="Remove filter">
            <i data-lucide="x" class="w-3 h-3"></i>
          </button>
        </span>
      `
    )
    .join('');

  refreshIcons();
}

function clearSingleFilter(module, filterType) {
  const config = HEADER_FILTER_MODULES[module];
  if (!config) return;

  const filters = state.filters[config.stateKey];

  if (filterType === 'search') {
    filters.search = '';

    if (state.view === config.viewName) {
      const searchInput = $('#global-search');
      if (searchInput) searchInput.value = '';
    }
  } else {
    filters[filterType] = config.allDefaultFilters.includes(filterType) ? 'all' : null;
  }

  closeHeaderFilterPopovers(module);
  config.render();
}

function resetModuleFilters(module) {
  const config = HEADER_FILTER_MODULES[module];
  if (!config) return;

  Object.assign(state.filters[config.stateKey], config.defaults);

  closeHeaderFilterPopovers(module);

  if (state.view === config.viewName) {
    const searchInput = $('#global-search');
    if (searchInput) searchInput.value = '';
  }

  config.render();
}

function renderTasksHeaderFilters() {
  const f = state.filters.tasks;

  $('#tasks-project-th-filter')?.classList.toggle('active', !!f.project);
  $('#tasks-assignee-th-filter')?.classList.toggle('active', !!f.assignee);
  $('#tasks-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#tasks-priority-th-filter')?.classList.toggle('active', f.priority !== 'all');
  $('#tasks-deadline-th-filter')?.classList.toggle('active', !!f.deadline);

  buildHeaderFilterOptions(
    'tasks-project-popover',
    'All Projects',
    state.projects.map((p) => ({ value: p.id, label: p.project_name || 'Untitled project' })),
    f.project
  );

  const assigneeThBtn = $('#tasks-assignee-th-filter');
  if (assigneeThBtn) {
    assigneeThBtn.disabled = isMember();
  }

  if (!isMember()) {
    buildHeaderFilterOptions(
      'tasks-assignee-popover',
      'All Assignees',
      state.teamMembers.map((m) => ({ value: m.name, label: m.name })),
      f.assignee
    );
  }

  syncHeaderFilterPopoverActive('tasks-status-popover', f.status);
  syncHeaderFilterPopoverActive('tasks-priority-popover', f.priority);
  syncHeaderFilterPopoverActive('tasks-deadline-popover', f.deadline);
}

function renderMemberTasksHeaderFilters() {
  const f = state.filters.memberTasks;

  $('#member-tasks-project-th-filter')?.classList.toggle('active', !!f.project);
  $('#member-tasks-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#member-tasks-priority-th-filter')?.classList.toggle('active', f.priority !== 'all');
  $('#member-tasks-deadline-th-filter')?.classList.toggle('active', !!f.deadline);

  buildHeaderFilterOptions(
    'member-tasks-project-popover',
    'All Projects',
    state.projects.map((p) => ({ value: p.id, label: p.project_name || 'Untitled project' })),
    f.project
  );

  syncHeaderFilterPopoverActive('member-tasks-status-popover', f.status);
  syncHeaderFilterPopoverActive('member-tasks-priority-popover', f.priority);
  syncHeaderFilterPopoverActive('member-tasks-deadline-popover', f.deadline);

  const hasActiveFilter =
    f.status !== 'all' ||
    f.priority !== 'all' ||
    !!f.project ||
    !!f.deadline ||
    state.memberTasksCardBase !== null;
  $('#member-tasks-clear-filters')?.classList.toggle('hidden', !hasActiveFilter);
}

function getTaskActiveFilterChips() {
  const f = state.filters.tasks;
  const deadlineLabels = {
    overdue: 'Overdue',
    due_today: 'Due Today',
    due_this_week: 'Due This Week',
    no_deadline: 'No Deadline',
  };

  const chips = [];

  if (f.search) {
    chips.push({ type: 'search', label: `Search: ${f.search}` });
  }

  if (f.status !== 'all') {
    chips.push({ type: 'status', label: `Status: ${labelize(f.status)}` });
  }

  if (f.priority !== 'all') {
    chips.push({ type: 'priority', label: `Priority: ${labelize(f.priority)}` });
  }

  if (f.project) {
    const project = state.projects.find((p) => String(p.id) === String(f.project));
    chips.push({ type: 'project', label: `Project: ${project ? project.project_name : 'Unknown'}` });
  }

  if (f.assignee) {
    chips.push({ type: 'assignee', label: `Assigned: ${f.assignee}` });
  }

  if (f.deadline) {
    chips.push({ type: 'deadline', label: `Deadline: ${deadlineLabels[f.deadline] || f.deadline}` });
  }

  return chips;
}

function renderProjectsHeaderFilters() {
  const f = state.filters.projects;

  $('#projects-client-th-filter')?.classList.toggle('active', !!f.client);
  $('#projects-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#projects-priority-th-filter')?.classList.toggle('active', f.priority !== 'all');
  $('#projects-deadline-th-filter')?.classList.toggle('active', !!f.deadline);

  const clients = Array.from(
    new Set(
      state.projects
        .map((p) => (p.client || '').trim())
        .filter((c) => c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  buildHeaderFilterOptions(
    'projects-client-popover',
    'All Clients',
    clients.map((c) => ({ value: c, label: c })),
    f.client
  );

  syncHeaderFilterPopoverActive('projects-status-popover', f.status);
  syncHeaderFilterPopoverActive('projects-priority-popover', f.priority);
  syncHeaderFilterPopoverActive('projects-deadline-popover', f.deadline);
}

function getProjectActiveFilterChips() {
  const f = state.filters.projects;
  const deadlineLabels = {
    overdue: 'Overdue',
    due_today: 'Due Today',
    due_this_week: 'Due This Week',
    no_deadline: 'No Deadline',
  };

  const chips = [];

  if (f.search) {
    chips.push({ type: 'search', label: `Search: ${f.search}` });
  }

  if (f.client) {
    chips.push({ type: 'client', label: `Client: ${f.client}` });
  }

  if (f.status !== 'all') {
    chips.push({ type: 'status', label: `Status: ${labelize(f.status)}` });
  }

  if (f.priority !== 'all') {
    chips.push({ type: 'priority', label: `Priority: ${labelize(f.priority)}` });
  }

  if (f.deadline) {
    chips.push({ type: 'deadline', label: `Deadline: ${deadlineLabels[f.deadline] || f.deadline}` });
  }

  return chips;
}

function getFilteredProjectDetailsTasks(projectId) {
  let data = state.tasks.filter((t) => Number(t.project_id) === Number(projectId));

  const f = state.filters.projectDetails;

  if (f.search) {
    const q = f.search.toLowerCase();

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

  if (f.assignee) {
    const target = f.assignee.toLowerCase().trim();
    data = data.filter(
      (t) => (t.assigned_to || '').toLowerCase().trim() === target
    );
  }

  if (f.status !== 'all') {
    data = data.filter(
      (t) => (t.status || '').toLowerCase() === f.status
    );
  }

  if (f.priority !== 'all') {
    data = data.filter(
      (t) => (t.priority || 'medium').toLowerCase() === f.priority
    );
  }

  if (f.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data = data.filter((t) =>
      matchesDeadlineFilter(t.deadline, t.status, f.deadline, today)
    );
  }

  return data;
}

function renderProjectDetailsHeaderFilters() {
  const f = state.filters.projectDetails;

  $('#project-details-assignee-th-filter')?.classList.toggle('active', !!f.assignee);
  $('#project-details-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#project-details-priority-th-filter')?.classList.toggle('active', f.priority !== 'all');
  $('#project-details-deadline-th-filter')?.classList.toggle('active', !!f.deadline);

  buildHeaderFilterOptions(
    'project-details-assignee-popover',
    'All Assignees',
    state.teamMembers.map((m) => ({ value: m.name, label: m.name })),
    f.assignee
  );

  syncHeaderFilterPopoverActive('project-details-status-popover', f.status);
  syncHeaderFilterPopoverActive('project-details-priority-popover', f.priority);
  syncHeaderFilterPopoverActive('project-details-deadline-popover', f.deadline);
}

function getProjectDetailsActiveFilterChips() {
  const f = state.filters.projectDetails;
  const deadlineLabels = {
    overdue: 'Overdue',
    due_today: 'Due Today',
    due_this_week: 'Due This Week',
    no_deadline: 'No Deadline',
  };

  const chips = [];

  if (f.search) {
    chips.push({ type: 'search', label: `Search: ${f.search}` });
  }

  if (f.status !== 'all') {
    chips.push({ type: 'status', label: `Status: ${labelize(f.status)}` });
  }

  if (f.priority !== 'all') {
    chips.push({ type: 'priority', label: `Priority: ${labelize(f.priority)}` });
  }

  if (f.assignee) {
    chips.push({ type: 'assignee', label: `Assigned: ${f.assignee}` });
  }

  if (f.deadline) {
    chips.push({ type: 'deadline', label: `Deadline: ${deadlineLabels[f.deadline] || f.deadline}` });
  }

  return chips;
}

// Sprint CRM-4.5A — shared option lists for the "Company"/"Owner" header
// filters now repeated across Leads/Contacts/Deals/Activities/Proposals.
function crmOwnerFilterOptions() {
  return state.teamMembers.map((m) => ({ value: m.id, label: m.name }));
}
function crmClientFilterOptions() {
  return state.crmClients.filter((c) => !c.is_archived).map((c) => ({ value: c.id, label: c.client_name }));
}

// Sprint CRM-4.5A fix pass — generic distinct-value option builder for the
// new text-column header filters (Company/Name/Phone/Email/Lead/Deal/
// Activity/Proposal). Generalizes the distinct-value logic the Industry
// filter already used, rather than repeating it per field.
function crmDistinctFieldOptions(items, field) {
  return [...new Set(items.map((item) => (item[field] || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

// Sprint CRM-4.5A — toggles a "Clear Filters" button's visibility based on
// whether any filter (other than the archived/active toggle, which has its
// own dedicated select and isn't considered a "filter" for this purpose —
// matching the existing Tasks table convention) or the search box is active.
function updateCrmClearFiltersVisibility(buttonId, filters, defaults) {
  const btn = $(`#${buttonId}`);
  if (!btn) return;
  const hasActiveFilter = Object.keys(defaults).some((key) => {
    if (key === 'archived') return false;
    if (key === 'search') return !!filters.search;
    return filters[key] !== defaults[key];
  });
  btn.classList.toggle('hidden', !hasActiveFilter);
}

// Sprint CRM-4.5A — CRM tables use their own dedicated search box per tab
// (unlike Projects/Tasks, which share #global-search), so clearing a CRM
// table's filters also needs to reset that box and the archived-view select
// manually; resetModuleFilters() only knows about #global-search.
function clearCrmModuleFilters(module, searchInputId, archivedSelectId) {
  resetModuleFilters(module);
  const searchEl = $(`#${searchInputId}`);
  if (searchEl) searchEl.value = '';
  const archivedEl = $(`#${archivedSelectId}`);
  if (archivedEl) archivedEl.value = 'active';
}

function renderCrmLeadsHeaderFilters() {
  const f = state.filters.crmLeads;

  $('#crm-leads-lead-th-filter')?.classList.toggle('active', f.lead !== null);
  $('#crm-leads-source-th-filter')?.classList.toggle('active', f.source !== 'all');
  $('#crm-leads-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-leads-owner-th-filter')?.classList.toggle('active', f.owner !== null);
  $('#crm-leads-client-th-filter')?.classList.toggle('active', f.client !== null);
  $('#crm-leads-last-activity-th-filter')?.classList.toggle('active', f.lastActivity !== null);

  buildHeaderFilterOptions('crm-leads-lead-popover', 'All Leads', crmDistinctFieldOptions(state.crmLeads, 'lead_name'), f.lead);
  syncHeaderFilterPopoverActive('crm-leads-source-popover', f.source);
  syncHeaderFilterPopoverActive('crm-leads-status-popover', f.status);

  buildHeaderFilterOptions('crm-leads-owner-popover', 'All Owners', crmOwnerFilterOptions(), f.owner);
  buildHeaderFilterOptions('crm-leads-client-popover', 'All Companies', crmClientFilterOptions(), f.client);
  syncHeaderFilterPopoverActive('crm-leads-last-activity-popover', f.lastActivity);

  updateCrmClearFiltersVisibility('crm-leads-clear-filters', f, HEADER_FILTER_MODULES.crmLeads.defaults);
}

function renderCrmClientsHeaderFilters() {
  const f = state.filters.crmClients;

  $('#crm-clients-company-th-filter')?.classList.toggle('active', f.company !== null);
  $('#crm-clients-type-th-filter')?.classList.toggle('active', f.type !== 'all');
  $('#crm-clients-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-clients-industry-th-filter')?.classList.toggle('active', f.industry !== null);

  buildHeaderFilterOptions('crm-clients-company-popover', 'All Companies', crmDistinctFieldOptions(state.crmClients, 'client_name'), f.company);
  syncHeaderFilterPopoverActive('crm-clients-type-popover', f.type);
  syncHeaderFilterPopoverActive('crm-clients-status-popover', f.status);

  buildHeaderFilterOptions('crm-clients-industry-popover', 'All Industries', crmDistinctFieldOptions(state.crmClients, 'industry'), f.industry);

  updateCrmClearFiltersVisibility('crm-clients-clear-filters', f, HEADER_FILTER_MODULES.crmClients.defaults);
}

function renderCrmContactsHeaderFilters() {
  const f = state.filters.crmContacts;

  $('#crm-contacts-name-th-filter')?.classList.toggle('active', f.name !== null);
  $('#crm-contacts-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-contacts-client-th-filter')?.classList.toggle('active', f.client !== null);
  $('#crm-contacts-phone-th-filter')?.classList.toggle('active', f.phone !== null);
  $('#crm-contacts-email-th-filter')?.classList.toggle('active', f.email !== null);

  buildHeaderFilterOptions('crm-contacts-name-popover', 'All Names', crmDistinctFieldOptions(state.crmContacts, 'contact_name'), f.name);
  syncHeaderFilterPopoverActive('crm-contacts-status-popover', f.status);
  buildHeaderFilterOptions('crm-contacts-client-popover', 'All Companies', crmClientFilterOptions(), f.client);
  buildHeaderFilterOptions('crm-contacts-phone-popover', 'All Phones', crmDistinctFieldOptions(state.crmContacts, 'phone'), f.phone);
  buildHeaderFilterOptions('crm-contacts-email-popover', 'All Emails', crmDistinctFieldOptions(state.crmContacts, 'email'), f.email);

  updateCrmClearFiltersVisibility('crm-contacts-clear-filters', f, HEADER_FILTER_MODULES.crmContacts.defaults);
}

function renderCrmDealsHeaderFilters() {
  const f = state.filters.crmDeals;

  $('#crm-deals-deal-th-filter')?.classList.toggle('active', f.deal !== null);
  $('#crm-deals-stage-th-filter')?.classList.toggle('active', f.stage !== 'all');
  $('#crm-deals-client-th-filter')?.classList.toggle('active', f.client !== null);
  $('#crm-deals-value-th-filter')?.classList.toggle('active', f.value !== null);
  $('#crm-deals-owner-th-filter')?.classList.toggle('active', f.owner !== null);
  $('#crm-deals-close-date-th-filter')?.classList.toggle('active', f.closeDate !== null);

  buildHeaderFilterOptions('crm-deals-deal-popover', 'All Deals', crmDistinctFieldOptions(state.crmDeals, 'deal_name'), f.deal);
  syncHeaderFilterPopoverActive('crm-deals-stage-popover', f.stage);
  buildHeaderFilterOptions('crm-deals-client-popover', 'All Companies', crmClientFilterOptions(), f.client);
  syncHeaderFilterPopoverActive('crm-deals-value-popover', f.value);
  buildHeaderFilterOptions('crm-deals-owner-popover', 'All Owners', crmOwnerFilterOptions(), f.owner);
  syncHeaderFilterPopoverActive('crm-deals-close-date-popover', f.closeDate);

  updateCrmClearFiltersVisibility('crm-deals-clear-filters', f, HEADER_FILTER_MODULES.crmDeals.defaults);
}

function renderCrmActivitiesHeaderFilters() {
  const f = state.filters.crmActivities;

  $('#crm-activities-activity-th-filter')?.classList.toggle('active', f.activity !== null);
  $('#crm-activities-type-th-filter')?.classList.toggle('active', f.type !== 'all');
  $('#crm-activities-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-activities-client-th-filter')?.classList.toggle('active', f.client !== null);
  $('#crm-activities-date-th-filter')?.classList.toggle('active', f.date !== null);
  $('#crm-activities-owner-th-filter')?.classList.toggle('active', f.owner !== null);

  buildHeaderFilterOptions('crm-activities-activity-popover', 'All Activities', crmDistinctFieldOptions(state.crmActivities, 'title'), f.activity);
  syncHeaderFilterPopoverActive('crm-activities-type-popover', f.type);
  syncHeaderFilterPopoverActive('crm-activities-status-popover', f.status);
  buildHeaderFilterOptions('crm-activities-client-popover', 'All Companies', crmClientFilterOptions(), f.client);
  syncHeaderFilterPopoverActive('crm-activities-date-popover', f.date);
  buildHeaderFilterOptions('crm-activities-owner-popover', 'All Owners', crmOwnerFilterOptions(), f.owner);

  updateCrmClearFiltersVisibility('crm-activities-clear-filters', f, HEADER_FILTER_MODULES.crmActivities.defaults);
}

function renderCrmProposalsHeaderFilters() {
  const f = state.filters.crmProposals;

  $('#crm-proposals-proposal-th-filter')?.classList.toggle('active', f.proposal !== null);
  $('#crm-proposals-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-proposals-client-th-filter')?.classList.toggle('active', f.client !== null);
  $('#crm-proposals-amount-th-filter')?.classList.toggle('active', f.amount !== null);
  $('#crm-proposals-sent-date-th-filter')?.classList.toggle('active', f.sentDate !== null);
  $('#crm-proposals-owner-th-filter')?.classList.toggle('active', f.owner !== null);

  buildHeaderFilterOptions('crm-proposals-proposal-popover', 'All Proposals', crmDistinctFieldOptions(state.crmProposals, 'proposal_title'), f.proposal);
  syncHeaderFilterPopoverActive('crm-proposals-status-popover', f.status);
  buildHeaderFilterOptions('crm-proposals-client-popover', 'All Companies', crmClientFilterOptions(), f.client);
  syncHeaderFilterPopoverActive('crm-proposals-amount-popover', f.amount);
  syncHeaderFilterPopoverActive('crm-proposals-sent-date-popover', f.sentDate);
  buildHeaderFilterOptions('crm-proposals-owner-popover', 'All Owners', crmOwnerFilterOptions(), f.owner);

  updateCrmClearFiltersVisibility('crm-proposals-clear-filters', f, HEADER_FILTER_MODULES.crmProposals.defaults);
}

// ---------- Tasks View Rendering ----------

function renderTasks() {
  const data = getFilteredTasks();
  renderTasksToolbar(data);
  renderTasksView(data);
}

// Syncs all toolbar UI that is shared between table and kanban views.
// Re-applied on every render (not just setView()) so filter changes, data
// refreshes, and empty states keep the toolbar consistent.
function renderTasksToolbar(data) {
  const baseTasks = getTaskViewBase();

  // New Task button visibility — gated by canCreateTask() so an unmapped
  // role_type fails closed (hidden) rather than open.
  $$('[data-action="open-task-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !canCreateTask());
  });

  // Archive toggle active state
  $$('#tasks-archive-toggle .archive-toggle-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.archiveView === (state.filters.tasks.archiveView || 'active'));
  });

  // View mode switcher active state
  $$('#tasks-view-switcher .view-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.viewMode === state.tasksViewMode);
  });

  const summaryEl = $('#tasks-results-summary');
  if (summaryEl) {
    const total = baseTasks.length;
    const filtered = data.length;
    summaryEl.textContent =
      filtered === total
        ? `Showing all ${total} Tasks`
        : `Showing ${filtered} of ${total} Tasks`;
  }

  const resetBtn = $('#tasks-reset-filters');
  if (resetBtn) {
    const f = state.filters.tasks;
    const hasActiveFilter =
      f.status !== 'all' ||
      f.priority !== 'all' ||
      !!f.project ||
      !!f.assignee ||
      !!f.deadline ||
      !!f.search;
    resetBtn.classList.toggle('hidden', !hasActiveFilter);
  }

  renderActiveFilterChips('tasks');
  renderHeaderFilters('tasks');
}

// Dispatches to the correct view renderer and toggles container visibility.
function renderTasksView(data) {
  const tableContainer = $('#tasks-table-container');
  const kanbanContainer = $('#tasks-kanban-container');

  if (state.tasksViewMode === 'kanban') {
    tableContainer?.classList.add('hidden');
    kanbanContainer?.classList.remove('hidden');
    renderTasksKanban(data);
  } else {
    kanbanContainer?.classList.add('hidden');
    tableContainer?.classList.remove('hidden');
    renderTasksTable(data);
  }
}

// Renders the tasks table and its empty state. Extracted from the former
// monolithic renderTasks() — pure extraction, zero logic changes.
function renderTasksTable(data) {
  const tbody = $('#tasks-table-body');
  const empty = $('#tasks-empty');
  const baseTasks = getTaskViewBase();

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');

    const isFilteredEmpty = baseTasks.length > 0;

    const titleEl = $('#tasks-empty-title');
    const messageEl = $('#tasks-empty-message');
    if (titleEl) {
      titleEl.textContent = isFilteredEmpty
        ? 'No tasks match your current filters.'
        : 'No tasks yet';
    }
    if (messageEl) {
      messageEl.textContent = isFilteredEmpty
        ? 'Try adjusting or clearing your filters.'
        : 'Add a task to start tracking your work.';
    }

    $('#tasks-empty-new-task-btn')?.classList.toggle('hidden', isFilteredEmpty || !canCreateTask());
    $('#tasks-empty-reset-btn')?.classList.toggle('hidden', !isFilteredEmpty);

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

      const rowDeadlineClass = renderTaskDeadlineRowClass(t);

      return `
        <tr class="${rowDeadlineClass}">
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
            ${renderStatusBadge(status)}
          </td>

          <td class="px-5 py-3.5">
            ${renderPriorityBadge(priority)}
          </td>

          ${renderDeadlineCell(t.deadline)}

          ${renderTaskActionsCell(t, {
            canDelete: canDeleteTask(t),
            canEdit: canFullyEditTask() || canLimitedEditTask(t),
            canRestore: !!t.is_archived && canFullyEditTask(),
          })}
        </tr>`;
    })
    .join('');

  refreshIcons();
}

// Ordered column definitions for the Kanban board.
const KANBAN_COLUMNS = [
  { status: 'todo',        label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review',      label: 'In Review' },
  { status: 'completed',   label: 'Completed' },
  { status: 'on_hold',     label: 'On Hold' },
  { status: 'cancelled',   label: 'Cancelled' },
];

// Pure function — returns HTML string for one kanban card.
// No DOM reads, no role logic (permission flags derived by caller context).
function renderTaskCard(task) {
  const priority = (task.priority || 'medium').toLowerCase();
  const project = state.projects.find((p) => p.id === task.project_id);
  const canDrag = canFullyEditTask() || canLimitedEditTask(task);
  const accentClass = renderTaskDeadlineRowClass(task);

  const projectBadge = project
    ? `<div class="kanban-card-meta">
         <span class="kanban-card-project">
           <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 inline-block"></span>
           ${escapeHtml(project.project_name)}
         </span>
       </div>`
    : '';

  const assigneeBadge = task.assigned_to
    ? `<div class="flex items-center gap-1.5 min-w-0 shrink-0">
         <div class="client-avatar ${avatarColor(task.assigned_to)}" style="width:1.25rem;height:1.25rem;font-size:0.5rem;">${initials(task.assigned_to)}</div>
         <span class="kanban-card-assignee">${escapeHtml(task.assigned_to)}</span>
       </div>`
    : '';

  const deadlineBadge = task.deadline
    ? `<span class="kanban-card-deadline ${deadlineClass(task.deadline)}">${fmtDate(task.deadline)}</span>`
    : '';

  const notesIcon = task.notes
    ? `<i data-lucide="message-square" class="w-3 h-3 text-amber-400 shrink-0" title="${escapeHtml(task.notes)}"></i>`
    : '';

  return `
    <div class="kanban-card${accentClass ? ' ' + accentClass : ''}"
         data-kanban-card
         data-task-id="${task.id}"
         ${canDrag ? 'draggable="true"' : ''}>
      <div class="kanban-card-title-row">
        <button type="button"
                class="kanban-card-title"
                data-action="open-task-details"
                data-id="${task.id}">
          ${escapeHtml(task.task_info || 'Untitled task')}
        </button>
        ${notesIcon}
      </div>
      ${projectBadge}
      <div class="kanban-card-footer">
        ${assigneeBadge}
        <div class="kanban-card-badges">
          ${renderPriorityBadge(priority)}
          ${deadlineBadge}
        </div>
      </div>
    </div>
  `;
}

// Renders the kanban board. Each column shows its subset of `data`;
// empty columns show a placeholder. The board itself is written into
// #tasks-kanban-container which persists across re-renders so drag
// event listeners (attached to the container) survive without re-wiring.
function renderTasksKanban(data) {
  const container = $('#tasks-kanban-container');
  if (!container) return;

  const grouped = {};
  KANBAN_COLUMNS.forEach(({ status }) => { grouped[status] = []; });
  data.forEach((t) => {
    const s = (t.status || 'todo').toLowerCase();
    if (grouped[s] !== undefined) {
      grouped[s].push(t);
    } else {
      grouped.todo.push(t);
    }
  });

  container.innerHTML = `
    <div class="kanban-board">
      ${KANBAN_COLUMNS.map(({ status, label }) => {
        const cards = grouped[status] || [];
        return `
          <div class="kanban-col" data-kanban-status="${status}">
            <div class="kanban-col-header">
              <span class="kanban-col-label">${label}</span>
              <span class="kanban-col-count">${cards.length}</span>
            </div>
            <div class="kanban-col-body">
              ${cards.length > 0
                ? cards.map(renderTaskCard).join('')
                : '<div class="kanban-col-empty">No tasks</div>'
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

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
        ${renderButton(createCloseButtonDescriptor())}

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

  const search = (state.filters.team.search || '').toLowerCase();
  let data = [...state.teamMembers];

  if (search) {
    data = data.filter((m) =>
      [m.name, m.email, m.job_title, m.department]
        .some((v) => v && String(v).toLowerCase().includes(search))
    );
  }

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-500">
          ${search ? 'No team members match your search.' : 'No team members yet.'}
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
            ${renderMemberActionsCell(member, {
              canManage: state.currentRole === 'admin',
              canDelete: state.currentRole === 'admin',
            })}
          </td>
        </tr>
      `;
    })
    .join('');

  refreshIcons();
}

// ---------- CRM Leads Render ----------
function renderCrmLeads() {
  const tbody = $('#crm-leads-table-body');
  const empty = $('#crm-leads-empty');
  const wrapper = $('#crm-leads-table-wrapper');

  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmLeads;
  const search = (f.search || '').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  renderActiveFilterChips('crmLeads');
  renderHeaderFilters('crmLeads');

  let leads = state.crmLeads.filter((l) =>
    f.archived === 'archived' ? l.is_archived : !l.is_archived
  );

  if (search) {
    leads = leads.filter((l) =>
      [l.lead_name, l.company_name, l.contact_person, l.phone, l.email, l.referred_by]
        .some((v) => v && String(v).toLowerCase().includes(search))
    );
  }

  if (f.lead !== null && f.lead !== undefined) {
    leads = leads.filter((l) => (l.lead_name || '').trim() === f.lead);
  }

  if (f.source && f.source !== 'all') {
    leads = leads.filter((l) => l.source === f.source);
  }

  if (f.priority && f.priority !== 'all') {
    leads = leads.filter((l) => l.priority === f.priority);
  }

  if (f.status && f.status !== 'all') {
    leads = leads.filter((l) => normalizeCrmLeadStatusForDisplay(l.status) === f.status);
  }

  if (f.owner !== null && f.owner !== undefined) {
    leads = leads.filter((l) => Number(l.owner_id) === Number(f.owner));
  }

  if (f.client !== null && f.client !== undefined) {
    leads = leads.filter((l) => Number(l.client_id) === Number(f.client));
  }

  if (f.lastActivity) {
    leads = leads.filter((l) => matchesDateBucketFilter(l.updated_at, f.lastActivity, today));
  }

  if (leads.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }

  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();

  tbody.innerHTML = leads
    .map((l) => {
      const owner = state.teamMembers.find((m) => Number(m.id) === Number(l.owner_id));
      // Sprint CRM-4.5D — prefer relational Company/Contact data; fall back
      // to legacy free-text columns for leads created before this sprint.
      const linkedClient = l.client_id ? state.crmClients.find(c => Number(c.id) === Number(l.client_id)) : null;
      const linkedContact = l.contact_id ? state.crmContacts.find(c => Number(c.id) === Number(l.contact_id)) : null;
      const companyLabel = linkedClient ? linkedClient.client_name : l.company_name;
      const emailLabel = linkedContact?.email || l.email;
      const ownerCell = owner
        ? `<div class="flex items-center gap-2">
             <div class="w-6 h-6 rounded-full ${avatarColor(owner.name)} flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">${initials(owner.name)}</div>
             <span>${escapeHtml(owner.name)}</span>
           </div>`
        : '—';

      const editBtn = admin
        ? `<button class="icon-btn" data-action="edit-lead" data-id="${l.id}" title="Edit lead">
             <i data-lucide="pencil" class="w-4 h-4"></i>
           </button>`
        : '';

      const archiveBtn = admin && !l.is_archived
        ? `<button class="icon-btn" data-action="archive-lead" data-id="${l.id}" title="Archive lead">
             <i data-lucide="archive" class="w-4 h-4"></i>
           </button>`
        : '';

      const restoreBtn = admin && l.is_archived
        ? `<button class="icon-btn text-emerald-600" data-action="restore-lead" data-id="${l.id}" title="Restore to Active">
             <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
           </button>`
        : '';

      const actionsCell = admin
        ? `<div class="inline-flex items-center gap-1">${editBtn}${archiveBtn}${restoreBtn}</div>`
        : '<span class="text-xs text-gray-400">View only</span>';

      return `
        <tr>
          <td class="px-5 py-3.5">
            <div class="min-w-0">
              <button
                class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 text-left"
                data-action="open-lead-details"
                data-id="${l.id}"
              >${escapeHtml(l.lead_name)}</button>
              ${emailLabel ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(emailLabel)}</p>` : ''}
            </div>
          </td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(companyLabel || '—')}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${labelize(l.source)}</td>
          <td class="px-5 py-3.5">${renderStatusBadge(normalizeCrmLeadStatusForDisplay(l.status))}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${ownerCell}</td>
          <td class="px-5 py-3.5 text-sm text-gray-500">${timeAgo(l.updated_at)}</td>
          <td class="px-5 py-3.5 text-right">${actionsCell}</td>
        </tr>
      `;
    })
    .join('');

  refreshIcons();
}

// ---------- CRM Clients Render ----------
function renderCrmClients() {
  const tbody = $('#crm-clients-table-body');
  const empty = $('#crm-clients-empty');
  const wrapper = $('#crm-clients-table-wrapper');

  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmClients;
  const search = (f.search || '').toLowerCase();

  renderActiveFilterChips('crmClients');
  renderHeaderFilters('crmClients');

  let clients = state.crmClients.filter((c) =>
    f.archived === 'archived' ? c.is_archived : !c.is_archived
  );

  if (search) {
    clients = clients.filter((c) =>
      [c.client_name, c.industry, c.email, c.phone, c.website]
        .some((v) => v && String(v).toLowerCase().includes(search))
    );
  }

  if (f.type && f.type !== 'all') {
    clients = clients.filter((c) => c.client_type === f.type);
  }

  if (f.status && f.status !== 'all') {
    clients = clients.filter((c) => (c.status || '').toLowerCase() === f.status);
  }

  if (f.industry !== null && f.industry !== undefined) {
    clients = clients.filter((c) => (c.industry || '').trim() === f.industry);
  }

  if (f.company !== null && f.company !== undefined) {
    clients = clients.filter((c) => (c.client_name || '').trim() === f.company);
  }

  if (clients.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }

  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();

  tbody.innerHTML = clients
    .map((c) => {
      const editBtn = admin
        ? `<button class="icon-btn" data-action="edit-client" data-id="${c.id}" title="Edit client">
             <i data-lucide="pencil" class="w-4 h-4"></i>
           </button>`
        : '';

      const archiveBtn = admin && !c.is_archived
        ? `<button class="icon-btn" data-action="archive-client" data-id="${c.id}" title="Archive client">
             <i data-lucide="archive" class="w-4 h-4"></i>
           </button>`
        : '';

      const restoreBtn = admin && c.is_archived
        ? `<button class="icon-btn text-emerald-600" data-action="restore-client" data-id="${c.id}" title="Restore to Active">
             <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
           </button>`
        : '';

      const actionsCell = admin
        ? `<div class="inline-flex items-center gap-1">${editBtn}${archiveBtn}${restoreBtn}</div>`
        : '<span class="text-xs text-gray-400">View only</span>';

      return `
        <tr>
          <td class="px-5 py-3.5">
            <div class="min-w-0">
              <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-client-details" data-id="${c.id}">${escapeHtml(c.client_name)}</button>
              ${c.email ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(c.email)}</p>` : ''}
            </div>
          </td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${labelize(c.client_type)}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(c.industry || '—')}</td>
          <td class="px-5 py-3.5">${renderStatusBadge(c.status)}</td>
          <td class="px-5 py-3.5 text-right">${actionsCell}</td>
        </tr>
      `;
    })
    .join('');

  refreshIcons();
}

// ---------- CRM Tab ----------
function setCrmTab(tab) {
  state.crmTab = tab;
  const tabs = ['dashboard', 'leads', 'clients', 'contacts', 'deals', 'activities', 'proposals', 'services'];
  tabs.forEach(t => {
    const section = $(`#crm-section-${t}`);
    const btn = document.querySelector(`[data-crm-tab="${t}"]`);
    if (section) section.classList.toggle('hidden', t !== tab);
    if (btn) {
      const active = t === tab;
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('text-gray-900', active);
      btn.classList.toggle('shadow-sm', active);
      btn.classList.toggle('text-gray-500', !active);
    }
  });
}

// ---------- CRM Timeline Helper ----------
function buildCrmTimeline(items) {
  if (!items.length) return '<p class="text-sm text-gray-400 py-3">No activity yet.</p>';
  return items
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .map(item => {
      const icons = { activity: 'activity', note: 'sticky-note', proposal: 'file-text' };
      const icon = icons[item.type] || 'circle';
      const owner = item.owner_id
        ? state.teamMembers.find(m => Number(m.id) === Number(item.owner_id))
        : null;
      return `
        <div class="flex gap-3 py-2 border-b border-gray-100 last:border-0">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
            <i data-lucide="${icon}" class="w-3 h-3 text-gray-500"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">${escapeHtml(item.title)}</p>
            ${item.subtitle ? `<p class="text-xs text-gray-500">${escapeHtml(item.subtitle)}</p>` : ''}
            <div class="flex items-center gap-2 mt-0.5">
              ${item.date ? `<span class="text-xs text-gray-400">${fmtDate(item.date)}</span>` : ''}
              ${owner ? `<span class="text-xs text-gray-400">· ${escapeHtml(owner.name)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
}

// ---------- CRM Dashboard Render ----------
// Sprint CRM-4.5F — maps a KPI-card/quick-nav click target to the CRM
// filter-state module it should write into. Only tabs whose header-filter
// system is safe to drive from a single scalar field (see
// HEADER_FILTER_MODULES) are listed here.
const CRM_TAB_FILTER_MODULES = {
  clients: 'crmClients',
  leads: 'crmLeads',
  deals: 'crmDeals',
  activities: 'crmActivities',
};

// Currency-safe aggregation shared by the Pipeline Value KPI and the
// Deals-by-Stage / Deals-by-Service-Type breakdowns. No FX conversion —
// if a group spans more than one currency we refuse to sum them into one
// number and surface "Mixed" instead (Sprint CRM-4.5F requirement).
function crmCurrencySafeTotal(deals) {
  const withValue = deals.filter(d => Number(d.value) > 0);
  const currencies = [...new Set(withValue.map(d => d.currency || 'EGP'))];
  const total = withValue.reduce((sum, d) => sum + Number(d.value), 0);

  if (currencies.length === 0) return { display: '—', mixed: false };
  if (currencies.length === 1) return { display: `${total.toLocaleString()} ${currencies[0]}`, mixed: false };

  const byCurrency = {};
  withValue.forEach(d => {
    const c = d.currency || 'EGP';
    byCurrency[c] = (byCurrency[c] || 0) + Number(d.value);
  });
  const grouped = Object.entries(byCurrency).map(([c, v]) => `${v.toLocaleString()} ${c}`).join(' · ');
  return { display: 'Mixed currencies', mixed: true, grouped };
}

// Compact HTML bar list — used in place of a chart library for the
// Sources / Service-Type breakdowns (Sprint CRM-4.5F: no external chart
// dependency for the CRM dashboard).
function renderCrmBarList(containerEl, rows, opts = {}) {
  if (!containerEl) return;
  if (!rows.length) {
    containerEl.innerHTML = `<p class="text-sm text-gray-400 py-6 text-center">${escapeHtml(opts.emptyText || 'No data yet.')}</p>`;
    return;
  }
  const max = Math.max(...rows.map(r => r.count), 1);
  containerEl.innerHTML = rows.map(r => `
    <div class="mb-2 last:mb-0">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-sm text-gray-700 font-medium truncate">${escapeHtml(r.label)}</span>
        <span class="text-xs text-gray-500 shrink-0">${r.count}${r.sub ? ` · ${escapeHtml(r.sub)}` : ''}</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="h-1.5 rounded-full ${opts.barColor || 'bg-indigo-500'}" style="width:${Math.max(4, Math.round(r.count / max * 100))}%"></div>
      </div>
    </div>
  `).join('');
}

function renderCrmDashboard() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const nonArchivedClients = state.crmClients.filter(c => !c.is_archived);
  const activeClients = nonArchivedClients.filter(c => (c.status || '').toLowerCase() === 'active');

  const leadStatus = l => normalizeCrmLeadStatusForDisplay(l.status);
  const nonArchivedLeads = state.crmLeads.filter(l => !l.is_archived);
  const openLeads = nonArchivedLeads.filter(l => !['converted', 'disqualified'].includes(leadStatus(l)));
  const convertedLeads = nonArchivedLeads.filter(l => leadStatus(l) === 'converted');

  const nonArchivedDeals = state.crmDeals.filter(d => !d.is_archived);
  const openDeals = nonArchivedDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const wonDeals  = nonArchivedDeals.filter(d => d.stage === 'won');
  const pipeline = crmCurrencySafeTotal(openDeals);

  const nonArchivedActivities = state.crmActivities.filter(a => !a.is_archived);
  const plannedActivities = nonArchivedActivities.filter(a => a.status === 'planned' && a.activity_date);
  const overdueAct  = plannedActivities.filter(a => new Date(a.activity_date) < now);
  const dueTodayAct = plannedActivities.filter(a => {
    const d = new Date(a.activity_date); d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  });
  const next7Act = plannedActivities.filter(a => {
    const d = new Date(a.activity_date); d.setHours(0, 0, 0, 0);
    return d.getTime() > now.getTime() && d < in7Days;
  });
  const upcomingAct = plannedActivities.filter(a => new Date(a.activity_date) >= now);

  // ---- KPI Cards ----
  const statsEl = $('#crm-dashboard-stats');
  if (statsEl) {
    const cards = [
      { label: 'Active Companies',    value: activeClients.length, sub: `of ${nonArchivedClients.length} total`, icon: 'building-2',  color: 'emerald', tab: 'clients',    filters: 'status=active' },
      { label: 'Open Leads',          value: openLeads.length,     sub: null, icon: 'target',      color: 'indigo',  tab: 'leads' },
      { label: 'Converted Leads',     value: convertedLeads.length, sub: null, icon: 'user-check', color: 'teal',    tab: 'leads',      filters: 'status=converted' },
      { label: 'Open Deals',          value: openDeals.length,     sub: null, icon: 'handshake',   color: 'blue',    tab: 'deals' },
      { label: 'Won Deals',           value: wonDeals.length,      sub: null, icon: 'trophy',      color: 'amber',   tab: 'deals',      filters: 'stage=won' },
      { label: 'Pipeline Value',      value: pipeline.display,     sub: pipeline.mixed ? pipeline.grouped : null, icon: 'trending-up', color: 'violet',  tab: 'deals' },
      { label: 'Overdue Activities',  value: overdueAct.length,    sub: null, icon: 'clock',        color: overdueAct.length ? 'rose' : 'gray', tab: 'activities', filters: 'status=planned,date=past' },
      { label: 'Upcoming Activities', value: upcomingAct.length,   sub: null, icon: 'calendar', color: 'sky', tab: 'activities', filters: 'status=planned,date=next_7_days' },
    ];
    statsEl.innerHTML = cards.map(c => `
      <div class="stat-card kpi-card kpi-card--compact" data-action="crm-kpi-nav" data-crm-tab="${c.tab}" ${c.filters ? `data-crm-filters="${c.filters}"` : ''}>
        <div class="kpi-card-top">
          <div class="kpi-card-icon-wrap bg-${c.color}-50">
            <i data-lucide="${c.icon}" class="w-4 h-4 text-${c.color}-500"></i>
          </div>
        </div>
        <p class="kpi-card-label">${escapeHtml(c.label)}</p>
        <p class="kpi-card-value text-${c.color}-600">${c.value}</p>
        ${c.sub ? `<p class="text-[11px] text-gray-400 mt-0.5 truncate">${escapeHtml(c.sub)}</p>` : ''}
      </div>
    `).join('');
  }

  // ---- Deals by Stage & Value ----
  // Architecture note (Sprint CRM-2 investigation, carried forward): the
  // deal-form's Stage select only offers discovery/proposal/negotiation/won/
  // lost — 'meeting' is not a selectable value anywhere in the UI, so it is
  // excluded from this breakdown.
  const pipelineEl = $('#crm-dashboard-pipeline');
  if (pipelineEl) {
    const stages = ['discovery', 'proposal', 'negotiation', 'won', 'lost'];
    const stageData = stages.map(stage => {
      const items = nonArchivedDeals.filter(d => d.stage === stage);
      return { stage, count: items.length, summary: crmCurrencySafeTotal(items) };
    });

    if (!nonArchivedDeals.length) {
      pipelineEl.innerHTML = '<p class="text-sm text-gray-400 py-6 text-center">No deals yet.</p>';
    } else {
      pipelineEl.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th class="pb-2 pr-4">Stage</th>
                <th class="pb-2 pr-4">Deals</th>
                <th class="pb-2">Value</th>
              </tr>
            </thead>
            <tbody>
              ${stageData.map(s => `
                <tr class="border-b border-gray-50">
                  <td class="py-1.5 pr-4">${renderStatusBadge(s.stage)}</td>
                  <td class="py-1.5 pr-4 text-gray-600">${s.count}</td>
                  <td class="py-1.5 text-gray-600" title="${s.summary.mixed ? escapeHtml(s.summary.grouped) : ''}">${s.summary.display}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // ---- Leads Funnel ----
  const funnelEl = $('#crm-dashboard-funnel');
  if (funnelEl) {
    const funnelStages = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted'];
    const funnelData = funnelStages.map(s => ({
      stage: s,
      count: nonArchivedLeads.filter(l => leadStatus(l) === s).length,
    }));
    if (!nonArchivedLeads.length) {
      funnelEl.innerHTML = '<p class="text-sm text-gray-400 py-6 text-center">No leads yet.</p>';
    } else {
      const max = Math.max(...funnelData.map(f => f.count), 1);
      funnelEl.innerHTML = funnelData.map(f => `
        <div class="mb-2 last:mb-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            ${renderStatusBadge(f.stage)}
            <span class="text-xs text-gray-500">${f.count}</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full bg-indigo-500" style="width:${Math.max(4, Math.round(f.count / max * 100))}%"></div>
          </div>
        </div>
      `).join('');
    }
  }

  // ---- Leads by Source ----
  const sourcesEl = $('#crm-dashboard-sources');
  if (sourcesEl) {
    const bySource = {};
    nonArchivedLeads.forEach(l => {
      const key = l.source || 'unknown';
      bySource[key] = (bySource[key] || 0) + 1;
    });
    const rows = Object.entries(bySource)
      .map(([source, count]) => ({ label: labelize(source), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    renderCrmBarList(sourcesEl, rows, { emptyText: 'No leads yet.', barColor: 'bg-blue-500' });
  }

  // ---- Deals by Service Type ----
  const servicesEl = $('#crm-dashboard-services');
  if (servicesEl) {
    const byService = {};
    nonArchivedDeals.forEach(d => {
      const key = getCrmServiceTypeLabel(d.service_type_id) || 'Unspecified';
      if (!byService[key]) byService[key] = [];
      byService[key].push(d);
    });
    const rows = Object.entries(byService)
      .map(([label, deals]) => {
        const summary = crmCurrencySafeTotal(deals);
        return { label, count: deals.length, sub: summary.display !== '—' ? summary.display : null };
      })
      .sort((a, b) => b.count - a.count);
    renderCrmBarList(servicesEl, rows, { emptyText: 'No deals yet.', barColor: 'bg-violet-500' });
  }

  // ---- Activities Attention ----
  const activitiesEl = $('#crm-dashboard-activities');
  if (activitiesEl) {
    const byDateAsc = (a, b) => new Date(a.activity_date) - new Date(b.activity_date);
    const attention = [
      ...[...overdueAct].sort(byDateAsc).map(a => ({ ...a, bucket: 'overdue' })),
      ...[...dueTodayAct].sort(byDateAsc).map(a => ({ ...a, bucket: 'today' })),
      ...[...next7Act].sort(byDateAsc).map(a => ({ ...a, bucket: 'next_7' })),
    ];
    const bucketLabel = { overdue: 'Overdue', today: 'Due Today', next_7: 'Next 7 Days' };
    const bucketClass = { overdue: 'text-rose-600', today: 'text-amber-600', next_7: 'text-sky-600' };

    if (!attention.length) {
      activitiesEl.innerHTML = '<p class="text-sm text-gray-400 py-6 text-center">Nothing overdue or due soon.</p>';
    } else {
      const shown = attention.slice(0, 20);
      activitiesEl.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th class="pb-2 pr-4">When</th>
                <th class="pb-2 pr-4">Activity</th>
                <th class="pb-2 pr-4">Company</th>
                <th class="pb-2 pr-4">Related</th>
                <th class="pb-2 pr-4">Owner</th>
                <th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              ${shown.map(a => {
                const client = a.client_id ? state.crmClients.find(c => Number(c.id) === Number(a.client_id)) : null;
                const owner = a.owner_id ? state.teamMembers.find(m => Number(m.id) === Number(a.owner_id)) : null;
                let related = '—';
                if (a.deal_id) {
                  const deal = state.crmDeals.find(d => Number(d.id) === Number(a.deal_id));
                  if (deal) related = `<button class="text-indigo-600 hover:underline" data-action="open-deal-details" data-id="${deal.id}">${escapeHtml(deal.deal_name)}</button>`;
                } else if (a.lead_id) {
                  const lead = state.crmLeads.find(l => Number(l.id) === Number(a.lead_id));
                  if (lead) related = `<button class="text-indigo-600 hover:underline" data-action="open-lead-details" data-id="${lead.id}">${escapeHtml(lead.lead_name)}</button>`;
                }
                return `
                  <tr class="border-b border-gray-50">
                    <td class="py-1.5 pr-4 font-medium ${bucketClass[a.bucket]}">${bucketLabel[a.bucket]}<br><span class="text-xs text-gray-400 font-normal">${fmtDate(a.activity_date)}</span></td>
                    <td class="py-1.5 pr-4 text-gray-800">${escapeHtml(a.title || labelize(a.activity_type))}</td>
                    <td class="py-1.5 pr-4 text-gray-600">${client ? `<button class="hover:underline hover:text-indigo-600" data-action="open-client-details" data-id="${client.id}">${escapeHtml(client.client_name)}</button>` : '—'}</td>
                    <td class="py-1.5 pr-4 text-gray-600">${related}</td>
                    <td class="py-1.5 pr-4 text-gray-600">${owner ? escapeHtml(owner.name) : '—'}</td>
                    <td class="py-1.5">${renderStatusBadge(a.status || 'planned')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${attention.length > shown.length ? `<p class="text-xs text-gray-400 mt-3 text-center">+${attention.length - shown.length} more — view all in Activities</p>` : ''}
      `;
    }
  }

  refreshIcons();
}

// ---------- CRM Contacts Render ----------
function renderCrmContacts() {
  const tbody = $('#crm-contacts-table-body');
  const empty = $('#crm-contacts-empty');
  const wrapper = $('#crm-contacts-table-wrapper');
  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmContacts;
  const search = (f.search || '').toLowerCase();

  renderActiveFilterChips('crmContacts');
  renderHeaderFilters('crmContacts');

  let contacts = state.crmContacts.filter(c =>
    f.archived === 'archived' ? c.is_archived : !c.is_archived
  );
  if (search) {
    contacts = contacts.filter(c =>
      [c.contact_name, c.title, c.phone, c.email].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.status !== 'all') {
    contacts = contacts.filter(c => getCrmContactStatus(c) === f.status);
  }
  if (f.client !== null && f.client !== undefined) {
    contacts = contacts.filter(c => Number(c.client_id) === Number(f.client));
  }
  if (f.name !== null && f.name !== undefined) {
    contacts = contacts.filter(c => (c.contact_name || '').trim() === f.name);
  }
  if (f.phone !== null && f.phone !== undefined) {
    contacts = contacts.filter(c => (c.phone || '').trim() === f.phone);
  }
  if (f.email !== null && f.email !== undefined) {
    contacts = contacts.filter(c => (c.email || '').trim() === f.email);
  }

  if (contacts.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();
  tbody.innerHTML = contacts.map(c => {
    const client = state.crmClients.find(cl => Number(cl.id) === Number(c.client_id));
    return `
      <tr>
        <td class="px-5 py-3.5">
          <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-contact-details" data-id="${c.id}">${escapeHtml(c.contact_name)}</button>
          ${c.title ? `<p class="text-xs text-gray-500">${escapeHtml(c.title)}</p>` : ''}
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? `<button class="hover:text-indigo-600 hover:underline text-left" data-action="open-client-details" data-id="${client.id}">${escapeHtml(client.client_name)}</button>` : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(c.phone || '—')}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(c.email || '—')}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(getCrmContactStatus(c))}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-contact" data-id="${c.id}" title="Edit contact"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!c.is_archived ? `<button class="icon-btn" data-action="archive-contact" data-id="${c.id}" title="Archive contact"><i data-lucide="archive" class="w-4 h-4"></i></button>` : `<button class="icon-btn text-emerald-600" data-action="restore-contact" data-id="${c.id}" title="Restore to Active"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>`}
          </div>` : '<span class="text-xs text-gray-400">View only</span>'}
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

// ---------- CRM Deals Render ----------
function renderCrmDeals() {
  const tbody = $('#crm-deals-table-body');
  const empty = $('#crm-deals-empty');
  const wrapper = $('#crm-deals-table-wrapper');
  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmDeals;
  const search = (f.search || '').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  renderActiveFilterChips('crmDeals');
  renderHeaderFilters('crmDeals');

  let deals = state.crmDeals.filter(d =>
    f.archived === 'archived' ? d.is_archived : !d.is_archived
  );
  if (search) {
    deals = deals.filter(d =>
      [d.deal_name, d.notes].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.deal !== null && f.deal !== undefined) {
    deals = deals.filter(d => (d.deal_name || '').trim() === f.deal);
  }
  if (f.stage !== 'all') deals = deals.filter(d => d.stage === f.stage);
  if (f.status !== 'all') deals = deals.filter(d => d.status === f.status);
  if (f.client !== null && f.client !== undefined) {
    deals = deals.filter(d => Number(d.client_id) === Number(f.client));
  }
  if (f.value) {
    deals = deals.filter(d => matchesAmountBucketFilter(d.value, f.value));
  }
  if (f.owner !== null && f.owner !== undefined) {
    deals = deals.filter(d => Number(d.owner_id) === Number(f.owner));
  }
  if (f.closeDate) {
    deals = deals.filter(d => matchesDateBucketFilter(d.expected_close_date, f.closeDate, today));
  }

  if (deals.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();
  tbody.innerHTML = deals.map(d => {
    const client = state.crmClients.find(c => Number(c.id) === Number(d.client_id));
    const owner = state.teamMembers.find(m => Number(m.id) === Number(d.owner_id));
    const value = d.value != null ? `${Number(d.value).toLocaleString()} ${d.currency || 'EGP'}` : '—';
    return `
      <tr>
        <td class="px-5 py-3.5">
          <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-deal-details" data-id="${d.id}">
            ${escapeHtml(d.deal_name)}
          </button>
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? escapeHtml(client.client_name) : '—'}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(d.stage || 'discovery')}</td>
        <td class="px-5 py-3.5 text-sm font-medium text-gray-900">${value}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${owner ? escapeHtml(owner.name) : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-500">${d.expected_close_date ? fmtDate(d.expected_close_date) : '—'}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-deal" data-id="${d.id}" title="Edit deal"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!d.is_archived ? `<button class="icon-btn" data-action="archive-deal" data-id="${d.id}" title="Archive deal"><i data-lucide="archive" class="w-4 h-4"></i></button>` : `<button class="icon-btn text-emerald-600" data-action="restore-deal" data-id="${d.id}" title="Restore to Active"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>`}
          </div>` : '<span class="text-xs text-gray-400">View only</span>'}
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

// ---------- CRM Activities Render ----------
function renderCrmActivities() {
  const tbody = $('#crm-activities-table-body');
  const empty = $('#crm-activities-empty');
  const wrapper = $('#crm-activities-table-wrapper');
  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmActivities;
  const search = (f.search || '').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  renderActiveFilterChips('crmActivities');
  renderHeaderFilters('crmActivities');

  let activities = state.crmActivities.filter(a =>
    f.archived === 'archived' ? a.is_archived : !a.is_archived
  );
  if (search) {
    activities = activities.filter(a =>
      [a.title, a.description, a.outcome].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.activity !== null && f.activity !== undefined) {
    activities = activities.filter(a => (a.title || '').trim() === f.activity);
  }
  if (f.type !== 'all') activities = activities.filter(a => a.activity_type === f.type);
  if (f.status !== 'all') activities = activities.filter(a => a.status === f.status);
  if (f.client !== null && f.client !== undefined) {
    activities = activities.filter(a => Number(a.client_id) === Number(f.client));
  }
  if (f.date) {
    activities = activities.filter(a => matchesDateBucketFilter(a.activity_date, f.date, today));
  }
  if (f.owner !== null && f.owner !== undefined) {
    activities = activities.filter(a => Number(a.owner_id) === Number(f.owner));
  }

  if (activities.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();
  tbody.innerHTML = activities.map(a => {
    const client = state.crmClients.find(c => Number(c.id) === Number(a.client_id));
    const owner = state.teamMembers.find(m => Number(m.id) === Number(a.owner_id));
    return `
      <tr>
        <td class="px-5 py-3.5">
          <p class="text-sm font-medium text-gray-900">${escapeHtml(a.title)}</p>
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${labelize(a.activity_type)}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? escapeHtml(client.client_name) : '—'}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(a.status || 'planned')}</td>
        <td class="px-5 py-3.5 text-sm text-gray-500">${a.activity_date ? fmtDate(a.activity_date) : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${owner ? escapeHtml(owner.name) : '—'}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-activity" data-id="${a.id}" title="Edit activity"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!a.is_archived ? `<button class="icon-btn" data-action="archive-activity" data-id="${a.id}" title="Archive activity"><i data-lucide="archive" class="w-4 h-4"></i></button>` : `<button class="icon-btn text-emerald-600" data-action="restore-activity" data-id="${a.id}" title="Restore to Active"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>`}
          </div>` : '<span class="text-xs text-gray-400">View only</span>'}
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

// ---------- CRM Proposals Render ----------
function renderCrmProposals() {
  const tbody = $('#crm-proposals-table-body');
  const empty = $('#crm-proposals-empty');
  const wrapper = $('#crm-proposals-table-wrapper');
  if (!tbody || !empty || !wrapper) return;

  const f = state.filters.crmProposals;
  const search = (f.search || '').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  renderActiveFilterChips('crmProposals');
  renderHeaderFilters('crmProposals');

  let proposals = state.crmProposals.filter(p =>
    f.archived === 'archived' ? p.is_archived : !p.is_archived
  );
  if (search) {
    proposals = proposals.filter(p =>
      [p.proposal_title, p.notes].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.proposal !== null && f.proposal !== undefined) {
    proposals = proposals.filter(p => (p.proposal_title || '').trim() === f.proposal);
  }
  if (f.status !== 'all') proposals = proposals.filter(p => p.status === f.status);
  if (f.client !== null && f.client !== undefined) {
    proposals = proposals.filter(p => Number(p.client_id) === Number(f.client));
  }
  if (f.amount) {
    proposals = proposals.filter(p => matchesAmountBucketFilter(p.amount, f.amount));
  }
  if (f.sentDate) {
    proposals = proposals.filter(p => matchesDateBucketFilter(p.sent_date, f.sentDate, today));
  }
  if (f.owner !== null && f.owner !== undefined) {
    proposals = proposals.filter(p => Number(p.owner_id) === Number(f.owner));
  }

  if (proposals.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');

  const admin = isAdmin();
  tbody.innerHTML = proposals.map(p => {
    const client = state.crmClients.find(c => Number(c.id) === Number(p.client_id));
    const owner = state.teamMembers.find(m => Number(m.id) === Number(p.owner_id));
    const amount = p.amount != null ? `${Number(p.amount).toLocaleString()} ${p.currency || 'EGP'}` : '—';
    return `
      <tr>
        <td class="px-5 py-3.5">
          <p class="text-sm font-medium text-gray-900">${escapeHtml(p.proposal_title)}</p>
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? escapeHtml(client.client_name) : '—'}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(p.status || 'draft')}</td>
        <td class="px-5 py-3.5 text-sm font-medium text-gray-900">${amount}</td>
        <td class="px-5 py-3.5 text-sm text-gray-500">${p.sent_date ? fmtDate(p.sent_date) : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${owner ? escapeHtml(owner.name) : '—'}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-proposal" data-id="${p.id}" title="Edit proposal"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!p.is_archived ? `<button class="icon-btn" data-action="archive-proposal" data-id="${p.id}" title="Archive proposal"><i data-lucide="archive" class="w-4 h-4"></i></button>` : `<button class="icon-btn text-emerald-600" data-action="restore-proposal" data-id="${p.id}" title="Restore to Active"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>`}
          </div>` : '<span class="text-xs text-gray-400">View only</span>'}
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

// Sprint CRM-4.5D Fix Pass 2 — a Lead may qualify multiple Deals (approved
// business rule: one Lead can produce several Deals, e.g. Social Media +
// Website + Video Production as separate engagements). Returns all active
// (non-archived) Deals linked to the Lead, most-recent-first.
function findDealsForLead(leadId) {
  return state.crmDeals
    .filter(d => Number(d.lead_id) === Number(leadId) && !d.is_archived)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// ---------- Lead Details ----------
function renderLeadDetails() {
  const lead = state.crmLeads.find(
    (l) => Number(l.id) === Number(state.selectedLeadId)
  );

  if (!lead) {
    state.selectedLeadId = null;
    localStorage.removeItem('tgora_selected_lead_id');
    setView('crm');
    return;
  }

  const status   = normalizeCrmLeadStatusForDisplay(lead.status || 'new');
  const priority = (lead.priority || 'medium').toLowerCase();
  const owner    = state.teamMembers.find((m) => Number(m.id) === Number(lead.owner_id));

  const nameEl = $('#lead-details-name');
  if (nameEl) nameEl.textContent = lead.lead_name || 'Untitled';

  const sourceEl = $('#lead-details-source');
  if (sourceEl) sourceEl.textContent = `Source: ${labelize(lead.source)}`;

  const statusEl = $('#lead-details-status');
  if (statusEl) {
    statusEl.className = `badge badge-${status}`;
    statusEl.innerHTML = `<span class="dot"></span>${labelize(status)}`;
  }

  const priorityEl = $('#lead-details-priority');
  if (priorityEl) {
    priorityEl.className = `badge priority-${priority}`;
    priorityEl.innerHTML = `<span class="dot"></span>${labelize(priority)}`;
  }

  const ownerChip = $('#lead-details-owner-chip');
  if (ownerChip) {
    ownerChip.innerHTML = owner
      ? `<div class="w-6 h-6 rounded-full ${avatarColor(owner.name)} flex items-center justify-center text-white text-[10px] font-semibold">${initials(owner.name)}</div>
         <span class="text-sm text-gray-700">${escapeHtml(owner.name)}</span>`
      : '<span class="text-sm text-gray-400">No owner assigned</span>';
  }

  const setText = (id, val) => {
    const el = $(`#${id}`);
    if (el) el.textContent = val || '—';
  };

  // Sprint CRM-4.5D — prefer relational Company/Contact data; fall back to
  // legacy free-text columns for leads created before this sprint.
  const linkedClient  = lead.client_id  ? state.crmClients.find(c => Number(c.id) === Number(lead.client_id)) : null;
  const linkedContact = lead.contact_id ? state.crmContacts.find(c => Number(c.id) === Number(lead.contact_id)) : null;

  const companyEl = $('#lead-details-company');
  if (companyEl) {
    companyEl.innerHTML = linkedClient
      ? `<button class="text-indigo-600 hover:underline" data-action="open-client-details" data-id="${linkedClient.id}">${escapeHtml(linkedClient.client_name)}</button>`
      : escapeHtml(lead.company_name) || '—';
  }

  const contactEl = $('#lead-details-contact');
  if (contactEl) {
    contactEl.innerHTML = linkedContact
      ? `<button class="text-indigo-600 hover:underline" data-action="open-contact-details" data-id="${linkedContact.id}">${escapeHtml(linkedContact.contact_name)}</button>`
      : escapeHtml(lead.contact_person) || '—';
  }

  setText('lead-details-phone',    linkedContact?.phone    || lead.phone);
  setText('lead-details-whatsapp', linkedContact?.whatsapp || lead.whatsapp);
  setText('lead-details-email',    linkedContact?.email    || lead.email);
  setText('lead-details-referred-by', lead.referred_by);
  setText('lead-details-service',  lead.service_interest);
  setText('lead-details-budget',   lead.expected_budget);
  setText('lead-details-followup', fmtDate(lead.next_follow_up));
  setText('lead-details-activity', timeAgo(lead.updated_at));

  const notesEl = $('#lead-details-notes');
  if (notesEl) notesEl.textContent = lead.notes || 'No notes yet.';

  // Related client chip
  const clientChipEl = $('#lead-details-client-chip');
  if (clientChipEl) {
    clientChipEl.innerHTML = linkedClient
      ? `<span class="text-xs text-gray-500">Linked Company:</span>
         <button class="text-xs font-medium text-indigo-600 hover:underline" data-action="open-client-details" data-id="${linkedClient.id}">${escapeHtml(linkedClient.client_name)}</button>`
      : lead.client_id
        ? '<span class="text-xs text-gray-400">Linked company not found</span>'
        : '<span class="text-xs text-gray-400">No linked company</span>';
  }

  // Related deals chip (Sprint CRM-4.5D Fix Pass 2 — Lead -> Deal is
  // user-controlled, never auto-created, and a Lead may now qualify multiple
  // Deals). Shows every linked Deal (if any), plus a Create Deal action
  // whenever the Lead is Converted — even when Deals already exist, since a
  // Converted Lead can intentionally spawn more than one Deal.
  const dealChipEl = $('#lead-details-deal-chip');
  if (dealChipEl) {
    const relatedDeals = findDealsForLead(lead.id);
    const listHtml = relatedDeals.length > 0
      ? relatedDeals.map((d) => `
          <div class="flex items-center justify-between gap-2">
            <button class="text-xs font-medium text-indigo-600 hover:underline text-left" data-action="open-deal-details" data-id="${d.id}">${escapeHtml(d.deal_name)}</button>
            ${renderStatusBadge(d.stage || 'discovery')}
          </div>
        `).join('')
      : `<span class="text-xs text-gray-400">${status === 'converted' ? 'No related deals yet' : 'Available once this lead is Converted'}</span>`;

    const createBtnHtml = status === 'converted'
      ? `<button
           data-action="create-deal-from-lead"
           data-id="${lead.id}"
           class="h-8 px-3 inline-flex items-center gap-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition self-start"
         >
           <i data-lucide="briefcase" class="w-3.5 h-3.5"></i> Create Deal
         </button>`
      : '';

    dealChipEl.innerHTML = `<div class="flex flex-col gap-2 w-full">${listHtml}${createBtnHtml}</div>`;
  }

  // Timeline
  const timelineEl = $('#lead-details-timeline');
  if (timelineEl) {
    const leadNotes = state.crmNotes.filter(n => Number(n.lead_id) === Number(lead.id));
    const leadActivities = state.crmActivities.filter(a => Number(a.lead_id) === Number(lead.id));
    const items = [
      ...leadNotes.map(n => ({ type: 'note', title: n.body ? n.body.substring(0, 60) + (n.body.length > 60 ? '…' : '') : 'Note', date: n.created_at, owner_id: n.created_by })),
      ...leadActivities.map(a => ({ type: 'activity', title: a.title || labelize(a.activity_type), subtitle: labelize(a.status), date: a.activity_date || a.created_at, owner_id: a.owner_id })),
    ];
    timelineEl.innerHTML = buildCrmTimeline(items);
  }

  const addActivityBtn = $('#lead-details-add-activity-btn');
  if (addActivityBtn) addActivityBtn.dataset.leadId = lead.id;

  const editBtn = $('#lead-details-edit-btn');
  if (editBtn) editBtn.dataset.id = lead.id;

  const archiveBtn = $('#lead-details-archive-btn');
  if (archiveBtn) {
    archiveBtn.dataset.id = lead.id;
    archiveBtn.classList.toggle('hidden', !!lead.is_archived);
  }

  refreshIcons();
}

function openLeadDetails(id) {
  const lead = state.crmLeads.find((l) => Number(l.id) === id);
  if (!lead) { toast('Lead not found', 'error'); return; }

  state.selectedLeadId = id;
  localStorage.setItem('tgora_selected_lead_id', id);

  window.history.pushState(
    { view: 'lead-details', leadId: id },
    '',
    `#lead-details-${id}`
  );

  setView('lead-details');
  renderLeadDetails();
}

function openClientDetails(id) {
  const client = state.crmClients.find(c => Number(c.id) === id);
  if (!client) { toast('Company not found', 'error'); return; }
  state.selectedClientId = id;
  localStorage.setItem('tgora_selected_client_id', id);
  window.history.pushState({ view: 'client-details', clientId: id }, '', `#client-details-${id}`);
  setView('client-details');
  renderClientDetails();
}

function openContactDetails(id) {
  const contact = state.crmContacts.find(c => Number(c.id) === id);
  if (!contact) { toast('Contact not found', 'error'); return; }
  state.selectedContactId = id;
  localStorage.setItem('tgora_selected_contact_id', id);
  window.history.pushState({ view: 'contact-details', contactId: id }, '', `#contact-details-${id}`);
  setView('contact-details');
  renderContactDetails();
}

// Sprint CRM-4.5B — shared safe-external-link builder for Company Details
// (Website + Social Media). Prefixes bare domains/handles with https:// so
// the browser doesn't treat them as a relative in-app path, and escapes the
// result for safe use in both the href attribute and link text.
function buildSafeExternalUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function renderExternalLink(url) {
  const href = buildSafeExternalUrl(url);
  if (!href) return '—';
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline break-all">${escapeHtml(url.trim())}</a>`;
}

function renderClientDetails() {
  const client = state.crmClients.find(c => Number(c.id) === Number(state.selectedClientId));
  if (!client) {
    state.selectedClientId = null;
    localStorage.removeItem('tgora_selected_client_id');
    setView('crm');
    return;
  }

  const status = (client.status || 'active').toLowerCase();

  const nameEl = $('#client-details-name');
  if (nameEl) nameEl.textContent = client.client_name || 'Untitled';

  const typeEl = $('#client-details-type');
  if (typeEl) typeEl.textContent = `${labelize(client.client_type)} · ${client.industry || 'No industry'}`;

  const statusEl = $('#client-details-status');
  if (statusEl) {
    statusEl.className = `badge badge-${status}`;
    statusEl.innerHTML = `<span class="dot"></span>${labelize(status)}`;
  }

  const editBtn = $('#client-details-edit-btn');
  if (editBtn) editBtn.dataset.id = client.id;
  const archiveBtn = $('#client-details-archive-btn');
  if (archiveBtn) {
    archiveBtn.dataset.id = client.id;
    archiveBtn.classList.toggle('hidden', !!client.is_archived);
  }

  ['client-details-add-note-btn', 'client-details-note-panel-btn'].forEach(id => {
    const btn = $(`#${id}`); if (btn) btn.dataset.clientId = client.id;
  });
  const addContactBtn = $('#client-details-add-contact-btn');
  if (addContactBtn) addContactBtn.dataset.clientId = client.id;
  const addDealBtn = $('#client-details-add-deal-btn');
  if (addDealBtn) addDealBtn.dataset.clientId = client.id;

  const setText = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val || '—'; };
  setText('client-details-phone',    client.phone);
  setText('client-details-whatsapp', client.whatsapp);
  setText('client-details-email',    client.email);
  setText('client-details-address',  client.address);
  setText('client-details-source',   labelize(client.source));
  setText('client-details-notes',    client.notes || 'No notes yet.');

  const websiteEl = $('#client-details-website');
  if (websiteEl) websiteEl.innerHTML = renderExternalLink(client.website);

  // Referred By — only shown when present (Sprint CRM-4.5B, Source = Referral).
  const referredByCard = $('#client-details-referred-by-card');
  if (referredByCard) {
    const hasReferredBy = !!(client.referred_by || '').trim();
    referredByCard.classList.toggle('hidden', !hasReferredBy);
    if (hasReferredBy) setText('client-details-referred-by', client.referred_by);
  }

  // Social Media — the whole card is hidden when no social field is set.
  const socialCard = $('#client-details-social');
  const socialLinksEl = $('#client-details-social-links');
  if (socialCard && socialLinksEl) {
    const platforms = [
      { label: 'Facebook', url: client.facebook_url },
      { label: 'Instagram', url: client.instagram_url },
      { label: 'LinkedIn', url: client.linkedin_url },
      { label: 'TikTok', url: client.tiktok_url },
      { label: 'Snapchat', url: client.snapchat_url },
      { label: 'Other', url: client.other_social_url },
    ].filter(p => (p.url || '').trim());

    socialCard.classList.toggle('hidden', platforms.length === 0);
    socialLinksEl.innerHTML = platforms
      .map(p => {
        const href = buildSafeExternalUrl(p.url);
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="task-filter-chip text-indigo-600 hover:underline">${escapeHtml(p.label)}</a>`;
      })
      .join('');
  }

  // Contacts
  const contacts = state.crmContacts.filter(c => Number(c.client_id) === Number(client.id) && !c.is_archived);
  const contactsEl = $('#client-details-contacts-list');
  if (contactsEl) {
    contactsEl.innerHTML = contacts.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No contacts yet.</p>'
      : contacts.map(c => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-contact-details" data-id="${c.id}">${escapeHtml(c.contact_name)}</button>
              ${c.title ? `<p class="text-xs text-gray-500">${escapeHtml(c.title)}</p>` : ''}
            </div>
            <div class="text-right text-xs text-gray-500 space-y-0.5">
              ${c.phone ? `<p>${escapeHtml(c.phone)}</p>` : ''}
              ${c.email ? `<p>${escapeHtml(c.email)}</p>` : ''}
            </div>
          </div>
        `).join('');
  }

  // Deals
  const deals = state.crmDeals.filter(d => Number(d.client_id) === Number(client.id) && !d.is_archived);
  const dealsEl = $('#client-details-deals-list');
  if (dealsEl) {
    dealsEl.innerHTML = deals.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No deals yet.</p>'
      : deals.map(d => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-deal-details" data-id="${d.id}">${escapeHtml(d.deal_name)}</button>
              <p class="text-xs text-gray-500">${labelize(d.stage)}</p>
            </div>
            <span class="text-sm font-medium text-gray-700">${d.value != null ? `${Number(d.value).toLocaleString()} ${d.currency || 'EGP'}` : '—'}</span>
          </div>
        `).join('');
  }

  // Notes
  const notes = state.crmNotes.filter(n => Number(n.client_id) === Number(client.id) && !n.is_archived);
  const notesListEl = $('#client-details-notes-list');
  if (notesListEl) {
    notesListEl.innerHTML = notes.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No notes yet.</p>'
      : notes.map(n => `
          <div class="py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm text-gray-800 whitespace-pre-wrap">${escapeHtml(n.body)}</p>
            <p class="text-xs text-gray-400 mt-1">${timeAgo(n.created_at)}</p>
          </div>
        `).join('');
  }

  // Leads panel
  const leads = state.crmLeads.filter(l => Number(l.client_id) === Number(client.id) && !l.is_archived);
  const leadsListEl = $('#client-details-leads-list');
  if (leadsListEl) {
    leadsListEl.innerHTML = leads.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No leads linked.</p>'
      : leads.map(l => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-lead-details" data-id="${l.id}">${escapeHtml(l.lead_name)}</button>
            ${renderStatusBadge(normalizeCrmLeadStatusForDisplay(l.status))}
          </div>
        `).join('');
  }

  // Activities panel
  const activities = state.crmActivities.filter(a => Number(a.client_id) === Number(client.id) && !a.is_archived);
  const activitiesListEl = $('#client-details-activities-list');
  if (activitiesListEl) {
    activitiesListEl.innerHTML = activities.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No activities yet.</p>'
      : activities.slice(0, 5).map(a => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p class="text-sm font-medium text-gray-900">${escapeHtml(a.title)}</p>
              <p class="text-xs text-gray-500">${labelize(a.activity_type)} · ${a.activity_date ? fmtDate(a.activity_date) : '—'}</p>
            </div>
            ${renderStatusBadge(a.status)}
          </div>
        `).join('');
  }

  // Proposals panel
  const proposals = state.crmProposals.filter(p => Number(p.client_id) === Number(client.id) && !p.is_archived);
  const proposalsListEl = $('#client-details-proposals-list');
  if (proposalsListEl) {
    proposalsListEl.innerHTML = proposals.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No proposals yet.</p>'
      : proposals.map(p => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium text-gray-900">${escapeHtml(p.proposal_title)}</p>
            <span class="text-sm text-gray-600">${p.amount != null ? `${Number(p.amount).toLocaleString()} ${p.currency || 'EGP'}` : '—'}</span>
          </div>
        `).join('');
  }

  // Timeline panel
  const timelineEl = $('#client-details-timeline');
  if (timelineEl) {
    const timelineItems = [
      ...notes.map(n => ({ type: 'note', title: n.body ? n.body.substring(0, 60) + (n.body.length > 60 ? '…' : '') : 'Note', date: n.created_at, owner_id: n.created_by })),
      ...activities.map(a => ({ type: 'activity', title: a.title || labelize(a.activity_type), subtitle: labelize(a.status), date: a.activity_date || a.created_at, owner_id: a.owner_id })),
      ...proposals.map(p => ({ type: 'proposal', title: p.proposal_title, subtitle: labelize(p.status), date: p.sent_date || p.created_at, owner_id: p.owner_id })),
    ];
    timelineEl.innerHTML = buildCrmTimeline(timelineItems);
  }

  // Wire add-activity button for client details
  const addActivityBtn = $('#client-details-add-activity-btn');
  if (addActivityBtn) addActivityBtn.dataset.clientId = client.id;
  const addProposalBtn = $('#client-details-add-proposal-btn');
  if (addProposalBtn) addProposalBtn.dataset.clientId = client.id;

  refreshIcons();
}

// Sprint CRM-4.5C — Contact Details. Mirrors renderClientDetails() in shape.
// crm_contacts only has a client_id FK; no other CRM table (crm_leads,
// crm_deals, crm_activities, crm_notes) has a contact_id column, so the
// only *direct* relationship a Contact has is to its parent Company.
// Leads are additionally matched by name/email as a documented, indirect
// best-effort link (see comment above the leads block below) rather than
// invented as a real foreign-key relationship.
function renderContactDetails() {
  const contact = state.crmContacts.find(c => Number(c.id) === Number(state.selectedContactId));
  if (!contact) {
    state.selectedContactId = null;
    localStorage.removeItem('tgora_selected_contact_id');
    setView('crm');
    return;
  }

  const status = getCrmContactStatus(contact);
  const company = state.crmClients.find(cl => Number(cl.id) === Number(contact.client_id));

  const nameEl = $('#contact-details-name');
  if (nameEl) nameEl.textContent = contact.contact_name || 'Untitled';

  const titleEl = $('#contact-details-title');
  if (titleEl) titleEl.textContent = contact.title || 'No job title';

  const statusEl = $('#contact-details-status');
  if (statusEl) {
    statusEl.className = `badge badge-${status}`;
    statusEl.innerHTML = `<span class="dot"></span>${labelize(status)}`;
  }

  const companyChipEl = $('#contact-details-company-chip');
  if (companyChipEl) {
    companyChipEl.innerHTML = company
      ? `<button class="text-sm font-medium text-indigo-600 hover:underline" data-action="open-client-details" data-id="${company.id}">${escapeHtml(company.client_name)}</button>`
      : '<span class="text-sm text-gray-400">No company linked</span>';
  }

  const editBtn = $('#contact-details-edit-btn');
  if (editBtn) editBtn.dataset.id = contact.id;
  const archiveBtn = $('#contact-details-archive-btn');
  if (archiveBtn) {
    archiveBtn.dataset.id = contact.id;
    archiveBtn.classList.toggle('hidden', !!contact.is_archived);
  }

  const setText = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val || '—'; };
  setText('contact-details-phone',     contact.phone);
  setText('contact-details-whatsapp',  contact.whatsapp);
  setText('contact-details-email',     contact.email);
  setText('contact-details-job-title', contact.title);
  setText('contact-details-company',   company ? company.client_name : 'No company');
  setText('contact-details-notes',     contact.notes || 'No notes yet.');

  const statusTextEl = $('#contact-details-status-text');
  if (statusTextEl) statusTextEl.textContent = labelize(status);

  // Timeline — no contact_id on crm_notes/crm_activities/crm_proposals, so
  // the safest related data available is the parent Company's activity
  // (same client_id), same as Company Details shows. The header note above
  // the panel in index.html makes this scope explicit to the viewer.
  const timelineEl = $('#contact-details-timeline');
  if (timelineEl) {
    if (!company) {
      timelineEl.innerHTML = '<p class="text-sm text-gray-400 py-3">No linked company, so no activity to show.</p>';
    } else {
      const companyNotes = state.crmNotes.filter(n => Number(n.client_id) === Number(company.id) && !n.is_archived);
      const companyActivities = state.crmActivities.filter(a => Number(a.client_id) === Number(company.id) && !a.is_archived);
      const companyProposals = state.crmProposals.filter(p => Number(p.client_id) === Number(company.id) && !p.is_archived);
      const items = [
        ...companyNotes.map(n => ({ type: 'note', title: n.body ? n.body.substring(0, 60) + (n.body.length > 60 ? '…' : '') : 'Note', date: n.created_at, owner_id: n.created_by })),
        ...companyActivities.map(a => ({ type: 'activity', title: a.title || labelize(a.activity_type), subtitle: labelize(a.status), date: a.activity_date || a.created_at, owner_id: a.owner_id })),
        ...companyProposals.map(p => ({ type: 'proposal', title: p.proposal_title, subtitle: labelize(p.status), date: p.sent_date || p.created_at, owner_id: p.owner_id })),
      ];
      timelineEl.innerHTML = buildCrmTimeline(items);
    }
  }

  // Leads — Sprint CRM-4.5D added contact_id to crm_leads, so leads created
  // since then match directly. Older leads have no contact_id and fall back
  // to the pre-4.5D heuristic (email equality, or matching free-text
  // contact_person name gated by matching client_id when both are set),
  // clearly labeled as a legacy match in the UI.
  const directLeads = state.crmLeads.filter(l => !l.is_archived && l.contact_id != null && Number(l.contact_id) === Number(contact.id));

  const contactEmail = (contact.email || '').trim().toLowerCase();
  const contactName = (contact.contact_name || '').trim().toLowerCase();
  const legacyLeads = state.crmLeads.filter(l => {
    if (l.is_archived || l.contact_id != null) return false;
    const leadEmail = (l.email || '').trim().toLowerCase();
    if (contactEmail && leadEmail && leadEmail === contactEmail) return true;
    const leadContactName = (l.contact_person || '').trim().toLowerCase();
    if (contactName && leadContactName && leadContactName === contactName) {
      if (l.client_id && contact.client_id) return Number(l.client_id) === Number(contact.client_id);
      return true;
    }
    return false;
  });

  const matchedLeads = [
    ...directLeads.map(l => ({ lead: l, legacy: false })),
    ...legacyLeads.map(l => ({ lead: l, legacy: true })),
  ];
  const leadsListEl = $('#contact-details-leads-list');
  if (leadsListEl) {
    leadsListEl.innerHTML = matchedLeads.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No leads matched to this contact yet.</p>'
      : matchedLeads.map(({ lead: l, legacy }) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <button class="text-sm font-medium text-gray-900 hover:text-indigo-600 text-left" data-action="open-lead-details" data-id="${l.id}">${escapeHtml(l.lead_name)}</button>
            <div class="flex items-center gap-2">
              ${legacy ? '<span class="text-[10px] text-gray-400 font-medium">Legacy match</span>' : ''}
              ${renderStatusBadge(normalizeCrmLeadStatusForDisplay(l.status))}
            </div>
          </div>
        `).join('');
  }

  // Deals & Activities — crm_deals/crm_activities have no contact_id and no
  // contact-identifying free-text field, so there is no reliable way to
  // match them to a specific contact. State the limitation plainly instead
  // of guessing, and point to the parent Company where these records live.
  const limitationEl = $('#contact-details-limitation-note');
  if (limitationEl) {
    limitationEl.innerHTML = company
      ? `Deals and Activities are tracked per Company, not per Contact. View
         <button class="text-indigo-600 hover:underline font-medium" data-action="open-client-details" data-id="${company.id}">${escapeHtml(company.client_name)}</button>
         to see all related deals and activity.`
      : 'Deals and Activities are tracked per Company, not per Contact. This contact has no linked company yet.';
  }

  refreshIcons();
}

function openDealDetailsModal(id) {
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  if (!deal) { toast('Deal not found', 'error'); return; }
  state.selectedDealId = id;

  const client = state.crmClients.find(c => Number(c.id) === Number(deal.client_id));
  const owner = state.teamMembers.find(m => Number(m.id) === Number(deal.owner_id));
  const relatedLead = deal.lead_id != null ? state.crmLeads.find(l => Number(l.id) === Number(deal.lead_id)) : null;

  const setTxt = (elId, val) => { const el = $(`#${elId}`); if (el) el.textContent = val || '—'; };
  setTxt('deal-details-modal-name', deal.deal_name);
  setTxt('deal-details-modal-stage', labelize(deal.stage));

  // Company — clickable link to Company Details when linked (Sprint CRM-4.5E),
  // mirroring the Related Lead link pattern below.
  const clientEl = $('#deal-details-modal-client');
  if (clientEl) {
    clientEl.innerHTML = client
      ? `<button class="text-sm font-semibold text-indigo-600 hover:underline" data-action="open-client-details" data-id="${client.id}">${escapeHtml(client.client_name)}</button>`
      : '—';
  }
  setTxt('deal-details-modal-value', deal.value != null ? `${Number(deal.value).toLocaleString()} ${deal.currency || 'EGP'}` : '—');
  setTxt('deal-details-modal-owner', owner ? owner.name : '—');
  setTxt('deal-details-modal-service-type', deal.service_type_id ? (getCrmServiceTypeLabel(deal.service_type_id) || '—') : '—');
  setTxt('deal-details-modal-probability', deal.probability != null ? `${deal.probability}%` : '—');
  setTxt('deal-details-modal-close', deal.expected_close_date ? fmtDate(deal.expected_close_date) : '—');
  setTxt('deal-details-modal-notes', deal.notes || 'No notes.');

  // Related lead — clickable link back to Lead Details when linked (Sprint CRM-4).
  const leadEl = $('#deal-details-modal-lead');
  if (leadEl) {
    leadEl.innerHTML = relatedLead
      ? `<button class="text-sm font-semibold text-indigo-600 hover:underline" data-action="open-lead-details" data-id="${relatedLead.id}">${escapeHtml(relatedLead.lead_name)}</button>`
      : '—';
  }

  const editBtn = $('#deal-details-modal-edit-btn');
  if (editBtn) editBtn.dataset.id = deal.id;

  const addActivityBtn = $('#deal-details-modal-add-activity-btn');
  if (addActivityBtn) addActivityBtn.dataset.dealId = deal.id;

  const activities = state.crmActivities.filter(a => Number(a.deal_id) === id && !a.is_archived);
  const actEl = $('#deal-details-modal-activities');
  if (actEl) {
    actEl.innerHTML = activities.length === 0
      ? '<p class="text-sm text-gray-400">No activities yet.</p>'
      : activities.map(a => `
          <div class="py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium text-gray-900">${escapeHtml(a.title)}</p>
            <p class="text-xs text-gray-500">${labelize(a.activity_type)} · ${a.activity_date ? fmtDate(a.activity_date) : '—'}</p>
          </div>
        `).join('');
  }

  // Notes linked to deal's client
  const dealNotes = state.crmNotes.filter(n => Number(n.client_id) === Number(deal.client_id) && !n.is_archived);
  const notesEl = $('#deal-details-modal-notes-list');
  if (notesEl) {
    notesEl.innerHTML = dealNotes.length === 0
      ? '<p class="text-sm text-gray-400">No notes.</p>'
      : dealNotes.slice(0, 3).map(n => `
          <div class="py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm text-gray-800">${escapeHtml(n.body ? n.body.substring(0, 80) + (n.body.length > 80 ? '…' : '') : '')}</p>
            <p class="text-xs text-gray-400 mt-0.5">${timeAgo(n.created_at)}</p>
          </div>
        `).join('');
  }

  // Proposals linked to deal's client
  const dealProposals = state.crmProposals.filter(p => Number(p.client_id) === Number(deal.client_id) && !p.is_archived);
  const propsEl = $('#deal-details-modal-proposals-list');
  if (propsEl) {
    propsEl.innerHTML = dealProposals.length === 0
      ? '<p class="text-sm text-gray-400">No proposals.</p>'
      : dealProposals.map(p => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium text-gray-900">${escapeHtml(p.proposal_title)}</p>
            <span class="text-xs text-gray-500">${p.amount != null ? `${Number(p.amount).toLocaleString()} ${p.currency || 'EGP'}` : '—'}</span>
          </div>
        `).join('');
  }

  // Related Projects — Sprint CRM-5 (multi-project fix). A Won Deal may
  // produce any number of Projects, so the Create Project button always
  // stays available once Won, and every linked Project is listed below it.
  const projectEl = $('#deal-details-modal-project');
  if (projectEl) {
    const linkedProjects = state.projects.filter(p => Number(p.deal_id) === id);
    if (deal.stage !== 'won') {
      projectEl.innerHTML = '<p class="text-sm text-gray-400">Available once this Deal is Won.</p>';
    } else {
      const createBtn = `
        <button class="h-9 px-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm" data-action="create-project-from-deal" data-id="${deal.id}">
          <i data-lucide="folder-plus" class="w-4 h-4"></i> Create Project
        </button>
      `;
      const list = linkedProjects.length === 0
        ? '<p class="text-sm text-gray-400">No related projects yet.</p>'
        : `<div class="space-y-2">${linkedProjects.map(p => {
            const status = (p.status || 'planning').toLowerCase();
            return `
              <button class="w-full flex items-center justify-between gap-3 py-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left" data-action="open-project-details" data-id="${p.id}">
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-indigo-600 truncate">${escapeHtml(p.project_name || 'Untitled')}</span>
                  <span class="block text-xs text-gray-500">${p.project_code ? escapeHtml(p.project_code) : '—'}</span>
                </span>
                <span class="badge badge-${status} shrink-0"><span class="dot"></span>${labelize(status)}</span>
              </button>
            `;
          }).join('')}</div>`;
      projectEl.innerHTML = `<div class="space-y-3">${createBtn}${list}</div>`;
    }
    refreshIcons();
  }

  openModal('deal-details-modal');
}

async function refreshDataAndRender() {
  console.log('refreshDataAndRender started');

  const [
    projects,
    tasks,
    teamMembers,
    notifications,
    crmLeads,
    crmClients,
    crmContacts,
    crmDeals,
    crmActivities,
    crmNotes,
    crmProposals,
    crmServiceTypes,
    financeAccounts,
    financeCategories,
    financeTransactions,
    financeForecasts,
    financeSettings,
    financeFixedCosts,
    financeChartOfAccounts,
  ] = await Promise.all([
    fetchProjects(),
    fetchTasks(),
    fetchTeamMembers(),
    fetchNotifications(),
    fetchCrmLeads(),
    fetchCrmClients(),
    fetchCrmContacts(),
    fetchCrmDeals(),
    fetchCrmActivities(),
    fetchCrmNotes(),
    fetchCrmProposals(),
    fetchCrmServiceTypes(),
    fetchFinanceAccounts(),
    fetchFinanceCategories(),
    fetchFinanceTransactions(),
    fetchFinanceForecasts(),
    fetchFinanceSettings(),
    fetchFinanceFixedCosts(),
    fetchFinanceChartOfAccounts(),
  ]);

  const prevRole = state.currentRole;

  state.projects   = projects;
  state.tasks      = tasks;
  state.teamMembers = teamMembers;
  state.crmLeads   = crmLeads;
  state.crmClients = crmClients;
  state.crmContacts = crmContacts;
  state.crmDeals    = crmDeals;
  state.crmActivities = crmActivities;
  state.crmNotes    = crmNotes;
  state.crmProposals = crmProposals;
  state.crmServiceTypes = crmServiceTypes;
  state.financeAccounts     = financeAccounts;
  state.financeCategories   = financeCategories;
  state.financeTransactions = financeTransactions;
  state.financeForecasts    = financeForecasts;
  state.financeSettings     = financeSettings;
  state.financeFixedCosts   = financeFixedCosts;
  state.financeChartOfAccounts = financeChartOfAccounts;
  syncAccountingJournal(); // Sprint 4.5B — reconcile Journal against the freshly-fetched transactions

  // Re-derive role from the freshly-fetched team members so that external
  // role changes are reflected without a full page reload.
  if (state.currentUser?.id) {
    const rematched = state.teamMembers.find(
      (m) => String(m.auth_user_id || '') === String(state.currentUser.id)
    );
    state.currentMember = rematched || null;
    state.currentRole   = (rematched?.role_type || 'member').toLowerCase().trim();
    // C2: the member behind this session may have just been deactivated or
    // removed (this re-fetch is exactly what a realtime team_members change
    // or a Team Member edit triggers) — revoke access immediately rather
    // than rendering the app with a stale role.
    if (await denyAccessIfNotActiveMember(rematched)) return;
  }

  // Fetch admin-gated Commercial data only after the role above has been
  // re-derived — these fetchers self-gate on isAdmin(), so running them
  // before re-derivation would gate on the pre-refresh (possibly stale) role.
  const [projectCommercialTerms, projectPaymentScheduleItems] = await Promise.all([
    fetchProjectCommercialTerms(),
    fetchProjectPaymentScheduleItems(),
  ]);
  state.projectCommercialTerms = projectCommercialTerms;
  state.projectPaymentScheduleItems = projectPaymentScheduleItems;

  // If the role changed, the parallel-fetched notifications used the old
  // access level; re-fetch with the corrected role so the server-side
  // user_id filter matches the new permission boundary.
  state.notifications = (state.currentRole !== prevRole)
    ? await fetchNotifications()
    : notifications;

  renderAll();
  renderNotifications();
  renderAlerts();
  updateSidebarUserCard();

  console.log('refreshDataAndRender completed');
}

// ============================================================
// Finance Module
// ============================================================

const fmtMoney = (amount, currency = 'EGP') =>
  `${Number(amount || 0).toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;

const FINANCE_TX_TYPE_LABELS = {
  income:                'Income',
  expense:               'Expense',
  transfer:              'Transfer',
  capital_injection:     'Capital Injection',
  pass_through_received: 'Pass-Through In',
  pass_through_spent:    'Pass-Through Out',
};

const FINANCE_TX_TYPE_COLORS = {
  income:                'text-emerald-600',
  expense:               'text-rose-600',
  transfer:              'text-blue-600',
  capital_injection:     'text-indigo-600',
  pass_through_received: 'text-amber-600',
  pass_through_spent:    'text-orange-600',
};

const FINANCE_TX_TYPE_BG = {
  income:                'bg-emerald-50',
  expense:               'bg-rose-50',
  transfer:              'bg-blue-50',
  capital_injection:     'bg-indigo-50',
  pass_through_received: 'bg-amber-50',
  pass_through_spent:    'bg-orange-50',
};

const FINANCE_ACCT_TYPE_LABELS = {
  business_bank:    'Business Bank',
  personal_account: 'Personal Account',
  partner_account:  'Partner Account',
  cash:             'Cash',
  other:            'Other',
};

const FINANCE_TX_STATUS_LABELS  = { pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled' };
const FINANCE_TX_STATUS_BG      = { pending: 'bg-amber-50',  completed: 'bg-emerald-50', cancelled: 'bg-gray-100' };
const FINANCE_TX_STATUS_COLORS  = { pending: 'text-amber-700', completed: 'text-emerald-700', cancelled: 'text-gray-500' };

const FINANCE_FORECAST_TYPE_LABELS = {
  expected_income:   'Expected Income',
  expected_expense:  'Expected Expense',
  expected_transfer: 'Expected Transfer',
  client_funds:      'Client Funds',
};
const FINANCE_FORECAST_TYPE_BG = {
  expected_income:   'bg-emerald-50',
  expected_expense:  'bg-rose-50',
  expected_transfer: 'bg-blue-50',
  client_funds:      'bg-amber-50',
};
const FINANCE_FORECAST_TYPE_COLORS = {
  expected_income:   'text-emerald-700',
  expected_expense:  'text-rose-700',
  expected_transfer: 'text-blue-700',
  client_funds:      'text-amber-700',
};

const FINANCE_FORECAST_STATUS_LABELS = {
  expected: 'Expected', committed: 'Committed', received: 'Received', cancelled: 'Cancelled', overdue: 'Overdue',
  partially_collected: 'Partially Collected',
};
const FINANCE_FORECAST_STATUS_BG = {
  expected: 'bg-blue-50', committed: 'bg-indigo-50', received: 'bg-emerald-50', cancelled: 'bg-gray-100', overdue: 'bg-rose-50',
  partially_collected: 'bg-amber-50',
};
const FINANCE_FORECAST_STATUS_COLORS = {
  expected: 'text-blue-700', committed: 'text-indigo-700', received: 'text-emerald-700', cancelled: 'text-gray-500', overdue: 'text-rose-700',
  partially_collected: 'text-amber-700',
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Finance Rules & Accounting Engine (Sprint 4.2A) ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Originally a DESCRIPTIVE rules table + pure lookup helpers documenting, in
// one place, the accounting impact every transaction/forecast type has
// across the Finance module (see investigation in the Sprint 4.2A report).
// As of Sprint 4.2B/4.2C/4.2D/4.2E, several calculators have been wired to
// read from it instead of carrying their own inline classification:
// getAccountBalance/getCashFlowForPeriod/getCashFlowThisMonth (org/account-
// level cash, 4.2B); getFinanceSummary/getClientBalanceSummary/getProjectPnL
// (revenue/expense/profit/client-funds, 4.2C); getFinancePeriodSummary
// (period revenue/expense, 4.2D); openAccountLedgerModal and
// openWidgetDrilldown's 'account-balances' branch (per-account ledger in/out
// via getFinanceAccountImpact(), 4.2E) — no formula changes in any of them,
// only the classification source.
//
// Directional impact fields (revenueImpact, expenseImpact, profitImpact,
// cashImpact, clientFundsImpact, forecastImpact) use signed polarity rather
// than booleans/adjectives, so a future accounting calculation can do
// `total += rule.cashImpact * amount` instead of branching on strings:
//   +1 = increases that dimension   -1 = decreases it   0 = no effect
// accountBalanceImpact is the same convention, except for `transfer`, which
// affects two different accounts oppositely and so is a
// { fromAccount, toAccount } pair instead of a single scalar.
const FINANCE_RULES = {
  income: {
    transactionType: 'income',
    label: 'Income',
    revenueImpact: +1, expenseImpact: 0, profitImpact: +1,
    cashImpact: +1, clientFundsImpact: 0, forecastImpact: 0,
    accountBalanceImpact: +1,
    businessHealthImpact: ['currentRevenue', 'breakEvenProgress', 'safeTargetProgress', 'netProfit'],
    isOperational: true, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
  },
  expense: {
    transactionType: 'expense',
    label: 'Expense',
    revenueImpact: 0, expenseImpact: +1, profitImpact: -1,
    cashImpact: -1, clientFundsImpact: 0, forecastImpact: 0,
    accountBalanceImpact: -1,
    businessHealthImpact: ['netProfit'],
    isOperational: true, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
  },
  transfer: {
    transactionType: 'transfer',
    label: 'Transfer',
    revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
    cashImpact: 0, clientFundsImpact: 0, forecastImpact: 0,
    accountBalanceImpact: { fromAccount: -1, toAccount: +1 },
    businessHealthImpact: [],
    isOperational: false, isRealCash: true, isForecastOnly: false, isInternalMovement: true,
  },
  capitalInjection: {
    transactionType: 'capital_injection',
    label: 'Capital Injection',
    revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
    cashImpact: +1, clientFundsImpact: 0, forecastImpact: 0,
    accountBalanceImpact: +1,
    businessHealthImpact: ['cashInAccounts', 'cashRunwayMonths', 'totalCapital (KPI only)'],
    isOperational: false, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
  },
  // Not present in the data model today — no transaction_type value, no
  // FINANCE_TX_TYPE_* entry, no UI option. Included as a forward-looking
  // placeholder only (the account model already has a 'partner_account'
  // account type, so this is a plausible future addition), mirrored as the
  // inverse of capitalInjection. isImplemented: false means nothing in the
  // app currently produces or reads this rule.
  partnerWithdrawal: {
    transactionType: 'partner_withdrawal',
    label: 'Partner Withdrawal',
    revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
    cashImpact: -1, clientFundsImpact: 0, forecastImpact: 0,
    accountBalanceImpact: -1,
    businessHealthImpact: ['cashInAccounts', 'cashRunwayMonths'],
    isOperational: false, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
    isImplemented: false,
  },
  passThroughIn: {
    transactionType: 'pass_through_received',
    label: 'Pass-Through In',
    revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
    cashImpact: +1, clientFundsImpact: +1, forecastImpact: 0,
    accountBalanceImpact: +1,
    businessHealthImpact: ['cashInAccounts', 'cashRunwayMonths', 'clientFundsHeld'],
    isOperational: false, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
  },
  passThroughOut: {
    transactionType: 'pass_through_spent',
    label: 'Pass-Through Out',
    revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
    cashImpact: -1, clientFundsImpact: -1, forecastImpact: 0,
    accountBalanceImpact: -1,
    businessHealthImpact: ['cashInAccounts', 'cashRunwayMonths', 'clientFundsHeld'],
    isOperational: false, isRealCash: true, isForecastOnly: false, isInternalMovement: false,
  },
  // Forecasts never touch real cash/revenue/expense totals (cashImpact/
  // accountBalanceImpact are always 0, isRealCash always false) — they only
  // feed the Forecast Pipeline KPIs and Business Health's projectedRevenue/
  // projectedGap/weighted-income figures until a matching real transaction
  // is recorded (forecasts are excluded from calculations once status
  // becomes 'received', at which point the real transaction takes over).
  // revenueImpact/expenseImpact here describe the *projected* direction,
  // consistent with what the same field means on real transactions above.
  forecast: {
    expectedIncome: {
      forecastType: 'expected_income',
      label: 'Expected Income',
      revenueImpact: +1, expenseImpact: 0, profitImpact: 0,
      cashImpact: 0, clientFundsImpact: 0, forecastImpact: +1,
      accountBalanceImpact: 0,
      businessHealthImpact: ['forecastIncoming', 'weightedExpectedIncome', 'projectedRevenue', 'projectedGap'],
      isOperational: false, isRealCash: false, isForecastOnly: true, isInternalMovement: false,
    },
    expectedExpense: {
      forecastType: 'expected_expense',
      label: 'Expected Expense',
      revenueImpact: 0, expenseImpact: +1, profitImpact: 0,
      cashImpact: 0, clientFundsImpact: 0, forecastImpact: +1,
      accountBalanceImpact: 0,
      businessHealthImpact: ['forecastOutgoing'],
      isOperational: false, isRealCash: false, isForecastOnly: true, isInternalMovement: false,
    },
    // Both defined in FINANCE_FORECAST_TYPE_LABELS/BG/COLORS (selectable in
    // the UI) but no calculation function anywhere filters on either value —
    // dead branches of the taxonomy today. Flagged as a risk in the report.
    expectedTransfer: {
      forecastType: 'expected_transfer',
      label: 'Expected Transfer',
      revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
      cashImpact: 0, clientFundsImpact: 0, forecastImpact: 0,
      accountBalanceImpact: 0,
      businessHealthImpact: [],
      isOperational: false, isRealCash: false, isForecastOnly: true, isInternalMovement: true,
      isImplemented: false,
    },
    clientFunds: {
      forecastType: 'client_funds',
      label: 'Client Funds',
      revenueImpact: 0, expenseImpact: 0, profitImpact: 0,
      cashImpact: 0, clientFundsImpact: +1, forecastImpact: 0,
      accountBalanceImpact: 0,
      businessHealthImpact: [],
      isOperational: false, isRealCash: false, isForecastOnly: true, isInternalMovement: false,
      isImplemented: false,
    },
  },
};

// Maps the real transaction_type/forecast_type DB values to their FINANCE_RULES
// key, since a few rule keys (capitalInjection, passThroughIn/Out) don't match
// the snake_case DB value 1:1.
const FINANCE_TX_TYPE_TO_RULE_KEY = {
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
  capital_injection: 'capitalInjection',
  partner_withdrawal: 'partnerWithdrawal',
  pass_through_received: 'passThroughIn',
  pass_through_spent: 'passThroughOut',
};
const FINANCE_FORECAST_TYPE_TO_RULE_KEY = {
  expected_income: 'expectedIncome',
  expected_expense: 'expectedExpense',
  expected_transfer: 'expectedTransfer',
  client_funds: 'clientFunds',
};

// Pure lookups — no state access, no DOM, no fetch. Return null for an
// unrecognized/unimplemented type rather than throwing, so a future caller
// can safely fall back to today's inline logic if a rule isn't found.
function getFinanceRule(transactionType) {
  const key = FINANCE_TX_TYPE_TO_RULE_KEY[transactionType];
  return key ? FINANCE_RULES[key] : null;
}
function getFinanceForecastRule(forecastType) {
  const key = FINANCE_FORECAST_TYPE_TO_RULE_KEY[forecastType];
  return key ? FINANCE_RULES.forecast[key] : null;
}
// Attaches the matching rule to a transaction/forecast object without
// mutating the input. Returns null if the type has no rule (e.g. an unknown
// or not-yet-implemented type) — callers should treat that the same as
// "no rule available yet", not as an error.
function classifyFinanceTransaction(tx) {
  const rule = tx && getFinanceRule(tx.transaction_type);
  return rule ? { transactionType: tx.transaction_type, ...rule } : null;
}
function classifyFinanceForecast(fc) {
  const rule = fc && getFinanceForecastRule(fc.forecast_type);
  return rule ? { forecastType: fc.forecast_type, ...rule } : null;
}

// Sprint 4.2B: organization-level cash direction for a single transaction
// type. Thin wrapper over getFinanceRule().cashImpact — +1 for cash-in
// (income/capital_injection/pass_through_received), -1 for cash-out
// (expense/pass_through_spent), 0 for no org-level movement. `transfer`
// already carries cashImpact: 0 in FINANCE_RULES (money moves between two of
// the org's own accounts, so the org-wide total is unaffected), and an
// unrecognized type safely falls back to 0 via getFinanceRule() returning
// null. This is for ORG-LEVEL cash flow only — it does not know which
// account a transfer credits/debits; per-account/ledger direction stays on
// its own transfer-specific branch in each caller.
function getFinanceCashImpact(type) {
  return getFinanceRule(type)?.cashImpact ?? 0;
}

// Sprint 4.2C: revenue/expense/profit/client-funds direction for a single
// transaction type, mirroring getFinanceCashImpact() above. Thin wrappers over
// getFinanceRule().*Impact — +1/0/-1, with an unrecognized type safely
// resolving to 0 via getFinanceRule() returning null. Used by
// getFinanceSummary/getClientBalanceSummary/getProjectPnL to replace their
// inline per-type switch statements.
function getFinanceRevenueImpact(type) {
  return getFinanceRule(type)?.revenueImpact ?? 0;
}
function getFinanceExpenseImpact(type) {
  return getFinanceRule(type)?.expenseImpact ?? 0;
}
function getFinanceProfitImpact(type) {
  return getFinanceRule(type)?.profitImpact ?? 0;
}
function getFinanceClientFundsImpact(type) {
  return getFinanceRule(type)?.clientFundsImpact ?? 0;
}

// ---------- Collections — schedule component derivation (Sprint Finance Completion) ----------
// Locked architecture decision: Revenue vs. Client Funds is NEVER stored as
// its own column on finance_transactions — it is derived from
// transaction_type via the same FINANCE_RULES impact fields every other
// classification in this file already reads. No FINANCE_RULES entry has both
// revenueImpact and clientFundsImpact non-zero, so this mapping is
// unambiguous for every transaction_type in use today. Returns null for a
// transaction_type that is neither (expense, transfer, capital_injection,
// partner_withdrawal, pass_through_spent) — those never represent a
// collection against a Payment Schedule Item.
function getScheduleComponent(tx) {
  if (!tx) return null;
  if (getFinanceRevenueImpact(tx.transaction_type) > 0) return 'revenue';
  if (getFinanceClientFundsImpact(tx.transaction_type) > 0) return 'client_funds';
  return null;
}

// Sprint 4.2E: account-level (not org-level) in/out direction for a single
// transaction against a specific account — +1 inflow, -1 outflow, 0 no
// impact. Org-level cash flow and account-level ledger are different:
// org-level getFinanceCashImpact() always returns 0 for `transfer` (money
// stays inside the org), but at the account level a transfer moves money
// out of `from_account_id` and into `to_account_id`, so that branch is
// handled here explicitly rather than by delegating to getFinanceCashImpact
// for transfers. Mirrors the transfer branch already established in
// getAccountBalance() (Sprint 4.2A): two independent checks (not
// if/else-if), so a (pathological, not currently reachable via the
// transaction form) transfer where from_account_id === to_account_id ===
// accountId nets to 0 rather than being forced to a single sign. For every
// non-transfer type, delegates to getFinanceCashImpact() — identical
// direction to the org-level case as long as the transaction belongs to
// this account.
function getFinanceAccountImpact(transaction, accountId) {
  if (!transaction) return 0;
  const type = transaction.transaction_type;
  if (type === 'transfer') {
    let impact = 0;
    if (Number(transaction.from_account_id) === Number(accountId)) impact -= 1;
    if (Number(transaction.to_account_id) === Number(accountId)) impact += 1;
    return impact;
  }
  if (Number(transaction.account_id) !== Number(accountId)) return 0;
  return getFinanceCashImpact(type);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Accounting Engine — Foundation (Sprint 4.3A) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Scaffolding only. Nothing in this section is called from anywhere else in
// the app yet — it exists so a future sprint has a place to build a real
// Double-Entry Accounting Engine (Chart of Accounts, Journal Posting,
// Ledger, Trial Balance) without first having to invent the shapes below.
//
// This is NOT a replacement for FINANCE_RULES above. FINANCE_RULES answers
// "what kind of business event is this transaction?" (revenue, expense,
// client funds, ...). This layer will eventually answer a different
// question: "how does that event post as debits/credits to accounting
// accounts?" The two layers stay separate on purpose — a future
// buildJournalEntries() is expected to read FINANCE_RULES for the business
// classification and ACCOUNTING_RULES for the posting behavior, but that
// wiring does not exist yet and must not be added before a Chart of
// Accounts exists.

// Accounting-side vocabulary — the debit/credit posting side of an entry.
// Distinct from FINANCE_TX_TYPE_* above, which describes business
// transaction types, not accounting posting sides.
const ACCOUNTING_ENTRY_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
};

// Sprint 4.3C: Finance Rule -> Chart of Accounts mapping (debit/credit
// account codes only — no calculations, no posting, no journal generation
// happens here). Keyed by the transaction_type string each FINANCE_RULES
// entry stores on itself as `transactionType` (see FINANCE_TX_TYPE_TO_RULE_KEY
// above) — NOT by the FINANCE_RULES object's own key names (e.g.
// 'capitalInjection') — so buildJournalEntries() below looks this up via
// rule.transactionType. Account codes only, and only codes already seeded
// by Sprint 4.3B's finance_chart_of_accounts_migration.sql (1000, 2100,
// 3000, 3200, 4000, 5000) — no new Chart Accounts are introduced here.
//
// `transfer` is deliberately NOT mapped: it moves cash between two of the
// org's own operational finance_accounts (accountBalanceImpact is a
// { fromAccount, toAccount } pair, not a single scalar — see FINANCE_RULES
// above), and posting that as one Chart-of-Accounts debit/credit pair would
// require knowing which specific Chart account each finance_account rolls
// up to. That rollup doesn't exist yet (linked_finance_account_id is still
// unpopulated — see Sprint 4.3B report), so mapping `transfer` here would be
// a guess rather than a real answer. Left unsupported until that design
// exists.
//
// Forecast rules (FINANCE_RULES.forecast.*) are not mapped either — a
// forecast is a projection, not a completed transaction, so it has no
// journal entry. This falls out naturally rather than needing a special
// case: forecasts carry `forecast_type`, not `transaction_type`, so
// getFinanceRule() (which only reads FINANCE_TX_TYPE_TO_RULE_KEY) already
// returns null for them before ACCOUNTING_RULES is even consulted.
const ACCOUNTING_RULES = {
  income: {
    debitAccountCode:  '1000', // Cash and Bank
    creditAccountCode: '4000', // Service Revenue
  },
  expense: {
    debitAccountCode:  '5000', // Operating Expenses
    creditAccountCode: '1000', // Cash and Bank
  },
  capital_injection: {
    debitAccountCode:  '1000', // Cash and Bank
    creditAccountCode: '3000', // Owner Equity
  },
  partner_withdrawal: {
    debitAccountCode:  '3200', // Partner Drawings
    creditAccountCode: '1000', // Cash and Bank
  },
  pass_through_received: {
    debitAccountCode:  '1000', // Cash and Bank
    creditAccountCode: '2100', // Client Funds Liability
  },
  pass_through_spent: {
    debitAccountCode:  '2100', // Client Funds Liability
    creditAccountCode: '1000', // Cash and Bank
  },
  // transfer: intentionally absent — see comment above.
};

// Default shape of a normalized Journal Entry — a plain object model, same
// convention FINANCE_RULES entries use above.
const ACCOUNTING_DEFAULTS = {
  account: '',
  debit: 0,
  credit: 0,
  description: '',
  transactionId: null,
  transactionType: '',
};

// Returns a new Journal Entry object (never a shared reference), with any
// provided fields overriding the defaults above.
function createJournalEntry(overrides = {}) {
  return { ...ACCOUNTING_DEFAULTS, ...overrides };
}

// Sprint 4.3C: converts a single Finance transaction into its corresponding
// Journal Entries via ACCOUNTING_RULES. Returns [] for anything unmapped —
// unknown/unrecognized transaction_type (getFinanceRule() returns null),
// transfer, or a forecast (see ACCOUNTING_RULES' comment above for why both
// stay unmapped) — rather than guessing. No calculation beyond copying the
// transaction amount, no posting, no state mutation, no persistence. Not
// called from any existing Finance code path.
function buildJournalEntries(transaction) {
  if (!transaction) return [];
  const rule = getFinanceRule(transaction.transaction_type);
  if (!rule) return [];
  const mapping = ACCOUNTING_RULES[rule.transactionType];
  if (!mapping) return [];

  const amount      = Number(transaction.amount) || 0;
  const description = transaction.description || transaction.transaction_type;

  return [
    createJournalEntry({
      account:         mapping.debitAccountCode,
      debit:           amount,
      credit:          0,
      description,
      transactionId:   transaction.id ?? null,
      transactionType: transaction.transaction_type,
    }),
    createJournalEntry({
      account:         mapping.creditAccountCode,
      debit:           0,
      credit:          amount,
      description,
      transactionId:   transaction.id ?? null,
      transactionType: transaction.transaction_type,
    }),
  ];
}

// Accounting Engine entry point.
// Flow: Finance Transaction -> Accounting Rule -> Journal Entries.
// Thin orchestration over buildJournalEntries() today. Not called from any
// existing Finance code path.
function buildAccountingEntries(transaction) {
  return buildJournalEntries(transaction);
}

// Validates the fundamental double-entry invariant: total debits == total
// credits. Pure, tolerant of a non-array input, and unused for now —
// reserved for when Journal Posting is introduced.
function isBalancedJournal(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const totalDebit  = list.reduce((s, e) => s + (Number(e.debit)  || 0), 0);
  const totalCredit = list.reduce((s, e) => s + (Number(e.credit) || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 0.005;
}

// Local, in-memory posting identity (Sprint 4.3E) — no DB, no UUIDs. Lives
// only as long as the page session, same as state.accountingJournal itself.
let accountingJournalNextId = 1;
let accountingJournalNextNumber = 1;
function generateJournalNumber() {
  return `JRN-${String(accountingJournalNextNumber++).padStart(6, '0')}`;
}

// ─── Journal Posting Engine (Sprint 4.3D/4.3E) ───────────────────────────────
// Posts a single Finance transaction into the in-memory General Journal
// (state.accountingJournal). Thin orchestration over buildAccountingEntries()
// and isBalancedJournal() above — all-or-nothing, never a partial post.
// Returns null (and posts nothing) for an invalid transaction, an unmapped/
// unimplemented transaction_type (buildAccountingEntries() returns []), or
// an unbalanced journal. Not called from any existing Finance code path.
//
// Sprint 4.3E wraps the Journal Entries (unchanged shape) in a Journal
// Posting — header metadata + the entries themselves — instead of pushing
// bare entries into the journal. Each posting gets a locally-generated,
// incrementing id/journalNumber; status is always 'posted' (the only status
// this engine produces) and source is always 'finance_transaction' (the
// only producer that exists).
function postJournal(transaction) {
  const entries = buildAccountingEntries(transaction);
  if (entries.length === 0) return null;
  if (!isBalancedJournal(entries)) return null;

  const posting = {
    id:              accountingJournalNextId++,
    journalNumber:   generateJournalNumber(),
    transactionId:   transaction.id ?? null,
    transactionType: transaction.transaction_type,
    description:     transaction.description || transaction.transaction_type,
    postingDate:     transaction.transaction_date || null,
    createdAt:       new Date().toISOString(),
    source:          'finance_transaction',
    status:          'posted',
    entries,
  };

  state.accountingJournal.push(posting);
  return posting;
}

// Posts an array of Finance transactions via postJournal(), one at a time.
// Pure aggregation only — does not clear state.accountingJournal first, so
// repeated calls accumulate onto whatever is already posted. A transaction
// is "posted" if postJournal() returned a Journal Posting, "skipped"
// otherwise (invalid, unmapped type, transfer, forecast, or unbalanced).
function postAllAccountingTransactions(transactions) {
  const list = Array.isArray(transactions) ? transactions : [];
  const journalPostings = [];
  const postedEntries = [];
  const postedTransactions = [];
  const skippedTransactions = [];

  for (const transaction of list) {
    const posting = postJournal(transaction);
    if (posting) {
      journalPostings.push(posting);
      postedEntries.push(...posting.entries);
      postedTransactions.push(transaction);
    } else {
      skippedTransactions.push(transaction);
    }
  }

  return { journalPostings, postedEntries, postedTransactions, skippedTransactions };
}

// ─── Automatic Journal Posting Integration (Sprint 4.5B) ────────────────────
// Fully reconciles state.accountingJournal from state.financeTransactions —
// the single integration point between real Finance transactions and the
// Accounting Engine. Reuses postAllAccountingTransactions() (itself a thin
// loop over postJournal()) rather than introducing a second posting path.
//
// Sprint 4.5B originally posted incrementally (only transactions not yet
// represented in the journal, by transactionId), which meant an edited
// transaction kept its stale original-amount posting forever — the Journal
// could drift from Finance with no way to catch up short of inventing
// reversal entries, which are explicitly out of scope. Revised here to
// clear state.accountingJournal and repost from scratch on every call
// instead: the same "pure, no caching, rebuilt fresh on every call"
// convention every other engine in this stack already follows (General
// Ledger, Trial Balance, Income Statement, Balance Sheet, Cash Flow — see
// their own section comments above). Journal Posting couldn't follow that
// convention until now because a posting has identity (id/journalNumber,
// Sprint 4.3E) that earlier sprints assumed had to be preserved; a full
// rebuild means that identity is only stable for the duration of one
// reconciled state, not across edits — acceptable because nothing in this
// codebase persists or displays journalNumber/id across syncs (no posting
// history, no audit trail, both explicitly out of scope).
//
// "Active" matches the exact filter every other Finance read path already
// applies to decide what counts as a real transaction (see
// validateFinanceTotals()'s base filter above): not archived, not
// soft-deleted, not cancelled. Because every sync rebuilds from the CURRENT
// state.financeTransactions, this function is naturally self-correcting:
//   - edited transaction  -> next sync reposts it with its current amount/
//     type/account, so the Journal (and everything derived from it —
//     Ledger, Trial Balance, Income Statement, Balance Sheet, Cash Flow,
//     the Facade, and the Accounting Reports UI that reads the Facade)
//     reflects the edit with no drift.
//   - archived/soft-deleted/cancelled -> excluded from the active set, so
//     it simply doesn't appear in the rebuilt journal — this is an
//     in-memory reporting view, not data loss: the underlying
//     finance_transactions row and its audit log are untouched in Supabase.
//   - restored -> becomes active again, reappears on the next sync.
// No reversal entries exist or are needed: "remove a posting" is just "not
// include it in this rebuild."
//
// Idempotent by construction, for a stronger reason than before: calling
// this any number of times in a row with an unchanged state.financeTransactions
// always clears then rebuilds the identical set of postings, so there is
// never a second posting for the same transaction — clear-then-rebuild
// cannot accumulate duplicates the way append-only posting could.
// postJournal()'s own unmapped/unbalanced skip logic (Sprint 4.3D) means an
// unpostable transaction (unknown type, transfer, forecast, or a genuinely
// unbalanced entry pair) is silently skipped here too — Finance transaction
// creation/update itself already succeeded and returned before this
// function is ever called, so Accounting can never block or fail Finance.
function syncAccountingJournal() {
  state.accountingJournal = [];
  accountingJournalNextId = 1;
  accountingJournalNextNumber = 1;

  const transactions = Array.isArray(state.financeTransactions) ? state.financeTransactions : [];
  const activeTransactions = transactions.filter(t =>
    !t.is_archived && !t.is_deleted && t.status !== 'cancelled'
  );

  if (activeTransactions.length === 0) {
    return { journalPostings: [], postedEntries: [], postedTransactions: [], skippedTransactions: [] };
  }

  return postAllAccountingTransactions(activeTransactions);
}

// ─── Chart of Accounts (Sprint 4.3B) ─────────────────────────────────────────
// Pure lookup helpers over state.financeChartOfAccounts. Reads only — no
// caller anywhere yet, and none of these touch state.financeAccounts or any
// existing balance/formula. See fetchFinanceChartOfAccounts() for how the
// data is loaded (falls back to [] if finance_chart_of_accounts doesn't
// exist yet), so these all degrade gracefully to "not found" until then.
function getChartAccountByCode(code) {
  return state.financeChartOfAccounts.find(a => a.account_code === code) || null;
}
function getChartAccountsByType(type) {
  return state.financeChartOfAccounts.filter(a => a.account_type === type);
}
function getChartAccountNormalBalance(account) {
  return account?.normal_balance || null;
}
function formatChartAccountLabel(account) {
  if (!account) return '';
  return `${account.account_code} — ${account.account_name}`;
}

// ─── General Ledger Engine (Sprint 4.3F) ─────────────────────────────────────
// Reads ONLY state.accountingJournal (the posted Journal Postings from
// Sprint 4.3D/4.3E) — never state.financeTransactions. Accounting is the
// source of truth for the ledger, not the raw Finance transactions that fed
// it. Chart of Accounts helpers above are used solely to resolve each
// entry's account code to its name/normal balance; finance_accounts and
// FINANCE_RULES are not touched. Pure and uncached — every call rebuilds
// the ledger fresh from the current journal, so there is nothing to
// invalidate and no risk of drifting from state.accountingJournal.
//
// For each account, balance polarity follows its Chart of Accounts
// normal_balance: debit-normal accounts (assets, expenses) net as
// debitTotal - creditTotal; credit-normal accounts (liabilities, equity,
// revenue) net as creditTotal - debitTotal. This is a mechanical read of
// whatever finance_chart_of_accounts_migration.sql seeded — e.g. '3200'
// Partner Drawings is seeded credit-normal there, so it nets the same
// direction as Owner Equity here rather than the debit-normal convention a
// real drawings/contra-equity account would traditionally use. Not a
// judgment call made in this sprint; just following the existing seed.
//
// An entry whose account code has no Chart of Accounts match (not seeded,
// or state.financeChartOfAccounts hasn't loaded) is skipped safely rather
// than guessing a name/normal balance for it.
function buildGeneralLedger() {
  const journal = Array.isArray(state.accountingJournal) ? state.accountingJournal : [];
  const ledgerByCode = {};

  for (const posting of journal) {
    const entries = Array.isArray(posting?.entries) ? posting.entries : [];
    for (const entry of entries) {
      const chartAccount = getChartAccountByCode(entry.account);
      if (!chartAccount) continue;

      if (!ledgerByCode[entry.account]) {
        ledgerByCode[entry.account] = {
          accountCode:   entry.account,
          accountName:   chartAccount.account_name,
          normalBalance: chartAccount.normal_balance,
          debitTotal:    0,
          creditTotal:   0,
          balance:       0,
          entries:       [],
        };
      }

      const ledgerAccount = ledgerByCode[entry.account];
      ledgerAccount.debitTotal  += Number(entry.debit)  || 0;
      ledgerAccount.creditTotal += Number(entry.credit) || 0;
      ledgerAccount.entries.push(entry);
    }
  }

  return Object.values(ledgerByCode).map(account => ({
    ...account,
    balance: account.normalBalance === 'debit'
      ? account.debitTotal - account.creditTotal
      : account.creditTotal - account.debitTotal,
  }));
}

// Returns the complete General Ledger — one row per account code that
// appears in state.accountingJournal and resolves against the Chart of
// Accounts. Pure; no mutation of state.accountingJournal or
// state.financeChartOfAccounts.
function getLedgerAccounts() {
  return buildGeneralLedger();
}

// Returns a single ledger account by Chart of Accounts code, or null if
// that code has no posted entries (or isn't a recognized Chart account).
function getLedgerAccount(accountCode) {
  return buildGeneralLedger().find(a => a.accountCode === accountCode) || null;
}

// findLedgerAccount(accountCode) was considered for this sprint but not
// added: getLedgerAccount(accountCode) above already does exactly that
// lookup (by Chart of Accounts code, null if not found) with no different
// semantics to offer, so a second function would just be a same-behavior
// alias. Callers wanting "find an account by code" should use
// getLedgerAccount() directly.

// ─── Ledger Integrity & Audit Helpers (Sprint 4.3G) ──────────────────────────
// Pure, read-only validation over the General Ledger (Sprint 4.3F) and the
// posted Journal (Sprint 4.3D/4.3E). No new state, no caching, no mutation —
// every helper here re-derives its answer from buildGeneralLedger() and/or
// state.accountingJournal on each call, same as the ledger engine itself.
// This is a diagnostic layer only: it reports issues, it never fixes or
// blocks a post (Journal Posting's own all-or-nothing balance check in
// postJournal() already prevents an unbalanced posting from ever reaching
// state.accountingJournal — these helpers exist to audit the aggregate
// result afterward, e.g. as a pre-flight check before a future Trial
// Balance sprint).

// Checks the General Ledger for structural problems that buildGeneralLedger()
// itself doesn't already guard against by construction (e.g. a Chart of
// Accounts row seeded with a bad normal_balance, or negative totals from a
// negative transaction amount slipping past upstream validation). Accepts
// an optional pre-built ledger (as returned by getLedgerAccounts()) so a
// caller can validate a snapshot without triggering a second rebuild;
// defaults to a fresh getLedgerAccounts() when omitted. Never throws —
// every problem found is collected into `issues` instead.
function validateLedger(ledger) {
  const accounts = Array.isArray(ledger) ? ledger : getLedgerAccounts();
  const issues = [];

  for (const account of accounts) {
    const accountCode = account?.accountCode ?? null;

    if (!account?.accountCode) {
      issues.push({ accountCode, type: 'missing_account_code', message: 'Ledger account is missing an account code.' });
    }
    if (!account?.accountName) {
      issues.push({ accountCode, type: 'missing_account_name', message: 'Ledger account is missing an account name.' });
    }
    if (account?.normalBalance !== 'debit' && account?.normalBalance !== 'credit') {
      issues.push({ accountCode, type: 'invalid_normal_balance', message: `Normal balance "${account?.normalBalance}" is not "debit" or "credit".` });
    }
    if (Number(account?.debitTotal) < 0) {
      issues.push({ accountCode, type: 'negative_debit_total', message: `Debit total is negative (${account.debitTotal}).` });
    }
    if (Number(account?.creditTotal) < 0) {
      issues.push({ accountCode, type: 'negative_credit_total', message: `Credit total is negative (${account.creditTotal}).` });
    }
  }

  return { isValid: issues.length === 0, issues };
}

// Sums debit/credit totals across every General Ledger account. `balanced`
// uses the same epsilon (0.005) as isBalancedJournal() above rather than
// strict equality, since these totals are sums of many entries' amounts and
// floating-point summation can drift by fractions of a cent even when the
// underlying journal is genuinely balanced — the same reasoning
// isBalancedJournal() already applies per-posting, extended here to the
// ledger-wide aggregate.
function getLedgerTotals() {
  const accounts = getLedgerAccounts();
  const totalDebits  = accounts.reduce((s, a) => s + (Number(a.debitTotal)  || 0), 0);
  const totalCredits = accounts.reduce((s, a) => s + (Number(a.creditTotal) || 0), 0);
  const difference = totalDebits - totalCredits;
  return {
    totalDebits,
    totalCredits,
    difference,
    balanced: Math.abs(difference) < 0.005,
  };
}

// Scans state.accountingJournal directly (not the aggregated ledger) for
// any posting whose own entries fail isBalancedJournal(). postJournal()
// already refuses to post an unbalanced journal, so under normal operation
// this always returns [] — it exists as a direct audit of the journal's
// integrity, independent of (and a cross-check against) the ledger
// aggregation in buildGeneralLedger().
function getUnbalancedPostings() {
  const journal = Array.isArray(state.accountingJournal) ? state.accountingJournal : [];
  return journal.filter(posting => !isBalancedJournal(posting?.entries));
}

// ─── Trial Balance Engine (Sprint 4.4A) ──────────────────────────────────────
// Pure, derived-only presentation of the General Ledger (Sprint 4.3F) as a
// classic two-column Trial Balance. Reads ONLY getLedgerAccounts() (plus
// getChartAccountByCode() to resolve each row's account_type for display —
// the ledger model itself doesn't carry accountType) — never
// state.financeTransactions, and never state.accountingJournal directly.
// The ledger has already done the real work (grouping entries by account,
// computing debitTotal/creditTotal/balance per Sprint 4.3F's normal-balance
// rules); this layer only re-projects each account's signed `balance` back
// into a debit/credit column pair, the shape a Trial Balance is expected to
// have. No new state, no caching, no mutation — rebuilt fresh on every call,
// same convention as buildGeneralLedger() and the Sprint 4.3G audit helpers.
//
// Column placement per account:
//   normalBalance === 'debit'  -> balance >= 0 goes to debit,  else abs(balance) to credit
//   normalBalance === 'credit' -> balance >= 0 goes to credit, else abs(balance) to debit
// This puts a normal-balance account's amount on its expected side and any
// abnormal (contra) balance on the opposite side, which is what lets
// debitTotal/creditTotal reconcile to the same figure as
// getLedgerTotals()/getLedgerAccounts() would for a genuinely balanced
// ledger — see Validation §6 in the sprint report for the cross-check.
function buildTrialBalance() {
  const ledgerAccounts = getLedgerAccounts();

  const rows = ledgerAccounts.map(account => {
    const chartAccount = getChartAccountByCode(account.accountCode);
    const balance = Number(account.balance) || 0;
    let debit = 0;
    let credit = 0;

    if (account.normalBalance === 'debit') {
      if (balance >= 0) debit = balance; else credit = Math.abs(balance);
    } else {
      if (balance >= 0) credit = balance; else debit = Math.abs(balance);
    }

    return {
      accountCode:   account.accountCode,
      accountName:   account.accountName,
      accountType:   chartAccount?.account_type || null,
      normalBalance: account.normalBalance,
      debit,
      credit,
      balance,
    };
  });

  const debitTotal  = rows.reduce((s, r) => s + (Number(r.debit)  || 0), 0);
  const creditTotal = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const difference  = debitTotal - creditTotal;
  const balanced    = Math.abs(difference) < 0.005;

  return {
    rows,
    totals: { debitTotal, creditTotal, difference, balanced },
    isBalanced: balanced,
    generatedAt: new Date().toISOString(),
  };
}

// Returns just the Trial Balance rows. Thin wrapper over buildTrialBalance()
// — no separate row-building logic, so this can never drift from
// buildTrialBalance()'s totals.
function getTrialBalanceRows() {
  return buildTrialBalance().rows;
}

// Returns just the Trial Balance totals. Thin wrapper over
// buildTrialBalance(), same reasoning as getTrialBalanceRows() above.
function getTrialBalanceTotals() {
  return buildTrialBalance().totals;
}

// ─── Income Statement Engine (Sprint 4.4B) ───────────────────────────────────
// Pure, derived-only Income Statement built from buildTrialBalance() —
// never from state.financeTransactions, and never from
// state.accountingJournal directly. The Trial Balance has already resolved
// each account's debit/credit column (Sprint 4.4A); this layer only filters
// those rows down to accountType 'revenue'/'expense' and reduces each to a
// single signed amount. No new state, no caching, no mutation — rebuilt
// fresh on every call, same convention as every engine layer below it.
//
// Sign convention per row (mirrors the Trial Balance's own debit/credit
// split, just collapsed to one number):
//   revenue: amount = credit - debit  (credit column is positive revenue;
//            a stray debit balance on a revenue account, e.g. a reversal,
//            nets out as negative revenue rather than being dropped)
//   expense: amount = debit - credit  (debit column is positive expense;
//            a stray credit balance on an expense account, e.g. a refund,
//            nets out as negative expense)
// Since a Trial Balance row only ever has one of debit/credit non-zero,
// this is equivalent to "use the normal-side column, treat the opposite
// side as a negative" as specified — written as a subtraction so it holds
// even in the (currently unreachable, but not assumed impossible) case
// where both are non-zero.
//
// grossProfit/operatingProfit/netProfit are intentionally all the same
// figure (revenue.total - expenses.total) for now — no COGS, tax, or
// depreciation sections exist yet. Kept as three separate fields (instead
// of one aliased number) so a future sprint can specialize each without
// changing this function's return shape.
function buildIncomeStatement() {
  const trialBalanceRows = getTrialBalanceRows();

  const revenueRows = trialBalanceRows
    .filter(row => row.accountType === 'revenue')
    .map(row => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: (Number(row.credit) || 0) - (Number(row.debit) || 0),
    }));

  const expenseRows = trialBalanceRows
    .filter(row => row.accountType === 'expense')
    .map(row => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: (Number(row.debit) || 0) - (Number(row.credit) || 0),
    }));

  const revenueTotal = revenueRows.reduce((s, r) => s + r.amount, 0);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0);
  const grossProfit = revenueTotal - expenseTotal;

  return {
    revenue: { rows: revenueRows, total: revenueTotal },
    expenses: { rows: expenseRows, total: expenseTotal },
    grossProfit,
    operatingProfit: grossProfit,
    netProfit: grossProfit,
    generatedAt: new Date().toISOString(),
  };
}

// Returns just the revenue rows. Thin wrapper over buildIncomeStatement()
// — no separate filtering logic, so this can never drift from the totals.
function getIncomeStatementRevenueRows() {
  return buildIncomeStatement().revenue.rows;
}

// Returns just the expense rows. Thin wrapper over buildIncomeStatement(),
// same reasoning as getIncomeStatementRevenueRows() above.
function getIncomeStatementExpenseRows() {
  return buildIncomeStatement().expenses.rows;
}

// Returns just the summary figures (both section totals plus the three
// profit figures). Thin wrapper over buildIncomeStatement().
function getIncomeStatementTotals() {
  const statement = buildIncomeStatement();
  return {
    revenueTotal:    statement.revenue.total,
    expenseTotal:    statement.expenses.total,
    grossProfit:     statement.grossProfit,
    operatingProfit: statement.operatingProfit,
    netProfit:       statement.netProfit,
  };
}

// ─── Balance Sheet Engine (Sprint 4.4C) ──────────────────────────────────────
// Pure, derived-only Balance Sheet built from buildTrialBalance() and
// buildIncomeStatement() — never from state.financeTransactions, and never
// from state.accountingJournal directly. The Trial Balance has already
// resolved each account's debit/credit column (Sprint 4.4A); this layer
// only filters those rows down to accountType 'asset'/'liability'/'equity'
// and reduces each to a single signed amount, the same shape convention the
// Income Statement (Sprint 4.4B) uses for 'revenue'/'expense'. No new
// state, no caching, no mutation — rebuilt fresh on every call.
//
// Sign convention per row (mirrors the Trial Balance's own debit/credit
// split, just collapsed to one number):
//   asset:     amount = debit - credit  (debit column is positive asset; a
//              stray credit balance on an asset account nets out as a
//              negative asset rather than being dropped)
//   liability: amount = credit - debit  (credit column is positive
//              liability; a stray debit balance nets out as negative)
//   equity:    amount = credit - debit  (same convention as liability)
// Since a Trial Balance row only ever has one of debit/credit non-zero,
// this is equivalent to "use the normal-side column, treat the opposite
// side as a negative" as specified.
//
// Retained Earnings is not a posted Chart of Accounts row — it is derived
// straight from buildIncomeStatement().netProfit, the same figure the
// Income Statement itself reports, so the two statements can never
// disagree about period profit.
function buildBalanceSheet() {
  const trialBalanceRows = getTrialBalanceRows();

  const assetRows = trialBalanceRows
    .filter(row => row.accountType === 'asset')
    .map(row => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: (Number(row.debit) || 0) - (Number(row.credit) || 0),
    }));

  const liabilityRows = trialBalanceRows
    .filter(row => row.accountType === 'liability')
    .map(row => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: (Number(row.credit) || 0) - (Number(row.debit) || 0),
    }));

  const equityRows = trialBalanceRows
    .filter(row => row.accountType === 'equity')
    .map(row => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: (Number(row.credit) || 0) - (Number(row.debit) || 0),
    }));

  const assetsTotal     = assetRows.reduce((s, r) => s + r.amount, 0);
  const liabilitiesTotal = liabilityRows.reduce((s, r) => s + r.amount, 0);
  const equityTotal     = equityRows.reduce((s, r) => s + r.amount, 0);

  const retainedEarnings = Number(buildIncomeStatement().netProfit) || 0;
  const totalLiabilitiesAndEquity = liabilitiesTotal + equityTotal + retainedEarnings;
  const difference = assetsTotal - totalLiabilitiesAndEquity;

  return {
    assets:      { rows: assetRows,     total: assetsTotal },
    liabilities: { rows: liabilityRows, total: liabilitiesTotal },
    equity:      { rows: equityRows,    total: equityTotal },
    retainedEarnings,
    totalLiabilitiesAndEquity,
    difference,
    balanced: Math.abs(difference) < 0.005,
    generatedAt: new Date().toISOString(),
  };
}

// Returns just the asset rows. Thin wrapper over buildBalanceSheet() — no
// separate filtering logic, so this can never drift from the totals.
function getBalanceSheetAssetsRows() {
  return buildBalanceSheet().assets.rows;
}

// Returns just the liability rows. Thin wrapper over buildBalanceSheet(),
// same reasoning as getBalanceSheetAssetsRows() above.
function getBalanceSheetLiabilitiesRows() {
  return buildBalanceSheet().liabilities.rows;
}

// Returns just the equity rows. Thin wrapper over buildBalanceSheet(), same
// reasoning as getBalanceSheetAssetsRows() above.
function getBalanceSheetEquityRows() {
  return buildBalanceSheet().equity.rows;
}

// Returns just the summary figures (section totals plus retained earnings
// and the balance check). Thin wrapper over buildBalanceSheet().
function getBalanceSheetTotals() {
  const statement = buildBalanceSheet();
  return {
    assetsTotal:               statement.assets.total,
    liabilitiesTotal:          statement.liabilities.total,
    equityTotal:               statement.equity.total,
    retainedEarnings:          statement.retainedEarnings,
    totalLiabilitiesAndEquity: statement.totalLiabilitiesAndEquity,
    difference:                statement.difference,
    balanced:                  statement.balanced,
  };
}

// ─── Accounting Cash Flow Statement Engine (Sprint 4.4D) ─────────────────────
// Pure, derived-only Cash Flow Statement built directly from
// state.accountingJournal (the posted Journal Postings) — never from
// state.financeTransactions, and never from buildTrialBalance()/
// buildIncomeStatement()/buildBalanceSheet(), since those aggregate by
// account rather than by posting and would lose the per-posting cash/offset
// pairing this statement needs. This is the Accounting Cash Flow Statement
// (a financial-statement view derived from the ledger), not the existing
// operational Finance Cash Flow widget (which reads state.financeTransactions
// directly) — the two are intentionally separate and this engine does not
// replace, read, or write anything belonging to the other. No new state, no
// caching, no mutation — rebuilt fresh on every call, same convention as
// every other engine layer above it.
//
// Cash movement detection: a posting is a cash movement only if one of its
// entries targets the Cash and Bank account (code 1000, see
// finance_chart_of_accounts_migration.sql). Every posting in
// state.accountingJournal has exactly two entries (see buildJournalEntries()
// above), so "the other entry" is unambiguous — it is the offset side whose
// Chart of Accounts account_type decides which section of the statement the
// movement belongs to:
//   revenue / expense / liability -> Operating Activities (liability covers
//     Client Funds Liability, code 2100 — there is no dedicated Balance
//     Sheet section for pass-through cash yet, so it is classified as
//     operating per this sprint's brief rather than left unclassified)
//   equity                        -> Financing Activities (Owner Equity,
//     Capital Contributions, Partner Drawings)
//   asset (other than cash itself, which can never be its own offset)
//                                 -> Investing Activities. No ACCOUNTING_RULES
//     mapping currently posts a non-cash asset account (1100/1200 are seeded
//     in the Chart of Accounts but unmapped), so this section is empty today
//     by construction, not by a special case — it activates automatically
//     the day such a mapping exists.
// A posting with no cash-side entry, or whose offset account isn't a
// recognized Chart of Accounts row, is skipped rather than guessed at.
// transfer and unmapped/unknown transaction types never reach this function
// in the first place — postJournal() already refuses to post them (see
// Sprint 4.3D/4.3E above), so they fall out naturally rather than needing a
// second skip check here.
const ACCOUNTING_CASH_FLOW_CASH_ACCOUNT_CODE = '1000';

function buildAccountingCashFlowStatement(openingCashBalance = 0) {
  const journal = Array.isArray(state.accountingJournal) ? state.accountingJournal : [];

  const operatingRows = [];
  const investingRows = [];
  const financingRows = [];

  for (const posting of journal) {
    const entries = Array.isArray(posting?.entries) ? posting.entries : [];
    const cashEntry = entries.find(e => e.account === ACCOUNTING_CASH_FLOW_CASH_ACCOUNT_CODE);
    if (!cashEntry) continue;

    const amount = (Number(cashEntry.debit) || 0) - (Number(cashEntry.credit) || 0);
    if (amount === 0) continue;

    const offsetEntry = entries.find(e => e.account !== ACCOUNTING_CASH_FLOW_CASH_ACCOUNT_CODE);
    if (!offsetEntry) continue;

    const offsetAccount = getChartAccountByCode(offsetEntry.account);
    if (!offsetAccount) continue;

    const row = {
      journalNumber:     posting.journalNumber ?? null,
      transactionId:     posting.transactionId ?? null,
      transactionType:   posting.transactionType ?? null,
      description:       posting.description || '',
      offsetAccountCode: offsetAccount.account_code,
      offsetAccountName: offsetAccount.account_name,
      amount,
    };

    switch (offsetAccount.account_type) {
      case 'revenue':
      case 'expense':
      case 'liability':
        operatingRows.push(row);
        break;
      case 'equity':
        financingRows.push(row);
        break;
      case 'asset':
        investingRows.push(row);
        break;
      default:
        break;
    }
  }

  const operatingTotal = operatingRows.reduce((s, r) => s + r.amount, 0);
  const investingTotal = investingRows.reduce((s, r) => s + r.amount, 0);
  const financingTotal = financingRows.reduce((s, r) => s + r.amount, 0);
  const netCashFlow = operatingTotal + investingTotal + financingTotal;

  const opening = Number(openingCashBalance) || 0;
  const closingCashBalance = opening + netCashFlow;

  return {
    operatingActivities: { rows: operatingRows, total: operatingTotal },
    investingActivities: { rows: investingRows, total: investingTotal },
    financingActivities: { rows: financingRows, total: financingTotal },
    netCashFlow,
    openingCashBalance: opening,
    closingCashBalance,
    generatedAt: new Date().toISOString(),
  };
}

// Returns just the Operating Activities rows. Thin wrapper over
// buildAccountingCashFlowStatement() — no separate filtering logic, so this
// can never drift from the statement's totals.
function getAccountingCashFlowOperatingRows() {
  return buildAccountingCashFlowStatement().operatingActivities.rows;
}

// Returns just the Investing Activities rows. Thin wrapper over
// buildAccountingCashFlowStatement(), same reasoning as
// getAccountingCashFlowOperatingRows() above.
function getAccountingCashFlowInvestingRows() {
  return buildAccountingCashFlowStatement().investingActivities.rows;
}

// Returns just the Financing Activities rows. Thin wrapper over
// buildAccountingCashFlowStatement(), same reasoning as
// getAccountingCashFlowOperatingRows() above.
function getAccountingCashFlowFinancingRows() {
  return buildAccountingCashFlowStatement().financingActivities.rows;
}

// Returns just the summary figures (section totals, net cash flow, opening/
// closing cash balance). Thin wrapper over buildAccountingCashFlowStatement().
function getAccountingCashFlowTotals(openingCashBalance = 0) {
  const statement = buildAccountingCashFlowStatement(openingCashBalance);
  return {
    operatingTotal:      statement.operatingActivities.total,
    investingTotal:      statement.investingActivities.total,
    financingTotal:      statement.financingActivities.total,
    netCashFlow:         statement.netCashFlow,
    openingCashBalance:  statement.openingCashBalance,
    closingCashBalance:  statement.closingCashBalance,
  };
}

// ─── Accounting Statements Facade (Sprint 4.4E) ──────────────────────────────
// Pure composition layer over the four statement engines above (Trial
// Balance, Income Statement, Balance Sheet, Accounting Cash Flow) plus the
// Ledger Integrity & Audit Helpers (Sprint 4.3G) — collects what already
// exists into one object for a future UI/reporting layer to consume. No
// statement logic lives here: every field is exactly what its own engine
// already returns, called once and passed through unchanged. No new state,
// no caching, no mutation — rebuilt fresh on every call, same convention as
// every engine it composes.
function buildAccountingStatements(options = {}) {
  const openingCashBalance = options.openingCashBalance ?? 0;

  return {
    trialBalance:      buildTrialBalance(),
    incomeStatement:   buildIncomeStatement(),
    balanceSheet:      buildBalanceSheet(),
    cashFlowStatement: buildAccountingCashFlowStatement(openingCashBalance),
    integrity: {
      ledgerValidation:   validateLedger(),
      ledgerTotals:       getLedgerTotals(),
      unbalancedPostings: getUnbalancedPostings(),
    },
    generatedAt: new Date().toISOString(),
  };
}

// Thin wrapper over buildAccountingStatements() — no separate composition
// logic, so this can never drift from the facade.
function getAccountingStatements(options = {}) {
  return buildAccountingStatements(options);
}

// Returns a single named statement/section from the facade, or null for an
// unrecognized name rather than guessing. `name` matches the facade's own
// top-level keys except generatedAt, which isn't a statement.
const ACCOUNTING_STATEMENT_NAMES = ['trialBalance', 'incomeStatement', 'balanceSheet', 'cashFlowStatement', 'integrity'];
function getAccountingStatement(name, options = {}) {
  if (!ACCOUNTING_STATEMENT_NAMES.includes(name)) return null;
  return buildAccountingStatements(options)[name];
}

function financeTypeBadge(txType) {
  const bg    = FINANCE_TX_TYPE_BG[txType]    || 'bg-gray-50';
  const color = FINANCE_TX_TYPE_COLORS[txType] || 'text-gray-600';
  const label = FINANCE_TX_TYPE_LABELS[txType] || txType;
  return `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${color}">${escapeHtml(label)}</span>`;
}

function txStatusBadge(status) {
  const s = status || 'completed';
  const bg    = FINANCE_TX_STATUS_BG[s]     || 'bg-gray-100';
  const color = FINANCE_TX_STATUS_COLORS[s]  || 'text-gray-500';
  const label = FINANCE_TX_STATUS_LABELS[s]  || s;
  return `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${color}">${escapeHtml(label)}</span>`;
}

function forecastTypeBadge(fcType) {
  const bg    = FINANCE_FORECAST_TYPE_BG[fcType]     || 'bg-gray-50';
  const color = FINANCE_FORECAST_TYPE_COLORS[fcType]  || 'text-gray-600';
  const label = FINANCE_FORECAST_TYPE_LABELS[fcType]  || fcType;
  return `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${color}">${escapeHtml(label)}</span>`;
}

function forecastStatusBadge(status) {
  const s = status || 'expected';
  const bg    = FINANCE_FORECAST_STATUS_BG[s]     || 'bg-gray-50';
  const color = FINANCE_FORECAST_STATUS_COLORS[s]  || 'text-gray-600';
  const label = FINANCE_FORECAST_STATUS_LABELS[s]  || s;
  return `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${color}">${escapeHtml(label)}</span>`;
}

// ─── Finance Settings Helpers (Sprint 4.1A) ──────────────────────────────────
// Settings-driven Finance values, backed by state.financeSettings (loaded from
// the finance_settings table). Every helper falls back to the value supplied
// by the caller if the setting is missing, inactive, or the table isn't
// available yet — never throws, never breaks the UI.
function getFinanceSetting(key, fallback = null) {
  const row = (state.financeSettings || []).find(s => s.setting_key === key && s.is_active !== false);
  if (!row || row.setting_value === undefined || row.setting_value === null) return fallback;
  return row.setting_value;
}
function getFinanceNumberSetting(key, fallback = 0) {
  const v = getFinanceSetting(key, undefined);
  const n = Number(v);
  return v !== undefined && !isNaN(n) ? n : fallback;
}
function getFinanceArraySetting(key, fallback = []) {
  const v = getFinanceSetting(key, undefined);
  return Array.isArray(v) ? v : fallback;
}
function getFinanceObjectSetting(key, fallback = {}) {
  const v = getFinanceSetting(key, undefined);
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
}

// ─── Business Health: Fixed Costs (Sprint 4.3) ────────────────────────────────
// Default list used until/unless the 'fixed_costs' row in finance_settings
// overrides it. Kept as the fallback so behavior is unchanged if the table
// is empty or not yet migrated.
const FINANCE_FIXED_COSTS_DEFAULT = [
  { label: 'Salaries', amount: 52000 },
  { label: 'Adobe', amount: 1600 },
  { label: 'Google Workspace', amount: 1100 },
  { label: 'ChatGPT', amount: 1400 },
  { label: 'Internet / Utilities', amount: 1200 },
  { label: 'Miscellaneous', amount: 3000 },
];
// Resolution order: finance_fixed_costs table rows > finance_settings
// 'fixed_costs' > FINANCE_FIXED_COSTS_DEFAULT. Callers always get the same
// { label, amount } shape regardless of which source was used.
function getFinanceFixedCosts() {
  const rows = state.financeFixedCosts || [];
  if (rows.length) {
    return rows.map(r => ({ label: r.cost_name, amount: Number(r.amount) || 0 }));
  }
  return getFinanceArraySetting('fixed_costs', FINANCE_FIXED_COSTS_DEFAULT);
}

function getCrmClientName(id) {
  if (!id) return '';
  return state.crmClients.find(c => Number(c.id) === Number(id))?.client_name || '';
}

// Sprint CRM-2 — fallback labels only, used when crm_service_types hasn't
// been migrated/seeded yet. The lookup table (crm_service_types) is the
// source of truth once present; do not add new services here.
const CRM_SERVICE_TYPE_FALLBACK_LABELS = {
  branding: 'Branding',
  digital_marketing: 'Digital Marketing',
  website: 'Website',
  video_production: 'Video Production',
  photography: 'Photography',
  motion_graphics: 'Motion Graphics',
  printing: 'Printing',
  consulting: 'Consulting',
};

function getCrmServiceTypeById(id) {
  if (!id) return null;
  return state.crmServiceTypes.find(s => Number(s.id) === Number(id)) || null;
}

function getCrmServiceTypeLabel(id) {
  if (!id) return '';
  const serviceType = getCrmServiceTypeById(id);
  if (serviceType) return serviceType.service_name;
  return CRM_SERVICE_TYPE_FALLBACK_LABELS[String(id)] || '';
}

function getActiveCrmServiceTypes() {
  return state.crmServiceTypes.filter(s => s.is_active !== false);
}

function getAccountName(id) {
  if (!id) return '—';
  return state.financeAccounts.find(a => Number(a.id) === Number(id))?.account_name || '—';
}

function getCategoryName(id) {
  if (!id) return '—';
  return state.financeCategories.find(c => Number(c.id) === Number(id))?.category_name || '—';
}

// Sprint 4.2A: the single-account in/out classification now reads from the
// Finance Rules layer (getFinanceRule().cashImpact, +1/-1/0) instead of the
// inline ['income','capital_injection','pass_through_received'] / ['expense',
// 'pass_through_spent'] arrays this function used before — same result for
// every type that occurs in real data today (verified: income/capital_injection/
// pass_through_received all have cashImpact +1, expense/pass_through_spent both
// have -1), with an unrecognized type now safely resolving to "no rule found"
// (no balance change) instead of silently matching neither array. Transfer
// keeps its own two-account branch above since it isn't a single-account
// scalar impact (see FINANCE_RULES.transfer.accountBalanceImpact).
function getAccountBalance(accountId) {
  const acct = state.financeAccounts.find(a => Number(a.id) === Number(accountId));
  if (!acct) return 0;
  let balance = Number(acct.opening_balance) || 0;
  state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled').forEach(t => {
    const type = t.transaction_type;
    const amt  = Number(t.amount) || 0;
    if (type === 'transfer') {
      if (Number(t.from_account_id) === Number(accountId)) balance -= amt;
      if (Number(t.to_account_id)   === Number(accountId)) balance += amt;
    } else if (Number(t.account_id) === Number(accountId)) {
      const rule = getFinanceRule(type);
      if (rule) balance += rule.cashImpact * amt;
    }
  });
  return balance;
}

function generateFinanceTxNumber() {
  const year = new Date().getFullYear();
  const prefix = `TRX-${year}-`;
  const existing = state.financeTransactions
    .filter(t => t.transaction_number && t.transaction_number.startsWith(prefix))
    .map(t => parseInt(t.transaction_number.slice(prefix.length), 10))
    .filter(n => !isNaN(n));
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

// ─── Finance Date Range Intelligence ─────────────────────────────────────────

function getFinanceDateRange() {
  const range = state.financeDateRange || 'this_month';
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let startDate, endDate, label, isAllTime = false;

  switch (range) {
    case 'this_month':
      startDate = new Date(y, m, 1);
      endDate   = new Date(y, m + 1, 0);
      label     = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      break;
    case 'last_month':
      startDate = new Date(y, m - 1, 1);
      endDate   = new Date(y, m, 0);
      label     = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      break;
    case 'last_3_months':
      startDate = new Date(y, m - 2, 1);
      endDate   = new Date(y, m + 1, 0);
      label     = 'Last 3 Months';
      break;
    case 'last_6_months':
      startDate = new Date(y, m - 5, 1);
      endDate   = new Date(y, m + 1, 0);
      label     = 'Last 6 Months';
      break;
    case 'this_year':
      startDate = new Date(y, 0, 1);
      endDate   = new Date(y, 11, 31);
      label     = String(y);
      break;
    case 'last_year':
      startDate = new Date(y - 1, 0, 1);
      endDate   = new Date(y - 1, 11, 31);
      label     = String(y - 1);
      break;
    case 'last_2_years':
      startDate = new Date(y - 1, 0, 1);
      endDate   = new Date(y, 11, 31);
      label     = `${y - 1}–${y}`;
      break;
    case 'all_time':
      startDate = new Date(2000, 0, 1);
      endDate   = new Date(2099, 11, 31);
      label     = 'All Time';
      isAllTime = true;
      break;
    case 'custom': {
      const cs = state.financeCustomStart;
      const ce = state.financeCustomEnd;
      if (cs && ce) {
        startDate = new Date(cs + 'T00:00:00');
        endDate   = new Date(ce + 'T23:59:59');
        label     = `${cs} – ${ce}`;
      } else {
        startDate = new Date(y, m, 1);
        endDate   = new Date(y, m + 1, 0);
        label     = 'Custom Range';
      }
      break;
    }
    default:
      startDate = new Date(y, m, 1);
      endDate   = new Date(y, m + 1, 0);
      label     = 'This Month';
  }
  return { range, label, startDate, endDate, isAllTime };
}

function isInDateRange(dateStr, dr) {
  if (!dateStr) return false;
  if (dr.isAllTime) return true;
  const d = new Date(dateStr + 'T00:00:00');
  return d >= dr.startDate && d <= dr.endDate;
}

// Sprint 4.2D: realIncome/realExpenses now read the Finance Rules layer
// (getFinanceRevenueImpact/getFinanceExpenseImpact) instead of the inline
// per-type filter this function used before — same result for every type in
// real data today (verified in the Sprint 4.2D report). netProfit stays a
// plain formula (no classification involved), so no profitImpact helper is
// needed here. No date-range or row-filtering change.
function getFinancePeriodSummary(dr) {
  const activeTx = state.financeTransactions.filter(t =>
    !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && isInDateRange(t.transaction_date, dr)
  );
  const realIncome   = activeTx.reduce((s, t) => s + getFinanceRevenueImpact(t.transaction_type) * Number(t.amount), 0);
  const realExpenses = activeTx.reduce((s, t) => s + getFinanceExpenseImpact(t.transaction_type) * Number(t.amount), 0);
  return { realIncome, realExpenses, netProfit: realIncome - realExpenses };
}

// Sprint 4.2B: org-level cash-in/cash-out classification now reads
// getFinanceCashImpact(type) (±1/0 from the Finance Rules layer) instead of
// the inline ['income','capital_injection','pass_through_received'] / ['expense',
// 'pass_through_spent'] arrays. Transfer and any unrecognized type resolve to
// impact 0, so neither loop touches them — identical to before, where
// transfer matched neither array. No date-range or formula change.
function getCashFlowForPeriod(dr) {
  const activeTx = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
  let openingBalance = state.financeAccounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0);
  activeTx.filter(t => !isInDateRange(t.transaction_date, dr) && !dr.isAllTime && new Date(t.transaction_date + 'T00:00:00') < dr.startDate).forEach(t => {
    const amt = Number(t.amount) || 0;
    openingBalance += getFinanceCashImpact(t.transaction_type) * amt;
  });
  let cashIn = 0, cashOut = 0;
  activeTx.filter(t => isInDateRange(t.transaction_date, dr)).forEach(t => {
    const amt = Number(t.amount) || 0;
    const impact = getFinanceCashImpact(t.transaction_type);
    if (impact > 0) cashIn += amt;
    else if (impact < 0) cashOut += amt;
  });
  return { openingBalance, cashIn, cashOut, closingBalance: openingBalance + cashIn - cashOut, netMovement: cashIn - cashOut };
}

// Sprint 4.2F: expectedIncomeThisMonth/expectedExpensesThisMonth/weightedIncome
// now read the Finance Rules layer (classifyFinanceForecast().revenueImpact/
// expenseImpact) instead of the inline forecast_type === 'expected_income'/
// 'expected_expense' checks this function used before — classifyFinanceForecast()
// already existed as the correct abstraction (Sprint 4.2-era) but was never
// wired up anywhere. Same result for every forecast_type in the data model
// today: expectedIncome is the only implemented forecast rule with
// revenueImpact > 0, expectedExpense the only one with expenseImpact > 0, and
// an unrecognized/not-yet-implemented type (expectedTransfer, clientFunds)
// resolves to 0 via classifyFinanceForecast() returning null/0-impact,
// identical to before where it matched neither string check. Mirrors the
// getFinancePeriodSummary/getFinanceSummary migration pattern already applied
// to real transactions. overdueCount doesn't classify by type, so it is
// unchanged. No formula or date-range change.
function getFinanceForecastForPeriod(dr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const active = state.financeForecasts.filter(f =>
    !f.is_archived && !f.is_deleted && !['cancelled', 'received'].includes(f.status) &&
    !isForecastEffectivelyReceived(f) &&
    isInDateRange(f.expected_date, dr)
  );
  const expectedIncomeThisMonth   = active.reduce((s, f) => s + (classifyFinanceForecast(f)?.revenueImpact ?? 0) * Number(f.amount), 0);
  const expectedExpensesThisMonth = active.reduce((s, f) => s + (classifyFinanceForecast(f)?.expenseImpact ?? 0) * Number(f.amount), 0);
  const expectedNetCashflow       = expectedIncomeThisMonth - expectedExpensesThisMonth;
  const weightedIncome            = state.financeForecasts
    .filter(f => !f.is_archived && !f.is_deleted && !['cancelled', 'received'].includes(f.status) && !isForecastEffectivelyReceived(f))
    .reduce((s, f) => s + (classifyFinanceForecast(f)?.revenueImpact ?? 0) * Number(f.amount) * (Number(f.probability) || 100) / 100, 0);
  // Overdue for a schedule-generated forecast reflects the Item-owned Overdue
  // fact (due date passed AND Outstanding > 0) instead of the raw
  // status==='expected' check, which stays frozen at 'expected' forever for
  // schedule-linked forecasts (see isForecastEffectivelyReceived above) and
  // would otherwise keep a paid-late installment counted as overdue forever.
  // Manual forecasts are unchanged — same raw check as before.
  const overdueCount = state.financeForecasts.filter(f => {
    if (f.is_archived || f.is_deleted) return false;
    if (f.generated_from_schedule) {
      const cs = getForecastCollectionState(f);
      return cs ? cs.overdue : false;
    }
    return f.status === 'expected' && new Date(f.expected_date) < now;
  }).length;
  return { expectedIncomeThisMonth, expectedExpensesThisMonth, expectedNetCashflow, weightedIncome, overdueCount };
}

// Sprint Project Commercial C3 — Forecasted Client Funds. Deliberately kept
// separate from getFinanceForecastForPeriod(): that function's revenueImpact/
// expenseImpact sums must never include client_funds (FINANCE_RULES.forecast.
// clientFunds has revenueImpact:0/businessHealthImpact:[]), so this total is
// computed independently rather than folded into an existing field. No FX
// conversion — mirrors crmCurrencySafeTotal's "refuse to sum, show grouped
// breakdown instead" rule for any period that spans more than one currency.
function getForecastedClientFundsForPeriod(dr) {
  const active = state.financeForecasts.filter(f =>
    !f.is_archived && !f.is_deleted && !['cancelled', 'received'].includes(f.status) &&
    !isForecastEffectivelyReceived(f) &&
    f.forecast_type === 'client_funds' && isInDateRange(f.expected_date, dr)
  );
  const byCurrency = {};
  active.forEach(f => {
    const c = f.currency || 'EGP';
    byCurrency[c] = (byCurrency[c] || 0) + Number(f.amount);
  });
  const currencies = Object.keys(byCurrency);
  const value = active.reduce((s, f) => s + Number(f.amount), 0);
  const mixed = currencies.length > 1;
  const display = currencies.length === 0 ? fmtMoney(0) : mixed ? 'Mixed currencies' : fmtMoney(value, currencies[0]);
  return { value, display, mixed, byCurrency, rows: active };
}

function getFinanceDateRangeLabel() {
  return getFinanceDateRange().label;
}

function getFinancePeriodBadge(color) {
  const dr = getFinanceDateRange();
  return `<span class="finance-period-chip finance-period-chip--${color}">${escapeHtml(dr.label)}</span>`;
}

// ─── Future Period Intelligence Architecture ──────────────────────────────────
// These stubs are reserved for Sprint 4.3+ trend and variance features.
// Do NOT implement yet — scaffolding only.
//
// function getPreviousPeriod(dr) {
//   // Returns a { startDate, endDate, label } object for the period immediately
//   // preceding `dr`. Used to calculate MoM / QoQ / YoY comparisons.
//   // e.g. getPreviousPeriod({ range: 'this_month' }) → last calendar month
// }
//
// function calculateTrend(currentValue, previousValue) {
//   // Returns { direction: 'up'|'down'|'flat', pct: number, label: string }
//   // Used to drive KPI trend arrows and colour coding on KPI cards.
// }
//
// function calculateVariance(actual, forecast) {
//   // Returns { variance: number, pct: number, favourable: bool }
//   // Used in Forecast vs Actual report section and widget drilldowns.
// }
// ─────────────────────────────────────────────────────────────────────────────

// Sprint 4.2C: realIncome/realExpenses/passThroughHeld/cashFlowThisMonth now
// read the Finance Rules layer (getFinanceRevenueImpact/getFinanceExpenseImpact/
// getFinanceClientFundsImpact/getFinanceProfitImpact) instead of the inline
// per-type switch this function used before — same result for every type in
// real data today (verified in the Sprint 4.2C report). totalCapital stays on
// its own inline check: capital_injection has no isolated Finance Rules field
// (cashImpact is shared with income/pass_through_received, so it can't be used
// to isolate capital alone without adding a new rule dimension, which this
// sprint must not do).
function getFinanceSummary() {
  const activeTx = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
  const now = new Date();
  const thisMonth = (t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  let totalCapital = 0, realIncome = 0, realExpenses = 0, passThroughHeld = 0, cashFlowThisMonth = 0;
  activeTx.forEach(t => {
    const amt = Number(t.amount) || 0;
    const type = t.transaction_type;
    if (type === 'capital_injection') totalCapital += amt;
    realIncome      += getFinanceRevenueImpact(type) * amt;
    realExpenses    += getFinanceExpenseImpact(type) * amt;
    passThroughHeld += getFinanceClientFundsImpact(type) * amt;
    if (thisMonth(t)) cashFlowThisMonth += getFinanceProfitImpact(type) * amt;
  });
  const netProfit = realIncome - realExpenses;
  const totalAccountBalances = state.financeAccounts
    .filter(a => a.is_active)
    .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  return { totalCapital, realIncome, realExpenses, netProfit, passThroughHeld, cashFlowThisMonth, totalAccountBalances };
}

function getFinanceForecastSummary() {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  const active = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && !['cancelled', 'received'].includes(f.status));
  const thisMonth = active.filter(f => { const d = new Date(f.expected_date); return d >= now && d <= endOfMonth; });
  const expectedIncomeThisMonth   = thisMonth.filter(f => f.forecast_type === 'expected_income').reduce((s, f) => s + Number(f.amount), 0);
  const expectedExpensesThisMonth = thisMonth.filter(f => f.forecast_type === 'expected_expense').reduce((s, f) => s + Number(f.amount), 0);
  const expectedNetCashflow       = expectedIncomeThisMonth - expectedExpensesThisMonth;
  const weightedIncome            = active.filter(f => f.forecast_type === 'expected_income').reduce((s, f) => s + Number(f.amount) * Number(f.probability) / 100, 0);
  const overdueCount              = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && f.status === 'expected' && new Date(f.expected_date) < now).length;
  return { expectedIncomeThisMonth, expectedExpensesThisMonth, expectedNetCashflow, weightedIncome, overdueCount };
}

// Sprint 4.2B: same migration as getCashFlowForPeriod() — classification now
// reads getFinanceCashImpact(type) instead of inline arrays. No date-range change.
function getCashFlowThisMonth() {
  const now = new Date();
  const yr = now.getFullYear(), mo = now.getMonth();
  const monthStart = new Date(yr, mo, 1);
  const activeTx = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');

  let openingBalance = state.financeAccounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0);
  activeTx.filter(t => new Date(t.transaction_date + 'T00:00:00') < monthStart).forEach(t => {
    const amt = Number(t.amount) || 0;
    openingBalance += getFinanceCashImpact(t.transaction_type) * amt;
  });

  let cashIn = 0, cashOut = 0;
  activeTx.filter(t => {
    const d = new Date(t.transaction_date + 'T00:00:00');
    return d.getFullYear() === yr && d.getMonth() === mo;
  }).forEach(t => {
    const amt = Number(t.amount) || 0;
    const impact = getFinanceCashImpact(t.transaction_type);
    if (impact > 0) cashIn += amt;
    else if (impact < 0) cashOut += amt;
  });

  return { openingBalance, cashIn, cashOut, closingBalance: openingBalance + cashIn - cashOut, netMovement: cashIn - cashOut };
}

// ---------- Finance Engine ----------
// Sprint 4.1D: a single build step that gathers the core Finance metrics
// widgets need, so those widgets read one object instead of each calling
// getFinanceSummary/getFinancePeriodSummary/getCashFlowForPeriod/
// getFinanceForecastForPeriod/getBusinessHealthMetrics separately (and
// risking the callers drifting out of sync with each other over time).
//
// This is a thin orchestration layer, not a rewrite: it still delegates to
// the existing calculators below for the actual arithmetic (no formula
// changes), it just computes each one once per build and reuses the pieces
// (e.g. the same fixedCostTotal feeds both engine.targets and
// engine.businessHealth, instead of being computed twice).
//
// Pure: reads only the inputs given to it (or safe state/helper defaults),
// never mutates state, never touches the DOM, never fetches data.
//
// NOTE: getFinanceSummary/getCashFlowForPeriod/getFinanceForecastForPeriod
// always read live state.financeTransactions/financeAccounts/financeForecasts
// internally — they don't yet accept override arrays. Passing custom
// transactions/accounts/forecasts here is intentionally not wired this
// sprint (see Architect Notes on why); dateRange/fixedCosts/config are fully
// functional overrides since the underlying calculators already accept them.
function buildFinanceEngine(options = {}) {
  const dr  = options.dateRange || getFinanceDateRange();
  const cfg = options.config || getBusinessHealthConfig();
  const fixedCosts = options.fixedCosts || getFinanceFixedCosts();
  const fixedCostTotal = fixedCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const rawSummary    = getFinanceSummary();
  const periodSummary = getFinancePeriodSummary(dr);
  const cashFlow       = getCashFlowForPeriod(dr);
  const forecast         = getFinanceForecastForPeriod(dr);
  const forecastedClientFunds = getForecastedClientFundsForPeriod(dr);

  // WP2 — Outstanding is live/all-time (not period-filtered), computed once
  // here and reused for all four dashboard cards, same convention as
  // forecastedClientFunds above. The underlying rows are also exactly what
  // each Outstanding KPI's own getData() recomputes when its drilldown opens
  // — same source, so the card value and the drilldown total can never
  // diverge.
  const outstandingRows = getOutstandingPaymentItemRows();
  const outstandingRevenue     = sumOutstandingByCurrency(outstandingRows.filter(r => Math.round(r.outstandingRevenue * 100) > 0), 'outstandingRevenue');
  const outstandingClientFunds = sumOutstandingByCurrency(outstandingRows.filter(r => Math.round(r.outstandingClientFunds * 100) > 0), 'outstandingClientFunds');
  const outstandingTotal       = sumOutstandingByCurrency(outstandingRows.filter(r => Math.round(r.outstandingTotal * 100) > 0), 'outstandingTotal');
  const overdueOutstanding     = sumOutstandingByCurrency(outstandingRows.filter(r => r.isOverdue), 'outstandingTotal');

  const summary = {
    totalCapital:           rawSummary.totalCapital,
    realRevenue:            periodSummary.realIncome,
    realExpenses:           periodSummary.realExpenses,
    netProfit:              periodSummary.netProfit,
    cashInAccounts:         rawSummary.totalAccountBalances,
    clientFundsHeld:        rawSummary.passThroughHeld,
    forecastIncoming:       forecast.expectedIncomeThisMonth,
    forecastOutgoing:       forecast.expectedExpensesThisMonth,
    cashFlowPeriod:         cashFlow.netMovement,
    weightedExpectedIncome: forecast.weightedIncome,
    overdueForecasts:       forecast.overdueCount,
    // Objects (not plain numbers) — value/display/mixed/byCurrency — never
    // consumed by getBusinessHealthMetrics or any revenue/profit calculation.
    forecastedClientFunds:  forecastedClientFunds,
    outstandingRevenue,     outstandingClientFunds,
    outstandingTotal,       overdueOutstanding,
  };

  const breakEvenTarget = fixedCostTotal;
  const safeTarget       = fixedCostTotal * cfg.targetMultipliers.safe;
  const stretchTarget    = fixedCostTotal * cfg.targetMultipliers.stretch;

  const burnRate          = fixedCostTotal;
  const cashRunwayMonths  = burnRate > 0 ? summary.cashInAccounts / burnRate : Infinity;

  // Reuses the dr/cfg/summary/periodSummary/forecast/fixedCostTotal already computed
  // above instead of recalculating them inside getBusinessHealthMetrics.
  const businessHealth = getBusinessHealthMetrics({
    dr, cfg, fixedCostTotal,
    summary: rawSummary, periodSum: periodSummary, forecast,
  });

  return {
    dateRange: dr,
    summary,
    cashFlow,
    targets: { fixedCostTotal, breakEvenTarget, safeTarget, stretchTarget },
    runway: { burnRate, cashRunwayMonths },
    businessHealth,
  };
}

// Thin access helper (Sprint 4.1E) so KPI drilldowns and other call sites don't
// need to know how the engine is built. No caching/memoization — each call
// builds a fresh engine from current state, same as calling buildFinanceEngine()
// directly, so results are always consistent with what's on screen.
function getFinanceEngine() {
  return buildFinanceEngine();
}

// Sprint 4.2C: per-client revenue/expenses/pass-through now read the Finance
// Rules layer (getFinanceRevenueImpact/getFinanceExpenseImpact/
// getFinanceClientFundsImpact) instead of the inline per-type switch this
// function used before — same result for every type in real data today
// (verified in the Sprint 4.2C report). Output shape unchanged.
function getClientBalanceSummary(dr) {
  const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && (!dr || isInDateRange(t.transaction_date, dr)));
  const map = {};
  txs.forEach(t => {
    if (!t.client_id && !t.client_name) return;
    const key = t.client_id ? `id:${t.client_id}` : `name:${t.client_name}`;
    if (!map[key]) {
      map[key] = { clientId: t.client_id || null, clientName: t.client_name || getCrmClientName(t.client_id) || 'Unknown', revenue: 0, ptReceived: 0, ptSpent: 0, expenses: 0 };
    }
    const amt = Number(t.amount) || 0;
    const type = t.transaction_type;
    map[key].revenue  += getFinanceRevenueImpact(type) * amt;
    map[key].expenses += getFinanceExpenseImpact(type) * amt;
    const cfImpact = getFinanceClientFundsImpact(type);
    if (cfImpact > 0)      map[key].ptReceived += amt;
    else if (cfImpact < 0) map[key].ptSpent    += amt;
  });
  return Object.values(map).map(c => ({
    ...c,
    ptRemaining:    c.ptReceived - c.ptSpent,
    totalCashIn:    c.revenue + c.ptReceived,
    profitEstimate: c.revenue - c.expenses,
  })).sort((a, b) => b.revenue - a.revenue);
}

// Sprint 4.2C: per-project revenue/expenses/pass-through now read the Finance
// Rules layer (getFinanceRevenueImpact/getFinanceExpenseImpact/
// getFinanceClientFundsImpact) instead of the inline per-type switch this
// function used before — same result for every type in real data today
// (verified in the Sprint 4.2C report). The income/expense/pass_through_*
// whitelist guard is kept as-is: it controls which transactions create a
// project entry at all (e.g. a project with only a capital_injection
// transaction must not appear in Project P&L), which is a membership
// decision, not a classification one, so it doesn't belong in the rule
// helpers. Output shape unchanged.
function getProjectPnL(dr) {
  const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && (!dr || isInDateRange(t.transaction_date, dr)));
  const map = {};
  txs.forEach(t => {
    const type = t.transaction_type;
    if (!['income', 'expense', 'pass_through_received', 'pass_through_spent'].includes(type)) return;
    const key = t.project_name || '__unassigned__';
    if (!map[key]) map[key] = { projectName: t.project_name || 'Unassigned', revenue: 0, expenses: 0, ptReceived: 0, ptSpent: 0 };
    const amt = Number(t.amount) || 0;
    map[key].revenue  += getFinanceRevenueImpact(type) * amt;
    map[key].expenses += getFinanceExpenseImpact(type) * amt;
    const cfImpact = getFinanceClientFundsImpact(type);
    if (cfImpact > 0)      map[key].ptReceived += amt;
    else if (cfImpact < 0) map[key].ptSpent    += amt;
  });
  return Object.values(map).map(p => ({
    ...p,
    ptRemaining: p.ptReceived - p.ptSpent,
    profit:  p.revenue - p.expenses,
    margin:  p.revenue > 0 ? (p.revenue - p.expenses) / p.revenue * 100 : null,
  })).sort((a, b) => b.revenue - a.revenue);
}

function getExecutiveInsights(summary, cashFlow, forecast, dr) {
  const insights = [];
  const CASH_THRESHOLD = getFinanceNumberSetting('cash_safety_threshold', 100000);
  const activeTx = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
  const periodDr = dr || getFinanceDateRange();
  const periodTx = activeTx.filter(t => isInDateRange(t.transaction_date, periodDr));
  const periodLabel = periodDr.label;

  if (summary.totalAccountBalances < CASH_THRESHOLD) {
    insights.push({ type: 'warning', icon: 'alert-triangle', html: `Cash in accounts (<strong>${fmtMoney(summary.totalAccountBalances)}</strong>) is below the <strong>${fmtMoney(CASH_THRESHOLD)}</strong> safety threshold.` });
  }

  const catExp = {};
  periodTx.filter(t => t.transaction_type === 'expense').forEach(t => {
    const n = getCategoryName(t.category_id) || 'Uncategorized';
    catExp[n] = (catExp[n] || 0) + Number(t.amount);
  });
  const topCat = Object.entries(catExp).sort((a, b) => b[1] - a[1])[0];
  if (topCat) insights.push({ type: 'info', icon: 'trending-down', html: `Highest expense category (${escapeHtml(periodLabel)}): <strong>${escapeHtml(topCat[0])}</strong> (${fmtMoney(topCat[1])}).` });

  const projRev = {};
  periodTx.filter(t => t.transaction_type === 'income' && t.project_name).forEach(t => {
    projRev[t.project_name] = (projRev[t.project_name] || 0) + Number(t.amount);
  });
  const topProj = Object.entries(projRev).sort((a, b) => b[1] - a[1])[0];
  if (topProj) insights.push({ type: 'positive', icon: 'briefcase', html: `Top revenue project (${escapeHtml(periodLabel)}): <strong>${escapeHtml(topProj[0])}</strong> (${fmtMoney(topProj[1])}).` });

  const clientRev = {};
  periodTx.filter(t => t.transaction_type === 'income' && (t.client_name || t.client_id)).forEach(t => {
    const n = t.client_name || getCrmClientName(t.client_id) || 'Unknown';
    clientRev[n] = (clientRev[n] || 0) + Number(t.amount);
  });
  const topClient = Object.entries(clientRev).sort((a, b) => b[1] - a[1])[0];
  if (topClient) insights.push({ type: 'positive', icon: 'user', html: `Top client by revenue (${escapeHtml(periodLabel)}): <strong>${escapeHtml(topClient[0])}</strong> (${fmtMoney(topClient[1])}).` });

  if (summary.passThroughHeld > 0) {
    insights.push({ type: 'info', icon: 'arrow-right-left', html: `Currently holding <strong>${fmtMoney(summary.passThroughHeld)}</strong> in client funds (pass-through balance).` });
  }

  if (forecast.expectedNetCashflow !== 0) {
    const sign = forecast.expectedNetCashflow >= 0 ? '+' : '';
    insights.push({ type: forecast.expectedNetCashflow >= 0 ? 'positive' : 'warning', icon: 'calendar-check', html: `Forecasted net cashflow (${escapeHtml(periodLabel)}): <strong>${sign}${fmtMoney(forecast.expectedNetCashflow)}</strong>.` });
  }

  return insights;
}

function renderFinanceCharts(summary) {
  const fmtChartVal = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
    return String(Math.round(v));
  };

  const dr = getFinanceDateRange();

  function buildBuckets() {
    const { range, startDate, endDate } = dr;
    const buckets = [];

    const pushDaily = (s, e) => {
      const d = new Date(s);
      while (d <= e) {
        buckets.push({ label: d.toLocaleString('default', { day: 'numeric', month: 'short' }), s: new Date(d), e: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) });
        d.setDate(d.getDate() + 1);
      }
    };

    const pushMonthly = (s, e) => {
      const d = new Date(s.getFullYear(), s.getMonth(), 1);
      const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);
      while (d <= endMonth) {
        buckets.push({ label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), s: new Date(d), e: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) });
        d.setMonth(d.getMonth() + 1);
      }
    };

    if (range === 'this_month' || range === 'last_month') {
      pushDaily(startDate, endDate);
    } else if (range === 'all_time') {
      const txYears = state.financeTransactions.filter(t => t.transaction_date).map(t => new Date(t.transaction_date).getFullYear()).filter(y => !isNaN(y));
      const minYear = txYears.length ? Math.min(...txYears) : new Date().getFullYear();
      const maxYear = new Date().getFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        buckets.push({ label: String(y), s: new Date(y, 0, 1), e: new Date(y, 11, 31, 23, 59, 59, 999) });
      }
    } else if (range === 'last_2_years') {
      let d = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
      while (d <= endDate) {
        const qN = Math.floor(d.getMonth() / 3) + 1;
        const qEnd = new Date(d.getFullYear(), d.getMonth() + 3, 0);
        buckets.push({ label: `Q${qN} ${d.getFullYear()}`, s: new Date(d), e: new Date(qEnd.getFullYear(), qEnd.getMonth(), qEnd.getDate(), 23, 59, 59, 999) });
        d.setMonth(d.getMonth() + 3);
      }
    } else if (range === 'custom') {
      const diffDays = Math.round((endDate - startDate) / 86400000);
      if (diffDays <= 35) pushDaily(startDate, endDate);
      else pushMonthly(startDate, endDate);
    } else {
      pushMonthly(startDate, endDate);
    }

    if (!buckets.length) buckets.push({ label: dr.label, s: new Date(startDate), e: new Date(endDate) });
    return buckets;
  }

  // Revenue vs Expenses — period-aware grouped bar chart
  const barCanvas = $('#finance-income-expense-chart');
  if (barCanvas) {
    const buckets = buildBuckets();
    const incomeData = [], expenseData = [];
    buckets.forEach(b => {
      const bTx = state.financeTransactions.filter(t => {
        if (t.is_archived || t.is_deleted || t.status === 'cancelled') return false;
        const d = new Date(t.transaction_date + 'T00:00:00');
        return d >= b.s && d <= b.e;
      });
      incomeData.push(bTx.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0));
      expenseData.push(bTx.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
    });
    if (financeIncomeExpenseChartInstance) { financeIncomeExpenseChartInstance.destroy(); financeIncomeExpenseChartInstance = null; }
    financeIncomeExpenseChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: buckets.map(b => b.label),
        datasets: [
          { label: 'Income',   data: incomeData,   backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 4, borderSkipped: false },
          { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(244,63,94,0.85)',  borderRadius: 4, borderSkipped: false },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, pointStyleWidth: 8, padding: 16, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtMoney(ctx.raw)}` } },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 }, maxTicksLimit: 20 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => fmtChartVal(v), font: { size: 11 } },
          },
        },
      },
    });
  }

  // Expenses by category doughnut — period-filtered
  const doughnutCanvas = $('#finance-expense-category-chart');
  if (doughnutCanvas) {
    const catTotals = {};
    state.financeTransactions
      .filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && t.transaction_type === 'expense' && isInDateRange(t.transaction_date, dr))
      .forEach(t => { const n = getCategoryName(t.category_id); catTotals[n] = (catTotals[n] || 0) + Number(t.amount); });
    const labels = Object.keys(catTotals);
    const values = Object.values(catTotals);
    if (financeExpenseCategoryChartInstance) { financeExpenseCategoryChartInstance.destroy(); financeExpenseCategoryChartInstance = null; }
    const palette = ['#6366f1','#10b981','#f59e0b','#f43f5e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];
    if (labels.length) {
      financeExpenseCategoryChartInstance = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyleWidth: 8, padding: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtMoney(ctx.raw)}` } },
          },
        },
      });
    } else {
      const ctx = doughnutCanvas.getContext('2d');
      ctx.clearRect(0, 0, doughnutCanvas.width, doughnutCanvas.height);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText('No expense data yet', doughnutCanvas.width / 2, doughnutCanvas.height / 2);
    }
  }

  // Revenue & Expenses by Project — horizontal bar — period-filtered
  const projCanvas = $('#finance-project-revenue-chart');
  if (projCanvas) {
    const projData = getProjectPnL(dr).filter(p => p.revenue > 0 || p.expenses > 0).slice(0, 8);
    if (financeProjectRevenueChartInstance) { financeProjectRevenueChartInstance.destroy(); financeProjectRevenueChartInstance = null; }
    if (projData.length) {
      financeProjectRevenueChartInstance = new Chart(projCanvas, {
        type: 'bar',
        data: {
          labels: projData.map(p => p.projectName.length > 20 ? p.projectName.slice(0, 18) + '…' : p.projectName),
          datasets: [
            { label: 'Revenue',  data: projData.map(p => p.revenue),  backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 4 },
            { label: 'Expenses', data: projData.map(p => p.expenses), backgroundColor: 'rgba(244,63,94,0.85)',  borderRadius: 4 },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyleWidth: 8, padding: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtMoney(ctx.raw)}` } },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: v => fmtChartVal(v), font: { size: 10 } },
            },
            y: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        },
      });
    } else {
      const ctx = projCanvas.getContext('2d');
      ctx.clearRect(0, 0, projCanvas.width, projCanvas.height);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText('No project data yet', projCanvas.width / 2, projCanvas.height / 2);
    }
  }
}

const FINANCE_KPI_CONFIG = {
  totalCapital: {
    label: 'Total Capital', icon: 'landmark', color: 'indigo',
    tooltip: 'Money injected into the business. Not counted as revenue or profit.',
    formulaLines: ['SUM(', '  Capital Injection transactions', '  · Not Deleted', '  · Not Cancelled', ')'],
    excludedList: ['Income', 'Expenses', 'Pass-Through', 'Transfers', 'Forecasts', 'Deleted', 'Cancelled'],
    insight: 'Capital injections are investments in the business. They increase your cash balance but are never counted as revenue or operating profit.',
    navAction: { tab: 'transactions', typeFilter: 'capital_injection' },
    periodFiltered: false,
    getData() {
      const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && t.transaction_type === 'capital_injection');
      return { value: getFinanceEngine().summary.totalCapital, rows: txs.map(t => ({ date: t.transaction_date, txNum: t.transaction_number, desc: t.description, amount: Number(t.amount), positive: true, client: t.client_name || getCrmClientName(t.client_id) || '', project: t.project_name || '', category: getCategoryName(t.category_id) || '', ref: t.reference || '' })) };
    },
  },
  realRevenue: {
    label: 'Real Revenue', icon: 'trending-up', color: 'emerald',
    tooltip: 'Actual service income only. Excludes capital, transfers, client funds, and forecasts.',
    formulaLines: ['SUM(', '  Income transactions', '  · In selected period', '  · Not Deleted', '  · Not Cancelled', ')'],
    excludedList: ['Capital Injection', 'Pass-Through Received', 'Transfers', 'Forecasts', 'Deleted', 'Cancelled'],
    insight: 'Revenue counts only service income. Capital injections, client pass-through funds, and account transfers never count as revenue — they are tracked separately.',
    navAction: { tab: 'transactions', typeFilter: 'income' },
    periodFiltered: true,
    getData() {
      const dr = getFinanceDateRange();
      const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && t.transaction_type === 'income' && isInDateRange(t.transaction_date, dr));
      return { value: getFinanceEngine().summary.realRevenue, rows: txs.map(t => ({ date: t.transaction_date, txNum: t.transaction_number, desc: t.description, amount: Number(t.amount), positive: true, client: t.client_name || getCrmClientName(t.client_id) || '', project: t.project_name || '', category: getCategoryName(t.category_id) || '', ref: t.reference || '' })) };
    },
  },
  realExpenses: {
    label: 'Real Expenses', icon: 'trending-down', color: 'rose',
    tooltip: 'Actual company expenses only. Excludes transfers and client pass-through spending.',
    formulaLines: ['SUM(', '  Expense transactions', '  · In selected period', '  · Not Deleted', '  · Not Cancelled', ')'],
    excludedList: ['Pass-Through Spending', 'Transfers', 'Capital', 'Deleted', 'Cancelled'],
    insight: 'Operating expenses only. Pass-through spending is excluded — those funds belong to the client and are tracked separately under Client Funds Held.',
    navAction: { tab: 'transactions', typeFilter: 'expense' },
    periodFiltered: true,
    getData() {
      const dr = getFinanceDateRange();
      const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && t.transaction_type === 'expense' && isInDateRange(t.transaction_date, dr));
      return { value: getFinanceEngine().summary.realExpenses, rows: txs.map(t => ({ date: t.transaction_date, txNum: t.transaction_number, desc: t.description, amount: Number(t.amount), positive: false, client: t.client_name || getCrmClientName(t.client_id) || '', project: t.project_name || '', category: getCategoryName(t.category_id) || '', ref: t.reference || '' })) };
    },
  },
  netProfit: {
    label: 'Net Profit', icon: 'bar-chart-2', color: 'emerald',
    tooltip: 'Real Revenue minus Real Expenses for the selected period. Capital and pass-through are never included.',
    formulaLines: ['Real Revenue (period)', '− Real Expenses (period)', '= Net Profit'],
    excludedList: ['Capital', 'Pass-Through', 'Transfers', 'Forecasts'],
    insight: 'Profit is calculated purely from service revenue and operating expenses. Capital and client funds are always excluded to keep the P&L clean and accurate.',
    navAction: { tab: 'transactions', typeFilter: 'all' },
    periodFiltered: true,
    getData() {
      const s = getFinanceEngine().summary;
      const pos = s.netProfit >= 0;
      return {
        value: s.netProfit, color: pos ? 'emerald' : 'rose',
        breakdown: [
          { label: 'Real Revenue',    value: fmtMoney(s.realRevenue),   color: 'emerald' },
          { label: '− Real Expenses', value: fmtMoney(s.realExpenses), color: 'rose'    },
          { label: '= Net Profit',    value: `${pos ? '+' : ''}${fmtMoney(s.netProfit)}`, color: pos ? 'emerald' : 'rose', bold: true },
        ],
      };
    },
  },
  cashInAccounts: {
    label: 'Cash in Accounts', icon: 'wallet', color: 'blue',
    tooltip: 'Sum of current balances across all active accounts. Live — not period-filtered.',
    formulaLines: ['Per account:', '  Opening Balance', '  + All Inflows', '  − All Outflows', '  = Current Balance', 'Summed across active accounts'],
    excludedList: ['Inactive Accounts', 'Deleted Transactions', 'Cancelled Transactions'],
    insight: 'This is the actual spendable cash position across all active accounts. It includes capital, revenue, and client funds — reflecting real-world bank balances.',
    navAction: { tab: 'accounts' },
    periodFiltered: false,
    getData() {
      const accounts = state.financeAccounts.filter(a => a.is_active);
      const breakdown = accounts.map(a => ({ label: a.account_name, value: fmtMoney(getAccountBalance(a.id)), color: 'blue' }));
      const total = getFinanceEngine().summary.cashInAccounts;
      breakdown.push({ label: 'Total', value: fmtMoney(total), color: 'blue', bold: true });
      return { value: total, breakdown };
    },
  },
  clientFundsHeld: {
    label: 'Client Funds Held', icon: 'arrow-right-left', color: 'amber',
    tooltip: 'Client pass-through funds received but not yet spent on their behalf. Live — not period-filtered.',
    formulaLines: ['SUM(Pass-Through Received)', '− SUM(Pass-Through Spent)', '= Client Funds Held'],
    excludedList: ['Income', 'Expenses', 'Capital', 'Transfers'],
    insight: 'These funds belong to your clients. They must be spent on their behalf or returned — they are never counted as company revenue or profit.',
    navAction: { tab: 'transactions', typeFilter: 'pass_through_received' },
    periodFiltered: false,
    getData() {
      const base = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
      const rcv = base.filter(t => t.transaction_type === 'pass_through_received');
      const spt = base.filter(t => t.transaction_type === 'pass_through_spent');
      const ptIn = rcv.reduce((s, t) => s + Number(t.amount), 0);
      const ptOut = spt.reduce((s, t) => s + Number(t.amount), 0);
      const held = getFinanceEngine().summary.clientFundsHeld;
      return {
        value: held,
        breakdown: [
          { label: 'Funds Received',  value: fmtMoney(ptIn),  color: 'emerald' },
          { label: '− Funds Spent',   value: fmtMoney(ptOut), color: 'rose'    },
          { label: '= Funds Held',    value: fmtMoney(held),  color: 'amber', bold: true },
        ],
        rows: rcv.map(t => ({ date: t.transaction_date, txNum: t.transaction_number, desc: t.description || '', amount: Number(t.amount), positive: true, client: t.client_name || getCrmClientName(t.client_id) || '', project: t.project_name || '', category: getCategoryName(t.category_id) || '', ref: t.reference || '' })),
      };
    },
  },
  forecastIncoming: {
    label: 'Forecast Incoming', icon: 'calendar-check', color: 'teal',
    tooltip: 'Expected income from active forecasts due in the selected period. Not yet received.',
    formulaLines: ['SUM(', '  Expected Income forecasts', '  Due in selected period', '  · Not Cancelled', '  · Not Received', ')'],
    excludedList: ['Received', 'Cancelled', 'Deleted', 'Archived'],
    insight: 'Forecasts are planning tools only. Revenue is recognized only when payment is received and recorded as an Income transaction.',
    navAction: { tab: 'forecast' },
    periodFiltered: true,
    getData() {
      const dr = getFinanceDateRange();
      const fcs = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && !['cancelled','received'].includes(f.status) && f.forecast_type === 'expected_income' && isInDateRange(f.expected_date, dr));
      return { value: getFinanceEngine().summary.forecastIncoming, rows: fcs.map(f => ({ date: f.expected_date, txNum: '', desc: f.description || '', amount: Number(f.amount), positive: true, client: f.client_name || '', project: f.project_name || '', category: getCategoryName(f.category_id) || '', ref: '' })) };
    },
  },
  forecastOutgoing: {
    label: 'Forecast Outgoing', icon: 'calendar-x', color: 'orange',
    tooltip: 'Expected expenses from active forecasts due in the selected period. Not yet paid.',
    formulaLines: ['SUM(', '  Expected Expense forecasts', '  Due in selected period', '  · Not Cancelled', '  · Not Received', ')'],
    excludedList: ['Received', 'Cancelled', 'Deleted', 'Archived'],
    insight: 'Planned future payments. Expenses are only recorded when payments are made — forecasts do not reduce your current cash balance.',
    navAction: { tab: 'forecast' },
    periodFiltered: true,
    getData() {
      const dr = getFinanceDateRange();
      const fcs = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && !['cancelled','received'].includes(f.status) && f.forecast_type === 'expected_expense' && isInDateRange(f.expected_date, dr));
      return { value: getFinanceEngine().summary.forecastOutgoing, rows: fcs.map(f => ({ date: f.expected_date, txNum: '', desc: f.description || '', amount: Number(f.amount), positive: false, client: f.client_name || '', project: f.project_name || '', category: getCategoryName(f.category_id) || '', ref: '' })) };
    },
  },
  cashFlowThisMonth: {
    label: 'Cash Flow — Period', icon: 'activity', color: 'emerald',
    tooltip: 'Net cash movement during the selected period (all transaction types included).',
    formulaLines: ['Opening Balance', '+ Cash In', '  (Revenue · Capital · Client Funds)', '− Cash Out', '  (Expenses · Client Funds Spent)', '= Closing Balance'],
    excludedList: ['Cancelled Transactions', 'Deleted Transactions', 'Inter-Account Transfers'],
    insight: 'Tracks all real cash movements in the selected period. Transfers between accounts are excluded as they do not change the total cash position.',
    navAction: { tab: 'transactions', typeFilter: 'all' },
    periodFiltered: true,
    getData() {
      const cf = getFinanceEngine().cashFlow;
      const pos = cf.netMovement >= 0;
      return {
        value: cf.netMovement, color: pos ? 'emerald' : 'rose',
        displayValue: `${pos ? '+' : ''}${fmtMoney(cf.netMovement)}`,
        breakdown: [
          { label: 'Opening Balance',   value: fmtMoney(cf.openingBalance),  color: 'gray'                   },
          { label: '+ Cash In',         value: fmtMoney(cf.cashIn),          color: 'emerald'                },
          { label: '− Cash Out',        value: fmtMoney(cf.cashOut),         color: 'rose'                   },
          { label: '= Closing Balance', value: fmtMoney(cf.closingBalance),  color: pos ? 'emerald' : 'rose' },
          { label: 'Net Movement',      value: `${pos ? '+' : ''}${fmtMoney(cf.netMovement)}`, color: pos ? 'emerald' : 'rose', bold: true },
        ],
      };
    },
  },
  // Sprint Project Commercial C3. Deliberately excluded from every revenue/
  // profit/business-health list above — see getForecastedClientFundsForPeriod
  // and FINANCE_RULES.forecast.clientFunds (revenueImpact:0, businessHealthImpact:[]).
  forecastedClientFunds: {
    label: 'Forecasted Client Funds', icon: 'calendar-clock', color: 'cyan',
    tooltip: 'Expected future client pass-through receipts due in the selected period. Not revenue — separate from Client Funds Held.',
    formulaLines: ['SUM(', '  Client Funds forecasts', '  Due in selected period', '  · Not Cancelled', '  · Not Received', ')'],
    excludedList: ['Projected Revenue', 'Weighted Expected Income', 'Net Profit', 'Business Health', 'Received', 'Cancelled', 'Deleted', 'Archived'],
    insight: 'Client Funds forecasts represent expected pass-through receipts for client spending (e.g. ad budgets) — never company revenue. They are excluded from Projected Revenue, Weighted Expected Income, and Net Profit, and are distinct from Client Funds Held, which reflects cash already received.',
    navAction: { tab: 'forecast', typeFilter: 'client_funds' },
    periodFiltered: true,
    getData() {
      const dr = getFinanceDateRange();
      const s = getForecastedClientFundsForPeriod(dr);
      return {
        value: s.value,
        displayValue: s.display,
        breakdown: s.mixed ? Object.entries(s.byCurrency).map(([c, v]) => ({ label: c, value: fmtMoney(v, c), color: 'cyan' })) : undefined,
        rows: s.rows.map(f => ({ date: f.expected_date, txNum: '', desc: f.description || '', amount: Number(f.amount), positive: true, client: f.client_name || '', project: f.project_name || '', category: getCategoryName(f.category_id) || '', ref: '' })),
      };
    },
  },
  // Finance Completion Sprint — WP2. Live/all-time, not period-filtered, per
  // the Canonical Outstanding Model (WP1 Architecture Lock): Outstanding is a
  // standing contractual balance, not a period event. rowMode: 'paymentItems'
  // tells openKpiDrilldown() to render the Payment Item table (Part 2)
  // instead of the transaction-rows table every other KPI above uses — same
  // shared modal, one branch, not four separate implementations.
  outstandingRevenue: {
    label: 'Outstanding Revenue', icon: 'file-clock', color: 'amber',
    tooltip: 'Revenue still owed across active Payment Schedule Items. Live — not period-filtered.',
    formulaLines: ['SUM(', '  MAX(Revenue Amount − Collected Revenue, 0)', '  · Not Cancelled', ')'],
    excludedList: ['Cancelled Payment Items', 'Client Funds', 'Forecasted Amounts', 'Over-Collection (warning only)'],
    insight: 'Outstanding Revenue is the contractual Revenue balance not yet collected. It is derived fresh from Payment Schedule Items and their linked Finance Transactions every time — never cached or stored.',
    rowMode: 'paymentItems',
    periodFiltered: false,
    getData() {
      const itemRows = getOutstandingPaymentItemRows().filter((r) => Math.round(r.outstandingRevenue * 100) > 0);
      const agg = sumOutstandingByCurrency(itemRows, 'outstandingRevenue');
      return {
        value: agg.value, displayValue: agg.display,
        breakdown: agg.mixed ? Object.entries(agg.byCurrency).map(([c, v]) => ({ label: c, value: fmtMoney(v, c), color: 'amber' })) : undefined,
        itemRows,
      };
    },
  },
  outstandingClientFunds: {
    label: 'Outstanding Client Funds', icon: 'file-clock', color: 'cyan',
    tooltip: 'Client Funds still owed across active Payment Schedule Items. Live — not period-filtered.',
    formulaLines: ['SUM(', '  MAX(Client Funds Amount − Collected Client Funds, 0)', '  · Not Cancelled', ')'],
    excludedList: ['Cancelled Payment Items', 'Revenue', 'Forecasted Amounts', 'Over-Collection (warning only)'],
    insight: 'Outstanding Client Funds is the pass-through balance still owed — never company revenue, and separate from Forecasted Client Funds (a projection) and Client Funds Held (funds already received).',
    rowMode: 'paymentItems',
    periodFiltered: false,
    getData() {
      const itemRows = getOutstandingPaymentItemRows().filter((r) => Math.round(r.outstandingClientFunds * 100) > 0);
      const agg = sumOutstandingByCurrency(itemRows, 'outstandingClientFunds');
      return {
        value: agg.value, displayValue: agg.display,
        breakdown: agg.mixed ? Object.entries(agg.byCurrency).map(([c, v]) => ({ label: c, value: fmtMoney(v, c), color: 'cyan' })) : undefined,
        itemRows,
      };
    },
  },
  outstandingTotal: {
    label: 'Outstanding Total', icon: 'file-clock', color: 'orange',
    tooltip: 'Revenue + Client Funds still owed across active Payment Schedule Items. Live — not period-filtered.',
    formulaLines: ['Outstanding Revenue', '+ Outstanding Client Funds', '= Outstanding Total'],
    excludedList: ['Cancelled Payment Items', 'Forecasted Amounts', 'Over-Collection (warning only)'],
    insight: 'The full contractual balance still owed to the business across every active project — the single number an Admin should check to answer "how much are we still owed."',
    rowMode: 'paymentItems',
    periodFiltered: false,
    getData() {
      const itemRows = getOutstandingPaymentItemRows().filter((r) => Math.round(r.outstandingTotal * 100) > 0);
      const agg = sumOutstandingByCurrency(itemRows, 'outstandingTotal');
      return {
        value: agg.value, displayValue: agg.display,
        breakdown: agg.mixed ? Object.entries(agg.byCurrency).map(([c, v]) => ({ label: c, value: fmtMoney(v, c), color: 'orange' })) : undefined,
        itemRows,
      };
    },
  },
  overdueOutstanding: {
    label: 'Overdue Outstanding', icon: 'alert-triangle', color: 'rose',
    tooltip: 'Outstanding Total for Payment Schedule Items past their due date. Live — not period-filtered.',
    formulaLines: ['SUM(', '  Outstanding Total', '  · Due Date < Today', '  · Not Cancelled', ')'],
    excludedList: ['Not-Yet-Due Items', 'Cancelled Payment Items', 'Forecasted Amounts'],
    insight: 'These installments are both past due and still owe money — the highest-priority collections list. Overdue is owned by the Payment Schedule Item, not the Forecast.',
    rowMode: 'paymentItems',
    periodFiltered: false,
    getData() {
      const itemRows = getOutstandingPaymentItemRows().filter((r) => r.isOverdue);
      const agg = sumOutstandingByCurrency(itemRows, 'outstandingTotal');
      return {
        value: agg.value, displayValue: agg.display,
        breakdown: agg.mixed ? Object.entries(agg.byCurrency).map(([c, v]) => ({ label: c, value: fmtMoney(v, c), color: 'rose' })) : undefined,
        itemRows,
      };
    },
  },
};

// Part 2 (WP2) — the one Payment-Item-shaped table body every rowMode:
// 'paymentItems' KPI shares via openKpiDrilldown(). Visibility and
// navigation only: no Collect Payment action here (that stays on the
// Payment Schedule table where it already lives) and Action reuses the
// existing open-project-details wiring — no new details page.
const OUTSTANDING_ITEM_STATE_LABEL = { scheduled: 'Scheduled', partially_collected: 'Partially Collected', fully_collected: 'Collected' };
const OUTSTANDING_ITEM_STATE_CLASS = { scheduled: 'bg-blue-50 text-blue-600', partially_collected: 'bg-amber-50 text-amber-700', fully_collected: 'bg-emerald-50 text-emerald-600' };

function renderOutstandingItemRowsTable(itemRows) {
  if (!itemRows || itemRows.length === 0) {
    return `
    <div class="kpi-section">
      <div class="kpi-empty-state">
        <i data-lucide="inbox" class="w-8 h-8 text-gray-300 mx-auto mb-2 block"></i>
        <p class="text-[13px] text-gray-400 text-center">No outstanding payment schedule items.</p>
      </div>
    </div>`;
  }
  const totalOutstanding = itemRows.reduce((s, r) => s + r.outstandingTotal, 0);
  return `
    <div class="kpi-section">
      <p class="kpi-section-label">Outstanding Payment Items</p>
      <div class="kpi-table-wrap">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th">Company</th>
              <th class="kpi-th">Project</th>
              <th class="kpi-th">Payment Item</th>
              <th class="kpi-th whitespace-nowrap">Due Date</th>
              <th class="kpi-th text-right whitespace-nowrap">Revenue Outstanding</th>
              <th class="kpi-th text-right whitespace-nowrap">Client Funds Outstanding</th>
              <th class="kpi-th text-right whitespace-nowrap">Total Outstanding</th>
              <th class="kpi-th">Collection State</th>
              <th class="kpi-th">Overdue</th>
              <th class="kpi-th text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows.map(r => `
              <tr class="kpi-tr">
                <td class="kpi-td max-w-[110px] truncate">${escapeHtml(r.company)}</td>
                <td class="kpi-td max-w-[110px] truncate">${escapeHtml(r.projectName)}</td>
                <td class="kpi-td max-w-[130px] truncate">${escapeHtml(r.paymentLabel)}</td>
                <td class="kpi-td whitespace-nowrap ${r.isOverdue ? 'text-rose-600 font-medium' : 'text-gray-500'}">${fmtDate(r.dueDate)}</td>
                <td class="kpi-td text-right whitespace-nowrap">${fmtMoney(r.outstandingRevenue, r.currency)}</td>
                <td class="kpi-td text-right whitespace-nowrap">${fmtMoney(r.outstandingClientFunds, r.currency)}</td>
                <td class="kpi-td text-right font-semibold whitespace-nowrap">${fmtMoney(r.outstandingTotal, r.currency)}</td>
                <td class="kpi-td whitespace-nowrap">
                  <span class="badge ${OUTSTANDING_ITEM_STATE_CLASS[r.collectionState] || 'bg-gray-100 text-gray-500'}">${OUTSTANDING_ITEM_STATE_LABEL[r.collectionState] || r.collectionState}</span>
                  ${r.isOverCollected ? ' <span class="badge bg-rose-50 text-rose-600" title="Collected more than the scheduled amount">Over</span>' : ''}
                </td>
                <td class="kpi-td whitespace-nowrap">${r.isOverdue ? '<span class="badge bg-rose-50 text-rose-600">Overdue</span>' : '<span class="text-gray-300 text-xs">—</span>'}</td>
                <td class="kpi-td text-right whitespace-nowrap">
                  ${r.projectId != null ? `<button type="button" class="text-[11px] text-brand-600 hover:underline" data-action="open-project-details" data-id="${r.projectId}">Open Project</button>` : '<span class="text-[11px] text-gray-300">—</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-gray-400 text-right mt-1.5 pr-0.5">Total Outstanding: ${fmtMoney(totalOutstanding)} · ${itemRows.length} item${itemRows.length !== 1 ? 's' : ''}</p>
    </div>`;
}

function openKpiDrilldown(kpiKey) {
  const config = FINANCE_KPI_CONFIG[kpiKey];
  if (!config) return;

  const data  = config.getData();
  const color = data.color || config.color || 'gray';
  const rows  = data.rows || [];
  // WP2 — Outstanding KPIs are Payment-Item-shaped, not transaction-shaped
  // (they need Company/Project/Due Date/three Outstanding figures/Collection
  // State/an Action button — no single "amount" column). Rather than a
  // second drilldown implementation, this is the one existing shared
  // renderer with a mode parameter: rowMode picks which table body renders
  // below; the header/formula/excluded-list/insight/footer chrome is
  // identical for every KPI regardless of mode.
  const isItemMode = config.rowMode === 'paymentItems';
  const itemRows   = data.itemRows || [];

  const hasClient   = rows.some(r => r.client);
  const hasProject  = rows.some(r => r.project);
  const hasCategory = rows.some(r => r.category);
  const hasRef      = rows.some(r => r.ref);
  const totalAmt    = rows.reduce((s, r) => s + r.amount, 0);
  const recCount    = isItemMode ? itemRows.length : rows.length;
  const today       = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Formula rendered as readable checklist / math rows
  const formulaHtml = (config.formulaLines || []).map(line => {
    if (line.startsWith('  · ')) {
      return `<div class="kpi-fl-check"><span class="kpi-fl-check-icon text-${color}-500">✓</span><span>${escapeHtml(line.slice(4).trim())}</span></div>`;
    }
    if (line.startsWith('  ')) {
      return `<div class="kpi-fl-sub">${escapeHtml(line.trim())}</div>`;
    }
    if (line.startsWith('− ')) {
      return `<div class="kpi-fl-math"><span class="kpi-fl-op kpi-fl-op--minus">−</span><span>${escapeHtml(line.slice(2))}</span></div>`;
    }
    if (line.startsWith('+ ')) {
      return `<div class="kpi-fl-math"><span class="kpi-fl-op kpi-fl-op--plus">+</span><span>${escapeHtml(line.slice(2))}</span></div>`;
    }
    if (line.startsWith('= ')) {
      return `<div class="kpi-fl-result"><span class="kpi-fl-op">=</span><span>${escapeHtml(line.slice(2))}</span></div>`;
    }
    if (line === 'SUM(' || line === ')') {
      return `<div class="kpi-fl-struct">${escapeHtml(line)}</div>`;
    }
    return `<div class="kpi-fl-header">${escapeHtml(line)}</div>`;
  }).join('');

  // Records table with better empty state
  const rowsHtml = isItemMode ? renderOutstandingItemRowsTable(itemRows) : rows.length > 0 ? `
    <div class="kpi-section">
      <p class="kpi-section-label">Included Records</p>
      <div class="kpi-table-wrap">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th whitespace-nowrap">Date</th>
              <th class="kpi-th whitespace-nowrap">Tx #</th>
              ${hasClient   ? '<th class="kpi-th">Client</th>'    : ''}
              ${hasProject  ? '<th class="kpi-th">Project</th>'   : ''}
              ${hasCategory ? '<th class="kpi-th">Category</th>'  : ''}
              ${hasRef      ? '<th class="kpi-th font-mono">Ref</th>' : ''}
              <th class="kpi-th">Description</th>
              <th class="kpi-th text-right whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="kpi-tr">
                <td class="kpi-td text-gray-500 whitespace-nowrap">${fmtDate(r.date)}</td>
                <td class="kpi-td font-mono text-gray-400 text-[11px] whitespace-nowrap">${escapeHtml(r.txNum || '—')}</td>
                ${hasClient   ? `<td class="kpi-td max-w-[90px] truncate">${escapeHtml(r.client   || '—')}</td>` : ''}
                ${hasProject  ? `<td class="kpi-td max-w-[90px] truncate">${escapeHtml(r.project  || '—')}</td>` : ''}
                ${hasCategory ? `<td class="kpi-td max-w-[90px] truncate">${escapeHtml(r.category || '—')}</td>` : ''}
                ${hasRef      ? `<td class="kpi-td font-mono text-[11px] text-gray-400">${escapeHtml(r.ref || '—')}</td>` : ''}
                <td class="kpi-td max-w-[150px] truncate text-gray-600">${escapeHtml(r.desc || '—')}</td>
                <td class="kpi-td text-right font-semibold whitespace-nowrap ${r.positive ? 'text-emerald-600' : 'text-rose-600'}">${r.positive ? '+' : '−'}${fmtMoney(r.amount)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-gray-400 text-right mt-1.5 pr-0.5">Total: ${fmtMoney(totalAmt)} · ${recCount} record${recCount !== 1 ? 's' : ''}</p>
    </div>` : (!data.breakdown ? `
    <div class="kpi-section">
      <div class="kpi-empty-state">
        <i data-lucide="inbox" class="w-8 h-8 text-gray-300 mx-auto mb-2 block"></i>
        <p class="text-[13px] text-gray-400 text-center">No records match this KPI for the current period.</p>
      </div>
    </div>` : '');

  const breakdownHtml = data.breakdown && data.breakdown.length ? `
    <div class="kpi-section">
      <p class="kpi-section-label">Breakdown</p>
      <div class="kpi-breakdown-card">
        ${data.breakdown.map(b => `
          <div class="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <span class="text-[13px] text-gray-600">${escapeHtml(b.label)}</span>
            <span class="text-[13px] ${b.bold ? 'font-bold text-base' : 'font-semibold'} ${b.color ? `text-${b.color}-600` : 'text-gray-800'}">${escapeHtml(b.value)}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  // Navigation action button
  const nav = config.navAction;
  const navHtml = nav ? `
    <button class="kpi-nav-btn" data-action="kpi-nav-to" data-tab="${nav.tab}" data-type-filter="${nav.typeFilter || ''}">
      <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
      View Related Records
    </button>` : '';

  const dr = getFinanceDateRange();
  const periodBadgeHtml = config.periodFiltered
    ? `<span class="finance-period-chip finance-period-chip--${color}">${escapeHtml(dr.label)}</span>`
    : `<span class="finance-period-chip finance-period-chip--gray">Live — All Time</span>`;
  const liveNoteHtml = !config.periodFiltered
    ? `<div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[12px] text-gray-500 mb-1">
        <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 text-gray-400"></i>
        This KPI reflects live all-time data and is not affected by the selected period.
      </div>` : '';

  const body = $('#kpi-modal-body');
  if (!body) return;

  body.innerHTML = `
    <!-- HEADER -->
    <div class="kpi-modal-header bg-${color}-50 border-b border-${color}-100">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-white shadow-sm border border-${color}-100 flex items-center justify-center shrink-0">
          <i data-lucide="${config.icon}" class="w-7 h-7 text-${color}-500"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-bold text-gray-900 leading-tight">${escapeHtml(config.label)}</h3>
          <p class="text-[13px] text-gray-500 mt-1 leading-snug">${escapeHtml(config.tooltip)}</p>
          <div class="mt-2">${periodBadgeHtml}</div>
        </div>
        <button data-action="close-modal" class="w-8 h-8 rounded-lg hover:bg-white/70 flex items-center justify-center shrink-0 -mt-0.5 -mr-1">
          <i data-lucide="x" class="w-4 h-4 text-gray-500"></i>
        </button>
      </div>
    </div>

    <div class="px-6 pt-5 pb-3 space-y-5">

      ${liveNoteHtml}

      <!-- SECTION 1: Current Value -->
      <div class="kpi-section">
        <p class="kpi-section-label">Current Value</p>
        <div class="flex items-end justify-between gap-2">
          <p class="kpi-value-large text-${color}-600">${data.displayValue || fmtMoney(data.value)}</p>
          ${recCount > 0 ? `<span class="kpi-record-badge mb-1">${recCount} record${recCount !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>

      <!-- SECTION 2: 2-col — How Calculated (left) + What is Excluded (right) -->
      <div class="kpi-calc-grid">
        <div>
          <p class="kpi-section-label">How Calculated</p>
          <div class="kpi-formula-checklist border-l-4 border-${color}-200">
            ${formulaHtml}
          </div>
        </div>
        ${config.excludedList && config.excludedList.length ? `
        <div>
          <p class="kpi-section-label">What is Excluded</p>
          <div class="flex flex-wrap gap-1.5 mt-1">
            ${config.excludedList.map(ex => `<span class="kpi-excl-badge"><i data-lucide="x-circle" class="w-3 h-3 shrink-0"></i>${escapeHtml(ex)}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- SECTION 3: Breakdown or Records -->
      ${breakdownHtml}
      ${rowsHtml}

      <!-- SECTION 4: Executive Insight -->
      ${config.insight ? `
      <div class="kpi-insight-card border-l-4 border-${color}-300 bg-${color}-50">
        <i data-lucide="sparkles" class="w-4 h-4 text-${color}-500 shrink-0 mt-0.5"></i>
        <div>
          <p class="text-[11px] font-semibold text-${color}-700 uppercase tracking-wide mb-1">Executive Insight</p>
          <p class="text-[13px] text-gray-700 leading-relaxed">${escapeHtml(config.insight)}</p>
        </div>
      </div>` : ''}

    </div>

    <!-- FOOTER -->
    <div class="kpi-modal-footer">
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-gray-400">Last Calculated: ${today}</span>
        ${recCount > 0 ? `<span class="text-[11px] text-gray-400">Records Included: ${recCount}</span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        ${navHtml}
        <button data-action="close-modal" class="h-8 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Close</button>
      </div>
    </div>
  `;

  refreshIcons();
  openModal('finance-kpi-modal');
}

const FINANCE_WIDGET_CONFIG = {
  'weighted-income':     { title: 'Weighted Expected Income', icon: 'percent',       color: 'indigo',  tooltip: 'Probability-weighted sum of all active income forecasts.',                              periodFiltered: true  },
  'overdue-forecasts':   { title: 'Overdue Forecasts',        icon: 'alert-circle',  color: 'rose',    tooltip: 'Forecasts past their due date that have not been received or cancelled.',               periodFiltered: false },
  'cashflow-panel':      { title: 'Cash Flow — Period',       icon: 'activity',      color: 'blue',    tooltip: 'All real cash movements in the selected period across all accounts.',                   periodFiltered: true  },
  'revenue-vs-expenses': { title: 'Revenue vs Expenses',      icon: 'bar-chart-2',   color: 'emerald', tooltip: 'Comparison of service income vs operating expenses for the selected period.',          periodFiltered: true  },
  'expense-category':    { title: 'Expenses by Category',     icon: 'pie-chart',     color: 'rose',    tooltip: 'Breakdown of operating expenses by category for the selected period.',                  periodFiltered: true  },
  'project-revenue':     { title: 'Revenue by Project',       icon: 'briefcase',     color: 'violet',  tooltip: 'Revenue and expenses grouped by project for the selected period.',                     periodFiltered: true  },
  'account-balances':    { title: 'Account Balances',         icon: 'wallet',        color: 'blue',    tooltip: 'Current computed balance for each active account. Live — not period-filtered.',        periodFiltered: false },
  'executive-insights':  { title: 'Executive Insights',       icon: 'sparkles',      color: 'amber',   tooltip: 'Automated financial alerts and highlights based on the selected period.',              periodFiltered: true  },
  'recent-transactions': { title: 'Recent Transactions',      icon: 'clock',         color: 'gray',    tooltip: 'Transactions in the selected period across all accounts and types.',                   periodFiltered: true  },
  'business-health':     { title: 'Business Health',          icon: 'heart-pulse',   color: 'emerald', tooltip: 'Composite health score — profitability, cash runway, forecast accuracy.',              periodFiltered: true  },
};

function openWidgetDrilldown(widgetKey) {
  const cfg = FINANCE_WIDGET_CONFIG[widgetKey];
  if (!cfg) return;
  const body = $('#widget-modal-body');
  if (!body) return;

  const color = cfg.color || 'gray';
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const dr = getFinanceDateRange();
  const periodBadgeHtml = cfg.periodFiltered
    ? `<span class="finance-period-chip finance-period-chip--${color}">${escapeHtml(dr.label)}</span>`
    : `<span class="finance-period-chip finance-period-chip--gray">Live — All Time</span>`;

  let contentHtml = '';

  if (widgetKey === 'revenue-vs-expenses') {
    const ps = getFinancePeriodSummary(dr);
    const netColor = ps.netProfit >= 0 ? 'emerald' : 'rose';
    // Build monthly breakdown table for the period
    const months = [];
    const { startDate, endDate } = dr;
    const ms = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const me = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const d = new Date(ms);
    while (d <= me) {
      const y = d.getFullYear(), m = d.getMonth();
      const lbl = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthTx = state.financeTransactions.filter(t => {
        if (t.is_archived || t.is_deleted || t.status === 'cancelled') return false;
        const td = new Date(t.transaction_date + 'T00:00:00');
        return td.getFullYear() === y && td.getMonth() === m;
      });
      const revenue  = monthTx.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      months.push({ label: lbl, revenue, expenses, net: revenue - expenses });
      d.setMonth(d.getMonth() + 1);
    }
    contentHtml = `
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-emerald-50 rounded-xl p-3 text-center">
          <p class="text-[11px] text-emerald-600 uppercase tracking-wide font-semibold mb-1">Revenue</p>
          <p class="text-lg font-bold text-emerald-700">${fmtMoney(ps.realIncome)}</p>
        </div>
        <div class="bg-rose-50 rounded-xl p-3 text-center">
          <p class="text-[11px] text-rose-600 uppercase tracking-wide font-semibold mb-1">Expenses</p>
          <p class="text-lg font-bold text-rose-700">${fmtMoney(ps.realExpenses)}</p>
        </div>
        <div class="bg-${netColor}-50 rounded-xl p-3 text-center">
          <p class="text-[11px] text-${netColor}-600 uppercase tracking-wide font-semibold mb-1">Net Profit</p>
          <p class="text-lg font-bold text-${netColor}-700">${ps.netProfit >= 0 ? '+' : ''}${fmtMoney(ps.netProfit)}</p>
        </div>
      </div>
      <p class="kpi-section-label mb-2">Monthly Breakdown — ${escapeHtml(dr.label)}</p>
      <div class="kpi-table-wrap" style="max-height:260px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th">Month</th>
              <th class="kpi-th text-right">Revenue</th>
              <th class="kpi-th text-right">Expenses</th>
              <th class="kpi-th text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            ${months.length > 0 ? months.map(mo => {
              const c = mo.net >= 0 ? 'text-emerald-600' : 'text-rose-600';
              return `<tr class="kpi-tr">
                <td class="kpi-td font-medium">${escapeHtml(mo.label)}</td>
                <td class="kpi-td text-right text-emerald-600 font-semibold">${fmtMoney(mo.revenue)}</td>
                <td class="kpi-td text-right text-rose-600 font-semibold">${fmtMoney(mo.expenses)}</td>
                <td class="kpi-td text-right font-bold ${c}">${mo.net >= 0 ? '+' : ''}${fmtMoney(mo.net)}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="4" class="kpi-td text-center text-gray-400 py-4">No data for selected period.</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  else if (widgetKey === 'expense-category') {
    const catTotals = {};
    let totalExp = 0;
    state.financeTransactions
      .filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && t.transaction_type === 'expense' && isInDateRange(t.transaction_date, dr))
      .forEach(t => {
        const n = getCategoryName(t.category_id) || 'Uncategorized';
        catTotals[n] = (catTotals[n] || 0) + Number(t.amount);
        totalExp += Number(t.amount);
      });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    contentHtml = `
      <div class="flex items-center gap-3 mb-4">
        <div class="bg-rose-50 rounded-xl px-4 py-3 flex-1">
          <p class="text-[11px] text-rose-600 uppercase tracking-wide font-semibold mb-0.5">Total Expenses</p>
          <p class="text-xl font-bold text-rose-700">${fmtMoney(totalExp)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl px-4 py-3">
          <p class="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Categories</p>
          <p class="text-xl font-bold text-gray-800">${sorted.length}</p>
        </div>
      </div>
      ${top ? `
      <div class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
        <i data-lucide="trophy" class="w-4 h-4 text-amber-500 shrink-0"></i>
        <div>
          <p class="text-[11px] text-amber-600 font-semibold uppercase tracking-wide">Top Category</p>
          <p class="text-sm font-semibold text-amber-800">${escapeHtml(top[0])} — ${fmtMoney(top[1])} (${totalExp > 0 ? Math.round(top[1] / totalExp * 100) : 0}%)</p>
        </div>
      </div>` : ''}
      <p class="kpi-section-label mb-2">All Categories — ${escapeHtml(dr.label)}</p>
      ${sorted.length > 0 ? `
      <div class="kpi-table-wrap" style="max-height:260px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th" style="width:2rem">#</th>
              <th class="kpi-th">Category</th>
              <th class="kpi-th text-right">Amount</th>
              <th class="kpi-th text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([cat, amt], idx) => `
              <tr class="kpi-tr${idx === 0 ? ' bg-amber-50/50' : ''}">
                <td class="kpi-td text-gray-400 font-mono text-[11px]">${idx + 1}</td>
                <td class="kpi-td font-medium text-gray-700">${escapeHtml(cat)}</td>
                <td class="kpi-td text-right font-semibold text-rose-600">${fmtMoney(amt)}</td>
                <td class="kpi-td text-right text-gray-500">${totalExp > 0 ? Math.round(amt / totalExp * 100) : 0}%</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<p class="text-sm text-gray-400 text-center py-6">No expense data yet.</p>`}`;
  }

  else if (widgetKey === 'cashflow-panel') {
    const cf = getCashFlowForPeriod(dr);
    const mvColor = cf.netMovement >= 0 ? 'emerald' : 'rose';
    const periodTx = state.financeTransactions.filter(t => {
      if (t.is_archived || t.is_deleted || t.status === 'cancelled' || t.transaction_type === 'transfer') return false;
      return isInDateRange(t.transaction_date, dr);
    }).sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    contentHtml = `
      <div class="widget-cf-timeline mb-5">
        <div class="widget-cf-step">
          <div class="widget-cf-step-icon bg-gray-100"><i data-lucide="flag" class="w-4 h-4 text-gray-500"></i></div>
          <div><p class="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Opening Balance</p><p class="text-base font-bold text-gray-800">${fmtMoney(cf.openingBalance)}</p></div>
        </div>
        <div class="widget-cf-connector text-emerald-400">↓</div>
        <div class="widget-cf-step">
          <div class="widget-cf-step-icon bg-emerald-100"><i data-lucide="plus-circle" class="w-4 h-4 text-emerald-600"></i></div>
          <div><p class="text-[11px] text-emerald-600 uppercase tracking-wide font-semibold">Cash In</p><p class="text-base font-bold text-emerald-600">+${fmtMoney(cf.cashIn)}</p><p class="text-[11px] text-gray-400 mt-0.5">Revenue · Capital · Client funds</p></div>
        </div>
        <div class="widget-cf-connector text-rose-400">↓</div>
        <div class="widget-cf-step">
          <div class="widget-cf-step-icon bg-rose-100"><i data-lucide="minus-circle" class="w-4 h-4 text-rose-600"></i></div>
          <div><p class="text-[11px] text-rose-600 uppercase tracking-wide font-semibold">Cash Out</p><p class="text-base font-bold text-rose-600">−${fmtMoney(cf.cashOut)}</p><p class="text-[11px] text-gray-400 mt-0.5">Expenses · Client funds spent</p></div>
        </div>
        <div class="widget-cf-connector text-gray-300">↓</div>
        <div class="widget-cf-step">
          <div class="widget-cf-step-icon bg-${mvColor}-100"><i data-lucide="flag" class="w-4 h-4 text-${mvColor}-600"></i></div>
          <div>
            <p class="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Closing Balance</p>
            <p class="text-lg font-bold text-${mvColor}-600">${fmtMoney(cf.closingBalance)} <span class="text-sm font-normal text-gray-500">(${cf.netMovement >= 0 ? '+' : ''}${fmtMoney(cf.netMovement)} net)</span></p>
          </div>
        </div>
      </div>
      <p class="kpi-section-label mb-2">Transactions — ${escapeHtml(dr.label)}</p>
      ${periodTx.length > 0 ? `
      <div class="kpi-table-wrap" style="max-height:240px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th whitespace-nowrap">Date</th>
              <th class="kpi-th">Type</th>
              <th class="kpi-th">Description</th>
              <th class="kpi-th text-right whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${periodTx.map(t => {
              const isIn = getFinanceCashImpact(t.transaction_type) > 0;
              return `<tr class="kpi-tr">
                <td class="kpi-td text-gray-500 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
                <td class="kpi-td">${financeTypeBadge(t.transaction_type)}</td>
                <td class="kpi-td max-w-[200px] truncate text-gray-600">${escapeHtml(t.description || '—')}</td>
                <td class="kpi-td text-right font-semibold whitespace-nowrap ${isIn ? 'text-emerald-600' : 'text-rose-600'}">${isIn ? '+' : '−'}${fmtMoney(t.amount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<p class="text-sm text-gray-400 text-center py-6">No transactions in this period.</p>`}`;
  }

  // Sprint 4.2E: per-account in/out now reads getFinanceAccountImpact()
  // instead of the inline transfer if/if + income/expense arrays this branch
  // used before — same accumulation shape (two independent conditions for
  // transfer), so behavior is unchanged including the self-transfer edge
  // case. No date filtering here by design (this widget is live, not
  // period-filtered).
  else if (widgetKey === 'account-balances') {
    const accounts = state.financeAccounts.filter(a => a.is_active);
    const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
    const rows = accounts.map(a => {
      const openingBal = Number(a.opening_balance) || 0;
      let totalIn = 0, totalOut = 0;
      txs.forEach(t => {
        const amt = Number(t.amount) || 0;
        const impact = getFinanceAccountImpact(t, a.id);
        if (impact > 0) totalIn += amt;
        else if (impact < 0) totalOut += amt;
      });
      return { id: a.id, name: a.account_name, type: FINANCE_ACCT_TYPE_LABELS[a.account_type] || a.account_type, openingBal, totalIn, totalOut, currentBal: openingBal + totalIn - totalOut };
    });
    const grandTotal = rows.reduce((s, r) => s + r.currentBal, 0);
    contentHtml = `
      <div class="bg-blue-50 rounded-xl px-4 py-3 mb-4">
        <p class="text-[11px] text-blue-600 uppercase tracking-wide font-semibold mb-0.5">Total Balance — All Accounts</p>
        <p class="text-2xl font-bold text-blue-700">${fmtMoney(grandTotal)}</p>
      </div>
      <p class="kpi-section-label mb-2">Account Details</p>
      <div class="kpi-table-wrap" style="max-height:320px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th">Account</th>
              <th class="kpi-th">Type</th>
              <th class="kpi-th text-right whitespace-nowrap">Opening</th>
              <th class="kpi-th text-right whitespace-nowrap">Total In</th>
              <th class="kpi-th text-right whitespace-nowrap">Total Out</th>
              <th class="kpi-th text-right whitespace-nowrap">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="kpi-tr cursor-pointer" data-action="open-account-ledger" data-id="${r.id}">
                <td class="kpi-td font-medium text-gray-800">${escapeHtml(r.name)}</td>
                <td class="kpi-td text-gray-500 text-[12px]">${escapeHtml(r.type)}</td>
                <td class="kpi-td text-right text-gray-500">${fmtMoney(r.openingBal)}</td>
                <td class="kpi-td text-right text-emerald-600 font-semibold">+${fmtMoney(r.totalIn)}</td>
                <td class="kpi-td text-right text-rose-600 font-semibold">−${fmtMoney(r.totalOut)}</td>
                <td class="kpi-td text-right font-bold ${r.currentBal < 0 ? 'text-rose-600' : 'text-gray-900'}">${fmtMoney(r.currentBal)}</td>
              </tr>`).join('')}
            <tr class="kpi-tr bg-gray-50">
              <td class="kpi-td font-bold text-gray-900" colspan="5">Total</td>
              <td class="kpi-td text-right font-bold text-base ${grandTotal < 0 ? 'text-rose-600' : 'text-gray-900'}">${fmtMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  else if (widgetKey === 'weighted-income') {
    const active = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && !['cancelled', 'received'].includes(f.status) && f.forecast_type === 'expected_income' && isInDateRange(f.expected_date, dr));
    const weightedIncome = active.reduce((s, f) => s + Number(f.amount) * (Number(f.probability) || 100) / 100, 0);
    contentHtml = `
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-indigo-50 rounded-xl p-3">
          <p class="text-[11px] text-indigo-600 uppercase tracking-wide font-semibold mb-0.5">Weighted Income</p>
          <p class="text-xl font-bold text-indigo-700">${fmtMoney(weightedIncome)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Forecasts in Period</p>
          <p class="text-xl font-bold text-gray-800">${active.length}</p>
        </div>
      </div>
      <p class="kpi-section-label mb-2">Income Forecasts — ${escapeHtml(dr.label)}</p>
      ${active.length > 0 ? `
      <div class="kpi-table-wrap" style="max-height:280px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th whitespace-nowrap">Due Date</th>
              <th class="kpi-th">Description</th>
              <th class="kpi-th text-right">Amount</th>
              <th class="kpi-th text-right whitespace-nowrap">Probability</th>
              <th class="kpi-th text-right whitespace-nowrap">Weighted</th>
            </tr>
          </thead>
          <tbody>
            ${active.map(f => `
              <tr class="kpi-tr">
                <td class="kpi-td text-gray-500 whitespace-nowrap">${fmtDate(f.expected_date)}</td>
                <td class="kpi-td max-w-[180px] truncate text-gray-600">${escapeHtml(f.description || '—')}</td>
                <td class="kpi-td text-right font-semibold text-emerald-600">${fmtMoney(f.amount)}</td>
                <td class="kpi-td text-right text-gray-500">${Number(f.probability) || 0}%</td>
                <td class="kpi-td text-right font-semibold text-indigo-600">${fmtMoney(Number(f.amount) * Number(f.probability) / 100)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<p class="text-sm text-gray-400 text-center py-6">No active income forecasts.</p>`}`;
  }

  else if (widgetKey === 'overdue-forecasts') {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const overdue = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && f.status === 'expected' && new Date(f.expected_date) < now).sort((a, b) => new Date(a.expected_date) - new Date(b.expected_date));
    const overdueColor = overdue.length > 0 ? 'rose' : 'emerald';
    contentHtml = `
      <div class="bg-${overdueColor}-50 rounded-xl px-4 py-3 mb-4">
        <p class="text-[11px] text-${overdueColor}-600 uppercase tracking-wide font-semibold mb-0.5">Overdue Forecasts</p>
        <p class="text-2xl font-bold text-${overdueColor}-700">${overdue.length}</p>
      </div>
      ${overdue.length > 0 ? `
      <p class="kpi-section-label mb-2">Overdue Items</p>
      <div class="kpi-table-wrap" style="max-height:280px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th whitespace-nowrap">Due Date</th>
              <th class="kpi-th">Type</th>
              <th class="kpi-th">Description</th>
              <th class="kpi-th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${overdue.map(f => {
              const daysOver = Math.floor((Date.now() - new Date(f.expected_date).getTime()) / 86400000);
              // Sprint Project Commercial C3 fix: was a binary Income/Expense
              // check that mislabeled overdue Client Funds forecasts as
              // "Expense". Uses the same label map as the Forecast table's
              // Type badge instead of re-deriving a label here.
              const typeLabel = FINANCE_FORECAST_TYPE_LABELS[f.forecast_type] || f.forecast_type;
              const amtColor  = f.forecast_type === 'expected_income' ? 'text-emerald-600'
                : f.forecast_type === 'client_funds' ? 'text-amber-600' : 'text-rose-600';
              return `<tr class="kpi-tr">
                <td class="kpi-td whitespace-nowrap">
                  <span class="text-rose-600 font-medium">${fmtDate(f.expected_date)}</span>
                  <span class="block text-[10px] text-rose-400">${daysOver}d overdue</span>
                </td>
                <td class="kpi-td text-gray-500">${escapeHtml(typeLabel)}</td>
                <td class="kpi-td max-w-[200px] truncate text-gray-600">${escapeHtml(f.description || '—')}</td>
                <td class="kpi-td text-right font-semibold ${amtColor}">${fmtMoney(f.amount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="kpi-empty-state">
        <i data-lucide="check-circle" class="w-8 h-8 text-emerald-300 mx-auto mb-2 block"></i>
        <p class="text-[13px] text-gray-400 text-center">No overdue forecasts — everything is on track.</p>
      </div>`}`;
  }

  else if (widgetKey === 'executive-insights') {
    const sum = getFinanceSummary();
    const cf  = getCashFlowForPeriod(dr);
    const fc  = getFinanceForecastForPeriod(dr);
    const insights = getExecutiveInsights(sum, cf, fc, dr);
    const bgMap   = { warning: 'bg-amber-50',   info: 'bg-blue-50',   positive: 'bg-emerald-50' };
    const textMap = { warning: 'text-amber-800', info: 'text-blue-800', positive: 'text-emerald-800' };
    const iconMap = { warning: 'text-amber-500', info: 'text-blue-400', positive: 'text-emerald-500' };
    contentHtml = `
      <p class="text-[13px] text-gray-500 mb-4">Automated alerts and highlights calculated from your current transaction data.</p>
      ${insights.length > 0 ? `
      <div class="space-y-2.5">
        ${insights.map(ins => `
          <div class="flex items-start gap-3 ${bgMap[ins.type] || bgMap.info} rounded-xl px-4 py-3">
            <i data-lucide="${ins.icon}" class="w-5 h-5 ${iconMap[ins.type] || iconMap.info} mt-0.5 shrink-0"></i>
            <p class="text-sm ${textMap[ins.type] || textMap.info} leading-relaxed">${ins.html}</p>
          </div>`).join('')}
      </div>` : `
      <div class="kpi-empty-state">
        <i data-lucide="sparkles" class="w-8 h-8 text-gray-300 mx-auto mb-2 block"></i>
        <p class="text-[13px] text-gray-400 text-center">No insights available — add transactions to get started.</p>
      </div>`}`;
  }

  else if (widgetKey === 'recent-transactions') {
    const txs = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && isInDateRange(t.transaction_date, dr)).slice(0, 20);
    contentHtml = `
      <p class="text-[13px] text-gray-500 mb-4">Up to 20 transactions in <strong>${escapeHtml(dr.label)}</strong> across all accounts.</p>
      ${txs.length > 0 ? `
      <div class="kpi-table-wrap" style="max-height:380px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th whitespace-nowrap">Date</th>
              <th class="kpi-th">Type</th>
              <th class="kpi-th">Account</th>
              <th class="kpi-th">Description</th>
              <th class="kpi-th text-right whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${txs.map(t => {
              const isTransfer = t.transaction_type === 'transfer';
              const acct = isTransfer ? `${getAccountName(t.from_account_id)} → ${getAccountName(t.to_account_id)}` : getAccountName(t.account_id);
              return `<tr class="kpi-tr">
                <td class="kpi-td text-gray-500 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
                <td class="kpi-td">${financeTypeBadge(t.transaction_type)}</td>
                <td class="kpi-td text-gray-500 max-w-[100px] truncate">${escapeHtml(acct)}</td>
                <td class="kpi-td max-w-[200px] truncate text-gray-600">${escapeHtml(t.description || '—')}</td>
                <td class="kpi-td text-right font-semibold whitespace-nowrap ${FINANCE_TX_TYPE_COLORS[t.transaction_type] || ''}">${fmtMoney(t.amount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<p class="text-sm text-gray-400 text-center py-6">No transactions yet.</p>`}`;
  }

  else if (widgetKey === 'project-revenue') {
    const sorted = getProjectPnL(dr).filter(p => p.revenue > 0 || p.expenses > 0);
    contentHtml = `
      <p class="text-[13px] text-gray-500 mb-4">Revenue and expenses grouped by project for <strong>${escapeHtml(dr.label)}</strong>.</p>
      ${sorted.length > 0 ? `
      <div class="kpi-table-wrap" style="max-height:340px">
        <table class="w-full text-left">
          <thead class="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th class="kpi-th">Project</th>
              <th class="kpi-th text-right">Revenue</th>
              <th class="kpi-th text-right">Expenses</th>
              <th class="kpi-th text-right">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(p => {
              const net = p.revenue - p.expenses;
              const nc = net >= 0 ? 'text-emerald-700' : 'text-rose-700';
              return `<tr class="kpi-tr">
                <td class="kpi-td font-medium text-gray-800 max-w-[200px] truncate">${escapeHtml(p.projectName)}</td>
                <td class="kpi-td text-right font-semibold text-emerald-600">${fmtMoney(p.revenue)}</td>
                <td class="kpi-td text-right font-semibold text-rose-600">${fmtMoney(p.expenses)}</td>
                <td class="kpi-td text-right font-bold ${nc}">${net >= 0 ? '+' : ''}${fmtMoney(net)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<p class="text-sm text-gray-400 text-center py-6">No project revenue data yet.</p>`}`;
  }

  else if (widgetKey === 'business-health') {
    const m = getBusinessHealthMetrics();
    const bhc = m.statusColor;
    const summaryLines = getBusinessHealthSummaryLines(m);
    const breakEvenPctModal = m.breakEven > 0 ? Math.min(100, Math.round((m.currentRevenue / m.breakEven) * 100)) : 0;
    const safePctModal      = m.revenueProgressPct;
    const stretchPctModal   = m.stretchTarget > 0 ? Math.min(100, Math.round((m.currentRevenue / m.stretchTarget) * 100)) : 0;

    contentHtml = `
      <p class="kpi-section-label">Executive Summary</p>
      <div class="bg-gray-50 rounded-xl p-4 mb-5">
        ${summaryLines.map((line, i) => `<p class="text-[13px] text-gray-600 leading-relaxed${i < summaryLines.length - 1 ? ' mb-2.5' : ''}">${line}</p>`).join('')}
      </div>

      <p class="kpi-section-label">Health Score</p>
      <div class="flex items-center gap-4 mb-5">
        ${renderHealthRing(m.score, bhc, 84)}
        <div>
          <span class="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-${bhc}-50 text-${bhc}-700 border border-${bhc}-200 mb-1">${m.status}</span>
          <p class="text-[12px] text-gray-500">Composite score for ${escapeHtml(m.dr.label)}.</p>
        </div>
      </div>

      <p class="kpi-section-label">Revenue Progress</p>
      <div class="bg-gray-50 rounded-xl p-4 mb-5">
        <div class="space-y-4">
          ${renderBusinessHealthRevenueRow('Break-even', m.currentRevenue, m.breakEven, breakEvenPctModal, 'gray')}
          ${renderBusinessHealthRevenueRow('Safe Target', m.currentRevenue, m.safeTarget, safePctModal, 'blue')}
          ${renderBusinessHealthRevenueRow('Stretch Target', m.currentRevenue, m.stretchTarget, stretchPctModal, 'emerald')}
        </div>
      </div>

      <p class="kpi-section-label">Cash Runway</p>
      <div class="bg-gray-50 rounded-xl p-4 mb-5">
        <p class="text-2xl font-bold text-gray-800 mb-2">${fmtRunway(m.runwayMonths)}</p>
        ${renderRunwayMeter(m.runwayMonths, m.config)}
        <div class="mt-4 text-[12px] text-gray-600 space-y-1">
          <div class="flex justify-between"><span>Cash in Accounts</span><span class="font-semibold">${fmtMoney(m.cashInAccounts)}</span></div>
          <div class="flex justify-between"><span>÷ Burn Rate (Fixed Cost)</span><span class="font-semibold">${fmtMoney(m.burnRate)}</span></div>
          <div class="flex justify-between border-t border-gray-200 pt-1"><span>= Cash Runway</span><span class="font-bold">${fmtRunway(m.runwayMonths)}</span></div>
        </div>
      </div>

      <p class="kpi-section-label">Recommended Actions</p>
      <div class="space-y-2 mb-5">
        ${m.recommendations.map(r => {
          const st = BUSINESS_HEALTH_PRIORITY_STYLES[r.priority];
          return `
          <div class="flex items-start gap-2.5 ${st.bg} border-l-4 ${st.border} rounded-lg px-3 py-2.5">
            <i data-lucide="${r.icon}" class="w-3.5 h-3.5 ${st.icon} mt-0.5 shrink-0"></i>
            <div class="min-w-0">
              <span class="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ${st.badge} mb-1">${r.priority}</span>
              <p class="text-[12px] ${st.text}">${escapeHtml(r.text)}</p>
            </div>
          </div>`;
        }).join('')}
      </div>

      <p class="kpi-section-label">Target Calculation</p>
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-gray-50 rounded-xl p-3"><p class="text-[11px] text-gray-500 mb-0.5">Break-Even</p><p class="text-sm font-bold text-gray-800">${fmtMoney(m.breakEven)}</p></div>
        <div class="bg-blue-50 rounded-xl p-3"><p class="text-[11px] text-blue-600 mb-0.5">Safe Target ×${m.config.targetMultipliers.safe}</p><p class="text-sm font-bold text-blue-700">${fmtMoney(m.safeTarget)}</p></div>
        <div class="bg-emerald-50 rounded-xl p-3"><p class="text-[11px] text-emerald-600 mb-0.5">Stretch Target ×${m.config.targetMultipliers.stretch}</p><p class="text-sm font-bold text-emerald-700">${fmtMoney(m.stretchTarget)}</p></div>
      </div>

      <p class="kpi-section-label">Score Formula</p>
      <div class="mb-5">
        ${renderBusinessHealthScoreChecklist(m.scoreBreakdown)}
        <div class="flex items-center justify-between px-3 py-2.5 mt-2 bg-gray-100 rounded-xl">
          <span class="text-[13px] font-bold text-gray-800">Total Score</span>
          <span class="text-[13px] font-bold text-gray-900">${m.score} / 100</span>
        </div>
      </div>

      <p class="kpi-section-label">Fixed Cost Breakdown</p>
      <div class="bg-gray-50 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
        <span class="text-[12px] text-gray-500 uppercase font-semibold tracking-wide">Monthly Fixed Cost</span>
        <span class="text-xl font-extrabold text-gray-900">${fmtMoney(m.fixedCostTotal)}</span>
      </div>
      <div class="kpi-table-wrap mb-5" style="max-height:200px">
        <table class="w-full text-left">
          <tbody>
            ${getFinanceFixedCosts().map(c => `<tr class="kpi-tr"><td class="kpi-td">${escapeHtml(c.label)}</td><td class="kpi-td text-right font-semibold">${fmtMoney(c.amount)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <p class="kpi-section-label">Related Metrics</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Current Period Revenue</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.currentRevenue)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Net Profit</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.netProfit)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Forecasted Revenue</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.forecastedRevenue)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Projected Revenue</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.projectedRevenue)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Target Gap</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.projectedGap)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Client Funds Held</p><p class="text-base font-bold text-gray-800">${fmtMoney(m.clientFundsHeld)}</p></div>
        <div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-1">Days Remaining in Period</p><p class="text-base font-bold text-gray-800">${m.daysRemaining === null ? '—' : m.daysRemaining}</p></div>
      </div>
      ${!m.isMonthlyPeriod ? `
      <div class="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mt-4">
        <i data-lucide="calendar-clock" class="w-4 h-4 text-amber-500 mt-0.5 shrink-0"></i>
        <div>
          <p class="text-[12px] font-semibold text-amber-800">Monthly Benchmark</p>
          <p class="text-[12px] text-amber-700">These targets represent one operating month even when viewing a longer period.</p>
        </div>
      </div>` : ''}
    `;
  }

  // Navigation button
  const navMap = {
    'revenue-vs-expenses': { tab: 'transactions', typeFilter: 'all',                  label: 'Open Transactions' },
    'expense-category':    { tab: 'transactions', typeFilter: 'expense',               label: 'Open Expenses' },
    'cashflow-panel':      { tab: 'transactions', typeFilter: 'all',                  label: 'Open Transactions' },
    'account-balances':    { tab: 'accounts',     typeFilter: '',                      label: 'Open Accounts' },
    'weighted-income':     { tab: 'forecast',     typeFilter: '',                      label: 'Open Forecasts' },
    'overdue-forecasts':   { tab: 'forecast',     typeFilter: '',                      label: 'Open Forecasts' },
    'recent-transactions': { tab: 'transactions', typeFilter: 'all',                  label: 'Open Transactions' },
    'project-revenue':     { tab: 'transactions', typeFilter: 'all',                  label: 'Open Transactions' },
  };
  const nav = navMap[widgetKey];
  const navHtml = nav ? `
    <button class="kpi-nav-btn" data-action="kpi-nav-to" data-tab="${nav.tab}" data-type-filter="${nav.typeFilter || ''}">
      <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
      ${escapeHtml(nav.label)}
    </button>` : '';

  body.innerHTML = `
    <div class="kpi-modal-header bg-${color}-50 border-b border-${color}-100">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-white shadow-sm border border-${color}-100 flex items-center justify-center shrink-0">
          <i data-lucide="${cfg.icon}" class="w-7 h-7 text-${color}-500"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-bold text-gray-900 leading-tight">${escapeHtml(cfg.title)}</h3>
          <p class="text-[13px] text-gray-500 mt-1 leading-snug">${escapeHtml(cfg.tooltip)}</p>
          <div class="mt-2">${periodBadgeHtml}</div>
        </div>
        <button data-action="close-modal" class="w-8 h-8 rounded-lg hover:bg-white/70 flex items-center justify-center shrink-0 -mt-0.5 -mr-1">
          <i data-lucide="x" class="w-4 h-4 text-gray-500"></i>
        </button>
      </div>
    </div>
    <div class="px-6 pt-5 pb-3">
      ${contentHtml}
    </div>
    <div class="kpi-modal-footer">
      <span class="text-[11px] text-gray-400">Last Calculated: ${today}</span>
      <div class="flex items-center gap-2">
        ${navHtml}
        <button data-action="close-modal" class="h-8 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Close</button>
      </div>
    </div>
  `;

  refreshIcons();
  openModal('finance-widget-modal');
}

function renderFinanceDashboard() {
  const engine     = buildFinanceEngine();
  const dr         = engine.dateRange;
  const summary    = engine.summary;
  const cashFlow   = engine.cashFlow;

  // === 0. Sync global period bar ===
  renderFinanceGlobalPeriodBar();

  // === 1. Top stat cards (14) ===
  const statsEl = $('#finance-dashboard-stats');
  if (statsEl) {
    const netColor = summary.netProfit >= 0 ? 'emerald' : 'rose';
    const cfColor  = cashFlow.netMovement >= 0 ? 'emerald' : 'rose';
    const periodChip = `<span class="kpi-period-label">${escapeHtml(dr.label)}</span>`;
    const liveChip   = `<span class="kpi-period-label kpi-period-label--live">Live</span>`;
    const overdueColor = summary.overdueOutstanding.value > 0 ? 'rose' : 'gray';
    const cards = [
      { kpiKey: 'totalCapital',      label: 'Total Capital',       value: fmtMoney(summary.totalCapital),                                             icon: 'landmark',        color: 'indigo',  period: liveChip   },
      { kpiKey: 'realRevenue',       label: 'Real Revenue',        value: fmtMoney(summary.realRevenue),                                              icon: 'trending-up',     color: 'emerald', period: periodChip },
      { kpiKey: 'realExpenses',      label: 'Real Expenses',       value: fmtMoney(summary.realExpenses),                                             icon: 'trending-down',   color: 'rose',    period: periodChip },
      { kpiKey: 'netProfit',         label: 'Net Profit',          value: fmtMoney(summary.netProfit),                                                icon: 'bar-chart-2',     color: netColor,  period: periodChip },
      { kpiKey: 'cashInAccounts',    label: 'Cash in Accounts',    value: fmtMoney(summary.cashInAccounts),                                           icon: 'wallet',          color: 'blue',    period: liveChip   },
      { kpiKey: 'clientFundsHeld',   label: 'Client Funds Held',   value: fmtMoney(summary.clientFundsHeld),                                          icon: 'arrow-right-left',color: 'amber',   period: liveChip   },
      { kpiKey: 'forecastIncoming',  label: 'Forecast Incoming',   value: fmtMoney(summary.forecastIncoming),                                         icon: 'calendar-check',  color: 'teal',    period: periodChip },
      { kpiKey: 'forecastOutgoing',  label: 'Forecast Outgoing',   value: fmtMoney(summary.forecastOutgoing),                                         icon: 'calendar-x',      color: 'orange',  period: periodChip },
      { kpiKey: 'cashFlowThisMonth', label: 'Cash Flow — Period',  value: `${cashFlow.netMovement >= 0 ? '+' : ''}${fmtMoney(cashFlow.netMovement)}`, icon: 'activity',        color: cfColor,   period: periodChip },
      { kpiKey: 'forecastedClientFunds', label: 'Forecasted Client Funds', value: summary.forecastedClientFunds.display,                              icon: 'calendar-clock',  color: 'cyan',    period: periodChip },
      { kpiKey: 'outstandingRevenue',     label: 'Outstanding Revenue',     value: summary.outstandingRevenue.display,     icon: 'file-clock',    color: 'amber',      period: liveChip },
      { kpiKey: 'outstandingClientFunds', label: 'Outstanding Client Funds', value: summary.outstandingClientFunds.display, icon: 'file-clock',    color: 'cyan',       period: liveChip },
      { kpiKey: 'outstandingTotal',       label: 'Outstanding Total',        value: summary.outstandingTotal.display,       icon: 'file-clock',    color: 'orange',     period: liveChip },
      { kpiKey: 'overdueOutstanding',     label: 'Overdue Outstanding',      value: summary.overdueOutstanding.display,     icon: 'alert-triangle', color: overdueColor, period: liveChip },
    ];
    statsEl.innerHTML = cards.map(c => {
      const cfg = FINANCE_KPI_CONFIG[c.kpiKey];
      const tipDesc = cfg ? cfg.tooltip.replace(/"/g, '&quot;') : '';
      return `
      <div class="stat-card kpi-card" data-action="open-kpi-drilldown" data-kpi-key="${c.kpiKey}">
        <div class="kpi-card-top">
          <div class="kpi-card-icon-wrap bg-${c.color}-50">
            <i data-lucide="${c.icon}" class="w-4 h-4 text-${c.color}-500"></i>
          </div>
          <div class="kpi-card-top-right">
            <span class="kpi-info-circle" data-tooltip-title="${escapeHtml(c.label)}" data-tooltip-desc="${tipDesc}">
              <i data-lucide="info" class="w-3 h-3"></i>
            </span>
            <span class="kpi-trend-placeholder" aria-hidden="true"></span>
          </div>
        </div>
        <p class="kpi-card-label">${escapeHtml(c.label)}</p>
        <p class="kpi-card-value text-${c.color}-600">${c.value}</p>
        <div class="kpi-card-footer">${c.period}</div>
      </div>`;
    }).join('');
  }

  // === 2. Forecast pipeline cards (2) ===
  const forecastEl = $('#finance-forecast-cards');
  if (forecastEl) {
    const fcCards = [
      { label: 'Weighted Expected Income', value: fmtMoney(summary.weightedExpectedIncome), icon: 'percent',      color: 'indigo', widget: 'weighted-income', tooltip: `Probability-weighted sum of income forecasts due in ${dr.label}.` },
      { label: 'Overdue Forecasts',        value: String(summary.overdueForecasts),          icon: 'alert-circle', color: summary.overdueForecasts > 0 ? 'rose' : 'gray', widget: 'overdue-forecasts', tooltip: 'Forecasts past their due date that have not been received or cancelled.' },
    ];
    forecastEl.innerHTML = fcCards.map(c => `
      <div class="stat-card cursor-pointer" data-action="open-widget-drilldown" data-widget="${c.widget}">
        <div class="flex items-start justify-between gap-2">
          <div class="stat-card-content flex-1 min-w-0">
            <p class="stat-label">${c.label}</p>
            <p class="stat-value text-${c.color}-600">${c.value}</p>
          </div>
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <span class="widget-info-icon" data-tooltip-title="${escapeHtml(c.label)}" data-tooltip-desc="${escapeHtml(c.tooltip)}">
              <i data-lucide="info" class="w-4 h-4"></i>
            </span>
            <div class="stat-card-icon bg-${c.color}-50">
              <i data-lucide="${c.icon}" class="w-5 h-5 text-${c.color}-500"></i>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  // === 3. Trash counters ===
  const txInTrash = state.financeTransactions.filter(t => t.is_deleted).length;
  const fcInTrash = state.financeForecasts.filter(f => f.is_deleted).length;
  const trashEl = $('#finance-trash-summary');
  if (trashEl) {
    if (txInTrash === 0 && fcInTrash === 0) {
      trashEl.innerHTML = '';
    } else {
      const parts = [];
      if (txInTrash > 0) parts.push(`<strong>${txInTrash}</strong> transaction${txInTrash !== 1 ? 's' : ''}`);
      if (fcInTrash > 0) parts.push(`<strong>${fcInTrash}</strong> forecast${fcInTrash !== 1 ? 's' : ''}`);
      trashEl.innerHTML = `<div class="inline-flex items-center gap-2 text-xs text-gray-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5"><i data-lucide="trash" class="w-3.5 h-3.5 text-rose-400 shrink-0"></i> Trash: ${parts.join(' · ')} — switch to <em>Trash</em> view in Transactions or Forecast tabs to manage.</div>`;
    }
  }

  // === 4. Cash Flow Panel ===
  const cfPanelEl = $('#finance-cashflow-panel');
  if (cfPanelEl) {
    const mvColor = cashFlow.netMovement >= 0 ? 'emerald' : 'rose';
    cfPanelEl.innerHTML = `
      <div class="shadow-card rounded-2xl bg-white p-5 cursor-pointer" data-action="open-widget-drilldown" data-widget="cashflow-panel">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-800">Cash Flow — ${escapeHtml(dr.label)}</h3>
          </div>
          <span class="widget-info-icon" data-tooltip-title="Cash Flow — Period" data-tooltip-desc="All real cash movements in ${escapeHtml(dr.label)} across all accounts.">
            <i data-lucide="info" class="w-4 h-4"></i>
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
          <div class="bg-gray-50 rounded-xl p-3">
            <p class="text-xs text-gray-400 mb-1">Opening Balance</p>
            <p class="text-base font-semibold text-gray-800">${fmtMoney(cashFlow.openingBalance)}</p>
          </div>
          <div class="hidden sm:flex items-center justify-center text-2xl font-light text-emerald-300">+</div>
          <div class="bg-emerald-50 rounded-xl p-3">
            <p class="text-xs text-gray-400 mb-1">Cash In</p>
            <p class="text-base font-semibold text-emerald-600">+${fmtMoney(cashFlow.cashIn)}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">Revenue · Capital · Client funds</p>
          </div>
          <div class="hidden sm:flex items-center justify-center text-2xl font-light text-rose-300">−</div>
          <div class="bg-rose-50 rounded-xl p-3">
            <p class="text-xs text-gray-400 mb-1">Cash Out</p>
            <p class="text-base font-semibold text-rose-600">−${fmtMoney(cashFlow.cashOut)}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">Expenses · Client funds spent</p>
          </div>
          <div class="col-span-2 sm:col-span-5 mt-1 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 mb-0.5">Closing Balance</p>
              <p class="text-xl font-bold text-gray-900">${fmtMoney(cashFlow.closingBalance)}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400 mb-0.5">Net Movement</p>
              <p class="text-base font-semibold text-${mvColor}-600">${cashFlow.netMovement >= 0 ? '+' : ''}${fmtMoney(cashFlow.netMovement)}</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  // === 5. Account Balances ===
  const balancesEl = $('#finance-account-balances');
  if (balancesEl) {
    const accounts = state.financeAccounts.filter(a => a.is_active);
    balancesEl.innerHTML = accounts.length
      ? accounts.map(a => {
          const bal = getAccountBalance(a.id);
          return `<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors" data-action="open-account-ledger" data-id="${a.id}">
            <div>
              <p class="text-sm font-medium text-gray-800">${escapeHtml(a.account_name)}</p>
              <p class="text-xs text-gray-400">${escapeHtml(FINANCE_ACCT_TYPE_LABELS[a.account_type] || a.account_type)}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold ${bal < 0 ? 'text-rose-600' : 'text-gray-800'}">${fmtMoney(bal)}</span>
              <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-300"></i>
            </div>
          </div>`;
        }).join('')
      : '<p class="text-sm text-gray-400 py-3">No accounts.</p>';
  }

  // === 6. Executive Insights ===
  const insightsEl = $('#finance-insights-panel');
  if (insightsEl) {
    // getExecutiveInsights() still expects the legacy getFinanceSummary()/
    // getFinanceForecastForPeriod() field names — adapt from the already-built
    // engine instead of recalculating those getters a second time.
    const insights = getExecutiveInsights(
      { totalAccountBalances: summary.cashInAccounts, passThroughHeld: summary.clientFundsHeld },
      cashFlow,
      { expectedNetCashflow: summary.forecastIncoming - summary.forecastOutgoing },
      dr
    );
    if (!insights.length) {
      insightsEl.innerHTML = '';
    } else {
      const bgMap   = { warning: 'bg-amber-50',   info: 'bg-blue-50',   positive: 'bg-emerald-50' };
      const textMap = { warning: 'text-amber-800', info: 'text-blue-800', positive: 'text-emerald-800' };
      const iconMap = { warning: 'text-amber-500', info: 'text-blue-400', positive: 'text-emerald-500' };
      insightsEl.innerHTML = `
        <div class="shadow-card rounded-2xl bg-white p-5 cursor-pointer" data-action="open-widget-drilldown" data-widget="executive-insights">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-800">Executive Insights</h3>
            <span class="widget-info-icon" data-tooltip-title="Executive Insights" data-tooltip-desc="Automated financial alerts and highlights based on current data.">
              <i data-lucide="info" class="w-4 h-4"></i>
            </span>
          </div>
          <div class="space-y-2">
            ${insights.map(ins => `
              <div class="flex items-start gap-3 ${bgMap[ins.type] || bgMap.info} rounded-lg px-3 py-2.5">
                <i data-lucide="${ins.icon}" class="w-4 h-4 ${iconMap[ins.type] || iconMap.info} mt-0.5 shrink-0"></i>
                <p class="text-sm ${textMap[ins.type] || textMap.info}">${ins.html}</p>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  // === 6.5. Business Health ===
  renderBusinessHealthWidget(engine.businessHealth);

  // === 7. Recent Transactions ===
  const recentEl = $('#finance-recent-transactions');
  if (recentEl) {
    const recent = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && isInDateRange(t.transaction_date, dr)).slice(0, 8);
    recentEl.innerHTML = recent.length
      ? recent.map(t => {
          const isTransfer = t.transaction_type === 'transfer';
          const acct = isTransfer
            ? `${getAccountName(t.from_account_id)} → ${getAccountName(t.to_account_id)}`
            : getAccountName(t.account_id);
          return `<tr class="hover:bg-gray-50">
            <td class="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
            <td class="px-4 py-2 text-sm">${financeTypeBadge(t.transaction_type)}</td>
            <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">${escapeHtml(acct)}</td>
            <td class="px-4 py-2 text-sm text-gray-600">${escapeHtml(t.description || '—')}</td>
            <td class="px-4 py-2 text-sm font-medium text-right whitespace-nowrap ${FINANCE_TX_TYPE_COLORS[t.transaction_type] || ''}">${fmtMoney(t.amount)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-400 text-sm">No transactions yet.</td></tr>';
  }

  renderFinanceCharts(summary);
  refreshIcons();
}

function renderFinanceTransactions() {
  const f = state.filters.financeTransactions;

  // Populate account filter
  const acctFilterEl = $('#finance-tx-account-filter');
  if (acctFilterEl) {
    const prev = acctFilterEl.value;
    acctFilterEl.innerHTML = '<option value="">All Accounts</option>' +
      state.financeAccounts.filter(a => a.is_active)
        .map(a => `<option value="${a.id}">${escapeHtml(a.account_name)}</option>`).join('');
    if (prev) acctFilterEl.value = prev;
  }

  let txs = state.financeTransactions;

  if (f.archived === 'active')   txs = txs.filter(t => !t.is_archived && !t.is_deleted);
  if (f.archived === 'archived') txs = txs.filter(t =>  t.is_archived && !t.is_deleted);
  if (f.archived === 'deleted')  txs = txs.filter(t =>  t.is_deleted);
  if (f.type && f.type !== 'all') txs = txs.filter(t => t.transaction_type === f.type);
  if (f.account) {
    const aid = Number(f.account);
    txs = txs.filter(t => Number(t.account_id) === aid || Number(t.from_account_id) === aid || Number(t.to_account_id) === aid);
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    txs = txs.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.reference   || '').toLowerCase().includes(q) ||
      getAccountName(t.account_id).toLowerCase().includes(q) ||
      getCategoryName(t.category_id).toLowerCase().includes(q)
    );
  }

  const tbody = $('#finance-tx-table-body');
  const empty  = $('#finance-tx-empty');
  if (!txs.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (tbody) {
    tbody.innerHTML = txs.map(t => {
      const isTransfer = t.transaction_type === 'transfer';
      const acct = isTransfer
        ? `${getAccountName(t.from_account_id)} → ${getAccountName(t.to_account_id)}`
        : getAccountName(t.account_id);
      const projectOrClient = t.project_name || getCrmClientName(t.client_id) || '—';
      return `<tr class="hover:bg-gray-50 ${t.is_deleted ? 'opacity-50 bg-rose-50' : (t.is_archived || t.status === 'cancelled') ? 'opacity-60' : ''}">
        <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">${t.transaction_number ? `<span class="font-mono text-xs text-gray-400">${escapeHtml(t.transaction_number)}</span>` : ''}</td>
        <td class="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
        <td class="px-4 py-2 text-sm">${financeTypeBadge(t.transaction_type)}</td>
        <td class="px-4 py-2 text-sm">${txStatusBadge(t.status)}</td>
        <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">${escapeHtml(acct)}</td>
        <td class="px-4 py-2 text-sm text-gray-500 max-w-[120px] truncate">${escapeHtml(projectOrClient)}</td>
        <td class="px-4 py-2 text-sm text-gray-400">${escapeHtml(getCategoryName(t.category_id))}</td>
        <td class="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">${escapeHtml(t.description || '—')}</td>
        <td class="px-4 py-2 text-sm font-medium text-right whitespace-nowrap ${FINANCE_TX_TYPE_COLORS[t.transaction_type] || ''}">${fmtMoney(t.amount)}</td>
        <td class="px-4 py-2 text-right whitespace-nowrap">
          ${t.is_deleted ? `
            <button class="icon-btn text-emerald-600" data-action="restore-finance-transaction" data-id="${t.id}" title="Restore"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-700" data-action="permanent-delete-finance-transaction" data-id="${t.id}" title="Delete Permanently"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          ` : !t.is_archived ? `
            <button class="icon-btn" data-action="edit-finance-transaction" data-id="${t.id}" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="icon-btn text-amber-500" data-action="archive-finance-transaction" data-id="${t.id}" title="Archive"><i data-lucide="archive" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-500" data-action="soft-delete-finance-transaction" data-id="${t.id}" title="Move to Trash"><i data-lucide="trash" class="w-4 h-4"></i></button>
          ` : `
            <button class="icon-btn text-emerald-600" data-action="restore-finance-transaction" data-id="${t.id}" title="Restore"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-500" data-action="soft-delete-finance-transaction" data-id="${t.id}" title="Move to Trash"><i data-lucide="trash" class="w-4 h-4"></i></button>
          `}
        </td>
      </tr>`;
    }).join('');
  }
  refreshIcons();
}

function renderFinanceAccounts() {
  const tbody = $('#finance-accounts-table-body');
  const empty  = $('#finance-accounts-empty');
  const accounts = state.financeAccounts;
  if (!accounts.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (tbody) {
    tbody.innerHTML = accounts.map(a => {
      const bal = getAccountBalance(a.id);
      return `<tr class="hover:bg-gray-50 ${!a.is_active ? 'opacity-60' : ''}">
        <td class="px-4 py-3 text-sm font-medium text-gray-800">${escapeHtml(a.account_name)}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${escapeHtml(FINANCE_ACCT_TYPE_LABELS[a.account_type] || a.account_type)}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${escapeHtml(a.owner_name || '—')}</td>
        <td class="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${bal < 0 ? 'text-rose-600' : 'text-gray-800'}">${fmtMoney(bal)}</td>
        <td class="px-4 py-3 text-center">
          <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}">${a.is_active ? 'Active' : 'Inactive'}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <button class="icon-btn text-indigo-500" data-action="open-account-ledger" data-id="${a.id}" title="View Ledger"><i data-lucide="book-open" class="w-4 h-4"></i></button>
          <button class="icon-btn" data-action="edit-finance-account" data-id="${a.id}" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        </td>
      </tr>`;
    }).join('');
  }
  refreshIcons();
}

// Sprint 4.2E: row in/out amounts now read getFinanceAccountImpact() instead
// of the inline transfer if/else + ['income','capital_injection',
// 'pass_through_received'] / ['expense','pass_through_spent'] arrays this
// function used before. Running balance formula, row order, and DOM
// rendering are untouched. See getFinanceAccountImpact()'s comment for the
// one documented edge-case behavior note (self-transfer nets to 0 instead of
// -amount) — not reachable through the current transaction form.
function openAccountLedgerModal(accountId) {
  const acct = state.financeAccounts.find(a => Number(a.id) === accountId);
  if (!acct) return;

  // All non-deleted, non-cancelled transactions touching this account (archived included for full history)
  const txs = state.financeTransactions
    .filter(t => {
      if (t.is_deleted || t.status === 'cancelled') return false;
      if (t.transaction_type === 'transfer') {
        return Number(t.from_account_id) === accountId || Number(t.to_account_id) === accountId;
      }
      return Number(t.account_id) === accountId;
    })
    .slice()
    .sort((a, b) => {
      const d = (a.transaction_date || '').localeCompare(b.transaction_date || '');
      return d !== 0 ? d : (a.created_at || '').localeCompare(b.created_at || '');
    });

  let runBal = Number(acct.opening_balance) || 0;
  let totalInflow = 0, totalOutflow = 0;

  const rows = txs.map(t => {
    const amt    = Number(t.amount) || 0;
    const type   = t.transaction_type;
    const impact = getFinanceAccountImpact(t, accountId);
    const inAmt  = impact > 0 ? amt : 0;
    const outAmt = impact < 0 ? amt : 0;

    runBal        += inAmt - outAmt;
    totalInflow   += inAmt;
    totalOutflow  += outAmt;
    const runSnap  = runBal;

    const clientOrProject = t.project_name || t.client_name || getCrmClientName(t.client_id) || '—';
    const category        = getCategoryName(t.category_id) || '—';
    return `<tr class="hover:bg-gray-50 border-b border-gray-50 ${t.is_archived ? 'opacity-60' : ''}">
      <td class="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
      <td class="px-4 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">${t.transaction_number ? escapeHtml(t.transaction_number) : '—'}</td>
      <td class="px-4 py-2 text-sm">${financeTypeBadge(type)}</td>
      <td class="px-4 py-2 text-xs text-gray-500 max-w-[120px] truncate">${escapeHtml(clientOrProject)}</td>
      <td class="px-4 py-2 text-xs text-gray-400 max-w-[100px] truncate">${escapeHtml(category)}</td>
      <td class="px-4 py-2 text-sm text-gray-600 max-w-[160px] truncate">${escapeHtml(t.description || '—')}</td>
      <td class="px-4 py-2 text-sm text-right text-emerald-600 font-medium whitespace-nowrap">${inAmt > 0 ? fmtMoney(inAmt) : ''}</td>
      <td class="px-4 py-2 text-sm text-right text-rose-600 font-medium whitespace-nowrap">${outAmt > 0 ? fmtMoney(outAmt) : ''}</td>
      <td class="px-4 py-2 text-sm text-right font-semibold whitespace-nowrap ${runSnap < 0 ? 'text-rose-600' : 'text-gray-800'}">${fmtMoney(runSnap)}</td>
    </tr>`;
  });

  const nameEl = $('#acct-ledger-name');
  const metaEl = $('#acct-ledger-meta');
  const balEl  = $('#acct-ledger-balance');
  const openEl = $('#acct-ledger-opening');
  const inEl   = $('#acct-ledger-inflow');
  const outEl  = $('#acct-ledger-outflow');
  const body   = $('#acct-ledger-table-body');

  if (nameEl)  nameEl.textContent = acct.account_name;
  if (metaEl)  metaEl.textContent = `${FINANCE_ACCT_TYPE_LABELS[acct.account_type] || acct.account_type}${acct.owner_name ? ' · ' + acct.owner_name : ''}`;
  if (balEl)   balEl.textContent  = fmtMoney(getAccountBalance(accountId));
  if (openEl)  openEl.textContent = fmtMoney(acct.opening_balance || 0);
  if (inEl)    inEl.textContent   = fmtMoney(totalInflow);
  if (outEl)   outEl.textContent  = fmtMoney(totalOutflow);
  if (body) {
    body.innerHTML = rows.length
      ? rows.join('')
      : '<tr><td colspan="9" class="px-4 py-10 text-center text-gray-400 text-sm">No transactions for this account yet.</td></tr>';
  }

  refreshIcons();
  openModal('account-ledger-modal');
}

// Sprint Project Commercial C3 — shared default shape for the Forecast tab's
// filters (used both to seed state.filters.financeForecasts and to reset it
// on Clear Filters / KPI-nav, matching the CRM reset-before-apply idiom).
const FINANCE_FORECAST_FILTER_DEFAULTS = { search: '', type: 'all', status: 'all', archived: 'active', source: 'all', component: 'all' };

// Mirrors updateCrmClearFiltersVisibility's convention: 'archived' has its
// own dedicated select and isn't counted as an active "filter".
function updateFinanceForecastClearFiltersVisibility() {
  const btn = $('#finance-forecast-clear-filters');
  if (!btn) return;
  const f = state.filters.financeForecasts;
  const hasActive = !!f.search || f.type !== 'all' || f.status !== 'all' || f.source !== 'all' || f.component !== 'all';
  btn.classList.toggle('hidden', !hasActive);
}

function renderFinanceForecast() {
  const f = state.filters.financeForecasts;
  let forecasts = state.financeForecasts;

  if (f.archived === 'active')   forecasts = forecasts.filter(fc => !fc.is_archived && !fc.is_deleted);
  if (f.archived === 'archived') forecasts = forecasts.filter(fc =>  fc.is_archived && !fc.is_deleted);
  if (f.archived === 'deleted')  forecasts = forecasts.filter(fc =>  fc.is_deleted);
  if (f.type   && f.type   !== 'all') forecasts = forecasts.filter(fc => fc.forecast_type === f.type);
  if (f.status && f.status !== 'all') forecasts = forecasts.filter(fc => fc.status === f.status);
  if (f.source === 'manual')   forecasts = forecasts.filter(fc => !fc.generated_from_schedule);
  if (f.source === 'schedule') forecasts = forecasts.filter(fc =>  fc.generated_from_schedule);
  if (f.component && f.component !== 'all') forecasts = forecasts.filter(fc => fc.forecast_component === f.component);
  if (f.search) {
    const q = f.search.toLowerCase();
    forecasts = forecasts.filter(fc =>
      (fc.description  || '').toLowerCase().includes(q) ||
      (fc.client_name  || '').toLowerCase().includes(q) ||
      (fc.project_name || '').toLowerCase().includes(q) ||
      getCategoryName(fc.category_id).toLowerCase().includes(q)
    );
  }

  const tbody = $('#finance-forecast-table-body');
  const empty  = $('#finance-forecast-empty');
  updateFinanceForecastClearFiltersVisibility();
  if (!forecasts.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (tbody) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    tbody.innerHTML = forecasts.map(fc => {
      // Collections Foundation (locked architecture Decision 3): a
      // schedule-generated forecast's collection state is reflected from its
      // linked Payment Schedule Item, never computed from the forecast's own
      // (possibly stale) amount/expected_date. Manual forecasts are entirely
      // untouched — same legacy computation as before.
      const scheduleState = getForecastCollectionState(fc);
      const isConverted  = scheduleState ? scheduleState.status === 'received' : !!fc.linked_transaction_id;
      const isOverdue    = scheduleState ? scheduleState.overdue : (!isConverted && !fc.is_deleted && fc.status === 'expected' && new Date(fc.expected_date) < now);
      const displayStatus = isOverdue ? 'overdue' : (scheduleState ? scheduleState.status : fc.status);
      const clientOrProj = fc.client_name || getCrmClientName(fc.client_id) || fc.project_name || '—';
      const sourceCellHtml = renderFinanceForecastSourceCell(fc);
      return `<tr class="hover:bg-gray-50 ${fc.is_deleted ? 'opacity-50 bg-rose-50' : fc.is_archived ? 'opacity-60' : ''}">
        <td class="px-4 py-2 text-sm whitespace-nowrap ${isOverdue ? 'text-rose-600 font-medium' : 'text-gray-600'}">${fmtDate(fc.expected_date)}</td>
        <td class="px-4 py-2 text-sm">${forecastTypeBadge(fc.forecast_type)}</td>
        <td class="px-4 py-2 text-sm text-gray-600 max-w-[140px] truncate">${escapeHtml(clientOrProj)}</td>
        <td class="px-4 py-2 text-sm text-gray-400">${escapeHtml(getCategoryName(fc.category_id))}</td>
        <td class="px-4 py-2 text-sm font-medium text-right whitespace-nowrap">${fmtMoney(fc.amount)}</td>
        <td class="px-4 py-2 text-sm text-center text-gray-500">${Number(fc.probability).toFixed(0)}%</td>
        <td class="px-4 py-2 text-sm">${forecastStatusBadge(displayStatus)}${scheduleState?.overCollected ? ' <span class="badge bg-rose-50 text-rose-600">Over</span>' : ''}</td>
        <td class="px-4 py-2 text-sm">${sourceCellHtml}</td>
        <td class="px-4 py-2 text-right whitespace-nowrap">
          ${fc.is_deleted ? `
            <button class="icon-btn text-emerald-600" data-action="restore-finance-forecast" data-id="${fc.id}" title="Restore"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-700" data-action="permanent-delete-finance-forecast" data-id="${fc.id}" title="Delete Permanently"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          ` : !fc.is_archived ? `
            ${fc.generated_from_schedule
              ? `<span title="Generated from the Payment Schedule — edit the Payment Schedule Item instead" class="inline-flex"><i data-lucide="pencil" class="w-4 h-4 text-gray-300"></i></span>`
              : `<button class="icon-btn" data-action="edit-finance-forecast" data-id="${fc.id}" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>`
            }
            ${scheduleState
              ? `<span title="Collect Payment on the Payment Schedule for this item" class="inline-flex"><i data-lucide="calendar-clock" class="w-4 h-4 text-gray-300"></i></span>`
              : !isConverted
              ? `<button class="icon-btn text-indigo-500" data-action="convert-forecast-to-tx" data-id="${fc.id}" title="Convert to Transaction"><i data-lucide="arrow-right-circle" class="w-4 h-4"></i></button>`
              : `<span title="Already converted" class="inline-flex"><i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i></span>`
            }
            <button class="icon-btn text-amber-500" data-action="archive-finance-forecast" data-id="${fc.id}" title="Archive"><i data-lucide="archive" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-500" data-action="soft-delete-finance-forecast" data-id="${fc.id}" title="Move to Trash"><i data-lucide="trash" class="w-4 h-4"></i></button>
          ` : `
            <button class="icon-btn text-emerald-600" data-action="restore-finance-forecast" data-id="${fc.id}" title="Restore"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-500" data-action="soft-delete-finance-forecast" data-id="${fc.id}" title="Move to Trash"><i data-lucide="trash" class="w-4 h-4"></i></button>
          `}
        </td>
      </tr>`;
    }).join('');
  }
  refreshIcons();
}

function renderFinanceReports() {
  const dr          = getFinanceDateRange();
  const clientData  = getClientBalanceSummary(dr);
  const projectData = getProjectPnL(dr);

  // Update period labels in report headers
  const rptPeriodEls = document.querySelectorAll('.finance-report-period-label');
  rptPeriodEls.forEach(el => { el.textContent = dr.label; });

  // Client Balance table
  const clientBody = $('#finance-client-balance-body');
  if (clientBody) {
    clientBody.innerHTML = clientData.length
      ? clientData.map(c => `<tr class="hover:bg-gray-50 border-b border-gray-50">
          <td class="px-4 py-2.5 text-sm font-medium text-gray-800">${escapeHtml(c.clientName)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-emerald-600 font-medium">${fmtMoney(c.revenue)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-gray-500">${fmtMoney(c.ptReceived)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-gray-400">${fmtMoney(c.ptSpent)}</td>
          <td class="px-4 py-2.5 text-sm text-right font-medium ${c.ptRemaining > 0 ? 'text-amber-600' : 'text-gray-400'}">${fmtMoney(c.ptRemaining)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-rose-500">${fmtMoney(c.expenses)}</td>
          <td class="px-4 py-2.5 text-sm text-right font-semibold ${c.profitEstimate >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(c.profitEstimate)}</td>
        </tr>`).join('')
      : `<tr><td colspan="7" class="px-4 py-10 text-center text-gray-400 text-sm">No client transactions yet.</td></tr>`;
  }

  // Project P&L table
  const projBody = $('#finance-project-pnl-body');
  if (projBody) {
    projBody.innerHTML = projectData.length
      ? projectData.map(p => `<tr class="hover:bg-gray-50 border-b border-gray-50">
          <td class="px-4 py-2.5 text-sm font-medium text-gray-800">${escapeHtml(p.projectName)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-emerald-600 font-medium">${fmtMoney(p.revenue)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-rose-500">${fmtMoney(p.expenses)}</td>
          <td class="px-4 py-2.5 text-sm text-right text-gray-500">${fmtMoney(p.ptReceived)}</td>
          <td class="px-4 py-2.5 text-sm text-right ${p.ptRemaining > 0 ? 'text-amber-600' : 'text-gray-400'}">${fmtMoney(p.ptRemaining)}</td>
          <td class="px-4 py-2.5 text-sm text-right font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(p.profit)}</td>
          <td class="px-4 py-2.5 text-sm text-right ${p.margin === null ? 'text-gray-300' : p.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${p.margin !== null ? p.margin.toFixed(1) + '%' : '—'}</td>
        </tr>`).join('')
      : `<tr><td colspan="7" class="px-4 py-10 text-center text-gray-400 text-sm">No project transactions yet.</td></tr>`;
  }

  // Forecast vs Actual
  const fvaEl = $('#finance-forecast-vs-actual');
  if (fvaEl) {
    const activeTx     = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled' && isInDateRange(t.transaction_date, dr));
    const actualIncome = activeTx.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const actualExp    = activeTx.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const allFc        = state.financeForecasts.filter(f => !f.is_archived && !f.is_deleted && isInDateRange(f.expected_date, dr));
    const fcIncome     = allFc.filter(f => f.forecast_type === 'expected_income').reduce((s, f) => s + Number(f.amount), 0);
    const fcExp        = allFc.filter(f => f.forecast_type === 'expected_expense').reduce((s, f) => s + Number(f.amount), 0);
    const inPct  = fcIncome > 0 ? ((actualIncome / fcIncome) * 100).toFixed(0) + '% collected' : '—';
    const expPct = fcExp    > 0 ? ((actualExp    / fcExp)    * 100).toFixed(0) + '% spent'     : '—';
    fvaEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-emerald-50 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Actual Revenue</p>
          <p class="text-base font-semibold text-emerald-600">${fmtMoney(actualIncome)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Forecasted Revenue</p>
          <p class="text-base font-semibold text-gray-800">${fmtMoney(fcIncome)}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">${inPct}</p>
        </div>
        <div class="bg-rose-50 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Actual Expenses</p>
          <p class="text-base font-semibold text-rose-600">${fmtMoney(actualExp)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Forecasted Expenses</p>
          <p class="text-base font-semibold text-gray-800">${fmtMoney(fcExp)}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">${expPct}</p>
        </div>
      </div>`;
  }
}

// ─── Accounting Reports UI (Sprint 4.5A) ─────────────────────────────────────
// Read-only rendering layer over the Accounting Statements Facade (Sprint
// 4.4E) — every renderer here reads its statement argument only, never
// recalculates, and never touches state.accountingJournal or any other
// accounting engine state. Lives inside the existing Finance Reports tab
// (#finance-section-reports), gated behind its own selector
// (state.accountingReportTab) so it doesn't interfere with the Client
// Balance / Project P&L / Forecast vs Actual reports already rendered by
// renderFinanceReports() above.
//
// Journal Posting is not wired into real transaction creation yet (see
// Sprint 4.3D/4.3E), so state.accountingJournal is expected to be empty in
// normal use until a future sprint wires that up. This UI never fabricates
// data to fill that gap — an empty journal renders the empty-state message
// below instead of a statement.

// Builds a simple two-column (account / amount) section table used by the
// Income Statement, Balance Sheet, and Cash Flow renderers below. Pure
// string building only — no state reads, no recalculation; `rows` and
// `total` are passed in exactly as the statement object already computed
// them. Sprint 4.5C: uses accounting-report-table-container (auto-height)
// instead of table-scroll-container (20rem min-height) — see style.css —
// and slightly tighter spacing (mb-3/py-1.5) so a short section (the common
// case for Chart-of-Accounts-sized data) doesn't leave large empty gaps
// before the next section or the summary card below it.
function renderAccountingReportSection(title, rows, total, amountLabelFn) {
  const list = Array.isArray(rows) ? rows : [];
  const bodyHtml = list.length
    ? list.map(r => `<tr class="hover:bg-gray-50 border-b border-gray-50">
        <td class="px-4 py-1.5 text-sm text-gray-700">${escapeHtml(r.accountCode ? `${r.accountCode} — ${r.accountName || ''}` : (r.description || r.offsetAccountName || ''))}</td>
        <td class="px-4 py-1.5 text-sm text-right ${Number(r.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(r.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="2" class="px-4 py-4 text-center text-gray-400 text-sm">No ${escapeHtml(title.toLowerCase())} yet.</td></tr>`;

  return `
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">${escapeHtml(title)}</h4>
      <div class="accounting-report-table-container">
        <table class="w-full text-left">
          <tbody>${bodyHtml}</tbody>
          <tfoot>
            <tr class="border-t border-gray-200">
              <td class="px-4 py-1.5 text-sm font-semibold text-gray-800">Total ${escapeHtml(title)}</td>
              <td class="px-4 py-1.5 text-sm text-right font-semibold ${Number(total) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

// Trial Balance report: Account | Debit | Credit | Balance, mirroring
// buildTrialBalance()'s own column shape — Debit/Credit are unchanged; the
// Balance column (Sprint 4.5C) reads each row's existing `balance` field
// (buildTrialBalance() already computes it — see that function's own
// signed-balance convention above) rather than deriving anything new here.
// The `?? ` fallback only guards against a row shape that omits `balance`
// entirely (defensive; buildTrialBalance() always sets it today) — it is
// not a second calculation of the figure.
function renderTrialBalanceReport(statement) {
  const rows = Array.isArray(statement?.rows) ? statement.rows : [];
  const totals = statement?.totals || { debitTotal: 0, creditTotal: 0, difference: 0, balanced: true };

  const bodyHtml = rows.length
    ? rows.map(r => {
        const balance = r.balance ?? ((Number(r.debit) || 0) - (Number(r.credit) || 0));
        return `<tr class="hover:bg-gray-50 border-b border-gray-50">
        <td class="px-4 py-1.5 text-sm font-medium text-gray-800">${escapeHtml(r.accountCode)} — ${escapeHtml(r.accountName)}</td>
        <td class="px-4 py-1.5 text-sm text-right text-gray-700">${r.debit ? fmtMoney(r.debit) : '—'}</td>
        <td class="px-4 py-1.5 text-sm text-right text-gray-700">${r.credit ? fmtMoney(r.credit) : '—'}</td>
        <td class="px-4 py-1.5 text-sm text-right font-medium ${Number(balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(balance)}</td>
      </tr>`;
      }).join('')
    : `<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">No trial balance rows yet.</td></tr>`;

  return `
    <div class="accounting-report-table-container">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase">Account</th>
            <th class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase text-right">Debit</th>
            <th class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase text-right">Credit</th>
            <th class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase text-right">Balance</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
        <tfoot>
          <tr class="border-t border-gray-200">
            <td class="px-4 py-1.5 text-sm font-semibold text-gray-800">Total</td>
            <td class="px-4 py-1.5 text-sm text-right font-semibold text-gray-800">${fmtMoney(totals.debitTotal)}</td>
            <td class="px-4 py-1.5 text-sm text-right font-semibold text-gray-800">${fmtMoney(totals.creditTotal)}</td>
            <td class="px-4 py-1.5 text-sm text-right font-semibold text-gray-400">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="text-xs mt-2 ${totals.balanced ? 'text-emerald-600' : 'text-rose-600'}">${totals.balanced ? 'Balanced' : `Not balanced — difference ${fmtMoney(Math.abs(Number(totals.difference) || 0))}`}</p>`;
}

// Income Statement report: Revenue / Expenses sections + Net Profit, read
// straight from buildIncomeStatement()'s own revenue/expenses/netProfit
// fields.
function renderIncomeStatementReport(statement) {
  const revenue  = statement?.revenue  || { rows: [], total: 0 };
  const expenses = statement?.expenses || { rows: [], total: 0 };
  const netProfit = Number(statement?.netProfit) || 0;

  return `
    ${renderAccountingReportSection('Revenue', revenue.rows, revenue.total)}
    ${renderAccountingReportSection('Expenses', expenses.rows, expenses.total)}
    <div class="border-t border-gray-100 my-2"></div>
    <div class="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
      <span class="text-sm font-semibold text-gray-800">Net Profit</span>
      <span class="text-base font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(netProfit)}</span>
    </div>`;
}

// Balance Sheet report: Assets / Liabilities / Equity sections + Retained
// Earnings + Difference, read straight from buildBalanceSheet()'s own
// fields.
function renderBalanceSheetReport(statement) {
  const assets      = statement?.assets      || { rows: [], total: 0 };
  const liabilities = statement?.liabilities || { rows: [], total: 0 };
  const equity      = statement?.equity      || { rows: [], total: 0 };
  const retainedEarnings = Number(statement?.retainedEarnings) || 0;
  const difference       = Number(statement?.difference) || 0;
  const balanced          = !!statement?.balanced;

  return `
    ${renderAccountingReportSection('Assets', assets.rows, assets.total)}
    ${renderAccountingReportSection('Liabilities', liabilities.rows, liabilities.total)}
    ${renderAccountingReportSection('Equity', equity.rows, equity.total)}
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="text-xs text-gray-400 mb-1">Retained Earnings</p>
        <p class="text-base font-semibold text-gray-800">${fmtMoney(retainedEarnings)}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="text-xs text-gray-400 mb-1">Difference</p>
        <p class="text-base font-semibold ${balanced ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(difference)}</p>
      </div>
    </div>`;
}

// Cash Flow Statement report: Operating / Investing / Financing sections +
// Net Cash Flow, read straight from buildAccountingCashFlowStatement()'s own
// fields.
function renderAccountingCashFlowReport(statement) {
  const operating = statement?.operatingActivities || { rows: [], total: 0 };
  const investing = statement?.investingActivities || { rows: [], total: 0 };
  const financing = statement?.financingActivities || { rows: [], total: 0 };
  const netCashFlow = Number(statement?.netCashFlow) || 0;

  return `
    ${renderAccountingReportSection('Operating Activities', operating.rows, operating.total)}
    ${renderAccountingReportSection('Investing Activities', investing.rows, investing.total)}
    ${renderAccountingReportSection('Financing Activities', financing.rows, financing.total)}
    <div class="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
      <span class="text-sm font-semibold text-gray-800">Net Cash Flow</span>
      <span class="text-base font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtMoney(netCashFlow)}</span>
    </div>`;
}

// Selector map — the only place the four statement tabs are wired to their
// renderer, so adding/removing a tab means touching exactly one line here.
const ACCOUNTING_REPORT_RENDERERS = {
  trialBalance:      renderTrialBalanceReport,
  incomeStatement:   renderIncomeStatementReport,
  balanceSheet:      renderBalanceSheetReport,
  cashFlowStatement: renderAccountingCashFlowReport,
};

// Entry point wired into renderFinanceView() below (Finance Reports tab).
// Reads only getAccountingStatement(name) — never recalculates, never posts,
// never mutates state.accountingJournal. Shows the empty-state message
// instead of a statement when no journal postings exist yet, per this
// sprint's brief: real numbers only, no fabricated/demo data.
function renderAccountingReports() {
  const container = $('#accounting-report-content');
  if (!container) return;

  const activeTab = state.accountingReportTab || 'trialBalance';
  document.querySelectorAll('[data-accounting-report]').forEach(btn => {
    const active = btn.dataset.accountingReport === activeTab;
    btn.classList.toggle('bg-white', active);
    btn.classList.toggle('text-gray-900', active);
    btn.classList.toggle('shadow-sm', active);
    btn.classList.toggle('text-gray-500', !active);
  });

  const journal = Array.isArray(state.accountingJournal) ? state.accountingJournal : [];
  if (journal.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center text-center py-12">
        <i data-lucide="book-open" class="w-8 h-8 text-gray-300 mb-3"></i>
        <p class="text-sm text-gray-400">Accounting reports will appear once journal postings exist.</p>
      </div>`;
    refreshIcons();
    return;
  }

  const renderer = ACCOUNTING_REPORT_RENDERERS[activeTab] || renderTrialBalanceReport;
  container.innerHTML = renderer(getAccountingStatement(activeTab));
  refreshIcons();
}

// Switches the active Accounting Report tab and re-renders. Does not touch
// state.accountingJournal or trigger any posting.
function setAccountingReportTab(tab) {
  if (!ACCOUNTING_REPORT_RENDERERS[tab]) return;
  state.accountingReportTab = tab;
  renderAccountingReports();
}

// ─── Finance Validation ──────────────────────────────────────────────────────
// Call validateFinanceTotals() from the browser console to run reconciliation.
// Note: getFinanceSummary() and getClientBalanceSummary()/getProjectPnL() are all-time.
// Period filters (getFinanceDateRange()) affect dashboard display but NOT these reconciliation checks.
function validateFinanceTotals() {
  const s   = getFinanceSummary();
  const cf  = getCashFlowThisMonth();
  const cb  = getClientBalanceSummary();
  const pnl = getProjectPnL();

  const base = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted && t.status !== 'cancelled');
  const ptIn  = base.filter(t => t.transaction_type === 'pass_through_received').reduce((acc, t) => acc + Number(t.amount), 0);
  const ptOut = base.filter(t => t.transaction_type === 'pass_through_spent').reduce((acc, t) => acc + Number(t.amount), 0);

  const checks = [
    {
      check: 'Cash in Accounts = Sum of account balances',
      expected: s.totalAccountBalances,
      actual:   state.financeAccounts.filter(a => a.is_active).reduce((sum, a) => sum + getAccountBalance(a.id), 0),
    },
    {
      check: 'Net Profit = Real Revenue − Real Expenses',
      expected: s.realIncome - s.realExpenses,
      actual:   s.netProfit,
    },
    {
      check: 'Client Funds Held = PT Received − PT Spent',
      expected: ptIn - ptOut,
      actual:   s.passThroughHeld,
    },
    {
      check: 'Cash Flow: Closing = Opening + In − Out',
      expected: cf.openingBalance + cf.cashIn - cf.cashOut,
      actual:   cf.closingBalance,
    },
    {
      check: 'Client Balance revenue ≤ Real Revenue (some income may have no client)',
      expected: `≤ ${fmtMoney(s.realIncome)}`,
      actual:   cb.reduce((acc, c) => acc + c.revenue, 0),
      pass:     cb.reduce((acc, c) => acc + c.revenue, 0) <= s.realIncome + 0.01,
    },
    {
      check: 'Project P&L revenue ≤ Real Revenue (some income may have no project)',
      expected: `≤ ${fmtMoney(s.realIncome)}`,
      actual:   pnl.filter(p => p.projectName !== 'Unassigned').reduce((acc, p) => acc + p.revenue, 0),
      pass:     pnl.filter(p => p.projectName !== 'Unassigned').reduce((acc, p) => acc + p.revenue, 0) <= s.realIncome + 0.01,
    },
  ].map(c => ({
    ...c,
    pass: c.pass !== undefined ? c.pass : Math.abs(Number(c.expected) - Number(c.actual)) < 0.01,
  }));

  const allPass = checks.every(c => c.pass);
  console.group(`%cFinance Reconciliation — ${allPass ? '✅ ALL PASS' : '❌ ISSUES FOUND'}`, allPass ? 'color:green' : 'color:red');
  checks.forEach(c => console.log(`${c.pass ? '✅' : '❌'} ${c.check}\n   Expected: ${c.expected}  Actual: ${c.actual}`));
  console.groupEnd();
  return { checks, allPass };
}
// ─── Business Health (Sprint 4.3) ────────────────────────────────────────────

// ─── Business Health: Settings Config (Sprint 4.1C) ──────────────────────────
// Defaults mirror the values Business Health has always used (Sprint 4.3) so
// scoring/targets/thresholds are unchanged unless finance_settings overrides
// them. This is the ONLY place Business Health values are hardcoded now —
// getBusinessHealthConfig() is the single source every calculation reads from.
const BUSINESS_HEALTH_CONFIG_DEFAULT = {
  targetMultipliers: { safe: 1.5, stretch: 2.25 },
  runwayThresholds: { critical: 2, warning: 4, healthy: 6 },
  scoreWeights: { breakEven: 35, safeTarget: 25, netProfit: 15, cashRunway: 15, clientFunds: 10 },
  recommendationThresholds: { runwayCriticalMonths: 3, clientFundsWarningAmount: 0 },
};
// Reads 'business_health_config' from finance_settings and deep-merges it onto
// BUSINESS_HEALTH_CONFIG_DEFAULT, so a setting row that only overrides one nested
// value (e.g. targetMultipliers.safe) doesn't drop the rest of the defaults.
// Never throws — a missing table, missing row, or malformed value all just fall
// back to the hardcoded defaults above.
function getBusinessHealthConfig() {
  const raw = getFinanceObjectSetting('business_health_config', {});
  const mergeLevel = (defaults, override) => {
    if (!override || typeof override !== 'object' || Array.isArray(override)) return { ...defaults };
    const out = { ...defaults };
    Object.keys(defaults).forEach(key => {
      const defaultVal = defaults[key];
      const overrideVal = override[key];
      if (typeof defaultVal === 'number') {
        out[key] = (typeof overrideVal === 'number' && !isNaN(overrideVal)) ? overrideVal : defaultVal;
      } else {
        out[key] = mergeLevel(defaultVal, overrideVal);
      }
    });
    return out;
  };
  return mergeLevel(BUSINESS_HEALTH_CONFIG_DEFAULT, raw);
}

function getBusinessHealthDaysRemaining(dr) {
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const now = startOfDay(new Date());
  if (dr.range === 'this_month') {
    return Math.floor((startOfDay(dr.endDate) - now) / 86400000) + 1;
  }
  if (dr.range === 'custom') {
    const start = startOfDay(dr.startDate);
    const end   = startOfDay(dr.endDate);
    if (now >= start && now <= end) return Math.floor((end - now) / 86400000) + 1;
    return null; // outside range — "—"
  }
  return 0; // historical / multi-period ranges
}

function getBusinessHealthScore({ breakEven, safeTarget, currentRevenue, netProfit, runwayMonths, clientFundsHeld }, cfg) {
  const w = cfg.scoreWeights;
  const healthyRunway = cfg.runwayThresholds.healthy;
  const breakEvenPts  = breakEven  > 0 ? Math.min(1, currentRevenue / breakEven)  * w.breakEven  : w.breakEven;
  const safeTargetPts = safeTarget > 0 ? Math.min(1, currentRevenue / safeTarget) * w.safeTarget : w.safeTarget;
  const netProfitPts  = netProfit > 0 ? w.netProfit : 0;
  const runwayPts     = Math.min(1, (isFinite(runwayMonths) ? runwayMonths : healthyRunway) / healthyRunway) * w.cashRunway;
  const clientFundsPts = clientFundsHeld >= 0 ? w.clientFunds : 0;

  const score = Math.max(0, Math.min(100, Math.round(breakEvenPts + safeTargetPts + netProfitPts + runwayPts + clientFundsPts)));
  let status;
  if (score >= 90) status = 'Excellent';
  else if (score >= 75) status = 'Healthy';
  else if (score >= 55) status = 'Attention';
  else status = 'Risk';
  const statusColor = { Excellent: 'emerald', Healthy: 'blue', Attention: 'amber', Risk: 'rose' }[status];

  return {
    score, status, statusColor,
    breakdown: [
      { label: 'Progress to Break-Even',              points: Math.round(breakEvenPts * 10) / 10,  max: w.breakEven },
      { label: 'Progress to Safe Target',              points: Math.round(safeTargetPts * 10) / 10, max: w.safeTarget },
      { label: 'Positive Net Profit',                  points: netProfitPts,                         max: w.netProfit },
      { label: `Cash Runway ≥ ${healthyRunway} Months`, points: Math.round(runwayPts * 10) / 10,      max: w.cashRunway },
      { label: 'Client Funds Not Negative',            points: clientFundsPts,                       max: w.clientFunds },
    ],
  };
}

function getBusinessHealthRecommendations({ breakEven, safeTarget, currentRevenue, projectedRevenue, runwayMonths, clientFundsHeld, realIncome, realExpenses }, cfg) {
  const rt = cfg.recommendationThresholds;
  const recs = [];
  if (currentRevenue < breakEven) {
    recs.push({ type: 'warning', priority: 'Critical', icon: 'target', text: `Close ${fmtMoney(breakEven - currentRevenue)} more revenue to reach break-even.` });
  }
  if (projectedRevenue >= safeTarget) {
    recs.push({ type: 'positive', priority: 'Good', icon: 'check-circle', text: 'Forecast pipeline is enough to hit the safe target if collected.' });
  }
  if (runwayMonths < rt.runwayCriticalMonths) {
    recs.push({ type: 'warning', priority: 'Critical', icon: 'alert-triangle', text: `Cash runway is below ${rt.runwayCriticalMonths} months. Reduce burn or increase collections.` });
  }
  if (clientFundsHeld > rt.clientFundsWarningAmount) {
    recs.push({ type: 'info', priority: 'Important', icon: 'arrow-right-left', text: `${fmtMoney(clientFundsHeld)} in client funds is still held and should be tracked separately.` });
  }
  if (realExpenses > realIncome) {
    recs.push({ type: 'warning', priority: 'Critical', icon: 'trending-down', text: 'Expenses exceed revenue for this period.' });
  }
  if (!recs.length) {
    recs.push({ type: 'positive', priority: 'Good', icon: 'check-circle', text: 'No immediate actions needed — all Business Health checks are on track.' });
  }
  return recs;
}

// Accepts optional precomputed pieces (dr/cfg/summary/periodSum/forecast/fixedCostTotal) so
// buildFinanceEngine() can reuse values it already computed instead of recalculating them —
// every piece still defaults to the exact same lookups this function always used, so calling
// it with no args (as every existing widget/modal does) is 100% unchanged.
function getBusinessHealthMetrics(options = {}) {
  const cfg       = options.cfg || getBusinessHealthConfig();
  const dr        = options.dr || getFinanceDateRange();
  const summary   = options.summary || getFinanceSummary();
  const periodSum = options.periodSum || getFinancePeriodSummary(dr);
  const forecast  = options.forecast || getFinanceForecastForPeriod(dr);

  const fixedCostTotal = options.fixedCostTotal !== undefined
    ? options.fixedCostTotal
    : getFinanceFixedCosts().reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const breakEven      = fixedCostTotal;
  const safeTarget      = fixedCostTotal * cfg.targetMultipliers.safe;
  const stretchTarget   = fixedCostTotal * cfg.targetMultipliers.stretch;

  const currentRevenue  = periodSum.realIncome;
  const netProfit       = periodSum.netProfit;
  const cashInAccounts  = summary.totalAccountBalances;
  const clientFundsHeld = summary.passThroughHeld;

  const burnRate     = fixedCostTotal;
  const runwayMonths = burnRate > 0 ? cashInAccounts / burnRate : Infinity;

  const dayspan         = (dr.endDate - dr.startDate) / 86400000;
  const isMonthlyPeriod = dayspan <= 31;

  const daysRemaining = getBusinessHealthDaysRemaining(dr);
  const revenueProgressPct   = safeTarget > 0 ? Math.min(100, Math.round((currentRevenue / safeTarget) * 100)) : 0;
  const remainingToSafeTarget = Math.max(0, safeTarget - currentRevenue);
  let dailyNeeded;
  if (daysRemaining === null) dailyNeeded = null;
  else if (daysRemaining <= 0) dailyNeeded = 'closed';
  else dailyNeeded = remainingToSafeTarget / daysRemaining;

  const forecastedRevenue = forecast.expectedIncomeThisMonth;
  const projectedRevenue  = currentRevenue + forecastedRevenue;
  const projectedGap      = safeTarget - projectedRevenue;

  const scoreInfo = getBusinessHealthScore({ breakEven, safeTarget, currentRevenue, netProfit, runwayMonths, clientFundsHeld }, cfg);
  const recommendations = getBusinessHealthRecommendations({
    breakEven, safeTarget, currentRevenue, projectedRevenue, runwayMonths, clientFundsHeld,
    realIncome: periodSum.realIncome, realExpenses: periodSum.realExpenses,
  }, cfg);

  return {
    dr, fixedCostTotal, breakEven, safeTarget, stretchTarget,
    currentRevenue, netProfit, cashInAccounts, clientFundsHeld,
    burnRate, runwayMonths, isMonthlyPeriod,
    daysRemaining, revenueProgressPct, remainingToSafeTarget, dailyNeeded,
    forecastedRevenue, projectedRevenue, projectedGap,
    score: scoreInfo.score, status: scoreInfo.status, statusColor: scoreInfo.statusColor, scoreBreakdown: scoreInfo.breakdown,
    recommendations, config: cfg,
    realIncome: periodSum.realIncome, realExpenses: periodSum.realExpenses,
  };
}

function fmtRunway(months) {
  if (!isFinite(months)) return '∞';
  return `${months.toFixed(1)} Months`;
}

const BUSINESS_HEALTH_RING_HEX = { emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', rose: '#f43f5e' };

// Exact tints per Sprint 4.3A.2 spec — subtle status backgrounds for the Hero and quick-stat cards.
const BUSINESS_HEALTH_STATUS_TINT = {
  Risk:      { bg: '#FFF5F5', border: '#FECACA' },
  Attention: { bg: '#FFF8EB', border: '#FDE68A' },
  Healthy:   { bg: '#EFF6FF', border: '#BFDBFE' },
  Excellent: { bg: '#F0FDF4', border: '#BBF7D0' },
};

const BUSINESS_HEALTH_PRIORITY_STYLES = {
  Critical:  { bg: 'bg-rose-50',    border: 'border-rose-400',    text: 'text-rose-800',    icon: 'text-rose-500',    badge: 'bg-rose-600 text-white' },
  Important: { bg: 'bg-amber-50',   border: 'border-amber-400',   text: 'text-amber-800',   icon: 'text-amber-500',   badge: 'bg-amber-500 text-white' },
  Good:      { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', icon: 'text-emerald-500', badge: 'bg-emerald-600 text-white' },
};

function getRunwayMeterColor(months, cfg = getBusinessHealthConfig()) {
  const rt = cfg.runwayThresholds;
  if (!isFinite(months)) return 'emerald';
  if (months < rt.critical) return 'rose';
  if (months < rt.warning) return 'amber';
  if (months < rt.healthy) return 'blue';
  return 'emerald';
}

// meterMax is the fixed visual scale of the meter (12 months), not a business
// threshold — the four zone boundaries within it come from cfg.runwayThresholds.
function renderRunwayMeter(months, cfg = getBusinessHealthConfig()) {
  const rt = cfg.runwayThresholds;
  const meterMax = 12;
  const pct = isFinite(months) ? Math.max(0, Math.min(100, (months / meterMax) * 100)) : 100;
  const zones = [
    { color: '#FCA5A5', width: (rt.critical / meterMax) * 100 },                 // < critical — red
    { color: '#FDE68A', width: ((rt.warning - rt.critical) / meterMax) * 100 },  // critical–warning — amber
    { color: '#93C5FD', width: ((rt.healthy - rt.warning) / meterMax) * 100 },   // warning–healthy — blue
    { color: '#86EFAC', width: Math.max(0, ((meterMax - rt.healthy) / meterMax) * 100) }, // healthy–max — green
  ];
  const segHtml = zones.map((z, i) => `<div class="h-full" style="width:${z.width}%;background:${z.color};${i < zones.length - 1 ? 'border-right:2px solid #fff;' : ''}"></div>`).join('');
  return `
    <div class="relative pt-2">
      <div class="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-100">${segHtml}</div>
      <div class="absolute top-0" style="left:calc(${pct}% - 5px)">
        <div class="w-[10px] h-[10px] rounded-full bg-white border-2 border-gray-700 shadow-sm"></div>
      </div>
    </div>`;
}

function renderBusinessHealthProgressBar(pct, color) {
  return `
    <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div class="h-2.5 rounded-full bg-${color}-500" style="width:${Math.max(0, Math.min(100, pct))}%"></div>
    </div>`;
}

function renderBusinessHealthRevenueRow(label, current, target, pct, color) {
  return `
    <div>
      <div class="mb-1.5">
        <span class="text-[12px] font-medium text-gray-700">${label}</span>
      </div>
      ${renderBusinessHealthProgressBar(pct, color)}
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-[11px] text-gray-400 tabular-nums">${fmtMoney(current)} / ${fmtMoney(target)}</span>
        <span class="text-[12px] font-bold text-gray-800 tabular-nums">${pct}%</span>
      </div>
    </div>`;
}

// Returns the 3 executive-summary sentences as separate HTML strings (same computed
// values/highlights as before — only the sentence boundaries changed for layout purposes).
function getBusinessHealthSummaryLines(m) {
  const hi = (text, cls) => `<span class="font-semibold ${cls}">${text}</span>`;
  const hiStrong = (text, cls) => `<span class="font-extrabold ${cls}">${text}</span>`;
  const breakEvenPct = m.breakEven > 0 ? Math.round((m.currentRevenue / m.breakEven) * 100) : 0;
  const rt = m.config.runwayThresholds;
  const runwayLabel = !isFinite(m.runwayMonths) ? 'unlimited'
    : m.runwayMonths < rt.critical ? 'critical'
    : m.runwayMonths < rt.warning ? 'tight'
    : m.runwayMonths < rt.healthy ? 'stable'
    : 'healthy';
  const runwayText = isFinite(m.runwayMonths) ? `${m.runwayMonths.toFixed(1)} Months` : 'an indefinite period';
  const gapAbs = Math.abs(m.projectedGap);
  const gapIsShortfall = m.projectedGap > 0;

  const pctHtml    = hi(`${breakEvenPct}%`, 'text-blue-600');
  const runwayHtml = hi(runwayText, 'text-emerald-600');
  const gapHtml    = hiStrong(fmtMoney(gapAbs), gapIsShortfall ? 'text-rose-600' : 'text-emerald-600');
  const targetHtml = hi(fmtMoney(m.safeTarget), 'text-brand-600');

  const gapClause = gapIsShortfall
    ? `Including forecasts, you are still ${gapHtml} below the ${targetHtml} safe operating target.`
    : `Including forecasts, you have exceeded the ${targetHtml} safe operating target by ${gapHtml}.`;

  return [
    `Revenue currently covers ${pctHtml} of monthly break-even.`,
    `Cash runway is ${runwayLabel} for ${runwayHtml}.`,
    gapClause,
  ];
}

function getBusinessHealthSummaryText(m) {
  return getBusinessHealthSummaryLines(m).join(' ');
}

function renderHealthRing(score, colorName, size = 124) {
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const hex = BUSINESS_HEALTH_RING_HEX[colorName] || '#9ca3af';
  return `
    <div class="relative shrink-0" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="-rotate-90">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#f1f5f9" stroke-width="${stroke}"></circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${hex}" stroke-width="${stroke}"
          stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          style="transition:stroke-dashoffset .4s ease"></circle>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-3xl font-extrabold text-gray-900 leading-none">${score}</span>
        <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">/ 100</span>
      </div>
    </div>`;
}

// Presentation-only reformat of m.scoreBreakdown (unchanged values) into an executive
// checklist — no scoring math happens here, just label/points/max already computed.
function renderBusinessHealthScoreChecklist(scoreBreakdown) {
  return `
    <div class="bg-gray-50 rounded-xl divide-y divide-gray-200/70">
      ${scoreBreakdown.map(b => {
        const ratioPct = b.max > 0 ? Math.round((b.points / b.max) * 100) : 0;
        return `
        <div class="flex items-center justify-between gap-3 px-3 py-2.5">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-500 shrink-0"></i>
            <span class="text-[13px] font-medium text-gray-700 truncate">${escapeHtml(b.label)}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-[11px] text-gray-400 tabular-nums">${ratioPct}%</span>
            <span class="text-[13px] font-bold text-gray-800 tabular-nums whitespace-nowrap">${b.points} / ${b.max} pts</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderBusinessHealthWidget(m) {
  const el = $('#finance-business-health-panel');
  if (!el) return;

  const sc = m.statusColor;
  const dailyNeededHtml = m.dailyNeeded === null
    ? '—'
    : m.dailyNeeded === 'closed'
      ? 'Period closed'
      : fmtMoney(m.dailyNeeded);
  const daysRemainingHtml = m.daysRemaining === null ? '—' : String(Math.max(0, m.daysRemaining));
  const monthlyNote = !m.isMonthlyPeriod
    ? `<div class="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mt-4">
        <i data-lucide="calendar-clock" class="w-4 h-4 text-amber-500 mt-0.5 shrink-0"></i>
        <div>
          <p class="text-[12px] font-semibold text-amber-800">Monthly Benchmark</p>
          <p class="text-[12px] text-amber-700">These targets represent one operating month even when viewing a longer period.</p>
        </div>
      </div>`
    : '';

  const breakEvenPct = m.breakEven > 0 ? Math.min(100, Math.round((m.currentRevenue / m.breakEven) * 100)) : 0;
  const safePct       = m.revenueProgressPct;
  const stretchPct    = m.stretchTarget > 0 ? Math.min(100, Math.round((m.currentRevenue / m.stretchTarget) * 100)) : 0;

  const revenueNeededToBreakEven = Math.max(0, m.breakEven - m.currentRevenue);

  const gapPositive = m.projectedGap > 0;
  const gapColor = gapPositive ? 'rose' : 'emerald';
  const gapDisplay = gapPositive ? fmtMoney(m.projectedGap) : `+${fmtMoney(Math.abs(m.projectedGap))}`;

  const tint = BUSINESS_HEALTH_STATUS_TINT[m.status] || BUSINESS_HEALTH_STATUS_TINT.Attention;
  const summaryLines = getBusinessHealthSummaryLines(m);

  el.innerHTML = `
    <div class="shadow-card rounded-2xl bg-white p-5 cursor-pointer" data-action="open-widget-drilldown" data-widget="business-health">
      <div class="flex items-center justify-between mb-1">
        <h3 class="text-sm font-semibold text-gray-800">Business Health</h3>
        <div class="flex items-center gap-2">
          ${getFinancePeriodBadge(sc)}
          <span class="widget-info-icon" data-tooltip-title="Business Health" data-tooltip-desc="Based on current period, fixed costs, revenue target, cash runway, and forecast.">
            <i data-lucide="info" class="w-4 h-4"></i>
          </span>
        </div>
      </div>
      <p class="text-[12px] text-gray-400 mb-4">Based on current period, fixed costs, revenue target, cash runway, and forecast.</p>

      <!-- Executive Hero: 3 columns — Ring | Executive Summary | KPI Stack -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-5 rounded-xl p-4 mb-8" style="background:${tint.bg};border:1px solid ${tint.border}">
        <div class="flex flex-col items-center justify-center shrink-0 gap-2">
          ${renderHealthRing(m.score, sc)}
          <span class="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-${sc}-50 text-${sc}-700 border border-${sc}-200">${m.status}</span>
        </div>

        <div class="flex-1 min-w-0">
          ${summaryLines.map((line, i) => `<p class="text-[13px] text-gray-600 leading-relaxed${i < summaryLines.length - 1 ? ' mb-2.5' : ''}">${line}</p>`).join('')}
        </div>

        <div class="shrink-0 lg:w-48 flex flex-col divide-y divide-gray-200/70 lg:pl-5 lg:border-l lg:border-gray-200/70">
          <div class="pb-2 lg:pb-2.5">
            <p class="text-[10px] text-gray-400 uppercase font-semibold tracking-wide mb-0.5">Revenue Needed</p>
            <p class="text-base font-bold ${revenueNeededToBreakEven > 0 ? 'text-rose-600' : 'text-emerald-600'}">${revenueNeededToBreakEven > 0 ? fmtMoney(revenueNeededToBreakEven) : 'Covered'}</p>
            ${revenueNeededToBreakEven > 0 ? `<p class="text-[10px] text-gray-400 mt-0.5">to Break-even</p>` : ''}
          </div>
          <div class="py-2 lg:py-2.5">
            <p class="text-[10px] text-gray-400 uppercase font-semibold tracking-wide mb-0.5">Cash Runway</p>
            <p class="text-base font-bold text-gray-800">${fmtRunway(m.runwayMonths)}</p>
          </div>
          <div class="pt-2 lg:pt-2.5">
            <p class="text-[10px] text-gray-400 uppercase font-semibold tracking-wide mb-0.5">Monthly Safe Target</p>
            <p class="text-base font-bold text-gray-800">${fmtMoney(m.safeTarget)}</p>
          </div>
        </div>
      </div>

      <!-- Revenue Progress + Runway Meter -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="kpi-section-label">Revenue Target Progress</p>
          <div class="space-y-4">
            ${renderBusinessHealthRevenueRow('Break-even', m.currentRevenue, m.breakEven, breakEvenPct, 'gray')}
            ${renderBusinessHealthRevenueRow('Safe Target', m.currentRevenue, m.safeTarget, safePct, 'blue')}
            ${renderBusinessHealthRevenueRow('Stretch Target', m.currentRevenue, m.stretchTarget, stretchPct, 'emerald')}
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-4">
          <p class="kpi-section-label">Cash Runway</p>
          <div class="flex items-end justify-between mb-2">
            <p class="text-2xl font-bold text-gray-800">${fmtRunway(m.runwayMonths)}</p>
          </div>
          ${renderRunwayMeter(m.runwayMonths, m.config)}
          <div class="mt-4 space-y-1.5">
            <div class="flex justify-between text-[12px] text-gray-500 py-1 border-t border-gray-100">
              <span>Burn Rate</span><span class="font-semibold text-gray-700">${fmtMoney(m.burnRate)} / mo</span>
            </div>
            <div class="flex justify-between text-[12px] text-gray-500 py-1 border-t border-gray-100">
              <span>Cash in Accounts</span><span class="font-semibold text-gray-700">${fmtMoney(m.cashInAccounts)}</span>
            </div>
            <div class="flex justify-between text-[12px] text-gray-500 py-1 border-t border-gray-100">
              <span>Days Remaining</span><span class="font-semibold text-gray-700">${daysRemainingHtml}</span>
            </div>
            <div class="flex justify-between text-[12px] text-gray-500 py-1 border-t border-gray-100">
              <span>Daily Revenue Needed</span><span class="font-semibold text-gray-700">${dailyNeededHtml}</span>
            </div>
          </div>
        </div>
      </div>
      ${monthlyNote}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="kpi-section-label">Forecast Impact</p>
          <div class="flex flex-wrap items-center gap-3">
            <div class="bg-white border border-gray-100 rounded-lg px-3 py-2.5 text-center flex-1 min-w-[92px]">
              <p class="text-[10px] text-gray-400 uppercase font-semibold">Current</p>
              <p class="text-sm font-bold text-gray-800">${fmtMoney(m.currentRevenue)}</p>
            </div>
            <span class="text-lg text-gray-400 font-semibold shrink-0 px-0.5">+</span>
            <div class="bg-teal-50 rounded-lg px-3 py-2.5 text-center flex-1 min-w-[92px]">
              <p class="text-[10px] text-teal-600 uppercase font-semibold">Forecast</p>
              <p class="text-sm font-bold text-teal-700">${fmtMoney(m.forecastedRevenue)}</p>
            </div>
            <span class="text-lg text-gray-400 font-semibold shrink-0 px-0.5">=</span>
            <div class="bg-gray-800 rounded-lg px-3 py-2.5 text-center flex-1 min-w-[92px]">
              <p class="text-[10px] text-gray-300 uppercase font-semibold">Projected</p>
              <p class="text-sm font-bold text-white">${fmtMoney(m.projectedRevenue)}</p>
            </div>
            <span class="text-lg text-gray-400 font-semibold shrink-0 px-0.5">→</span>
            <div class="bg-blue-50 rounded-lg px-3 py-2.5 text-center flex-1 min-w-[92px]">
              <p class="text-[10px] text-blue-600 uppercase font-semibold">Safe Target</p>
              <p class="text-sm font-bold text-blue-700">${fmtMoney(m.safeTarget)}</p>
            </div>
            <span class="text-lg text-gray-400 font-semibold shrink-0 px-0.5">→</span>
            <div class="bg-${gapColor}-50 border-2 border-${gapColor}-200 rounded-lg px-3 py-3 text-center flex-1 min-w-[92px]">
              <p class="text-[10px] text-${gapColor}-600 uppercase font-bold">Gap</p>
              <p class="text-base font-extrabold text-${gapColor}-700">${gapDisplay}</p>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-4">
          <p class="kpi-section-label">Recommended Actions</p>
          <div class="space-y-2">
            ${m.recommendations.map(r => {
              const st = BUSINESS_HEALTH_PRIORITY_STYLES[r.priority];
              return `
              <div class="flex items-start gap-2.5 ${st.bg} border-l-4 ${st.border} rounded-lg px-3 py-2.5">
                <i data-lucide="${r.icon}" class="w-3.5 h-3.5 ${st.icon} mt-0.5 shrink-0"></i>
                <div class="min-w-0">
                  <span class="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ${st.badge} mb-1">${r.priority}</span>
                  <p class="text-[12px] ${st.text}">${escapeHtml(r.text)}</p>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Finance Global Period Bar ────────────────────────────────────────────────

function renderFinanceGlobalPeriodBar() {
  const dr = getFinanceDateRange();

  // Sync selector value
  const selectEl = $('#finance-date-range');
  if (selectEl) selectEl.value = state.financeDateRange || 'this_month';

  // Update period label chip
  const labelEl = $('#finance-period-label');
  if (labelEl) labelEl.textContent = dr.label;

  // Show/hide custom date inputs
  const customEl = $('#finance-custom-range-inputs');
  if (customEl) {
    customEl.classList.toggle('hidden', state.financeDateRange !== 'custom');
    if (state.financeDateRange === 'custom') {
      const csEl = $('#finance-custom-start');
      const ceEl = $('#finance-custom-end');
      if (csEl && state.financeCustomStart) csEl.value = state.financeCustomStart;
      if (ceEl && state.financeCustomEnd)   ceEl.value = state.financeCustomEnd;
    }
  }

  // Dynamic chart titles
  const rvseTitle = $('#finance-chart-title-rvse');
  if (rvseTitle) rvseTitle.textContent = `Revenue vs Expenses — ${dr.label}`;
  const catTitle = $('#finance-chart-title-cat');
  if (catTitle) catTitle.textContent = `Expenses by Category — ${dr.label}`;
  const projTitle = $('#finance-chart-title-proj');
  if (projTitle) projTitle.textContent = `Revenue by Project — ${dr.label}`;

  // Tab period banners (Transactions, Forecast)
  const chipHtml = `<span class="finance-period-chip finance-period-chip--indigo">${escapeHtml(dr.label)}</span>`;
  const txBanner = $('#finance-tx-period-banner');
  if (txBanner) txBanner.innerHTML = `<span class="finance-tab-period-viewing">Viewing</span>${chipHtml}`;
  const fcBanner = $('#finance-fc-period-banner');
  if (fcBanner) fcBanner.innerHTML = `<span class="finance-tab-period-viewing">Viewing</span>${chipHtml}`;

  // Reports banner
  const rptPeriod = $('#finance-reports-banner-period');
  if (rptPeriod) rptPeriod.textContent = dr.label;
  const rptDate = $('#finance-reports-banner-date');
  if (rptDate) rptDate.textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Report section period badges
  document.querySelectorAll('.finance-report-period-label').forEach(el => { el.textContent = dr.label; });

  refreshIcons();
}

// ─────────────────────────────────────────────────────────────────────────────

function setFinanceTab(tab) {
  state.financeTab = tab;
  ['dashboard', 'transactions', 'forecast', 'accounts', 'reports'].forEach(t => {
    const section = $(`#finance-section-${t}`);
    const btn = document.querySelector(`[data-finance-tab="${t}"]`);
    if (section) section.classList.toggle('hidden', t !== tab);
    if (btn) {
      const active = t === tab;
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('text-gray-900', active);
      btn.classList.toggle('shadow-sm', active);
      btn.classList.toggle('text-gray-500', !active);
    }
  });
  renderFinanceGlobalPeriodBar();
}

function renderFinanceView() {
  if (!isAdmin()) return;
  setFinanceTab(state.financeTab || 'dashboard');
  renderFinanceDashboard();
  renderFinanceTransactions();
  renderFinanceForecast();
  renderFinanceAccounts();
  renderFinanceReports();
  renderAccountingReports();
}

// --- Finance Modal Helpers ---
function populateFinanceCategorySelect(txType) {
  const el = $('#finance-tx-category');
  if (!el) return;
  const current = el.value;
  const catTypeMap = {
    income:                ['income'],
    expense:               ['expense'],
    capital_injection:     ['capital'],
    pass_through_received: ['pass_through'],
    pass_through_spent:    ['pass_through'],
    transfer:              [],
  };
  const allowed = catTypeMap[txType] || [];
  const cats = allowed.length
    ? state.financeCategories.filter(c => c.is_active && allowed.includes(c.category_type))
    : state.financeCategories.filter(c => c.is_active);
  el.innerHTML = '<option value="">— No category —</option>' +
    cats.map(c => `<option value="${c.id}">${escapeHtml(c.category_name)}</option>`).join('');
  if (current) el.value = current;
}

function populateFinanceAccountSelects(ids) {
  const opts = '<option value="">— Select account —</option>' +
    state.financeAccounts.filter(a => a.is_active)
      .map(a => `<option value="${a.id}">${escapeHtml(a.account_name)}</option>`).join('');
  ids.forEach(id => {
    const el = $(`#${id}`);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = opts;
    if (cur) el.value = cur;
  });
}

function syncFinanceTxFields() {
  const typeEl = $('#finance-tx-type');
  if (!typeEl) return;
  const type = typeEl.value;
  const isTransfer = type === 'transfer';
  $('#finance-tx-account-row')?.classList.toggle('hidden', isTransfer);
  $('#finance-tx-from-to-rows')?.classList.toggle('hidden', !isTransfer);
  $('#finance-tx-client-row')?.classList.toggle('hidden', !['income', 'pass_through_received', 'pass_through_spent'].includes(type));
  populateFinanceCategorySelect(type);
}

function openFinanceTransactionModal(id = null, prefill = {}) {
  state.editingFinanceTransactionId = id;
  const form  = $('#finance-transaction-form');
  const title = $('#finance-tx-modal-title');
  if (!form) return;
  form.reset();
  if (title) title.textContent = id ? 'Edit Transaction' : 'New Transaction';

  const clientSel = $('#finance-tx-client');
  if (clientSel) {
    clientSel.innerHTML = '<option value="">— No client —</option>' +
      state.crmClients.filter(c => !c.is_archived)
        .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
  }
  populateFinanceAccountSelects(['finance-tx-account', 'finance-tx-from-acct', 'finance-tx-to-acct']);

  if (id) {
    const tx = state.financeTransactions.find(t => Number(t.id) === id);
    if (tx) {
      form.elements['transaction_date'].value    = tx.transaction_date?.slice(0, 10) || '';
      form.elements['transaction_type'].value    = tx.transaction_type || 'income';
      form.elements['amount'].value              = tx.amount || '';
      form.elements['account_id'].value          = tx.account_id || '';
      form.elements['from_account_id'].value     = tx.from_account_id || '';
      form.elements['to_account_id'].value       = tx.to_account_id || '';
      form.elements['client_id'].value           = tx.client_id || '';
      form.elements['description'].value         = tx.description || '';
      form.elements['payment_method'].value      = tx.payment_method || '';
      form.elements['reference'].value           = tx.reference || '';
      form.elements['transaction_number'].value  = tx.transaction_number || '';
      form.elements['status'].value              = tx.status || 'completed';
      form.elements['due_date'].value            = tx.due_date?.slice(0, 10) || '';
      form.elements['project_name'].value        = tx.project_name || '';
      form.elements['internal_notes'].value      = tx.internal_notes || '';
      form.elements['tags'].value                = (tx.tags || []).join(', ');
      syncFinanceTxFields();
      if (tx.category_id) setTimeout(() => { if (form.elements['category_id']) form.elements['category_id'].value = tx.category_id; }, 0);
    }
  } else {
    form.elements['transaction_date'].value = new Date().toISOString().slice(0, 10);
    form.elements['status'].value           = 'completed';
    Object.entries(prefill).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
    syncFinanceTxFields();
  }
  openModal('finance-transaction-modal');
}

function openFinanceAccountModal(id = null) {
  state.editingFinanceAccountId = id;
  const form  = $('#finance-account-form');
  const title = $('#finance-acct-modal-title');
  if (!form) return;
  form.reset();
  if (title) title.textContent = id ? 'Edit Account' : 'New Account';
  if (id) {
    const acct = state.financeAccounts.find(a => Number(a.id) === id);
    if (acct) {
      form.elements['account_name'].value    = acct.account_name    || '';
      form.elements['account_type'].value    = acct.account_type    || 'business_bank';
      form.elements['owner_name'].value      = acct.owner_name      || '';
      form.elements['currency'].value        = acct.currency        || 'EGP';
      form.elements['opening_balance'].value = acct.opening_balance ?? 0;
      form.elements['notes'].value           = acct.notes           || '';
      if (form.elements['is_active']) form.elements['is_active'].checked = acct.is_active !== false;
    }
  } else {
    if (form.elements['is_active']) form.elements['is_active'].checked = true;
  }
  openModal('finance-account-modal');
}

function openSplitReceiptModal() {
  const form = $('#split-receipt-form');
  if (!form) return;
  form.reset();
  form.elements['transaction_date'].value = new Date().toISOString().slice(0, 10);

  const clientSel = $('#split-client-id');
  if (clientSel) {
    clientSel.innerHTML = '<option value="">— Select client —</option>' +
      state.crmClients.filter(c => !c.is_archived)
        .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
  }
  populateFinanceAccountSelects(['split-receipt-account']);

  const incomeCats = state.financeCategories.filter(c => c.is_active && c.category_type === 'income');
  const ptCats     = state.financeCategories.filter(c => c.is_active && c.category_type === 'pass_through');
  const incomeSel = $('#split-income-cat');
  if (incomeSel) incomeSel.innerHTML = '<option value="">— Category —</option>' +
    incomeCats.map(c => `<option value="${c.id}">${escapeHtml(c.category_name)}</option>`).join('');
  const ptSel = $('#split-pt-cat');
  if (ptSel) ptSel.innerHTML = '<option value="">— Category —</option>' +
    ptCats.map(c => `<option value="${c.id}">${escapeHtml(c.category_name)}</option>`).join('');

  const ptDisplay = $('#split-pt-display');
  if (ptDisplay) ptDisplay.textContent = '0 EGP';
  openModal('split-receipt-modal');
}

// --- Finance Form Handlers ---
async function handleFinanceAccountSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const id   = state.editingFinanceAccountId;
  const payload = {
    account_name:    form.elements['account_name'].value.trim(),
    account_type:    form.elements['account_type'].value,
    owner_name:      form.elements['owner_name'].value.trim() || null,
    currency:        form.elements['currency'].value || 'EGP',
    opening_balance: Number(form.elements['opening_balance'].value) || 0,
    notes:           form.elements['notes'].value.trim() || null,
    is_active:       form.elements['is_active'] ? form.elements['is_active'].checked : true,
    updated_at:      new Date().toISOString(),
  };
  if (!payload.account_name) { toast('Account name is required.', 'error'); return; }
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  let ok = false;
  if (id) {
    ok = !!(await updateFinanceAccount(id, payload));
  } else {
    payload.created_at = new Date().toISOString();
    ok = !!(await createFinanceAccount(payload));
  }
  if (btn) btn.disabled = false;
  if (ok) {
    toast(id ? 'Account updated.' : 'Account created.', 'success');
    closeModal();
    state.financeAccounts = await fetchFinanceAccounts();
    renderFinanceView();
  }
}

async function handleFinanceTransactionSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const id   = state.editingFinanceTransactionId;
  const type = form.elements['transaction_type']?.value;
  const isTransfer = type === 'transfer';
  const tagsRaw = form.elements['tags']?.value.trim() || '';
  const clientId = Number(form.elements['client_id']?.value) || null;
  const txNumRaw = form.elements['transaction_number']?.value.trim() || '';
  const now2 = new Date();
  const autoTxNum = txNumRaw || (!id ? generateFinanceTxNumber() : undefined);
  const payload = {
    transaction_date:    form.elements['transaction_date'].value,
    transaction_type:    type,
    status:              form.elements['status']?.value || 'completed',
    amount:              Number(form.elements['amount'].value) || 0,
    account_id:          !isTransfer ? (Number(form.elements['account_id']?.value) || null)      : null,
    from_account_id:      isTransfer ? (Number(form.elements['from_account_id']?.value) || null) : null,
    to_account_id:        isTransfer ? (Number(form.elements['to_account_id']?.value) || null)   : null,
    client_id:           clientId,
    client_name:         clientId ? (state.crmClients.find(c => Number(c.id) === clientId)?.client_name || null) : null,
    category_id:         Number(form.elements['category_id']?.value) || null,
    description:         form.elements['description']?.value.trim()  || null,
    payment_method:      form.elements['payment_method']?.value      || null,
    reference:           form.elements['reference']?.value.trim()    || null,
    due_date:            form.elements['due_date']?.value            || null,
    project_name:        form.elements['project_name']?.value.trim() || null,
    internal_notes:      form.elements['internal_notes']?.value.trim() || null,
    tags:                tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    updated_at:          new Date().toISOString(),
  };
  if (autoTxNum !== undefined) payload.transaction_number = autoTxNum;
  if (!payload.transaction_date)        { toast('Date is required.', 'error'); return; }
  if (!payload.amount || payload.amount <= 0) { toast('Amount must be greater than 0.', 'error'); return; }
  if (isTransfer && (!payload.from_account_id || !payload.to_account_id)) {
    toast('Both From and To accounts are required for a transfer.', 'error'); return;
  }
  if (!isTransfer && !payload.account_id) { toast('Account is required.', 'error'); return; }
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  let ok = false;
  if (id) {
    const oldTx = state.financeTransactions.find(t => Number(t.id) === id);
    const result = await updateFinanceTransaction(id, payload);
    if (result) await insertFinanceAuditLog({ entityType: 'transaction', entityId: id, action: 'updated', oldData: oldTx, newData: result });
    ok = !!result;
  } else {
    payload.created_at = new Date().toISOString();
    payload.created_by = state.currentUser?.id || null;
    ok = !!(await createFinanceTransaction(payload));
  }
  if (btn) btn.disabled = false;
  if (ok) {
    toast(id ? 'Transaction updated.' : 'Transaction added.', 'success');
    closeModal();
    await loadFinanceTransactionsAndSync();
    renderFinanceView();
  }
}

async function handleSplitReceiptSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form     = e.target;
  const txDate   = form.elements['transaction_date'].value;
  const clientId = Number(form.elements['client_id']?.value)          || null;
  const acctId   = Number(form.elements['account_id']?.value)         || null;
  const totalAmt = Number(form.elements['total_amount'].value)         || 0;
  const svcAmt   = Number(form.elements['service_amount'].value)       || 0;
  const ptAmt    = totalAmt - svcAmt;
  const incomeCatId = Number(form.elements['income_category_id']?.value) || null;
  const ptCatId     = Number(form.elements['pt_category_id']?.value)     || null;
  const reference   = form.elements['reference']?.value.trim()           || null;
  const projectName = form.elements['project_name']?.value.trim()        || null;
  if (!txDate)           { toast('Date is required.',                          'error'); return; }
  if (!acctId)           { toast('Account is required.',                        'error'); return; }
  if (totalAmt <= 0)     { toast('Total amount must be greater than 0.',        'error'); return; }
  if (svcAmt <= 0)       { toast('Service amount must be greater than 0.',      'error'); return; }
  if (svcAmt >= totalAmt){ toast('Service amount must be less than total amount.','error'); return; }
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  const now = new Date().toISOString();
  const createdBy = state.currentUser?.id || null;
  const incomeResult = await createFinanceTransaction({
    transaction_date: txDate, transaction_type: 'income', account_id: acctId,
    client_id: clientId, category_id: incomeCatId, amount: svcAmt,
    project_name: projectName, description: 'Service income (split receipt)',
    reference, created_by: createdBy, created_at: now, updated_at: now,
  });
  if (!incomeResult) { if (btn) btn.disabled = false; return; }
  const ptResult = await createFinanceTransaction({
    transaction_date: txDate, transaction_type: 'pass_through_received', account_id: acctId,
    client_id: clientId, category_id: ptCatId, amount: ptAmt,
    project_name: projectName, description: 'Client budget (split receipt)',
    related_transaction_id: incomeResult.id, reference,
    created_by: createdBy, created_at: now, updated_at: now,
  });
  if (btn) btn.disabled = false;
  if (ptResult) {
    toast('Split receipt recorded.', 'success');
    closeModal();
    await loadFinanceTransactionsAndSync();
    renderFinanceView();
  }
}

function openFinanceForecastModal(id = null, prefill = {}) {
  state.editingFinanceForecastId = id;
  const form  = $('#finance-forecast-form');
  const title = $('#finance-forecast-modal-title');
  if (!form) return;
  form.reset();
  if (title) title.textContent = id ? 'Edit Forecast' : 'New Forecast';

  const clientSel = $('#finance-forecast-client');
  if (clientSel) {
    clientSel.innerHTML = '<option value="">— No client —</option>' +
      state.crmClients.filter(c => !c.is_archived)
        .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
  }
  populateFinanceAccountSelects(['finance-forecast-account']);
  const catSel = $('#finance-forecast-category');
  if (catSel) {
    catSel.innerHTML = '<option value="">— No category —</option>' +
      state.financeCategories.filter(c => c.is_active)
        .map(c => `<option value="${c.id}">${escapeHtml(c.category_name)}</option>`).join('');
  }

  if (id) {
    const fc = state.financeForecasts.find(f => Number(f.id) === id);
    if (fc) {
      form.elements['expected_date'].value  = fc.expected_date?.slice(0, 10) || '';
      form.elements['forecast_type'].value  = fc.forecast_type || 'expected_income';
      form.elements['amount'].value         = fc.amount || '';
      form.elements['probability'].value    = fc.probability ?? 100;
      form.elements['status'].value         = fc.status || 'expected';
      form.elements['account_id'].value     = fc.account_id || '';
      form.elements['client_id'].value      = fc.client_id || '';
      form.elements['project_name'].value   = fc.project_name || '';
      form.elements['category_id'].value    = fc.category_id || '';
      form.elements['description'].value    = fc.description || '';
      form.elements['internal_notes'].value = fc.internal_notes || '';
      form.elements['tags'].value           = (fc.tags || []).join(', ');
    }
  } else {
    form.elements['expected_date'].value = new Date().toISOString().slice(0, 10);
    form.elements['probability'].value   = 100;
    Object.entries(prefill).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
  }
  openModal('finance-forecast-modal');
}

async function handleFinanceForecastSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const id   = state.editingFinanceForecastId;
  const oldFc = id ? state.financeForecasts.find(f => Number(f.id) === id) : null;
  // Forecast Safety: a schedule-generated Forecast is immutable through this
  // manual edit flow — it stays in sync with its Payment Schedule Item
  // exclusively via updateGeneratedForecastFromSchedule(), which writes
  // directly through updateFinanceForecast() and never goes through this
  // handler. Blocking here, not inside updateFinanceForecast() itself, keeps
  // that synchronization write path untouched.
  if (oldFc?.generated_from_schedule) {
    toast('This forecast is generated from the Payment Schedule and cannot be edited manually.', 'error');
    return;
  }
  const clientId = Number(form.elements['client_id']?.value) || null;
  const tagsRaw  = form.elements['tags']?.value.trim() || '';
  const payload = {
    expected_date:  form.elements['expected_date'].value,
    forecast_type:  form.elements['forecast_type'].value,
    amount:         Number(form.elements['amount'].value) || 0,
    probability:    Number(form.elements['probability'].value) ?? 100,
    status:         form.elements['status'].value || 'expected',
    account_id:     Number(form.elements['account_id']?.value)  || null,
    client_id:      clientId,
    client_name:    clientId ? (state.crmClients.find(c => Number(c.id) === clientId)?.client_name || null) : null,
    project_name:   form.elements['project_name']?.value.trim()   || null,
    category_id:    Number(form.elements['category_id']?.value)   || null,
    description:    form.elements['description']?.value.trim()    || null,
    internal_notes: form.elements['internal_notes']?.value.trim() || null,
    tags:           tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    updated_at:     new Date().toISOString(),
  };
  if (!payload.expected_date)              { toast('Expected date is required.', 'error'); return; }
  if (!payload.amount || payload.amount <= 0) { toast('Amount must be greater than 0.', 'error'); return; }
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  let ok = false;
  if (id) {
    const result = await updateFinanceForecast(id, payload);
    if (result) await insertFinanceAuditLog({ entityType: 'forecast', entityId: id, action: 'updated', oldData: oldFc, newData: result });
    ok = !!result;
  } else {
    payload.forecast_date = new Date().toISOString().slice(0, 10);
    payload.created_by    = state.currentUser?.id || null;
    payload.created_at    = new Date().toISOString();
    ok = !!(await createFinanceForecast(payload));
  }
  if (btn) btn.disabled = false;
  if (ok) {
    toast(id ? 'Forecast updated.' : 'Forecast created.', 'success');
    closeModal();
    state.financeForecasts = await fetchFinanceForecasts();
    renderFinanceView();
  }
}

// ---------- Project Commercial Terms / Payment Schedule Modals (Sprint Project Commercial B) ----------

function openCommercialTermsModal() {
  if (!isAdmin()) return;
  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  if (!project) return;

  const form  = $('#commercial-terms-form');
  const title = $('#commercial-terms-modal-title');
  if (!form) return;
  form.reset();

  const terms = state.projectCommercialTerms.find((ct) => Number(ct.project_id) === Number(project.id)) || null;
  if (title) title.textContent = terms ? 'Edit Commercial Terms' : 'Set Commercial Terms';

  if (terms) {
    form.elements['contract_value'].value = terms.contract_value ?? '';
    form.elements['currency'].value       = terms.currency || 'EGP';
    form.elements['notes'].value          = terms.notes || '';
  } else {
    form.elements['currency'].value = 'EGP';
  }

  openModal('commercial-terms-modal');
}

async function handleCommercialTermsSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;

  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  if (!project) return;

  const form = e.target;
  const contractValue = Number(form.elements['contract_value'].value);
  const currency = form.elements['currency'].value;

  if (!Number.isFinite(contractValue) || contractValue < 0) {
    toast('Contract Value must be 0 or greater.', 'error');
    return;
  }
  if (!currency) {
    toast('Currency is required.', 'error');
    return;
  }

  const existing = state.projectCommercialTerms.find((ct) => Number(ct.project_id) === Number(project.id)) || null;

  // Financial Data Integrity: once Payment Schedule Items exist under these
  // Commercial Terms, their amounts (and any collected Finance Transactions
  // against them) are already denominated in the original currency —
  // switching Currency here would silently mismatch every existing
  // scheduled/collected figure against the new one with no conversion.
  if (existing && existing.currency && currency !== existing.currency) {
    const hasScheduleItems = state.projectPaymentScheduleItems
      .some((i) => Number(i.commercial_terms_id) === Number(existing.id));
    if (hasScheduleItems) {
      toast('Currency cannot be changed once Payment Schedule Items exist for this project.', 'error');
      return;
    }
  }

  const payload = {
    contract_value: contractValue,
    currency,
    notes: form.elements['notes'].value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;

  let ok = false;
  if (existing) {
    ok = !!(await updateProjectCommercialTerms(existing.id, payload));
  } else {
    payload.project_id = project.id;
    payload.created_by = state.currentUser?.id || null;
    payload.created_at = new Date().toISOString();
    ok = !!(await createProjectCommercialTerms(payload));
  }

  if (btn) btn.disabled = false;

  if (ok) {
    toast(existing ? 'Commercial terms updated.' : 'Commercial terms saved.', 'success');
    closeModal();
    state.projectCommercialTerms = await fetchProjectCommercialTerms();
    renderProjectDetails();
  }
}

function updateClientFundsPurposeRequiredIndicator() {
  const form = $('#payment-item-form');
  const indicator = $('#client-funds-purpose-required-indicator');
  if (!form || !indicator) return;
  const clientFundsAmount = Number(form.elements['client_funds_amount']?.value) || 0;
  indicator.classList.toggle('hidden', !(clientFundsAmount > 0));
}

function openPaymentItemModal(id = null) {
  if (!isAdmin()) return;
  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  if (!project) return;

  const terms = state.projectCommercialTerms.find((ct) => Number(ct.project_id) === Number(project.id)) || null;
  if (!terms) {
    toast('Set Commercial Terms before adding a payment.', 'error');
    return;
  }

  state.editingPaymentScheduleItemId = id;
  const form  = $('#payment-item-form');
  const title = $('#payment-item-modal-title');
  if (!form) return;
  form.reset();
  if (title) title.textContent = id ? 'Edit Payment' : 'Add Payment';

  if (id) {
    const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === id);
    if (item) {
      form.elements['label'].value                = item.label || '';
      form.elements['due_date'].value              = item.due_date?.slice(0, 10) || '';
      form.elements['total_amount'].value          = item.total_amount ?? '';
      form.elements['revenue_amount'].value        = item.revenue_amount ?? '';
      form.elements['client_funds_amount'].value   = item.client_funds_amount ?? '';
      form.elements['client_funds_purpose'].value  = item.client_funds_purpose || '';
    }
  }

  updateClientFundsPurposeRequiredIndicator();
  openModal('payment-item-modal');
}

async function handlePaymentItemSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;

  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  if (!project) return;

  const terms = state.projectCommercialTerms.find((ct) => Number(ct.project_id) === Number(project.id)) || null;
  if (!terms) {
    toast('Set Commercial Terms before adding a payment.', 'error');
    return;
  }

  const form = e.target;
  const id = state.editingPaymentScheduleItemId;

  const dueDate = form.elements['due_date'].value;
  const totalAmount = Number(form.elements['total_amount'].value);

  // Revenue Amount and Client Funds Amount are optional composition fields —
  // an empty input means 0, not "missing".
  const revenueAmountRaw     = form.elements['revenue_amount'].value.trim();
  const clientFundsAmountRaw = form.elements['client_funds_amount'].value.trim();
  const revenueAmount        = revenueAmountRaw === '' ? 0 : Number(revenueAmountRaw);
  const clientFundsAmount    = clientFundsAmountRaw === '' ? 0 : Number(clientFundsAmountRaw);

  if (!dueDate) {
    toast('Due Date is required.', 'error');
    return;
  }
  if (![totalAmount, revenueAmount, clientFundsAmount].every((n) => Number.isFinite(n) && n >= 0)) {
    toast('Total, Revenue, and Client Funds amounts must be 0 or greater.', 'error');
    return;
  }
  // Compare in integer cents to avoid float rounding false-negatives.
  if (Math.round((revenueAmount + clientFundsAmount) * 100) !== Math.round(totalAmount * 100)) {
    toast('Total Amount must equal Revenue Amount + Client Funds Amount.', 'error');
    return;
  }

  // Financial Data Integrity: a component can never be edited down below
  // what has already been collected against it — Outstanding is derived as
  // component amount minus Collected (getPaymentItemOutstanding), so
  // dropping the amount below Collected would silently produce a negative
  // Outstanding (clamped to 0, i.e. money already received quietly vanishes
  // from the schedule).
  if (id) {
    const collected = getPaymentItemCollected(id);
    if (Math.round(revenueAmount * 100) < Math.round(collected.revenue * 100)) {
      toast(`Revenue Amount cannot be reduced below the ${fmtMoney(collected.revenue, terms.currency)} already collected.`, 'error');
      return;
    }
    if (Math.round(clientFundsAmount * 100) < Math.round(collected.clientFunds * 100)) {
      toast(`Client Funds Amount cannot be reduced below the ${fmtMoney(collected.clientFunds, terms.currency)} already collected.`, 'error');
      return;
    }
  }

  // Client Funds Purpose only applies when Client Funds Amount > 0 — clear
  // any stale value (e.g. left over from editing an item down to 0) rather
  // than persisting a purpose for a $0 component.
  const clientFundsPurpose = clientFundsAmount > 0
    ? (form.elements['client_funds_purpose'].value.trim() || null)
    : null;

  if (clientFundsAmount > 0 && !clientFundsPurpose) {
    toast('Client Funds Purpose is required when Client Funds Amount is greater than 0.', 'error');
    return;
  }

  const payload = {
    label: form.elements['label'].value.trim() || null,
    due_date: dueDate,
    total_amount: totalAmount,
    revenue_amount: revenueAmount,
    client_funds_amount: clientFundsAmount,
    client_funds_purpose: clientFundsPurpose,
    updated_at: new Date().toISOString(),
  };

  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;

  let ok = false;
  if (id) {
    ok = !!(await updateProjectPaymentScheduleItem(id, payload));
  } else {
    payload.commercial_terms_id = terms.id;
    payload.created_by = state.currentUser?.id || null;
    payload.created_at = new Date().toISOString();
    ok = !!(await createProjectPaymentScheduleItem(payload));
  }

  if (btn) btn.disabled = false;

  if (ok) {
    toast(id ? 'Payment updated.' : 'Payment added.', 'success');
    closeModal();
    state.editingPaymentScheduleItemId = null;
    state.projectPaymentScheduleItems = await fetchProjectPaymentScheduleItems();
    renderProjectDetails();
  }
}

async function handleCancelPaymentScheduleItem(id) {
  if (!isAdmin()) return;
  // Collections Safety: a Payment Schedule Item with any valid collected
  // transaction against it can never be cancelled — cancelling would orphan
  // real money already received from the Outstanding/Collected model (Item
  // is the source of truth those figures derive from). Checked here, not
  // just hidden in the UI, since this is the actual write path.
  if (getPaymentItemCollected(id).total > 0) {
    toast('This payment has collections recorded against it and cannot be cancelled.', 'error');
    return;
  }
  const result = await cancelProjectPaymentScheduleItem(id);
  if (result) {
    toast('Payment marked as cancelled.', 'success');
    state.projectPaymentScheduleItems = await fetchProjectPaymentScheduleItems();
    renderProjectDetails();
  }
}

async function handleRestorePaymentScheduleItem(id) {
  if (!isAdmin()) return;
  const result = await restoreProjectPaymentScheduleItem(id);
  if (result) {
    toast('Payment restored.', 'success');
    state.projectPaymentScheduleItems = await fetchProjectPaymentScheduleItems();
    renderProjectDetails();
  }
}

// ---------- Collect Payment (Sprint Finance Completion — Collections Foundation) ----------
// Records a collection directly as 1–2 Finance Transactions against a
// Payment Schedule Item — no payment_collections entity, per the locked
// architecture. A Mixed item (both components > 0) produces one transaction
// per eligible component, the second linked to the first via
// related_transaction_id — the same shape the existing Split Receipt feature
// already uses for one client payment split across income + pass-through.
// No allocation logic: the admin enters exactly what was collected per
// component (each input defaults to that component's own current
// Outstanding, so a plain full collection is just accepting the defaults).
function openCollectPaymentModal(itemId) {
  if (!isAdmin()) return;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === itemId);
  if (!item || item.is_cancelled) return;
  const terms = state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id));
  if (!terms) return;

  state.collectingPaymentItemId = itemId;
  const form = $('#collect-payment-form');
  if (!form) return;
  form.reset();

  const currency = terms.currency || 'EGP';
  const outstanding = getPaymentItemOutstanding(item);

  const titleEl = $('#collect-payment-modal-title');
  if (titleEl) titleEl.textContent = `Collect Payment — ${item.label || `Payment #${item.id}`}`;
  const metaEl = $('#collect-payment-modal-meta');
  if (metaEl) metaEl.textContent = `Due ${fmtDate(item.due_date)} · Outstanding ${fmtMoney(outstanding.total, currency)}`;

  const revenueEligible     = Number(item.revenue_amount) > 0;
  const clientFundsEligible = Number(item.client_funds_amount) > 0;

  const revenueRow = $('#collect-payment-revenue-row');
  if (revenueRow) {
    revenueRow.classList.toggle('hidden', !revenueEligible);
    if (revenueEligible) {
      form.elements['revenue_collected'].value = outstanding.revenue > 0 ? outstanding.revenue.toFixed(2) : '';
      $('#collect-payment-revenue-outstanding').textContent = `Outstanding: ${fmtMoney(outstanding.revenue, currency)}`;
    }
  }
  const clientFundsRow = $('#collect-payment-client-funds-row');
  if (clientFundsRow) {
    clientFundsRow.classList.toggle('hidden', !clientFundsEligible);
    if (clientFundsEligible) {
      form.elements['client_funds_collected'].value = outstanding.clientFunds > 0 ? outstanding.clientFunds.toFixed(2) : '';
      $('#collect-payment-client-funds-outstanding').textContent = `Outstanding: ${fmtMoney(outstanding.clientFunds, currency)}`;
    }
  }

  populateFinanceAccountSelects(['collect-payment-account']);
  form.elements['transaction_date'].value = new Date().toISOString().slice(0, 10);

  openModal('collect-payment-modal');
}

async function handleCollectPaymentSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const itemId = state.collectingPaymentItemId;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === itemId);
  if (!item) return;
  const terms = state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id));
  const project = terms ? state.projects.find((p) => Number(p.id) === Number(terms.project_id)) : null;
  if (!terms || !project) return;

  const transactionDate = form.elements['transaction_date'].value;
  const accountId = Number(form.elements['account_id'].value) || null;
  const revenueRaw     = form.elements['revenue_collected']?.value.trim() || '';
  const clientFundsRaw = form.elements['client_funds_collected']?.value.trim() || '';
  const revenueAmt     = revenueRaw === '' ? 0 : Number(revenueRaw);
  const clientFundsAmt = clientFundsRaw === '' ? 0 : Number(clientFundsRaw);

  if (!transactionDate) { toast('Date is required.', 'error'); return; }
  if (!accountId)       { toast('Account is required.', 'error'); return; }
  if (![revenueAmt, clientFundsAmt].every((n) => Number.isFinite(n) && n >= 0)) {
    toast('Amounts must be 0 or greater.', 'error'); return;
  }
  if (revenueAmt <= 0 && clientFundsAmt <= 0) {
    toast('Enter at least one amount collected.', 'error'); return;
  }

  const client = resolveGeneratedForecastClient(project);
  const now = new Date().toISOString();
  const description = `Collection: ${item.label || `Payment #${item.id}`}`;
  const currency = terms.currency || 'EGP';

  // One payload per eligible, non-zero component, always in the same order
  // (revenue first, client funds second) so the sibling-link step below
  // knows which result is which.
  const payloads = [];
  if (revenueAmt > 0) {
    payloads.push({
      transaction_date: transactionDate, transaction_type: 'income', status: 'completed',
      account_id: accountId, client_id: client.client_id, client_name: client.client_name,
      amount: revenueAmt, currency, description, project_name: project.project_name || null,
      payment_schedule_item_id: item.id,
      created_by: state.currentUser?.id || null, created_at: now, updated_at: now,
    });
  }
  if (clientFundsAmt > 0) {
    payloads.push({
      transaction_date: transactionDate, transaction_type: 'pass_through_received', status: 'completed',
      account_id: accountId, client_id: client.client_id, client_name: client.client_name,
      amount: clientFundsAmt, currency, description, project_name: project.project_name || null,
      payment_schedule_item_id: item.id,
      created_by: state.currentUser?.id || null, created_at: now, updated_at: now,
    });
  }

  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;

  // Single atomic insert — both rows land or neither does. This is the
  // operation Collected/Outstanding actually depend on (they sum by
  // payment_schedule_item_id + component, never by related_transaction_id),
  // so correctness is guaranteed here regardless of what happens next.
  const result = await createFinanceTransactionsBatch(payloads);

  // Best-effort sibling link for a Mixed collection, purely for audit/UI
  // traceability (mirrors Split Receipt's related_transaction_id). If this
  // single follow-up write fails, both transactions already exist and are
  // already correctly counted — nothing about Collected/Outstanding depends
  // on it, so it is not rolled back and does not fail the collection.
  if (result && result.length === 2) {
    const [revenueTx, clientFundsTx] = result;
    const linked = await updateFinanceTransaction(clientFundsTx.id, { related_transaction_id: revenueTx.id });
    if (!linked) console.error('handleCollectPaymentSubmit: sibling link update failed for transaction', clientFundsTx.id);
  }

  if (btn) btn.disabled = false;
  if (result) {
    toast('Payment collected.', 'success');
    closeModal();
    state.collectingPaymentItemId = null;
    await loadFinanceTransactionsAndSync();
    renderProjectDetails();
  }
}

function applyMemberDashboardLayout() {
  const dashboard = $('#view-dashboard');
  if (!dashboard) return;
  dashboard.classList.remove('member-dashboard', 'manager-dashboard');
  if (isMember()) {
    dashboard.classList.add('member-dashboard');
  } else if (isManager()) {
    dashboard.classList.add('manager-dashboard');
  }
}

function renderAll() {
  applyMemberDashboardLayout();
  populateTeamMembers();
  renderStats();
  renderCharts();
  renderTodayFocus();
  renderRecentProjects();
  renderRecentTasks();
  renderProjects();
  renderTasks();
  renderMyPerformance();
  renderTeamLeaderboard();
  renderMyPerformanceTrend();
  renderMyAchievements();
  renderCrmDashboard();
  renderCrmLeads();
  renderCrmClients();
  renderCrmContacts();
  renderCrmDeals();
  renderCrmActivities();
  renderCrmProposals();
  renderFinanceView();

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
    resetProjectDetailsFiltersForProject(state.selectedProjectId);
    setView('project-details');
    renderProjectDetails();
  } else if (
    savedView === 'lead-details' &&
    state.selectedLeadId
  ) {
    state.selectedLeadId = Number(state.selectedLeadId);
    setView('lead-details');
    renderLeadDetails();
  } else if (
    savedView === 'client-details' &&
    state.selectedClientId
  ) {
    state.selectedClientId = Number(state.selectedClientId);
    setView('client-details');
    renderClientDetails();
  } else if (
    savedView === 'contact-details' &&
    state.selectedContactId
  ) {
    state.selectedContactId = Number(state.selectedContactId);
    setView('contact-details');
    renderContactDetails();
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

// C2: a Team Member record with status 'inactive', or no matching Team
// Member record at all for the signed-in Supabase Auth user, must never be
// treated as a valid session. Called everywhere role is (re)resolved from
// team_members — init() on load/session-restore, and refreshDataAndRender()
// on every realtime team_members change and every Team Member edit
// (handleMemberSubmit already calls refreshDataAndRender() on success), so
// all three required trigger points share this one check. Signs the
// Supabase session out and returns to Login when it fires; returns false
// (no-op) for a normal active session so nothing else is affected.
async function denyAccessIfNotActiveMember(member) {
  if (!state.currentUser?.id) return false;
  const inactive = !member || (member.status || '').toLowerCase() === 'inactive';
  if (!inactive) return false;

  await supabaseClient.auth.signOut();
  state.currentUser = null;
  state.currentMember = null;
  state.currentRole = null;

  const errorEl = $('#login-error');
  if (errorEl) {
    errorEl.textContent = member
      ? 'Your account is inactive. Contact an administrator.'
      : 'No active Team Member record was found for this account. Contact an administrator.';
    errorEl.classList.remove('hidden');
  }
  $('#auth-screen')?.classList.remove('hidden');
  return true;
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

// Returns non-archived, role-scoped tasks.
// Used by dashboard stats, alerts, recent tasks, and nav counters.
// Active task views (Tasks table 'active' mode) also start from this set.
function getVisibleTasks() {
  if (isAdmin() || isManager()) {
    return state.tasks.filter((t) => !t.is_archived);
  }

  const member = getCurrentMember();
  if (!member) return [];

  const memberName = (member.name || '').toLowerCase().trim();

  return state.tasks.filter(
    (t) => !t.is_archived && (t.assigned_to || '').toLowerCase().trim() === memberName
  );
}

// Role-scoped tasks regardless of archive status.
// Used only by the Tasks view when archiveView !== 'active'.
function getVisibleTasksAllArchive() {
  if (isAdmin() || isManager()) return state.tasks;

  const member = getCurrentMember();
  if (!member) return [];

  const memberName = (member.name || '').toLowerCase().trim();
  return state.tasks.filter(
    (t) => (t.assigned_to || '').toLowerCase().trim() === memberName
  );
}

// Base for Tasks view: honours the archiveView filter.
function getTaskViewBase() {
  const av = state.filters.tasks.archiveView || 'active';
  if (av === 'archived') return getVisibleTasksAllArchive().filter((t) => t.is_archived);
  if (av === 'all') return getVisibleTasksAllArchive();
  return getVisibleTasks(); // 'active' — excludes archived
}

function getVisibleProjects() {
  if (isAdmin() || isManager()) {
    return state.projects;
  }

  const visibleTasks = getVisibleTasks();
  const visibleProjectIds = new Set(
    visibleTasks.map((t) => Number(t.project_id))
  );

  return state.projects.filter((p) => visibleProjectIds.has(Number(p.id)));
}

// Operational projects: the non-archived subset of whatever the caller is
// permitted to see. Unlike getProjectViewBase(), this ignores the Projects
// page archiveView toggle — Dashboard KPIs must always reflect the current
// operational state of the company, not whatever filter the user last left
// the Projects page on. Single source of truth for every Dashboard project KPI.
function getOperationalProjects() {
  return getVisibleProjects().filter((p) => !p.is_archived);
}

// A project status that permanently ends the engagement — used to decide
// archival. Kept distinct from the "on_hold"/"planning" statuses, which are
// non-terminal and never auto-archive.
function isTerminalProjectStatus(status) {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'cancelled';
}

function shouldArchiveProject(project) {
  return isTerminalProjectStatus(project?.status);
}

// Base for the Projects view: honours the archiveView filter
// (active/archived/all), mirroring getTaskViewBase().
function getProjectViewBase() {
  const av = state.filters.projects.archiveView || 'active';
  if (av === 'archived') return state.projects.filter((p) => p.is_archived);
  if (av === 'all') return state.projects;
  return state.projects.filter((p) => !p.is_archived); // 'active' — excludes archived
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

// ---------- Task Permission Helpers ----------
// Centralized task business rules. Callers (modals, table renderers, etc.)
// should ask these functions instead of checking isAdmin()/isManager()/
// isMember() directly for task-related decisions.
function isOwnTask(task) {
  const currentMember = getCurrentMember();

  if (!currentMember) return false;

  return (task.assigned_to || '').toLowerCase().trim() ===
    (currentMember.name || '').toLowerCase().trim();
}

function canFullyEditTask() {
  return isAdmin() || isManager();
}

// Deliberately not gated by isMember() (exact currentRole === 'member' match)
// — gated by ownership instead. A non-admin/non-manager who owns this task
// can always limited-edit it, even if their role_type string is unmapped;
// non-owners are never granted access regardless. This mirrors the same
// fail-open-on-identity / fail-closed-on-data-access pattern already applied
// to canViewPerformanceRanking().
function canLimitedEditTask(task) {
  return !isAdmin() && !isManager() && isOwnTask(task);
}

function canCreateTask() {
  return isAdmin() || isManager();
}

function canDeleteTask(task) {
  return isAdmin() || isManager();
}

// ---------- Project Permission Helpers (C6) ----------
// Mirrors the pre-existing UI gating exactly (project row action buttons,
// the New Project button toggle) — this is a parity fix adding the same
// check at the data-write layer, not a change to who can do what.
function canCreateProject() {
  return isAdmin() || isManager();
}

function canEditProject() {
  return isAdmin() || isManager();
}

function canDeleteProject() {
  return isAdmin();
}

// Single source of truth for Performance feature access (monthly history,
// hall of fame, snapshot generation). Ranking has its own, more permissive
// rule — see canViewPerformanceRanking().
function canAccessPerformance() {
  return isAdmin() || isManager();
}

// Performance Ranking is visible to every role, unlike the rest of the
// Performance features gated by canAccessPerformance(). Also permissive for
// any resolved team-member identity (not only an exact currentRole==='member'
// match) — viewing the ranking carries no data-exposure risk the way task
// scoping does, so this intentionally fails open rather than hiding the
// ranking from a recognized user whose role_type string is unmapped.
function canViewPerformanceRanking() {
  return isAdmin() || isManager() || isMember() || !!getCurrentMember();
}

// Fields a Manager may not edit on any task.
const TASK_MANAGER_RESTRICTED_FIELDS = ['start_date', 'deadline'];

// Fields a Member may edit on their own task (see canLimitedEditTask).
const TASK_MEMBER_EDITABLE_FIELDS = ['status', 'task_link', 'notes'];

function canEditTaskField(fieldName, task) {
  if (isAdmin()) return true;

  if (isManager()) {
    return !TASK_MANAGER_RESTRICTED_FIELDS.includes(fieldName);
  }

  // Not admin, not manager: this is only ever reached via
  // openEditTaskModal(), which already required canLimitedEditTask(task) —
  // i.e. ownership of this exact task — to get this far. Matches
  // canLimitedEditTask()'s identity check rather than re-testing isMember()
  // so the two stay consistent regardless of an unmapped role_type string.
  return TASK_MEMBER_EDITABLE_FIELDS.includes(fieldName);
}

// ---------- View Switching ----------
function syncSearchInputWithView() {
  const searchInput = $('#global-search');
  if (!searchInput) return;

  if (state.view === 'projects') {
    searchInput.value = state.filters.projects.search;
  } else if (state.view === 'tasks') {
    searchInput.value = state.filters.tasks.search;
  } else if (state.view === 'project-details') {
    searchInput.value = state.filters.projectDetails.search;
  } else if (state.view === 'team') {
    searchInput.value = state.filters.team.search;
  } else {
    searchInput.value = '';
  }
}

function setView(view) {
  if ((view === 'crm' || view === 'lead-details' || view === 'client-details' || view === 'contact-details') && !isAdmin()) {
    view = 'dashboard';
  }

  // Business items are Admin-only
  if (['finance', 'hr', 'assets'].includes(view) && !isAdmin()) {
    view = 'dashboard';
  }

  // Analytics/Reports are Admin or Manager only
  if (view === 'reports' && !isAdmin() && !isManager()) {
    view = 'dashboard';
  }

  closeAllHeaderFilterPopovers();

  state.view = view;
  localStorage.setItem('tgora_current_view', view);
  syncSearchInputWithView();

  $$('.view').forEach((el) => el.classList.add('hidden'));
  const target = $(`#view-${view}`);
  if (target) target.classList.remove('hidden');

  $$('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });

if (view === 'dashboard') {
  renderMyPerformance();
  renderTeamLeaderboard();
  renderMyPerformanceTrend();
}

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
          ${renderMemberActionsCell(member, {
            canManage: canEditTeamMember(),
            canDelete: canDeleteTeamMember(),
          })}
        </td>
      </tr>
    `).join('');

    refreshIcons();
  }

  renderTeamPerformance();
}

  // CRM nav item (Admin-only)
  const crmNavItem = $('#nav-crm-item');
  if (crmNavItem) {
    crmNavItem.classList.toggle('hidden', !isAdmin());
  }

  // Business section label + Finance/HR/Assets nav items (Admin-only)
  $('#sidebar-business-label')?.classList.toggle('hidden', !isAdmin());
  ['#nav-finance-item', '#nav-hr-item', '#nav-assets-item'].forEach((sel) => {
    $(sel)?.classList.toggle('hidden', !isAdmin());
  });

  // Analytics section label + Reports nav item (Admin or Manager only)
  const canSeeAnalytics = isAdmin() || isManager();
  $('#sidebar-analytics-label')?.classList.toggle('hidden', !canSeeAnalytics);
  $('#nav-reports-item')?.classList.toggle('hidden', !canSeeAnalytics);

  const crmNewLeadBtn = $('#crm-new-lead-btn');
  if (crmNewLeadBtn) {
    crmNewLeadBtn.classList.toggle('hidden', !isAdmin());
  }

  const crmNewClientBtn = $('#crm-new-client-btn');
  if (crmNewClientBtn) {
    crmNewClientBtn.classList.toggle('hidden', !isAdmin());
  }

  $$('[data-action="open-project-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !(isAdmin() || isManager()));
  });

  $$('[data-action="open-member-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !isAdmin());
  });

    $$('[data-action="open-task-modal"]').forEach((btn) => {
    btn.classList.toggle('hidden', !canCreateTask());
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

  const isArchive  = type.endsWith('_archive');
  const isSoftDel  = type.endsWith('_soft_delete');
  const isPermaDel = type.endsWith('_permanent_delete');

  const titleEl = $('#confirm-modal-title');
  if (titleEl) {
    titleEl.textContent = isArchive  ? `Archive this ${labelize(type.replace('_archive', ''))}?`
                        : isSoftDel  ? 'Move to Trash?'
                        : isPermaDel ? 'Permanently Delete?'
                        : 'Delete this item?';
  }

  const iconWrap = $('#confirm-icon-wrap');
  if (iconWrap) {
    if (isArchive) {
      iconWrap.className = 'w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4';
      iconWrap.innerHTML = '<i data-lucide="archive" class="w-5 h-5"></i>';
    } else if (isSoftDel) {
      iconWrap.className = 'w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4';
      iconWrap.innerHTML = '<i data-lucide="trash" class="w-5 h-5"></i>';
    } else if (isPermaDel) {
      iconWrap.className = 'w-12 h-12 mx-auto rounded-full bg-red-50 text-red-700 flex items-center justify-center mb-4';
      iconWrap.innerHTML = '<i data-lucide="trash-2" class="w-5 h-5"></i>';
    } else {
      iconWrap.className = 'w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4';
      iconWrap.innerHTML = '<i data-lucide="trash-2" class="w-5 h-5"></i>';
    }
  }

  const btn = $('#confirm-delete-btn');
  if (btn) {
    if (isArchive) {
      btn.className = 'h-9 px-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg shadow-sm';
      btn.innerHTML = '<i data-lucide="archive" class="w-4 h-4"></i> Archive';
    } else if (isSoftDel) {
      btn.className = 'h-9 px-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg shadow-sm';
      btn.innerHTML = '<i data-lucide="trash" class="w-4 h-4"></i> Move to Trash';
    } else if (isPermaDel) {
      btn.className = 'h-9 px-4 inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg shadow-sm';
      btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i> Delete Permanently';
    } else {
      btn.className = 'h-9 px-4 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg shadow-sm';
      btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i> Delete';
    }
  }

  $('#confirm-msg').textContent = isArchive  ? `${label} will be moved to the archived list.`
                                 : isSoftDel  ? `${label} will be moved to Trash and hidden from active views. You can restore it later.`
                                 : isPermaDel ? `${label} will be PERMANENTLY deleted from the database. This action cannot be undone.`
                                 : `${label} will be permanently removed.${type === 'project' ? ' Tasks under this project will also be deleted.' : ''}`;

  refreshIcons();
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
  state.projectCreationSourceDealId = null;

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

// Sprint CRM-5 — explicit, user-triggered "Create Project" action from a Won
// Deal (see the Related Projects section in openDealDetailsModal()). Project
// creation is never automatic on stage change; this is the only path that
// creates a Project from a Deal, and only when the user clicks it. Reuses
// the existing New Project modal/handler rather than a separate form. A Deal
// may produce multiple Projects, so the only guard is that the Deal must be
// Won — re-checked in handleProjectSubmit() as the authoritative enforcement
// point; this function's check only prevents the modal from opening in an
// invalid state.
function openCreateProjectFromDeal(dealId) {
  if (!isAdmin()) return;
  const deal = state.crmDeals.find(d => Number(d.id) === Number(dealId));
  if (!deal) { toast('Deal not found', 'error'); return; }
  if (deal.stage !== 'won') { toast('This Deal must be Won before creating a Project.', 'error'); return; }

  openCreateProjectModal();

  const client = state.crmClients.find(c => Number(c.id) === Number(deal.client_id));
  const form = $('#project-form');
  if (form?.client && client) {
    form.client.value = client.client_name || '';
  }

  state.projectCreationSourceDealId = deal.id;
  const title = $('#project-modal-title');
  if (title) title.textContent = 'Create Project from Deal';
}

function openEditProjectModal(id) {
  const project = state.projects.find((p) => p.id === id);

  if (!project) {
    toast('Project not found', 'error');
    return;
  }

  state.editingProjectId = id;
  state.projectCreationSourceDealId = null;

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

// ---------- Lead Modal Helpers ----------
function populateLeadClientSelect() {
  const sel = $('#lead-client-id');
  if (!sel) return;
  const activeClients = state.crmClients.filter(c => !c.is_archived);
  sel.innerHTML = '<option value="">-- Select a company --</option>' +
    activeClients.map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

// Sprint CRM-4.5D — Contact select is filtered to the Company chosen in
// #lead-client-id. Passing selectedContactId re-selects it only if it still
// belongs to clientId (used when editing a lead that already has a contact).
function populateLeadContactSelect(clientId, selectedContactId) {
  const sel = $('#lead-contact-id');
  const hint = $('#lead-contact-empty-hint');
  if (!sel) return;
  if (!clientId) {
    sel.innerHTML = '<option value="">-- Select a company first --</option>';
    sel.disabled = true;
    if (hint) hint.classList.add('hidden');
    return;
  }
  const contacts = state.crmContacts.filter(c => !c.is_archived && Number(c.client_id) === Number(clientId));
  sel.disabled = false;
  sel.innerHTML = '<option value="">-- Select a contact --</option>' +
    contacts.map(c => `<option value="${c.id}">${escapeHtml(c.contact_name)}</option>`).join('');
  if (hint) hint.classList.toggle('hidden', contacts.length > 0);
  if (selectedContactId != null && contacts.some(c => Number(c.id) === Number(selectedContactId))) {
    sel.value = String(selectedContactId);
  }
}

// Sprint CRM-4.5D — Fills the readonly Contact Info preview and the hidden
// snapshot fields (company_name/contact_person/phone/whatsapp/email) that
// legacy render code still reads. These are always derived here, never
// typed by the user.
function renderLeadContactPreview(contactId) {
  const previewEl = $('#lead-contact-preview');
  const contact = contactId ? state.crmContacts.find(c => Number(c.id) === Number(contactId)) : null;
  if (previewEl) previewEl.classList.toggle('hidden', !contact);
  const setPreview = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val || '—'; };
  setPreview('lead-contact-preview-phone', contact?.phone);
  setPreview('lead-contact-preview-whatsapp', contact?.whatsapp);
  setPreview('lead-contact-preview-email', contact?.email);
  setPreview('lead-contact-preview-title', contact?.title);

  const form = $('#lead-form');
  if (!form) return;
  const clientSel = $('#lead-client-id');
  const client = clientSel?.value ? state.crmClients.find(c => Number(c.id) === Number(clientSel.value)) : null;
  if (form.company_name)   form.company_name.value   = client ? (client.client_name || '') : '';
  if (form.contact_person) form.contact_person.value = contact ? (contact.contact_name || '') : '';
  if (form.phone)           form.phone.value           = contact ? (contact.phone || '') : '';
  if (form.whatsapp)        form.whatsapp.value        = contact ? (contact.whatsapp || '') : '';
  if (form.email)           form.email.value           = contact ? (contact.email || '') : '';
}

// Sprint CRM-4.5D — Service Interest is now a select backed by active CRM
// Service Types, storing service_name text in the existing service_interest
// column (no service_type_id migration this sprint). If a lead's legacy
// value doesn't match any active service type, it's kept as an extra
// "(legacy)" option so editing the lead never silently discards it.
function populateLeadServiceInterestSelect(currentValue) {
  const sel = $('#lead-service-interest');
  if (!sel) return;
  const options = getActiveCrmServiceTypes();
  let optionsHtml = '<option value="">-- No service type --</option>' +
    options.map(s => `<option value="${escapeHtml(s.service_name)}">${escapeHtml(s.service_name)}</option>`).join('');
  const matchesExisting = currentValue && options.some(s => s.service_name === currentValue);
  if (currentValue && !matchesExisting) {
    optionsHtml += `<option value="${escapeHtml(currentValue)}">${escapeHtml(currentValue)} (legacy)</option>`;
  }
  sel.innerHTML = optionsHtml;
  sel.value = currentValue || '';
}

function openNewLeadModal() {
  if (!isAdmin()) return;
  state.editingLeadId = null;
  const form = $('#lead-form');
  form.reset();
  populateLeadOwnerSelect();
  populateLeadClientSelect();
  populateLeadContactSelect(null);
  populateLeadServiceInterestSelect('');
  renderLeadContactPreview(null);
  $('#lead-modal-title').textContent = 'New Lead';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Lead';
  refreshIcons();
  openModal('lead-modal');
}

function openEditLeadModal(id) {
  if (!isAdmin()) return;
  const lead = state.crmLeads.find((l) => Number(l.id) === id);
  if (!lead) { toast('Lead not found', 'error'); return; }
  state.editingLeadId = id;
  state.leadEditReturnView = state.view;
  const form = $('#lead-form');
  form.reset();
  populateLeadOwnerSelect();
  populateLeadClientSelect();
  form.lead_name.value         = lead.lead_name || '';
  form.company_name.value      = lead.company_name || '';
  form.contact_person.value    = lead.contact_person || '';
  form.phone.value             = lead.phone || '';
  form.whatsapp.value          = lead.whatsapp || '';
  form.email.value             = lead.email || '';
  form.source.value            = lead.source || 'unknown';
  form.referred_by.value       = lead.referred_by || '';
  form.expected_budget.value   = lead.expected_budget || '';
  form.priority.value          = lead.priority || 'medium';
  form.status.value            = normalizeCrmLeadStatusForDisplay(lead.status || 'new');
  form.owner_id.value          = lead.owner_id != null ? String(lead.owner_id) : '';
  form.next_follow_up.value    = lead.next_follow_up || '';
  form.notes.value             = lead.notes || '';
  populateLeadServiceInterestSelect(lead.service_interest || '');
  const clientSel = $('#lead-client-id');
  if (clientSel) clientSel.value = lead.client_id != null ? String(lead.client_id) : '';
  populateLeadContactSelect(lead.client_id, lead.contact_id);
  // Legacy rows without contact_id keep their free-text snapshot values
  // (set above) untouched until the user explicitly picks a Contact.
  if (lead.contact_id) {
    renderLeadContactPreview(lead.contact_id);
  } else {
    $('#lead-contact-preview')?.classList.add('hidden');
  }
  $('#lead-modal-title').textContent = 'Edit Lead';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Lead';
  refreshIcons();
  openModal('lead-modal');
}

async function handleLeadSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;

  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingLeadId !== null;

  // Company is a hard requirement (form.client_id is a required select).
  // Contact is only required when the selected Company actually has
  // contacts to choose from — companies with zero contacts (Scope C) must
  // still be able to save a lead without one.
  const contactSel = $('#lead-contact-id');
  if (contactSel && !contactSel.disabled && contactSel.options.length > 1 && !contactSel.value) {
    toast('Select a contact for this lead', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));

  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  else payload.client_id = null;
  if (payload.contact_id) payload.contact_id = Number(payload.contact_id);
  else payload.contact_id = null;

  let result = null;
  if (isEditing) {
    payload.updated_at = new Date().toISOString();
    result = await updateCrmLead(state.editingLeadId, payload);
  } else {
    result = await createCrmLead(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing
    ? '<i data-lucide="check" class="w-4 h-4"></i> Update Lead'
    : '<i data-lucide="check" class="w-4 h-4"></i> Create Lead';
  refreshIcons();

  if (!result) return;

  toast(isEditing ? 'Lead updated' : 'Lead created', 'success');
  const returnView = state.leadEditReturnView;
  state.editingLeadId = null;
  state.leadEditReturnView = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
  if (returnView === 'lead-details' && state.selectedLeadId) {
    setView('lead-details');
    renderLeadDetails();
  } else {
    setView('crm');
  }
}

// ---------- Client Modal Helpers ----------
// Sprint CRM-3B — Company Type select only offers company/individual going
// forward (Type is entity type, not industry). Existing rows saved with a
// legacy value (e.g. 'real_estate', 'clinic') must still display and edit
// safely without being silently coerced to 'company'. These two helpers keep
// the shared #client-form select clean between opens and only inject a
// legacy option when editing a record that actually needs it.
function resetLegacyClientTypeOptions(select) {
  if (!select) return;
  Array.from(select.options)
    .filter((o) => o.dataset.legacyClientType === 'true')
    .forEach((o) => o.remove());
}

function ensureClientTypeOption(select, value) {
  if (!select || !value) return;
  const exists = Array.from(select.options).some((o) => o.value === value);
  if (!exists) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = `${labelize(value)} (legacy)`;
    opt.dataset.legacyClientType = 'true';
    select.appendChild(opt);
  }
}

// Sprint CRM-4.5B — Industry stays a free-text input (no lookup table), but
// swaps which <datalist> of suggestions it points at based on Type, so
// Company vs Individual get different suggested values without a second
// input or any server-side change.
function updateClientIndustryDatalist(typeValue) {
  const input = $('#client-industry-input');
  if (!input) return;
  input.setAttribute('list', typeValue === 'individual' ? 'client-industry-datalist-individual' : 'client-industry-datalist-company');
}

// Sprint CRM-4.5B — Referred By is only relevant when Source = Referral;
// clearing it when hidden avoids saving stale text from a previously
// selected Source.
function updateClientReferredByVisibility(sourceValue, form) {
  const field = $('#client-referred-by-field');
  if (!field) return;
  const show = sourceValue === 'referral';
  field.classList.toggle('hidden', !show);
  if (!show && form?.referred_by) form.referred_by.value = '';
}

function openNewClientModal() {
  if (!isAdmin()) return;
  state.editingClientId = null;
  state.clientEditReturnView = null;
  const form = $('#client-form');
  form.reset();
  resetLegacyClientTypeOptions(form.client_type);
  updateClientIndustryDatalist(form.client_type.value);
  updateClientReferredByVisibility(form.source.value, form);
  $('#client-modal-title').textContent = 'New Company';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Company';
  refreshIcons();
  openModal('client-modal');
}

function openEditClientModal(id) {
  if (!isAdmin()) return;
  const client = state.crmClients.find((c) => Number(c.id) === id);
  if (!client) { toast('Company not found', 'error'); return; }
  state.editingClientId = id;
  state.clientEditReturnView = state.view;
  const form = $('#client-form');
  form.reset();
  form.client_name.value = client.client_name || '';
  resetLegacyClientTypeOptions(form.client_type);
  ensureClientTypeOption(form.client_type, client.client_type);
  form.client_type.value = client.client_type || 'company';
  updateClientIndustryDatalist(form.client_type.value);
  form.industry.value    = client.industry || '';
  form.website.value     = client.website || '';
  form.phone.value       = client.phone || '';
  form.whatsapp.value    = client.whatsapp || '';
  form.email.value       = client.email || '';
  form.address.value     = client.address || '';
  form.source.value      = client.source || 'unknown';
  updateClientReferredByVisibility(form.source.value, form);
  form.referred_by.value    = client.referred_by || '';
  form.facebook_url.value   = client.facebook_url || '';
  form.instagram_url.value  = client.instagram_url || '';
  form.linkedin_url.value   = client.linkedin_url || '';
  form.tiktok_url.value     = client.tiktok_url || '';
  form.snapchat_url.value   = client.snapchat_url || '';
  form.other_social_url.value = client.other_social_url || '';
  form.status.value      = client.status || 'active';
  form.notes.value       = client.notes || '';
  $('#client-modal-title').textContent = 'Edit Company';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Company';
  refreshIcons();
  openModal('client-modal');
}

async function handleClientSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;

  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingClientId !== null;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));

  let result = null;
  if (isEditing) {
    payload.updated_at = new Date().toISOString();
    result = await updateCrmClient(state.editingClientId, payload);
  } else {
    result = await createCrmClient(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing
    ? '<i data-lucide="check" class="w-4 h-4"></i> Update Company'
    : '<i data-lucide="check" class="w-4 h-4"></i> Create Company';
  refreshIcons();

  if (!result) return;

  toast(isEditing ? 'Company updated' : 'Company created', 'success');
  const returnView = state.clientEditReturnView;
  state.editingClientId = null;
  state.clientEditReturnView = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
  if (returnView === 'client-details' && state.selectedClientId) {
    setView('client-details');
    renderClientDetails();
  } else {
    setView('crm');
  }
}

// ---------- Contact Modal Helpers ----------
function populateContactClientSelect() {
  const select = $('#contact-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No company</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

// Sprint CRM-4.5C — low-risk helper text only; does not auto-create or
// change any company link, just clarifies what saving the form will do.
function updateContactCompanyHelper(clientIdValue) {
  const helper = $('#contact-company-helper');
  if (!helper) return;
  const client = clientIdValue ? state.crmClients.find(c => Number(c.id) === Number(clientIdValue)) : null;
  if (client) {
    helper.textContent = `This contact will be linked to ${client.client_name}.`;
    helper.classList.remove('hidden');
  } else {
    helper.classList.add('hidden');
  }
}

function openNewContactModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingContactId = null;
  const form = $('#contact-form');
  form.reset();
  populateContactClientSelect();
  if (prefillClientId) { const sel = $('#contact-client-id'); if (sel) sel.value = prefillClientId; }
  updateContactCompanyHelper($('#contact-client-id')?.value);
  $('#contact-modal-title').textContent = 'New Contact';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Contact';
  refreshIcons();
  openModal('contact-modal');
}

function openEditContactModal(id) {
  if (!isAdmin()) return;
  const contact = state.crmContacts.find(c => Number(c.id) === id);
  if (!contact) { toast('Contact not found', 'error'); return; }
  state.editingContactId = id;
  const form = $('#contact-form');
  form.reset();
  populateContactClientSelect();
  form.contact_name.value = contact.contact_name || '';
  form.title.value = contact.title || '';
  form.phone.value = contact.phone || '';
  form.whatsapp.value = contact.whatsapp || '';
  form.email.value = contact.email || '';
  form.notes.value = contact.notes || '';
  if (form.status) form.status.value = getCrmContactStatus(contact);
  const sel = $('#contact-client-id');
  if (sel) sel.value = contact.client_id != null ? String(contact.client_id) : '';
  updateContactCompanyHelper(sel?.value);
  $('#contact-modal-title').textContent = 'Edit Contact';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Contact';
  refreshIcons();
  openModal('contact-modal');
}

async function handleContactSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingContactId !== null;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  if (!payload.status) payload.status = 'active';
  let result = null;
  if (isEditing) { payload.updated_at = new Date().toISOString(); result = await updateCrmContact(state.editingContactId, payload); }
  else { result = await createCrmContact(payload); }
  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing ? '<i data-lucide="check" class="w-4 h-4"></i> Update Contact' : '<i data-lucide="check" class="w-4 h-4"></i> Create Contact';
  refreshIcons();
  if (!result) return;
  toast(isEditing ? 'Contact updated' : 'Contact created', 'success');
  state.editingContactId = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
}

// ---------- Deal Modal Helpers ----------
function populateDealClientSelect() {
  const select = $('#deal-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select a company --</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function populateDealOwnerSelect() {
  const select = $('#deal-owner-id');
  if (!select) return;
  select.innerHTML = '<option value="">No owner</option>' +
    state.teamMembers.filter(m => (m.status || '').toLowerCase() !== 'inactive')
      .map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

// Sprint CRM-2 — falls back to a bare "No service type" option if
// crm_service_types is empty (table missing or not seeded yet).
function populateDealServiceTypeSelect() {
  const select = $('#deal-service-type-id');
  if (!select) return;
  select.innerHTML = '<option value="">No service type</option>' +
    getActiveCrmServiceTypes()
      .map(s => `<option value="${s.id}">${escapeHtml(s.service_name)}</option>`).join('');
}

// Sprint CRM-4.5D Fix Pass 2 — Related Lead is filtered to the Company
// selected in #deal-client-id (previously it listed every non-archived Lead
// from every Company, which was the reported bug). Disabled with a neutral
// placeholder until a Company is chosen — the safest UX, since Related Lead
// is optional and an unfiltered list is exactly what we're removing.
// selectedLeadId is always preserved/selected even when it doesn't belong to
// the filtered list (legacy data, or a Lead with no linked Company), so
// callers like openCreateDealFromLead()/openEditDealModal() never silently
// lose a Lead link that was already explicitly set.
function populateDealLeadSelect(clientId, selectedLeadId) {
  const select = $('#deal-lead-id');
  if (!select) return;

  const selectedLead = selectedLeadId != null
    ? state.crmLeads.find(l => Number(l.id) === Number(selectedLeadId))
    : null;

  if (!clientId) {
    if (selectedLead) {
      select.disabled = false;
      select.innerHTML = `<option value="">No linked lead</option><option value="${selectedLead.id}">${escapeHtml(selectedLead.lead_name)}</option>`;
      select.value = String(selectedLead.id);
    } else {
      select.innerHTML = '<option value="">-- Select a company first --</option>';
      select.disabled = true;
    }
    return;
  }

  const leads = state.crmLeads.filter(l => !l.is_archived && Number(l.client_id) === Number(clientId));
  select.disabled = false;
  let optionsHtml = '<option value="">No linked lead</option>' +
    leads.map(l => `<option value="${l.id}">${escapeHtml(l.lead_name)}</option>`).join('');

  const alreadyIncluded = selectedLead && leads.some(l => Number(l.id) === Number(selectedLead.id));
  if (selectedLead && !alreadyIncluded) {
    optionsHtml += `<option value="${selectedLead.id}">${escapeHtml(selectedLead.lead_name)} (different company)</option>`;
  }
  select.innerHTML = optionsHtml;
  if (selectedLead) select.value = String(selectedLead.id);
}

// Sprint CRM-4.5E — Probability is a 0–100 range slider; this keeps the
// percentage label next to the field in sync with the slider position.
function updateDealProbabilityDisplay() {
  const input = $('#deal-probability');
  const label = $('#deal-probability-value');
  if (!input || !label) return;
  label.textContent = `${input.value || 0}%`;
}

// Sprint CRM-4.5E — Expected Close Date is locked (disabled, value kept
// visible and untouched) while the Deal is in a closed stage (Won/Lost).
// Switching back to an open stage re-enables it. The value is never cleared
// or replaced here; handleDealSubmit() re-includes the displayed value even
// when the input is disabled, so what the user sees is what gets saved.
function updateDealExpectedCloseLock() {
  const form = $('#deal-form');
  if (!form || !form.stage) return;
  const closed = form.stage.value === 'won' || form.stage.value === 'lost';
  const input = $('#deal-expected-close-date');
  if (input) input.disabled = closed;
  $('#deal-close-locked-note')?.classList.toggle('hidden', !closed);
}

// Sprint CRM-3B — selecting a Related Lead on the Deal form fills in only
// currently-empty, clearly-safe fields (client, owner, service type, value).
// Deal name is intentionally NOT autofilled — company_name/lead_name alone
// isn't a meaningful deal name, and inventing one risks overwriting what the
// user intends to type. It never overwrites a field the user (or a prior
// edit) already populated, never touches the database, and the user can
// freely edit any autofilled value before saving — this is UI-only
// convenience, not a Lead conversion or automation.
function handleDealLeadAutofill() {
  const form = $('#deal-form');
  const leadSel = $('#deal-lead-id');
  if (!form || !leadSel || !leadSel.value) return;

  const lead = state.crmLeads.find((l) => Number(l.id) === Number(leadSel.value));
  if (!lead) return;

  const clientSel = $('#deal-client-id');
  if (clientSel && !clientSel.value && lead.client_id != null) {
    clientSel.value = String(lead.client_id);
  }

  const ownerSel = $('#deal-owner-id');
  if (ownerSel && !ownerSel.value && lead.owner_id != null) {
    ownerSel.value = String(lead.owner_id);
  }

  const serviceSel = $('#deal-service-type-id');
  if (serviceSel && !serviceSel.value && lead.service_interest) {
    const wanted = lead.service_interest.trim().toLowerCase();
    const match = getActiveCrmServiceTypes().find((s) => s.service_name.toLowerCase() === wanted);
    if (match) serviceSel.value = String(match.id);
  }

  if (form.value && !form.value.value.trim() && lead.expected_budget) {
    const parsed = parseFloat(String(lead.expected_budget).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      form.value.value = String(parsed);
    }
  }
}

function openNewDealModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingDealId = null;
  state.dealCreationSourceLeadId = null;
  const form = $('#deal-form');
  form.reset();
  populateDealClientSelect();
  populateDealOwnerSelect();
  populateDealServiceTypeSelect();
  if (prefillClientId) { const sel = $('#deal-client-id'); if (sel) sel.value = prefillClientId; }
  populateDealLeadSelect(prefillClientId || null, null);
  updateDealProbabilityDisplay();
  updateDealExpectedCloseLock();
  $('#deal-modal-title').textContent = 'New Deal';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Deal';
  refreshIcons();
  openModal('deal-modal');
}

// Sprint CRM-4.5D Fix Pass 2 — explicit, user-triggered "Create Deal" action
// from a Converted Lead (see renderLeadDetails()'s Related Deals chip).
// Conversion never auto-creates a Deal; this is the only path that does,
// and only when the user clicks it. A Lead may now qualify multiple Deals
// (approved business rule), so this no longer blocks when a Deal already
// exists for the Lead. Reuses openNewDealModal()/handleDealLeadAutofill() so
// the same "only fill currently-empty, clearly-safe fields, never guess the
// Deal name" behavior from Sprint CRM-3B applies here too.
function openCreateDealFromLead(leadId) {
  if (!isAdmin()) return;
  const lead = state.crmLeads.find(l => Number(l.id) === Number(leadId));
  if (!lead) { toast('Lead not found', 'error'); return; }

  openNewDealModal(lead.client_id != null ? lead.client_id : undefined);
  populateDealLeadSelect(lead.client_id != null ? lead.client_id : null, lead.id);
  handleDealLeadAutofill();
  state.dealCreationSourceLeadId = lead.id;
  $('#deal-modal-title').textContent = 'Create Deal from Lead';
}

function openEditDealModal(id) {
  if (!isAdmin()) return;
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  if (!deal) { toast('Deal not found', 'error'); return; }
  state.editingDealId = id;
  state.dealCreationSourceLeadId = null;
  const form = $('#deal-form');
  form.reset();
  populateDealClientSelect();
  populateDealOwnerSelect();
  populateDealServiceTypeSelect();
  form.deal_name.value = deal.deal_name || '';
  form.stage.value = deal.stage || 'discovery';
  form.value.value = deal.value != null ? String(deal.value) : '';
  form.currency.value = deal.currency || 'EGP';
  form.expected_close_date.value = deal.expected_close_date || '';
  // Range sliders can't be empty — a Deal without a probability sits at 0,
  // which round-trips back to NULL on save (handleDealSubmit treats 0 as
  // "no probability", same as the old empty textbox).
  form.probability.value = deal.probability != null ? String(deal.probability) : '0';
  form.notes.value = deal.notes || '';
  const cSel = $('#deal-client-id'); if (cSel) cSel.value = deal.client_id != null ? String(deal.client_id) : '';
  const oSel = $('#deal-owner-id'); if (oSel) oSel.value = deal.owner_id != null ? String(deal.owner_id) : '';
  const sSel = $('#deal-service-type-id'); if (sSel) sSel.value = deal.service_type_id != null ? String(deal.service_type_id) : '';
  populateDealLeadSelect(deal.client_id, deal.lead_id);
  updateDealProbabilityDisplay();
  updateDealExpectedCloseLock();
  $('#deal-modal-title').textContent = 'Edit Deal';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Deal';
  refreshIcons();
  openModal('deal-modal');
}

async function handleDealSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingDealId !== null;

  // Company is a hard requirement — mirrors the same check already done for
  // Lead (form.client_id is also now a required select; this is the
  // explicit JS backstop, same pattern as Lead's contact check above).
  if (!form.client_id.value) {
    toast('Select a company before saving this deal.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  else payload.client_id = null;
  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.value) payload.value = Number(payload.value);
  if (payload.service_type_id) payload.service_type_id = Number(payload.service_type_id);
  else payload.service_type_id = null;
  if (payload.lead_id) payload.lead_id = Number(payload.lead_id);
  else payload.lead_id = null;
  if (payload.probability) payload.probability = Number(payload.probability);
  else payload.probability = null;
  // Sprint CRM-4.5E — a disabled input (Expected Close locked on Won/Lost)
  // is excluded from FormData; re-include the displayed value so the saved
  // date always matches what the form shows, without clearing or replacing.
  const closeInput = $('#deal-expected-close-date');
  if (closeInput && closeInput.disabled) {
    payload.expected_close_date = closeInput.value || null;
  }

  // Sprint CRM-4.5D Fix Pass 2 — a Lead may qualify multiple Deals (approved
  // business rule), so linking more than one Deal to the same lead_id is no
  // longer blocked here or anywhere else in this write path.

  let result = null;
  if (isEditing) { payload.updated_at = new Date().toISOString(); result = await updateCrmDeal(state.editingDealId, payload); }
  else { result = await createCrmDeal(payload); }
  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing ? '<i data-lucide="check" class="w-4 h-4"></i> Update Deal' : '<i data-lucide="check" class="w-4 h-4"></i> Create Deal';
  refreshIcons();
  if (!result) return;
  toast(isEditing ? 'Deal updated' : 'Deal created', 'success');
  state.editingDealId = null;
  form.reset();
  closeModal();
  const returnToLeadId = state.dealCreationSourceLeadId;
  state.dealCreationSourceLeadId = null;
  await refreshDataAndRender();
  if (!isEditing && returnToLeadId) {
    openLeadDetails(returnToLeadId);
  } else {
    setCrmTab('deals');
  }
}

// ---------- Activity Modal Helpers ----------
function populateActivityClientSelect() {
  const select = $('#activity-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No company</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function populateActivityOwnerSelect() {
  const select = $('#activity-owner-id');
  if (!select) return;
  select.innerHTML = '<option value="">No owner</option>' +
    state.teamMembers.filter(m => (m.status || '').toLowerCase() !== 'inactive')
      .map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

// Sprint CRM-4.5E — Related Lead on the Activity form, filtered to the
// Company selected in #activity-client-id. Mirrors populateDealLeadSelect()
// exactly: disabled with a neutral placeholder until a Company is chosen,
// and an already-selected Lead is always preserved (with a suffix when it
// falls outside the filtered list) so edit/context flows never silently
// lose an existing lead link.
function populateActivityLeadSelect(clientId, selectedLeadId) {
  const select = $('#activity-lead-id');
  if (!select) return;

  const selectedLead = selectedLeadId != null
    ? state.crmLeads.find(l => Number(l.id) === Number(selectedLeadId))
    : null;

  if (!clientId) {
    if (selectedLead) {
      select.disabled = false;
      select.innerHTML = `<option value="">No linked lead</option><option value="${selectedLead.id}">${escapeHtml(selectedLead.lead_name)}</option>`;
      select.value = String(selectedLead.id);
    } else {
      select.innerHTML = '<option value="">-- Select a company first --</option>';
      select.disabled = true;
    }
    return;
  }

  const leads = state.crmLeads.filter(l => !l.is_archived && Number(l.client_id) === Number(clientId));
  select.disabled = false;
  let optionsHtml = '<option value="">No linked lead</option>' +
    leads.map(l => `<option value="${l.id}">${escapeHtml(l.lead_name)}</option>`).join('');

  const alreadyIncluded = selectedLead && leads.some(l => Number(l.id) === Number(selectedLead.id));
  if (selectedLead && !alreadyIncluded) {
    optionsHtml += `<option value="${selectedLead.id}">${escapeHtml(selectedLead.lead_name)} (different company)</option>`;
  }
  select.innerHTML = optionsHtml;
  if (selectedLead) select.value = String(selectedLead.id);
}

// Sprint CRM-4.5E — Related Deal on the Activity form. Filtered to the
// selected Company; when a Related Lead is also selected it narrows further
// to Deals belonging to that Lead (approved optional refinement). Same
// preserve-the-selection rule as the Lead select: a Deal that is already
// linked stays selectable (suffixed) even when it falls outside the
// filtered list, so legacy data and cross-flow edits are never dropped.
function populateActivityDealSelect(clientId, leadId, selectedDealId) {
  const select = $('#activity-deal-id');
  if (!select) return;

  const selectedDeal = selectedDealId != null
    ? state.crmDeals.find(d => Number(d.id) === Number(selectedDealId))
    : null;

  if (!clientId) {
    if (selectedDeal) {
      select.disabled = false;
      select.innerHTML = `<option value="">No linked deal</option><option value="${selectedDeal.id}">${escapeHtml(selectedDeal.deal_name)}</option>`;
      select.value = String(selectedDeal.id);
    } else {
      select.innerHTML = '<option value="">-- Select a company first --</option>';
      select.disabled = true;
    }
    return;
  }

  let deals = state.crmDeals.filter(d => !d.is_archived && Number(d.client_id) === Number(clientId));
  if (leadId != null) deals = deals.filter(d => Number(d.lead_id) === Number(leadId));
  select.disabled = false;
  let optionsHtml = '<option value="">No linked deal</option>' +
    deals.map(d => `<option value="${d.id}">${escapeHtml(d.deal_name)}</option>`).join('');

  const alreadyIncluded = selectedDeal && deals.some(d => Number(d.id) === Number(selectedDeal.id));
  if (selectedDeal && !alreadyIncluded) {
    const suffix = Number(selectedDeal.client_id) === Number(clientId)
      ? ' (not linked to this lead)'
      : ' (different company)';
    optionsHtml += `<option value="${selectedDeal.id}">${escapeHtml(selectedDeal.deal_name)}${suffix}</option>`;
  }
  select.innerHTML = optionsHtml;
  if (selectedDeal) select.value = String(selectedDeal.id);
}

// Sprint CRM-4 (reworked in CRM-4.5E) — prefillLeadId/prefillDealId let a
// caller attach the new Activity directly to a Lead or Deal. These are now
// visible, Company-filtered selects (previously hidden fields), so the user
// can see and adjust what the Activity relates to before saving. Context is
// completed from the entity itself: opening from a Deal also prefills the
// Deal's Company and Related Lead; opening from a Lead prefills the Lead's
// Company.
function openNewActivityModal(prefillClientId, prefillLeadId, prefillDealId) {
  if (!isAdmin()) return;
  state.editingActivityId = null;
  const form = $('#activity-form');
  form.reset();
  populateActivityClientSelect();
  populateActivityOwnerSelect();

  let clientId = prefillClientId != null ? Number(prefillClientId) : null;
  let leadId = prefillLeadId != null ? Number(prefillLeadId) : null;
  const dealId = prefillDealId != null ? Number(prefillDealId) : null;
  if (dealId != null) {
    const deal = state.crmDeals.find(d => Number(d.id) === dealId);
    if (deal) {
      if (clientId == null && deal.client_id != null) clientId = Number(deal.client_id);
      if (leadId == null && deal.lead_id != null) leadId = Number(deal.lead_id);
    }
  }
  if (leadId != null && clientId == null) {
    const lead = state.crmLeads.find(l => Number(l.id) === leadId);
    if (lead && lead.client_id != null) clientId = Number(lead.client_id);
  }

  const cSel = $('#activity-client-id');
  if (cSel) cSel.value = clientId != null ? String(clientId) : '';
  populateActivityLeadSelect(clientId, leadId);
  populateActivityDealSelect(clientId, leadId, dealId);

  $('#activity-modal-title').textContent = 'New Activity';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Activity';
  refreshIcons();
  openModal('activity-modal');
}

function openEditActivityModal(id) {
  if (!isAdmin()) return;
  const activity = state.crmActivities.find(a => Number(a.id) === id);
  if (!activity) { toast('Activity not found', 'error'); return; }
  state.editingActivityId = id;
  const form = $('#activity-form');
  form.reset();
  populateActivityClientSelect();
  populateActivityOwnerSelect();
  form.title.value = activity.title || '';
  form.activity_type.value = activity.activity_type || 'call';
  form.description.value = activity.description || '';
  form.activity_date.value = activity.activity_date || '';
  form.status.value = activity.status || 'planned';
  form.outcome.value = activity.outcome || '';
  const cSel = $('#activity-client-id'); if (cSel) cSel.value = activity.client_id != null ? String(activity.client_id) : '';
  const oSel = $('#activity-owner-id'); if (oSel) oSel.value = activity.owner_id != null ? String(activity.owner_id) : '';
  populateActivityLeadSelect(activity.client_id, activity.lead_id);
  populateActivityDealSelect(activity.client_id, activity.lead_id, activity.deal_id);
  $('#activity-modal-title').textContent = 'Edit Activity';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Activity';
  refreshIcons();
  openModal('activity-modal');
}

async function handleActivitySubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingActivityId !== null;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.lead_id) payload.lead_id = Number(payload.lead_id);
  else payload.lead_id = null;
  if (payload.deal_id) payload.deal_id = Number(payload.deal_id);
  else payload.deal_id = null;
  let result = null;
  if (isEditing) { payload.updated_at = new Date().toISOString(); result = await updateCrmActivity(state.editingActivityId, payload); }
  else { result = await createCrmActivity(payload); }
  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing ? '<i data-lucide="check" class="w-4 h-4"></i> Update Activity' : '<i data-lucide="check" class="w-4 h-4"></i> Create Activity';
  refreshIcons();
  if (!result) return;
  toast(isEditing ? 'Activity updated' : 'Activity created', 'success');
  state.editingActivityId = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
}

// ---------- Note Modal Helpers ----------
function populateNoteClientSelect() {
  const select = $('#note-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No company</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function openNewNoteModal(prefillClientId, prefillLeadId) {
  if (!isAdmin()) return;
  state.editingNoteId = null;
  const form = $('#note-form');
  form.reset();
  populateNoteClientSelect();
  if (prefillClientId) { const sel = $('#note-client-id'); if (sel) sel.value = prefillClientId; }
  const hid = $('#note-lead-id-hidden');
  if (hid) hid.value = prefillLeadId || '';
  $('#note-modal-title').textContent = 'New Note';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Save Note';
  refreshIcons();
  openModal('note-modal');
}

async function handleNoteSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving…';
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  if (payload.lead_id) payload.lead_id = Number(payload.lead_id);
  const result = await createCrmNote(payload);
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Save Note';
  refreshIcons();
  if (!result) return;
  toast('Note saved', 'success');
  form.reset();
  closeModal();
  const prevView = state.view;
  await refreshDataAndRender();
  if (prevView === 'client-details' && state.selectedClientId) { setView('client-details'); renderClientDetails(); }
  else if (prevView === 'lead-details' && state.selectedLeadId) { setView('lead-details'); renderLeadDetails(); }
}

// ---------- Proposal Modal Helpers ----------
function populateProposalClientSelect() {
  const select = $('#proposal-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No company</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function populateProposalOwnerSelect() {
  const select = $('#proposal-owner-id');
  if (!select) return;
  select.innerHTML = '<option value="">No owner</option>' +
    state.teamMembers.filter(m => (m.status || '').toLowerCase() !== 'inactive')
      .map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

function openNewProposalModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingProposalId = null;
  const form = $('#proposal-form');
  form.reset();
  populateProposalClientSelect();
  populateProposalOwnerSelect();
  if (prefillClientId) { const sel = $('#proposal-client-id'); if (sel) sel.value = prefillClientId; }
  $('#proposal-modal-title').textContent = 'New Proposal';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Proposal';
  refreshIcons();
  openModal('proposal-modal');
}

function openEditProposalModal(id) {
  if (!isAdmin()) return;
  const proposal = state.crmProposals.find(p => Number(p.id) === id);
  if (!proposal) { toast('Proposal not found', 'error'); return; }
  state.editingProposalId = id;
  const form = $('#proposal-form');
  form.reset();
  populateProposalClientSelect();
  populateProposalOwnerSelect();
  form.proposal_title.value = proposal.proposal_title || '';
  form.amount.value = proposal.amount != null ? String(proposal.amount) : '';
  form.currency.value = proposal.currency || 'EGP';
  form.status.value = proposal.status || 'draft';
  form.sent_date.value = proposal.sent_date || '';
  form.valid_until.value = proposal.valid_until || '';
  form.notes.value = proposal.notes || '';
  const cSel = $('#proposal-client-id'); if (cSel) cSel.value = proposal.client_id != null ? String(proposal.client_id) : '';
  const oSel = $('#proposal-owner-id'); if (oSel) oSel.value = proposal.owner_id != null ? String(proposal.owner_id) : '';
  $('#proposal-modal-title').textContent = 'Edit Proposal';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Proposal';
  refreshIcons();
  openModal('proposal-modal');
}

async function handleProposalSubmit(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const form = e.target;
  const submitBtn = form.querySelector('button[type=submit]');
  const isEditing = state.editingProposalId !== null;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.amount) payload.amount = Number(payload.amount);
  let result = null;
  if (isEditing) { payload.updated_at = new Date().toISOString(); result = await updateCrmProposal(state.editingProposalId, payload); }
  else { result = await createCrmProposal(payload); }
  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing ? '<i data-lucide="check" class="w-4 h-4"></i> Update Proposal' : '<i data-lucide="check" class="w-4 h-4"></i> Create Proposal';
  refreshIcons();
  if (!result) return;
  toast(isEditing ? 'Proposal updated' : 'Proposal created', 'success');
  state.editingProposalId = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
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

    try {
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

      let data;

      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error('Failed to create member. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create member account');
      }

      result = data.member;
    } catch (err) {
      toast(err.message || 'Failed to create member. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        `<i data-lucide="check" class="w-4 h-4"></i>
        Save Member`;

      refreshIcons();
    }

    if (!result) return;
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

  // Sprint CRM-5 — authoritative guard for Deal → Project conversion. The
  // modal only opens in this state via openCreateProjectFromDeal(), which
  // already checked this, but state can go stale (e.g. the Deal was edited
  // in another tab while this modal sat open), so re-validate here as the
  // real enforcement point rather than trusting the UI alone. A Deal may
  // produce multiple Projects, so the only requirement is that it's Won.
  let sourceDealId = null;
  if (!isEditing && state.projectCreationSourceDealId != null) {
    const deal = state.crmDeals.find(d => Number(d.id) === Number(state.projectCreationSourceDealId));
    if (!deal || deal.stage !== 'won') {
      toast('This Deal can no longer be converted to a Project. Please re-open it from Deal Details.', 'error');
      state.projectCreationSourceDealId = null;
      closeModal();
      return;
    }
    sourceDealId = deal.id;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));
  payload.is_archived = shouldArchiveProject(payload);

  if (!isEditing) {
    payload.project_code = generateProjectCode();
    if (sourceDealId != null) payload.deal_id = sourceDealId;
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
    state.projectCreationSourceDealId = null;
    form.reset();
    closeModal();

    await refreshDataAndRender();

    if (sourceDealId != null) {
      openDealDetailsModal(Number(sourceDealId));
    } else {
      setView('projects');
    }
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

// Small UX helper for the Task edit modal: disables a field per
// canEditTaskField() and gives disabled fields a clear tooltip. Does not
// itself decide permissions — it just applies the helper's verdict.
function applyTaskFieldPermission(field, fieldName, task) {
  const editable = canEditTaskField(fieldName, task);
  field.disabled = !editable;
  field.title = editable ? '' : 'You do not have permission to edit this field';
  return editable;
}

function openEditTaskModal(id) {
  const task = state.tasks.find((t) => Number(t.id) === Number(id));

  if (!task) {
    toast('Task not found', 'error');
    return;
  }

  // Explicit OR: allow if EITHER full or limited (own-task) edit access is
  // granted — never required to have both, and never blocked just because
  // canFullyEditTask() alone is false.
  const canOpenEdit = canFullyEditTask() || canLimitedEditTask(task);

  if (!canOpenEdit) {
    console.warn('You do not have permission to edit this task');
    toast('You do not have permission to edit this task', 'error');
    return;
  }

  state.editingTaskId = id;

  const form = $('#task-form');

  syncTaskProjectSelect();

  // Editing must never be blocked by legacy tasks that predate this
  // requirement — required-ness only applies to creating new tasks.
  form.assigned_to.required = false;
  form.deadline.required = false;

  // C4: rebuild the Assigned To select for THIS task before setting its
  // value, so an inactive/legacy current assignee is preserved as a
  // selectable option instead of silently failing to match and blanking out.
  populateTaskAssigneeSelect(task.assigned_to);

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

  applyTaskFieldPermission(form.task_info, 'task_info', task);
  applyTaskFieldPermission(form.assigned_to, 'assigned_to', task);
  applyTaskFieldPermission(form.priority, 'priority', task);
  applyTaskFieldPermission(form.start_date, 'start_date', task);
  applyTaskFieldPermission(form.deadline, 'deadline', task);
  applyTaskFieldPermission(form.project_id, 'project_id', task);

  applyTaskFieldPermission(form.status, 'status', task);
  applyTaskFieldPermission(form.notes, 'notes', task);

  const canEditMaterialsLink = applyTaskFieldPermission(form.materials_link, 'materials_link', task);
  applyTaskFieldPermission(form.task_link, 'task_link', task);

  // More specific than the generic permission tooltip above, so it's applied
  // after and wins for this one field.
  if (!canEditMaterialsLink) {
    form.materials_link.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
    form.materials_link.title = 'Members can view this link but cannot edit it';
  } else {
    form.materials_link.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
    form.materials_link.title = '';
  }

  // Member-only "status update" labeling — unrelated to the per-field
  // edit permissions above, kept as its own UI-only distinction.
  const isLimited = canLimitedEditTask(task) && !canFullyEditTask();

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

  // Only enforce on create — existing tasks may predate this requirement
  // and must remain editable even with a missing assignee/deadline.
  if (!isEditing) {
    const missingAssignee = !form.assigned_to.value;
    const missingDeadline = !form.deadline.value;

    if (missingAssignee && missingDeadline) {
      toast('Please select an assignee and set a deadline before creating a task', 'error');
      return;
    }

    if (missingAssignee) {
      toast('Please select an assignee before creating a task', 'error');
      return;
    }

    if (missingDeadline) {
      toast('Please set a deadline before creating a task', 'error');
      return;
    }
  }

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
        task_link: form.task_link.value || null,
        notes: form.notes.value || null
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
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Processing…`;
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

  if (type === 'lead_archive') {
    ok = !!(await archiveCrmLead(id));
  }

  if (type === 'client_archive') {
    ok = !!(await archiveCrmClient(id));
  }

  if (type === 'contact_archive') {
    ok = !!(await archiveCrmContact(id));
  }

  if (type === 'deal_archive') {
    ok = !!(await archiveCrmDeal(id));
  }

  if (type === 'activity_archive') {
    ok = !!(await archiveCrmActivity(id));
  }

  if (type === 'proposal_archive') {
    ok = !!(await archiveCrmProposal(id));
  }

  if (type === 'finance_transaction_archive') {
    ok = !!(await archiveFinanceTransaction(id));
  }
  if (type === 'finance_transaction_soft_delete') {
    ok = !!(await softDeleteFinanceTransaction(id));
  }
  if (type === 'finance_transaction_permanent_delete') {
    ok = await permanentDeleteFinanceTransaction(id);
  }

  if (type === 'finance_forecast_archive') {
    ok = !!(await archiveFinanceForecast(id));
  }
  if (type === 'finance_forecast_soft_delete') {
    ok = !!(await softDeleteFinanceForecast(id));
  }
  if (type === 'finance_forecast_permanent_delete') {
    ok = await permanentDeleteFinanceForecast(id);
  }

  btn.disabled = false;
  btn.innerHTML = type.endsWith('_archive')
    ? '<i data-lucide="archive" class="w-4 h-4"></i> Archive'
    : type.endsWith('_soft_delete')
    ? '<i data-lucide="trash" class="w-4 h-4"></i> Move to Trash'
    : type.endsWith('_permanent_delete')
    ? '<i data-lucide="trash-2" class="w-4 h-4"></i> Delete Permanently'
    : '<i data-lucide="trash-2" class="w-4 h-4"></i> Delete';
  refreshIcons();

  closeConfirm();

  if (ok) {
    const toastMsg = type.endsWith('_archive')
      ? `${labelize(type.replace('_archive', ''))} archived`
      : type.endsWith('_soft_delete')
      ? 'Moved to Trash'
      : type.endsWith('_permanent_delete')
      ? 'Permanently deleted'
      : `${labelize(type)} deleted`;
    toast(toastMsg, 'success');

    await refreshDataAndRender();

    if (currentView === 'projects') {
      setView('projects');
    } else if (currentView === 'tasks') {
      setView('tasks');
    } else if (currentView === 'team') {
      setView('team');
    } else if (currentView === 'crm') {
      setView('crm');
    } else if (currentView === 'finance') {
      setView('finance');
    } else if (currentView === 'project-details') {
      setView('project-details');
      renderProjectDetails();
    } else if (currentView === 'team-member' && state.selectedMemberId) {
      openMemberDetails(state.selectedMemberId);
    } else if (currentView === 'client-details') {
      state.selectedClientId = null;
      localStorage.removeItem('tgora_selected_client_id');
      setView('crm');
      setCrmTab('clients');
    } else if (currentView === 'contact-details') {
      state.selectedContactId = null;
      localStorage.removeItem('tgora_selected_contact_id');
      setView('crm');
      setCrmTab('contacts');
    } else if (currentView === 'lead-details') {
      state.selectedLeadId = null;
      localStorage.removeItem('tgora_selected_lead_id');
      setView('crm');
      setCrmTab('leads');
    } else {
      setView(currentView || 'dashboard');
    }
  }
}

// ---------- Event Wiring ----------
let lastProjectDetailsId = null;

function resetProjectDetailsFiltersForProject(projectId) {
  const normalizedId = Number(projectId);

  if (lastProjectDetailsId !== normalizedId) {
    lastProjectDetailsId = normalizedId;
    Object.assign(state.filters.projectDetails, HEADER_FILTER_MODULES.projectDetails.defaults);

    if (state.view === 'project-details') {
      const searchInput = $('#global-search');
      if (searchInput) searchInput.value = '';
    }
  }
}

// ---------- Forecast Schedule Linkage — State Model (Sprint Project Commercial C2) ----------
// See the C2 architecture amendment report for the full state model and the
// reasoning behind these rules. All functions in this section are pure
// (read state.financeForecasts / state.projectPaymentScheduleItems / CRM
// state only, no DB writes) so they can be reused by both the Payment
// Schedule table badges and the Review Differences modal.

// Client resolution mirrors the CRM Origin chain used elsewhere in Project
// Details (Project -> Deal -> Deal.client_id -> crm_clients — see the
// "CRM Origin" block in renderProjectDetails). A standalone Project (no
// deal_id) or a Deal whose client_id can't be resolved to a live crm_clients
// row both fall back to the Project's own text `client` field rather than
// guessing at a client_id.
function resolveGeneratedForecastClient(project) {
  if (project.deal_id != null) {
    const deal = state.crmDeals.find((d) => Number(d.id) === Number(project.deal_id));
    if (deal && deal.client_id != null) {
      const client = state.crmClients.find((c) => Number(c.id) === Number(deal.client_id));
      if (client) {
        return { client_id: client.id, client_name: client.client_name || project.client || null };
      }
    }
  }
  return { client_id: null, client_name: project.client || null };
}

const FORECAST_COMPONENT_TO_TYPE = { revenue: 'expected_income', client_funds: 'client_funds' };
const FORECAST_COMPONENT_LABEL   = { revenue: 'Revenue', client_funds: 'Client Funds' };

// A component is eligible for generation iff the Payment Schedule Item
// actually allocates a non-zero amount to it — a Payment Item with only a
// revenue_amount never gets a client_funds Forecast, and vice versa.
function getEligibleForecastComponents(item) {
  const components = [];
  if (Number(item.revenue_amount) > 0) components.push('revenue');
  if (Number(item.client_funds_amount) > 0) components.push('client_funds');
  return components;
}

function getComponentAmount(item, component) {
  return component === 'revenue' ? Number(item.revenue_amount) || 0 : Number(item.client_funds_amount) || 0;
}

function findActiveGeneratedForecast(item, component) {
  return state.financeForecasts.find((f) =>
    Number(f.payment_schedule_item_id) === Number(item.id) &&
    f.forecast_component === component &&
    f.generated_from_schedule === true &&
    !f.is_deleted &&
    f.status !== 'cancelled'
  ) || null;
}

function buildGeneratedForecastPayload(project, item, component, terms) {
  const amount = getComponentAmount(item, component);
  const client = resolveGeneratedForecastClient(project);
  const now = new Date().toISOString();
  return {
    forecast_date:               now.slice(0, 10),
    expected_date:                item.due_date,
    forecast_type:                FORECAST_COMPONENT_TO_TYPE[component],
    client_id:                    client.client_id,
    client_name:                  client.client_name,
    project_name:                  project.project_name || null,
    amount,
    currency:                     terms.currency || 'EGP',
    probability:                  100,
    status:                       'expected',
    description:                  `Generated from Payment Schedule: ${item.label || `Payment #${item.id}`} (${FORECAST_COMPONENT_LABEL[component]})`,
    payment_schedule_item_id:     item.id,
    forecast_component:           component,
    generated_from_schedule:      true,
    source_snapshot_amount:       amount,
    source_snapshot_due_date:     item.due_date,
    source_snapshot_updated_at:   item.updated_at,
    generated_by:                  state.currentUser?.id || null,
    created_by:                    state.currentUser?.id || null,
    created_at:                    now,
    updated_at:                    now,
  };
}

// Per-component drift detection against the Forecast's own snapshot. Amounts
// compare in integer cents to avoid float rounding false-positives; dates
// compare as YYYY-MM-DD strings.
function computeComponentForecastState(item, component) {
  const forecast = findActiveGeneratedForecast(item, component);
  if (!forecast) {
    return { component, forecast: null, generated: false, sourceDrift: false, forecastDrift: false, adjusted: false, immutable: false };
  }

  const amtEq  = (a, b) => Math.round((Number(a) || 0) * 100) === Math.round((Number(b) || 0) * 100);
  const dateEq = (a, b) => (a ? String(a).slice(0, 10) : null) === (b ? String(b).slice(0, 10) : null);

  const liveAmt = getComponentAmount(item, component);
  const liveDue = item.due_date;
  const snapAmt = forecast.source_snapshot_amount;
  const snapDue = forecast.source_snapshot_due_date;

  const sourceDrift   = !amtEq(liveAmt, snapAmt) || !dateEq(liveDue, snapDue);
  const forecastDrift = !amtEq(forecast.amount, snapAmt) || !dateEq(forecast.expected_date, snapDue);
  const immutable = forecast.status === 'received' || forecast.linked_transaction_id != null;

  // Forecast-only drift (source still matches its snapshot) is never treated
  // as an error — it's an intentional operational adjustment, surfaced only
  // as a secondary "Adjusted" indicator, never as Review Needed.
  return { component, forecast, generated: true, sourceDrift, forecastDrift, adjusted: !sourceDrift && forecastDrift, immutable };
}

// Item-level roll-up. Precedence: Source Cancelled > Review Needed >
// Generated > Partially Generated > Not Generated. Determined from
// component completeness and source drift ONLY — a solo Forecast-side
// adjustment never demotes/blocks Generated, it only sets the `adjusted`
// flag alongside whatever state completeness already produced (e.g. a Mixed
// item with one adjusted-but-generated component and one ungenerated
// component is "Partially Generated + Adjusted", not "Generated + Adjusted").
function computePaymentItemForecastState(item) {
  const components = getEligibleForecastComponents(item);
  const componentStates = components.map((c) => computeComponentForecastState(item, c));
  const hasActiveGenerated = componentStates.some((cs) => cs.forecast != null);

  if (item.is_cancelled) {
    return {
      state: hasActiveGenerated ? 'source_cancelled' : 'not_applicable',
      reason: null,
      adjusted: false,
      components: componentStates,
    };
  }

  const anySourceDrift  = componentStates.some((cs) => cs.sourceDrift);
  const generatedCount  = componentStates.filter((cs) => cs.generated).length;
  const adjusted        = componentStates.some((cs) => cs.adjusted);

  let state;
  let reason = null;
  if (anySourceDrift) {
    state = 'review_needed';
    reason = componentStates.some((cs) => cs.sourceDrift && cs.forecastDrift)
      ? 'source_and_forecast_changed'
      : 'source_changed';
  } else if (generatedCount === components.length && components.length > 0) {
    state = 'generated';
  } else if (generatedCount > 0) {
    state = 'partially_generated';
  } else {
    state = 'not_generated';
  }

  return { state, reason, adjusted, components: componentStates };
}

// ---------- Collections Foundation (Sprint Finance Completion — locked architecture) ----------
// Payment Schedule Item is the Single Source of Truth. Finance Transactions
// are the collection source of truth. Collected/Outstanding are ALWAYS
// derived here from live finance_transactions — never cached or stored on
// the Payment Schedule Item, the Forecast, or anywhere else.

// "Valid" mirrors the exact active-transaction filter every other Finance
// total in this codebase already uses (getFinanceSummary, getProjectPnL,
// the Accounting Journal sync): not soft-deleted, not archived, not
// cancelled.
function getPaymentItemCollected(itemId) {
  const valid = state.financeTransactions.filter((t) =>
    Number(t.payment_schedule_item_id) === Number(itemId) &&
    !t.is_deleted && !t.is_archived && t.status !== 'cancelled'
  );
  let revenue = 0, clientFunds = 0;
  valid.forEach((t) => {
    const component = getScheduleComponent(t);
    const amt = Number(t.amount) || 0;
    if (component === 'revenue') revenue += amt;
    else if (component === 'client_funds') clientFunds += amt;
  });
  return { revenue, clientFunds, total: revenue + clientFunds };
}

// Canonical Outstanding Model (WP2): clamped at 0 per component — an
// over-collection is a warning flag (isPaymentItemOverCollected below), never
// a negative Outstanding figure.
function getPaymentItemOutstanding(item) {
  const collected = getPaymentItemCollected(item.id);
  const revenue     = Math.max((Number(item.revenue_amount) || 0) - collected.revenue, 0);
  const clientFunds = Math.max((Number(item.client_funds_amount) || 0) - collected.clientFunds, 0);
  return { revenue, clientFunds, total: revenue + clientFunds, collected };
}

// Cent-rounded comparisons throughout, matching the convention
// computeComponentForecastState() already established for amount equality.
// Over-collection is deliberately NOT one of these states — see
// isPaymentItemOverCollected() below. Fully collected and over-collected are
// the same lifecycle stage (nothing more is owed); over-collection is a
// warning flag layered on top of "Collected", exactly how Overdue is layered
// on top of Scheduled/Partially Collected rather than being its own state.
function getPaymentItemCollectionState(item) {
  if (item.is_cancelled) return 'cancelled';
  const outstanding     = getPaymentItemOutstanding(item);
  const outstandingCents = Math.round(outstanding.total * 100);
  if (outstanding.collected.total > 0 && outstandingCents <= 0) return 'fully_collected';
  if (outstanding.collected.total > 0) return 'partially_collected';
  return 'scheduled';
}

// Warning/validation flag, not a state — collected more than the item's
// total_amount. Item-level granularity (matches Outstanding Total shown in
// the same row); a per-component over-collection is a separate, existing
// concern already surfaced on the Forecast list via
// getForecastCollectionState().overCollected. Deliberately computed from raw
// collected vs. total_amount, NOT from getPaymentItemOutstanding() — that
// function clamps at 0 per the Canonical Outstanding Model, so this flag
// would always read false if it were derived from the (already-clamped)
// Outstanding figure instead of the raw comparison.
function isPaymentItemOverCollected(item) {
  if (item.is_cancelled) return false;
  const collected = getPaymentItemCollected(item.id);
  return Math.round((collected.total - (Number(item.total_amount) || 0)) * 100) > 0;
}

// Overdue is owned by the Payment Schedule Item (locked architecture
// Decision 2) — a due date that has passed with nothing outstanding is not
// overdue, and an item with no Forecast yet generated can still be overdue.
function isPaymentItemOverdue(item) {
  if (item.is_cancelled || !item.due_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (item.due_date >= today) return false;
  return Math.round(getPaymentItemOutstanding(item).total * 100) > 0;
}

// Forecast reflection (locked architecture Decision 3): collection state is
// computed once, on the Payment Schedule Item, using the Item's LIVE
// component amount — never the Forecast's own (possibly stale/under-review)
// amount. Nothing is written back to fc.status; this is read-time only, per
// "Outstanding must always be derived, do not store derived values."
// Returns null for a manually-created (non-schedule) forecast, or if its
// linked Payment Schedule Item can't be resolved — callers fall back to the
// existing legacy behavior for those.
function getForecastCollectionState(fc) {
  if (!fc || !fc.generated_from_schedule || !fc.payment_schedule_item_id || !fc.forecast_component) return null;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === Number(fc.payment_schedule_item_id));
  if (!item) return null;

  const component   = fc.forecast_component;
  const liveAmount  = getComponentAmount(item, component);
  const collected   = getPaymentItemCollected(item.id);
  const collectedAmt = component === 'revenue' ? collected.revenue : collected.clientFunds;
  const rawOutstanding = liveAmount - collectedAmt;
  const cents = (n) => Math.round((Number(n) || 0) * 100);

  let status;
  if (cents(collectedAmt) <= 0) status = 'expected';
  else if (cents(rawOutstanding) > 0) status = 'partially_collected';
  else status = 'received';

  return {
    status,
    collected: collectedAmt,
    // Clamped at 0, matching the Canonical Outstanding Model — overCollected
    // below is computed from the raw (pre-clamp) value, same decoupling as
    // isPaymentItemOverCollected().
    outstanding: Math.max(rawOutstanding, 0),
    overCollected: cents(rawOutstanding) < 0,
    overdue: isPaymentItemOverdue(item),
  };
}

// Dashboard forecast aggregations (getFinanceForecastForPeriod,
// getForecastedClientFundsForPeriod) gate on raw fc.status to decide which
// forecasts are still "active"/incoming. That is correct for a manually
// created forecast, but WP1 deliberately never writes fc.status for a
// schedule-generated one — its collection state is derived at read time only
// (getForecastCollectionState above). Without this check, a fully-collected
// schedule-linked forecast would keep counting as still-expected income
// forever, double-counting the same money as both Real Revenue (from the
// real transaction) and Forecast Incoming / Weighted Expected Income (from
// the now-stale forecast). Manual forecasts are entirely unaffected — this
// returns false for any forecast that isn't schedule-generated, so their
// existing raw-status behavior is unchanged.
function isForecastEffectivelyReceived(fc) {
  if (!fc.generated_from_schedule) return false;
  const cs = getForecastCollectionState(fc);
  return cs ? cs.status === 'received' : false;
}

// ---------- Finance Dashboard Outstanding (WP2 — Finance Dashboard & Outstanding Completion) ----------
// One row per non-cancelled Payment Schedule Item, enriched with Company/
// Project attribution and Outstanding — the single source every Outstanding
// KPI and the drilldown list read from, so the Dashboard can never compute a
// different number than the Payment Schedule table (Part 1/2 of WP2).
// Attribution walks Payment Item -> Commercial Terms -> Project -> Deal ->
// CRM Company via resolveGeneratedForecastClient(), the exact same resolver
// already used for schedule-generated Forecasts and Collect Payment — no new
// resolution logic. A missing/broken relationship at any hop falls back to
// safe display text rather than throwing.
function getOutstandingPaymentItemRows() {
  return state.projectPaymentScheduleItems
    .filter((item) => !item.is_cancelled)
    .map((item) => {
      const terms   = state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id)) || null;
      const project = terms ? state.projects.find((p) => Number(p.id) === Number(terms.project_id)) : null;
      const client  = project ? resolveGeneratedForecastClient(project) : { client_id: null, client_name: null };
      const outstanding = getPaymentItemOutstanding(item);
      return {
        currency:               terms?.currency || 'EGP',
        company:                client.client_name || 'Unassigned',
        projectName:            project?.project_name || '—',
        projectId:              project?.id ?? null,
        paymentLabel:           item.label || `Payment #${item.id}`,
        dueDate:                item.due_date,
        outstandingRevenue:     outstanding.revenue,
        outstandingClientFunds: outstanding.clientFunds,
        outstandingTotal:       outstanding.total,
        collectionState:        getPaymentItemCollectionState(item),
        isOverdue:              isPaymentItemOverdue(item),
        isOverCollected:        isPaymentItemOverCollected(item),
      };
    });
}

// Currency-safe aggregation for Outstanding — same "never blend currencies,
// show a grouped breakdown instead, no FX conversion" rule
// getForecastedClientFundsForPeriod() already established for forecasts.
// `field` is one of the outstanding* keys on a getOutstandingPaymentItemRows() row.
function sumOutstandingByCurrency(rows, field) {
  const byCurrency = {};
  rows.forEach((r) => { byCurrency[r.currency] = (byCurrency[r.currency] || 0) + r[field]; });
  const currencies = Object.keys(byCurrency);
  const value = rows.reduce((s, r) => s + r[field], 0);
  const mixed = currencies.length > 1;
  const display = currencies.length === 0 ? fmtMoney(0) : mixed ? 'Mixed currencies' : fmtMoney(value, currencies[0]);
  return { value, display, mixed, byCurrency };
}

// Project Commercial Summary + Payment Schedule (Sprint Project Commercial B).
// Admin-only — hidden entirely for Manager/Member. Contract Value comes from
// project_commercial_terms; Scheduled/Revenue/Client Funds Value and Schedule
// Variance are derived (never stored) from non-cancelled payment schedule
// items, per the approved Commercial Summary design.
function renderProjectCommercialSection(project) {
  const wrap = $('#project-details-commercial');
  if (!wrap) return;

  if (!isAdmin()) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  const terms = state.projectCommercialTerms.find(
    (ct) => Number(ct.project_id) === Number(project.id)
  ) || null;

  const emptyEl      = $('#project-commercial-empty');
  const summaryEl    = $('#project-commercial-summary');
  const scheduleCard = $('#project-payment-schedule-card');

  if (!terms) {
    emptyEl?.classList.remove('hidden');
    summaryEl?.classList.add('hidden');
    scheduleCard?.classList.add('hidden');
    refreshIcons();
    return;
  }

  emptyEl?.classList.add('hidden');
  summaryEl?.classList.remove('hidden');
  scheduleCard?.classList.remove('hidden');

  const items = state.projectPaymentScheduleItems.filter(
    (i) => Number(i.commercial_terms_id) === Number(terms.id)
  );
  const activeItems = items.filter((i) => !i.is_cancelled);

  const currency = terms.currency || 'EGP';
  const contractValue    = Number(terms.contract_value) || 0;
  const scheduledValue   = activeItems.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const revenueValue     = activeItems.reduce((sum, i) => sum + (Number(i.revenue_amount) || 0), 0);
  const clientFundsValue = activeItems.reduce((sum, i) => sum + (Number(i.client_funds_amount) || 0), 0);
  // Split by component, matching how Revenue Value / Client Funds Value are
  // already split rather than blended — Outstanding Revenue (Tgora's own
  // money) and Outstanding Client Funds (pass-through, not Tgora's revenue)
  // mean very different things and must not collapse into one figure.
  const outstandingRevenue     = activeItems.reduce((sum, i) => sum + getPaymentItemOutstanding(i).revenue, 0);
  const outstandingClientFunds = activeItems.reduce((sum, i) => sum + getPaymentItemOutstanding(i).clientFunds, 0);
  const outstandingTotal       = outstandingRevenue + outstandingClientFunds;
  const variance = Math.round((scheduledValue - contractValue) * 100) / 100;

  $('#commercial-contract-value').textContent     = fmtMoney(contractValue, currency);
  $('#commercial-scheduled-value').textContent    = fmtMoney(scheduledValue, currency);
  $('#commercial-revenue-value').textContent      = fmtMoney(revenueValue, currency);
  $('#commercial-client-funds-value').textContent = fmtMoney(clientFundsValue, currency);

  const outstandingColor = (v) => v > 0 ? 'text-amber-600' : v < 0 ? 'text-rose-600' : 'text-emerald-600';
  [
    ['#commercial-outstanding-revenue-value', outstandingRevenue],
    ['#commercial-outstanding-client-funds-value', outstandingClientFunds],
    ['#commercial-outstanding-total-value', outstandingTotal],
  ].forEach(([selector, value]) => {
    const el = $(selector);
    if (!el) return;
    el.textContent = fmtMoney(value, currency);
    el.className = 'font-semibold ' + outstandingColor(value);
  });

  const varianceEl = $('#commercial-schedule-variance');
  if (varianceEl) {
    if (variance === 0) {
      varianceEl.textContent = 'Fully scheduled';
      varianceEl.className = 'font-semibold text-emerald-600';
    } else if (variance < 0) {
      varianceEl.textContent = `Unscheduled: ${fmtMoney(Math.abs(variance), currency)}`;
      varianceEl.className = 'font-semibold text-amber-600';
    } else {
      varianceEl.textContent = `Over scheduled: ${fmtMoney(variance, currency)}`;
      varianceEl.className = 'font-semibold text-rose-600';
    }
  }

  const notesEl = $('#commercial-notes');
  if (notesEl) {
    if (terms.notes) {
      notesEl.textContent = terms.notes;
      notesEl.classList.remove('hidden');
    } else {
      notesEl.classList.add('hidden');
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = $('#payment-schedule-body');
  const emptyScheduleEl = $('#payment-schedule-empty');

  if (items.length === 0) {
    if (body) body.innerHTML = '';
    emptyScheduleEl?.classList.remove('hidden');
    refreshIcons();
    return;
  }
  emptyScheduleEl?.classList.add('hidden');

  const sortedItems = [...items].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  if (body) {
    body.innerHTML = sortedItems.map((item) => {
      const isCancelled = !!item.is_cancelled;
      const collectionState = getPaymentItemCollectionState(item);
      const isOverdue = isPaymentItemOverdue(item);
      const isOverCollected = isPaymentItemOverCollected(item);
      const outstanding = getPaymentItemOutstanding(item);

      // Precedence: Cancelled > Overdue > collection state — Overdue can be
      // true alongside Partially Collected (a balance remains past its due
      // date), so it takes display priority over the plain collection label.
      // Over-collection is a separate warning flag, not part of this
      // precedence chain — it renders alongside whichever status is shown
      // (in practice only ever alongside "Collected", since collecting more
      // than the total always clears any Outstanding).
      const COLLECTION_STATE_LABEL = {
        scheduled: 'Scheduled', partially_collected: 'Partially Collected', fully_collected: 'Collected',
      };
      const COLLECTION_STATE_CLASS = {
        scheduled: 'badge bg-blue-50 text-blue-600',
        partially_collected: 'badge bg-amber-50 text-amber-700',
        fully_collected: 'badge bg-emerald-50 text-emerald-600',
      };
      const statusLabel = isCancelled ? 'Cancelled' : isOverdue ? 'Overdue' : COLLECTION_STATE_LABEL[collectionState];
      const statusClass = isCancelled
        ? 'badge bg-gray-100 text-gray-500'
        : isOverdue
        ? 'badge bg-rose-50 text-rose-600'
        : COLLECTION_STATE_CLASS[collectionState];
      const overCollectedBadge = isOverCollected
        ? ' <span class="badge bg-rose-50 text-rose-600" title="Collected more than the scheduled amount">Over</span>'
        : '';

      const fcState = computePaymentItemForecastState(item);
      const canGenerate = !isCancelled && fcState.components.length > 0 && (fcState.state === 'not_generated' || fcState.state === 'partially_generated');
      const canReview   = fcState.components.some((cs) => cs.forecast != null);

      return `
        <tr class="hover:bg-gray-50 transition ${isCancelled ? 'opacity-50' : ''}">
          <td class="px-5 py-3.5 text-sm text-gray-900">${escapeHtml(item.label || '—')}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${fmtDate(item.due_date)}</td>
          <td class="px-5 py-3.5 text-sm text-gray-900">${fmtMoney(item.total_amount, currency)}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${fmtMoney(item.revenue_amount, currency)}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${fmtMoney(item.client_funds_amount, currency)}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${fmtMoney(outstanding.collected.total, currency)}</td>
          <td class="px-5 py-3.5 text-sm font-medium ${outstanding.total > 0 ? 'text-amber-600' : 'text-emerald-600'}">${fmtMoney(outstanding.total, currency)}</td>
          <td class="px-5 py-3.5"><span class="${statusClass}">${statusLabel}</span>${overCollectedBadge}</td>
          <td class="px-5 py-3.5">${renderPaymentItemForecastBadge(fcState)}</td>
          <td class="px-5 py-3.5 text-right">
            <div class="flex items-center justify-end gap-2">
              ${!isCancelled
                ? `<button type="button" data-action="open-collect-payment" data-id="${item.id}" class="text-gray-400 hover:text-emerald-600" title="Collect Payment">
                     <i data-lucide="banknote" class="w-4 h-4"></i>
                   </button>`
                : ''
              }
              ${canGenerate
                ? `<button type="button" data-action="generate-payment-item-forecasts" data-id="${item.id}" class="text-gray-400 hover:text-indigo-600" title="Generate Forecast from Schedule">
                     <i data-lucide="sparkles" class="w-4 h-4"></i>
                   </button>`
                : ''
              }
              ${canReview
                ? `<button type="button" data-action="open-forecast-schedule-review" data-id="${item.id}" class="text-gray-400 hover:text-indigo-600" title="Review Forecast vs Schedule">
                     <i data-lucide="git-compare" class="w-4 h-4"></i>
                   </button>`
                : ''
              }
              <button type="button" data-action="edit-payment-item" data-id="${item.id}" class="text-gray-400 hover:text-indigo-600" title="Edit payment">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              ${isCancelled
                ? `<button type="button" data-action="restore-payment-item" data-id="${item.id}" class="text-gray-400 hover:text-emerald-600" title="Restore payment">
                     <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                   </button>`
                : outstanding.collected.total > 0
                ? `<span title="Has collections recorded — cannot be cancelled" class="inline-flex"><i data-lucide="x-circle" class="w-4 h-4 text-gray-300"></i></span>`
                : `<button type="button" data-action="cancel-payment-item" data-id="${item.id}" class="text-gray-400 hover:text-rose-600" title="Cancel payment">
                     <i data-lucide="x-circle" class="w-4 h-4"></i>
                   </button>`
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  refreshIcons();
}

// Renders the Forecast-state badge (+ secondary Adjusted indicator) shown in
// the Payment Schedule table's Forecast column and computed from
// computePaymentItemForecastState().
function renderPaymentItemForecastBadge(fcState) {
  if (fcState.state === 'not_applicable') return '<span class="text-xs text-gray-300">—</span>';

  const STATE_META = {
    not_generated:       { label: 'Not Generated',       cls: 'badge bg-gray-100 text-gray-500' },
    partially_generated: { label: 'Partially Generated', cls: 'badge bg-amber-50 text-amber-600' },
    generated:            { label: 'Generated',            cls: 'badge bg-emerald-50 text-emerald-600' },
    review_needed:        { label: 'Review Needed',        cls: 'badge bg-rose-50 text-rose-600' },
    source_cancelled:     { label: 'Source Cancelled',     cls: 'badge bg-gray-100 text-gray-400' },
  };
  const REASON_LABEL = {
    source_changed: 'Source Changed',
    source_and_forecast_changed: 'Source & Forecast Changed',
  };

  const meta = STATE_META[fcState.state];
  const reasonSuffix = fcState.reason ? ` · ${REASON_LABEL[fcState.reason]}` : '';
  const adjustedTag = fcState.adjusted
    ? ' <span class="badge bg-indigo-50 text-indigo-600">Adjusted</span>'
    : '';
  return `<span class="${meta.cls}">${meta.label}${reasonSuffix}</span>${adjustedTag}`;
}

// ---------- Forecast Schedule Linkage — Finance-side visibility (Sprint Project Commercial C3) ----------
// Reuses computeComponentForecastState() (C2) rather than re-deriving drift
// logic — a per-Forecast-row view of the same state model the Payment
// Schedule badges already use, just entered from the Forecast side instead
// of the Payment Item side.

const FORECAST_SYNC_STATE_META = {
  in_sync:                     { label: 'In Sync',                     cls: 'badge bg-emerald-50 text-emerald-600' },
  adjusted:                    { label: 'Adjusted',                    cls: 'badge bg-indigo-50 text-indigo-600'   },
  source_changed:               { label: 'Source Changed',              cls: 'badge bg-amber-50 text-amber-600'     },
  source_and_forecast_changed:  { label: 'Source & Forecast Changed',   cls: 'badge bg-rose-50 text-rose-600'       },
  source_cancelled:             { label: 'Source Cancelled',            cls: 'badge bg-gray-100 text-gray-400'      },
  source_missing:                { label: 'Source Missing',              cls: 'badge bg-rose-50 text-rose-600'       },
  received:                     { label: 'Received',                    cls: 'badge bg-emerald-50 text-emerald-600' },
};

// Returns null for manual forecasts (no schedule source to reconcile against)
// or for a schedule-generated row that's been superseded by a newer active
// forecast for the same component (nothing left to reconcile on this row).
// 'Source Missing' is a warning state, never a crash, even if the linked
// Payment Item was hard-deleted out from under an existing Forecast row.
function computeForecastSyncStatus(fc) {
  if (!fc.generated_from_schedule || !fc.payment_schedule_item_id) return null;
  if (fc.status === 'received' || fc.linked_transaction_id) return { status: 'received' };

  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === Number(fc.payment_schedule_item_id));
  if (!item) return { status: 'source_missing' };
  if (item.is_cancelled) return { status: 'source_cancelled' };

  const cs = computeComponentForecastState(item, fc.forecast_component);
  if (!cs.forecast || Number(cs.forecast.id) !== Number(fc.id)) return null;
  if (cs.sourceDrift) return { status: cs.forecastDrift ? 'source_and_forecast_changed' : 'source_changed' };
  if (cs.adjusted) return { status: 'adjusted' };
  return { status: 'in_sync' };
}

// Forecast.payment_schedule_item_id -> Payment Item -> Commercial Terms ->
// Project. No project_id is stored directly on the Forecast row (see
// buildGeneratedForecastPayload), so this chain is the only resolution path.
// Returns null (never throws) if any link is missing.
function resolveForecastSourceProject(fc) {
  if (!fc.generated_from_schedule || !fc.payment_schedule_item_id) return null;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === Number(fc.payment_schedule_item_id));
  if (!item) return null;
  const terms = state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id));
  if (!terms) return null;
  return state.projects.find((p) => Number(p.id) === Number(terms.project_id)) || null;
}

// Compact Source cell for the Finance Forecast table: Manual forecasts show
// a subdued label; schedule-generated ones show the "Schedule Generated"
// badge, which component it represents (Revenue/Client Funds — never the
// raw forecast_component value), its sync-state badge, and either a link
// back to the source Project or a Source Missing warning.
function renderFinanceForecastSourceCell(fc) {
  if (!fc.generated_from_schedule) {
    return '<span class="text-xs text-gray-300">Manual</span>';
  }
  const componentLabel = FORECAST_COMPONENT_LABEL[fc.forecast_component] || '';
  const sync = computeForecastSyncStatus(fc);
  const syncMeta = sync ? FORECAST_SYNC_STATE_META[sync.status] : null;
  const project = resolveForecastSourceProject(fc);
  const projectLinkHtml = project
    ? `<button type="button" class="text-[11px] text-brand-600 hover:underline text-left" data-action="open-project-details" data-id="${project.id}">Open Project</button>`
    : (sync?.status === 'source_missing' ? '<span class="text-[11px] text-rose-500">Source Missing</span>' : '');
  return `
    <div class="flex flex-col items-start gap-1">
      <span class="badge bg-indigo-50 text-indigo-600">Schedule Generated</span>
      ${componentLabel ? `<span class="text-[11px] text-gray-400">${escapeHtml(componentLabel)}</span>` : ''}
      ${syncMeta ? `<span class="${syncMeta.cls}">${syncMeta.label}</span>` : ''}
      ${projectLinkHtml}
    </div>`;
}

// ---------- Forecast Schedule Linkage — Actions (Sprint Project Commercial C2) ----------

async function handleGeneratePaymentItemForecasts(itemId) {
  if (!isAdmin()) return;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === itemId);
  if (!item || item.is_cancelled) return;
  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  const terms = project ? state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id)) : null;
  if (!project || !terms) return;

  const missing = getEligibleForecastComponents(item).filter((c) => !findActiveGeneratedForecast(item, c));
  if (missing.length === 0) {
    toast('All eligible components are already generated for this payment.', 'error');
    return;
  }

  const payloads = missing.map((c) => buildGeneratedForecastPayload(project, item, c, terms));
  const result = await createFinanceForecastsBatch(payloads);
  if (result) {
    toast(`Generated ${result.length} forecast${result.length === 1 ? '' : 's'}.`, 'success');
    state.financeForecasts = await fetchFinanceForecasts();
    renderProjectDetails();
  }
}

// Creation-only, project-scoped. Skips already-generated components and
// cancelled Payment Items, continues past per-item failures, and never
// touches an existing Forecast row (no update/resolve/cancel/restore calls
// anywhere in this function).
async function handleGenerateAllEligibleForecasts() {
  if (!isAdmin()) return;
  const project = state.projects.find((p) => Number(p.id) === Number(state.selectedProjectId));
  if (!project) return;
  const terms = state.projectCommercialTerms.find((ct) => Number(ct.project_id) === Number(project.id));
  if (!terms) return;

  const items = state.projectPaymentScheduleItems.filter(
    (i) => Number(i.commercial_terms_id) === Number(terms.id) && !i.is_cancelled
  );

  let createdCount = 0;
  let itemsTouched = 0;
  let failedCount = 0;

  for (const item of items) {
    const missing = getEligibleForecastComponents(item).filter((c) => !findActiveGeneratedForecast(item, c));
    if (missing.length === 0) continue;
    const payloads = missing.map((c) => buildGeneratedForecastPayload(project, item, c, terms));
    const result = await createFinanceForecastsBatch(payloads);
    if (result) {
      createdCount += result.length;
      itemsTouched += 1;
    } else {
      failedCount += 1;
    }
  }

  if (createdCount === 0 && failedCount === 0) {
    toast('No eligible payments to generate — everything is already generated.', 'error');
    return;
  }

  state.financeForecasts = await fetchFinanceForecasts();
  renderProjectDetails();
  toast(
    failedCount > 0
      ? `Generated ${createdCount} forecast(s) across ${itemsTouched} item(s). ${failedCount} item(s) failed.`
      : `Generated ${createdCount} forecast(s) across ${itemsTouched} item(s).`,
    failedCount > 0 ? 'error' : 'success'
  );
}

function openForecastScheduleReviewModal(itemId) {
  if (!isAdmin()) return;
  const item = state.projectPaymentScheduleItems.find((i) => Number(i.id) === itemId);
  if (!item) return;
  const terms = state.projectCommercialTerms.find((ct) => Number(ct.id) === Number(item.commercial_terms_id));
  if (!terms) return;

  state.reviewingPaymentScheduleItemId = itemId;

  const titleEl = $('#forecast-schedule-review-title');
  if (titleEl) titleEl.textContent = `Review — ${item.label || `Payment #${item.id}`}`;

  const currency = terms.currency || 'EGP';
  const componentStates = getEligibleForecastComponents(item).map((c) => computeComponentForecastState(item, c));

  const bodyEl = $('#forecast-schedule-review-body');
  if (bodyEl) {
    bodyEl.innerHTML = componentStates.map((cs) => renderForecastReviewComponentCard(item, cs, currency)).join('');
  }

  openModal('forecast-schedule-review-modal');
  refreshIcons();
}

function renderForecastReviewComponentCard(item, cs, currency) {
  const label = FORECAST_COMPONENT_LABEL[cs.component];

  if (!cs.forecast) {
    return `
      <div class="border border-gray-200 rounded-xl p-4">
        <p class="font-semibold text-gray-900 mb-1">${label}</p>
        <p class="text-sm text-gray-500">Not generated yet.</p>
      </div>`;
  }

  const fc = cs.forecast;
  const reasonLabel = cs.sourceDrift
    ? (cs.forecastDrift ? 'Source & Forecast Changed' : 'Source Changed')
    : (cs.adjusted ? 'Adjusted' : 'In Sync');
  const reasonClass = cs.sourceDrift
    ? 'badge bg-rose-50 text-rose-600'
    : cs.adjusted
    ? 'badge bg-indigo-50 text-indigo-600'
    : 'badge bg-emerald-50 text-emerald-600';

  const liveAmt = getComponentAmount(item, cs.component);

  let actionHtml = '';
  if (cs.immutable) {
    actionHtml = `<p class="text-xs text-gray-400 mt-3">Received / linked to a transaction — immutable from schedule.</p>`;
  } else if (cs.sourceDrift && !cs.forecastDrift) {
    actionHtml = `
      <button type="button" data-action="update-forecast-from-schedule" data-id="${fc.id}"
        class="mt-3 h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Update Forecast from Schedule
      </button>`;
  } else if (cs.sourceDrift && cs.forecastDrift) {
    actionHtml = `
      <div data-reset-zone="${fc.id}">
        <button type="button" data-action="request-reset-forecast-from-schedule" data-id="${fc.id}"
          class="mt-3 h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg">
          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Forecast to Schedule
        </button>
      </div>`;
  } else if (cs.adjusted) {
    actionHtml = `<p class="text-xs text-indigo-500 mt-3">This Forecast was manually adjusted and no longer matches its snapshot. This is expected — no action needed.</p>`;
  }

  return `
    <div class="border border-gray-200 rounded-xl p-4">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-gray-900">${label}</p>
        <span class="${reasonClass}">${reasonLabel}</span>
      </div>
      <table class="w-full text-xs mt-3">
        <thead>
          <tr class="text-left text-gray-400 uppercase tracking-wide">
            <th class="py-1 font-medium">—</th>
            <th class="py-1 font-medium text-right">Amount</th>
            <th class="py-1 font-medium text-right">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr>
            <td class="py-1.5 text-gray-500">Snapshot</td>
            <td class="py-1.5 text-right">${fmtMoney(fc.source_snapshot_amount, currency)}</td>
            <td class="py-1.5 text-right">${fmtDate(fc.source_snapshot_due_date)}</td>
          </tr>
          <tr>
            <td class="py-1.5 text-gray-500">Live Schedule</td>
            <td class="py-1.5 text-right ${cs.sourceDrift ? 'text-rose-600 font-semibold' : ''}">${fmtMoney(liveAmt, currency)}</td>
            <td class="py-1.5 text-right ${cs.sourceDrift ? 'text-rose-600 font-semibold' : ''}">${fmtDate(item.due_date)}</td>
          </tr>
          <tr>
            <td class="py-1.5 text-gray-500">Current Forecast</td>
            <td class="py-1.5 text-right ${cs.forecastDrift ? 'text-indigo-600 font-semibold' : ''}">${fmtMoney(fc.amount, currency)}</td>
            <td class="py-1.5 text-right ${cs.forecastDrift ? 'text-indigo-600 font-semibold' : ''}">${fmtDate(fc.expected_date)}</td>
          </tr>
        </tbody>
      </table>
      ${actionHtml}
    </div>`;
}

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

  // CRM Origin — Sprint CRM-5. Minimal, read-only provenance for Projects
  // created via Deal → Project conversion. Hidden entirely for standalone
  // Projects (deal_id null), which is every Project created before this
  // sprint plus any manually created going forward.
  const originEl = $('#project-details-crm-origin');
  if (originEl) {
    const originDeal = project.deal_id != null
      ? state.crmDeals.find(d => Number(d.id) === Number(project.deal_id))
      : null;
    if (!originDeal) {
      originEl.classList.add('hidden');
    } else {
      originEl.classList.remove('hidden');
      const originClient = state.crmClients.find(c => Number(c.id) === Number(originDeal.client_id));
      const originLead = originDeal.lead_id != null
        ? state.crmLeads.find(l => Number(l.id) === Number(originDeal.lead_id))
        : null;

      $('#project-details-origin-deal').innerHTML =
        `<button class="font-semibold text-indigo-600 hover:underline" data-action="open-deal-details" data-id="${originDeal.id}">${escapeHtml(originDeal.deal_name)}</button>`;

      $('#project-details-origin-company').innerHTML = originClient
        ? `<button class="font-semibold text-indigo-600 hover:underline" data-action="open-client-details" data-id="${originClient.id}">${escapeHtml(originClient.client_name)}</button>`
        : '—';

      const leadWrap = $('#project-details-origin-lead-wrap');
      if (originLead) {
        $('#project-details-origin-lead').innerHTML =
          `<button class="font-semibold text-indigo-600 hover:underline" data-action="open-lead-details" data-id="${originLead.id}">${escapeHtml(originLead.lead_name)}</button>`;
        leadWrap?.classList.remove('hidden');
      } else {
        leadWrap?.classList.add('hidden');
      }
      refreshIcons();
    }
  }

  renderProjectCommercialSection(project);

  const linkEl = $('#details-project-link');

  if (project.project_link) {
    linkEl.href = project.project_link;
    linkEl.textContent = 'Open Project Link';
    linkEl.classList.remove('hidden');
  } else {
    linkEl.classList.add('hidden');
  }

  const filteredTasks = getFilteredProjectDetailsTasks(project.id);

  const detailsSummaryEl = $('#project-details-results-summary');
  if (detailsSummaryEl) {
    detailsSummaryEl.textContent =
      filteredTasks.length === totalTasks
        ? `Showing all ${totalTasks} Tasks`
        : `Showing ${filteredTasks.length} of ${totalTasks} Tasks`;
  }

  const detailsResetBtn = $('#project-details-reset-filters');
  if (detailsResetBtn) {
    const f = state.filters.projectDetails;
    const hasActiveFilter =
      f.status !== 'all' ||
      f.priority !== 'all' ||
      !!f.assignee ||
      !!f.deadline ||
      !!f.search;
    detailsResetBtn.classList.toggle('hidden', !hasActiveFilter);
  }

  renderActiveFilterChips('projectDetails');
  renderHeaderFilters('projectDetails');

  const detailsTbody = $('#project-details-tasks-body');
  const detailsEmptyEl = $('#project-details-tasks-empty');

  if (filteredTasks.length === 0) {
    detailsTbody.innerHTML = '';
    detailsEmptyEl.classList.remove('hidden');

    const isFilteredEmpty = totalTasks > 0;

    const detailsEmptyTitleEl = $('#project-details-tasks-empty-title');
    const detailsEmptyMessageEl = $('#project-details-tasks-empty-message');
    if (detailsEmptyTitleEl) {
      detailsEmptyTitleEl.textContent = isFilteredEmpty
        ? 'No tasks match your current filters.'
        : 'No tasks yet';
    }
    if (detailsEmptyMessageEl) {
      detailsEmptyMessageEl.textContent = isFilteredEmpty
        ? 'Try adjusting or clearing your filters.'
        : 'Add a task to start tracking work on this project.';
    }

    $('#project-details-tasks-empty-reset-btn')?.classList.toggle('hidden', !isFilteredEmpty);

    refreshIcons();
    return;
  }

  detailsEmptyEl.classList.add('hidden');

  detailsTbody.innerHTML = filteredTasks
              .map((t) => {
                const taskStatus = (t.status || 'todo').toLowerCase();
                const taskPriority = (t.priority || 'medium').toLowerCase();

                const assignedMember = state.teamMembers.find(
                  (m) =>
                    (m.name || '').toLowerCase().trim() ===
                    (t.assigned_to || '').toLowerCase().trim()
                );

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
                      ${renderStatusBadge(taskStatus)}
                    </td>

                    <td class="px-5 py-3.5">
                      ${renderPriorityBadge(taskPriority)}
                    </td>

                    ${renderDeadlineCell(t.deadline)}

                    ${renderTaskActionsCell(t, {
                      canDelete: isAdmin() || isManager(),
                      canEdit: canFullyEditTask() || canLimitedEditTask(t),
                    })}
                  </tr>
                `;
              })
              .join('');

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

// Pure helper shared by every ranking/leaderboard view: keeps only members with
// enough counted tasks this month (>= 3) and orders them by performance score,
// highest first. No DOM, no rendering, no role logic, no state mutation; does
// not mutate the input array.
function rankEligiblePerformers(allPerf) {
  return allPerf
    .filter(({ perf }) => perf.monthlyTasks.length >= 3)
    .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore);
}

async function generatePerformanceSnapshot() {
  if (!canAccessPerformance()) {
    toast('You do not have permission to access performance features.', 'error');
    return;
  }

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

  const eligible = rankEligiblePerformers(allPerf);

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
  if (!canAccessPerformance()) {
    toast('You do not have permission to access performance features.', 'error');
    return;
  }

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
  if (!canAccessPerformance()) {
    toast('You do not have permission to access performance features.', 'error');
    return;
  }

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

  const rankingCard = $('#performance-ranking-card');

  if (rankingCard) rankingCard.classList.toggle('hidden', !canViewPerformanceRanking());

  const historyBtn = $('#monthly-history-btn');

  if (historyBtn) historyBtn.classList.toggle('hidden', !canAccessPerformance());

  const hallOfFameBtn = $('#hall-of-fame-btn');

  if (hallOfFameBtn) hallOfFameBtn.classList.toggle('hidden', !canAccessPerformance());

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

  const ranking = rankEligiblePerformers(allPerf);

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

  const ranking = rankEligiblePerformers(allPerf);

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

  const ranking = rankEligiblePerformers(allPerf);

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

function calculateMemberAchievements(member, memberTasks, monthlyRows) {
  const rows = monthlyRows || [];

  const earlyFinishCount = memberTasks.filter((t) => {
    if ((t.status || '').toLowerCase() !== 'completed') return false;
    if (!t.deadline || !t.completed_at) return false;

    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);

    const completedAt = new Date(t.completed_at);
    completedAt.setHours(0, 0, 0, 0);

    return completedAt < deadline;
  }).length;

  const winCount = rows.filter((r) => r.is_winner === true).length;

  const bestScore = rows.length ? Math.max(...rows.map((r) => r.score)) : 0;

  let longestStreak = 0;
  let currentStreak = 0;
  let prevIdx = null;

  rows.forEach((r) => {
    const idx = r.year * 12 + (r.month - 1);

    if (r.score >= 60) {
      currentStreak = prevIdx !== null && idx === prevIdx + 1 ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    prevIdx = idx;
  });

  const hasConsecutive = longestStreak >= 3;
  const bestStreak = Math.min(longestStreak, 3);

  const perfectMonth = rows.find((r) => r.score >= 90 && r.overdue_tasks === 0);

  const minOverdue = rows.length
    ? Math.min(...rows.map((r) => r.overdue_tasks ?? 0))
    : 0;

  let bestImprovement = 0;

  for (let i = 1; i < rows.length; i++) {
    bestImprovement = Math.max(bestImprovement, rows[i].score - rows[i - 1].score);
  }

  const isRisingStar = bestImprovement >= 20;

  return [
    {
      key: 'employee-of-the-month',
      icon: '🏆',
      name: 'Employee of the Month',
      description: 'Awarded for being the top performer in a saved month.',
      requirement: 'Win at least one monthly performance snapshot.',
      unlocked: winCount > 0,
      progress: `${winCount} monthly win${winCount === 1 ? '' : 's'}.`,
      explanation: winCount > 0
        ? 'You have been the top performer in at least one saved month. Great work!'
        : 'Be the top performer (rank #1) in a saved monthly snapshot to unlock this badge.',
    },
    {
      key: 'early-finisher',
      icon: '⏱️',
      name: 'Early Finisher',
      description: 'Complete at least 10 tasks before their deadline.',
      requirement: 'Complete at least 10 tasks before deadline.',
      unlocked: earlyFinishCount >= 10,
      progress: `${earlyFinishCount}/10 early completions.`,
      explanation: earlyFinishCount >= 10
        ? 'You have completed 10 or more tasks ahead of their deadlines.'
        : `Complete ${Math.max(10 - earlyFinishCount, 0)} more task${10 - earlyFinishCount === 1 ? '' : 's'} before their deadline to unlock this badge.`,
    },
    {
      key: 'high-performer',
      icon: '⭐',
      name: 'High Performer',
      description: 'Reach a monthly performance score of 80% or higher.',
      requirement: 'Reach score >= 80 in any saved month.',
      unlocked: bestScore >= 80,
      progress: `Best saved score: ${bestScore}%.`,
      explanation: bestScore >= 80
        ? 'You reached a performance score of 80% or higher in a saved month.'
        : 'Reach a performance score of 80% or higher in a saved month to unlock this badge.',
    },
    {
      key: 'consistent-performer',
      icon: '📈',
      name: 'Consistent Performer',
      description: 'Score 60% or higher for 3 consecutive months.',
      requirement: '3 consecutive saved months with score >= 60.',
      unlocked: hasConsecutive,
      progress: `Best streak: ${bestStreak}/3 months.`,
      explanation: hasConsecutive
        ? 'You scored 60% or higher for 3 consecutive saved months.'
        : 'Score 60% or higher for 3 saved months in a row to unlock this badge.',
    },
    {
      key: 'perfect-month',
      icon: '💯',
      name: 'Perfect Month',
      description: 'Score 90%+ with zero overdue tasks in a month.',
      requirement: 'Score >= 90 and 0 overdue tasks in any saved month.',
      unlocked: !!perfectMonth,
      progress: perfectMonth
        ? `${PERFORMANCE_MONTH_NAMES[perfectMonth.month - 1]} ${perfectMonth.year}: ${perfectMonth.score}% with 0 overdue tasks.`
        : `Best saved score: ${bestScore}%. Lowest overdue tasks in a saved month: ${minOverdue}.`,
      explanation: perfectMonth
        ? 'You had a saved month with a 90%+ score and zero overdue tasks.'
        : 'Reach a 90%+ score with zero overdue tasks in a saved month to unlock this badge.',
    },
    {
      key: 'rising-star',
      icon: '🚀',
      name: 'Rising Star',
      description: 'Improve your score by 20+ points vs. the previous saved month.',
      requirement: 'Improve by at least 20 percentage points vs. the previous saved month.',
      unlocked: isRisingStar,
      progress: `Best improvement: ${bestImprovement >= 0 ? '+' : ''}${bestImprovement}%.`,
      explanation: isRisingStar
        ? 'You improved your score by 20 or more points compared to the previous saved month.'
        : 'Improve your score by 20 or more points compared to the previous saved month to unlock this badge.',
    },
  ];
}

async function renderMyAchievements() {
  const widget = $('#my-achievements-widget');
  if (!widget) return;

  const member = getCurrentMember();

  if (isAdmin() || !member) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');

  const body = $('#my-achievements-body');
  const summaryEl = $('#my-achievements-summary');
  if (!body) return;

  const { data, error } = await supabaseClient
    .from('monthly_performance')
    .select('year, month, score, overdue_tasks, is_winner')
    .eq('member_id', member.id)
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    console.error('renderMyAchievements', error);
    body.innerHTML = `<p class="text-sm text-gray-500">Unable to load achievements.</p>`;
    return;
  }

  const rows = data || [];

  const memberTasks = state.tasks.filter(
    (t) =>
      (t.assigned_to || '').toLowerCase().trim() ===
      (member.name || '').toLowerCase().trim()
  );

  const achievements = calculateMemberAchievements(member, memberTasks, rows);

  state.myAchievements = achievements;

  checkAchievementUnlockNotifications(member, achievements);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (summaryEl) {
    summaryEl.textContent = `Unlocked ${unlockedCount} of ${achievements.length} achievements`;
  }

  body.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      ${achievements
        .map(
          (a) => `
            <div class="rounded-xl border p-3 text-center cursor-pointer transition hover:shadow-md ${
              a.unlocked
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }" data-action="open-achievement-details" data-key="${a.key}">
              <div class="text-2xl mb-1">${a.icon}</div>
              <p class="text-sm font-semibold text-gray-900">${escapeHtml(a.name)}</p>
              <p class="text-xs text-gray-500 mt-1">${escapeHtml(a.description)}</p>
              <span class="badge mt-2 inline-block ${a.unlocked ? 'badge-completed' : 'badge-todo'}">
                ${a.unlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  refreshIcons();
}

async function checkAchievementUnlockNotifications(member, achievements) {
  if (isAdmin() || !state.currentUser?.id) return;

  const unlocked = achievements.filter((a) => a.unlocked);
  if (unlocked.length === 0) return;

  try {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('entity_id')
      .eq('user_id', state.currentUser.id)
      .eq('type', 'achievement_unlocked')
      .eq('entity_type', 'achievement');

    if (error) {
      console.error('checkAchievementUnlockNotifications', error);
      return;
    }

    const existingKeys = new Set((data || []).map((row) => row.entity_id));

    let insertedAny = false;

    for (const achievement of unlocked) {
      if (existingKeys.has(achievement.key)) continue;

      const result = await insertNotification({
        user_id: state.currentUser.id,
        title: 'Achievement unlocked',
        message: `You unlocked ${achievement.name}.`,
        type: 'achievement_unlocked',
        entity_type: 'achievement',
        entity_id: achievement.key,
        is_read: false,
      });

      if (result) insertedAny = true;
    }

    if (insertedAny) {
      await refreshNotifications();
    }
  } catch (err) {
    console.error('checkAchievementUnlockNotifications', err);
  }
}

function openAchievementDetailsModal(key) {
  const content = $('#achievement-details-content');
  if (!content) return;

  const achievement = (state.myAchievements || []).find((a) => a.key === key);
  if (!achievement) return;

  content.innerHTML = `
    <div class="text-center mb-4">
      <div class="text-4xl mb-2">${achievement.icon}</div>
      <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(achievement.name)}</h3>
      <span class="badge mt-2 inline-block ${achievement.unlocked ? 'badge-completed' : 'badge-todo'}">
        ${achievement.unlocked ? 'Unlocked' : 'Locked'}
      </span>
    </div>
    <div class="space-y-3">
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
        <p class="text-sm text-gray-700 mt-1">${escapeHtml(achievement.description)}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Requirement</p>
        <p class="text-sm text-gray-700 mt-1">${escapeHtml(achievement.requirement)}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Progress</p>
        <p class="text-sm text-gray-700 mt-1">${escapeHtml(achievement.progress)}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">What this means</p>
        <p class="text-sm text-gray-700 mt-1">${escapeHtml(achievement.explanation)}</p>
      </div>
    </div>
  `;

  openModal('achievement-details-modal');
}

function openPerformanceRankingModal() {
  if (!canViewPerformanceRanking()) {
    toast('You do not have permission to access performance features.', 'error');
    return;
  }

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
          <td class="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap text-center">${perf.totalPoints} / ${perf.maxPoints}</td>
        </tr>
      `;
    })
    .join('');

  content.innerHTML = `
    <h3 class="text-base font-semibold text-gray-900 mb-3">${escapeHtml(monthTitle)}</h3>
    ${periodSubtitle}
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
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
              <th class="px-4 py-2.5 whitespace-nowrap text-center">Points</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
    ${notEnoughDataSection}
  `;

  refreshIcons();
  openModal('performance-ranking-modal');
}

// Top-level member tasks table renderer.
// Reads state.memberTasksBase and state.memberTasksCardBase set by openMemberDetails(),
// then applies state.filters.memberTasks header filters on top.
function renderMemberTasksTable() {
  const tbody = $('#member-tasks-table-body');
  if (!tbody) return;

  let tasks = state.memberTasksCardBase ?? state.memberTasksBase;

  const f = state.filters.memberTasks;

  if (f.status !== 'all') {
    tasks = tasks.filter((t) => (t.status || '').toLowerCase() === f.status);
  }
  if (f.priority !== 'all') {
    tasks = tasks.filter((t) => (t.priority || 'medium').toLowerCase() === f.priority);
  }
  if (f.project) {
    tasks = tasks.filter((t) => String(t.project_id) === String(f.project));
  }
  if (f.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tasks = tasks.filter((t) => matchesDeadlineFilter(t.deadline, t.status, f.deadline, today));
  }

  renderHeaderFilters('memberTasks');

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
            <p class="text-[11px] text-gray-500">Start ${fmtDate(task.start_date)}</p>
          </td>
          <td class="px-5 py-3.5">
            ${project
              ? `<button type="button" class="text-brand-600 hover:text-brand-700 hover:underline font-medium text-left" data-action="open-project-details" data-id="${project.id}">${escapeHtml(project.project_name)}</button>`
              : '—'
            }
          </td>
          <td class="px-5 py-3.5">${renderStatusBadge(taskStatus)}</td>
          <td class="px-5 py-3.5">${renderPriorityBadge(taskPriority)}</td>
          ${renderDeadlineCell(task.deadline)}
          ${renderTaskActionsCell(task, {
            canDelete: isAdmin() || isManager(),
            canEdit: canFullyEditTask() || canLimitedEditTask(task),
          })}
        </tr>
      `;
    })
    .join('');

  refreshIcons();
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

  const memberNameLower = (member.name || '').toLowerCase().trim();

  // All tasks for this member including archived — used exclusively for
  // performance calculations so historical completed_at data is never lost.
  const memberTasksForPerf = state.tasks.filter(
    (t) => (t.assigned_to || '').toLowerCase().trim() === memberNameLower
  );

  // Exclude archived tasks from stat cards and the assigned-tasks table view.
  const memberTasks = memberTasksForPerf.filter((t) => !t.is_archived);

  // Store for the top-level renderMemberTasksTable() + header filters.
  state.memberTasksBase = memberTasks;
  state.memberTasksCardBase = null;
  // Reset header filters when switching to a new member.
  Object.assign(state.filters.memberTasks, { status: 'all', priority: 'all', project: null, deadline: null });

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

  const { performanceScore, performanceLabel } = calculateMemberPerformance(memberTasksForPerf);

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
      state.memberTasksCardBase = null; // null = all member tasks
      renderMemberTasksTable();
    };
  }

  if (todoCard) {
    todoCard.classList.add('cursor-pointer');
    todoCard.onclick = () => {
      activateCard(todoCard);
      state.memberTasksCardBase = todoTasks;
      renderMemberTasksTable();
    };
  }

  if (progressCard) {
    progressCard.classList.add('cursor-pointer');
    progressCard.onclick = () => {
      activateCard(progressCard);
      state.memberTasksCardBase = inProgressTasks;
      renderMemberTasksTable();
    };
  }

  if (reviewCard) {
    reviewCard.classList.add('cursor-pointer');
    reviewCard.onclick = () => {
      activateCard(reviewCard);
      state.memberTasksCardBase = reviewTasks;
      renderMemberTasksTable();
    };
  }

  if (completedCard) {
    completedCard.classList.add('cursor-pointer');
    completedCard.onclick = () => {
      activateCard(completedCard);
      state.memberTasksCardBase = completedTasks;
      renderMemberTasksTable();
    };
  }

  if (overdueCard) {
    overdueCard.classList.add('cursor-pointer');
    overdueCard.onclick = () => {
      activateCard(overdueCard);
      state.memberTasksCardBase = overdueTasks;
      renderMemberTasksTable();
    };
  }

  const performanceCard = $('#member-performance-score')?.closest('.stat-card');

  if (performanceCard) {
    performanceCard.classList.add('cursor-pointer');
    performanceCard.onclick = () => {
      openPerformanceDetailsModal();
    };
  }

  renderMemberTasksTable();
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
    if (!canCreateTask()) {
      toast('You do not have permission to create tasks', 'error');
      return;
    }

    state.editingTaskId = null;

    const form = $('#task-form');

    if (form) {
      form.reset();

      Array.from(form.elements).forEach((field) => {
        field.disabled = false;
      });

      form.assigned_to.required = true;
      form.deadline.required = true;
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

  // WP2 fix: this action performs a full view switch (setView below), but
  // never closed an open modal before invoking it. Every existing call site
  // renders this button in plain page content (Recent Projects, Forecast
  // list, Team page), so the gap was never visible — the new Outstanding
  // drilldown is the first modal to use it. closeModal() is idempotent when
  // nothing is open, so this is a no-op everywhere else.
  closeModal();

  state.selectedProjectId = id;
  resetProjectDetailsFiltersForProject(id);

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
  if (!canCreateProject()) {
    toast('You do not have permission to create projects', 'error');
    return;
  }
  openCreateProjectModal();
  return;
}

  if (action === 'open-task-modal') {
  if (!canCreateTask()) {
    toast('You do not have permission to create tasks', 'error');
    return;
  }

  state.editingTaskId = null;

  const form = $('#task-form');

  if (form) {
    form.reset();

    Array.from(form.elements).forEach((field) => {
      field.disabled = false;
    });

    form.assigned_to.required = true;
    form.deadline.required = true;
  }

  // C4: reset Assigned To back to active-members-only — a prior Edit may
  // have left a preserved-inactive-assignee option in this shared select.
  populateTeamMembers();
  syncTaskProjectSelect();
  openModal('task-modal');
  return;
}

  if (action === 'open-member-modal') {
  if (!canEditTeamMember()) {
    toast('You do not have permission to create team members', 'error');
    return;
  }
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

  if (action === 'open-achievement-details') {
    openAchievementDetailsModal(trigger.dataset.key);
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
  if (!canEditProject()) {
    toast('You do not have permission to edit projects', 'error');
    return;
  }
  const id = Number(trigger.dataset.id);
  openEditProjectModal(id);
  return;
}

if (action === 'delete-project') {
  if (!canDeleteProject()) {
    toast('You do not have permission to delete projects', 'error');
    return;
  }
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

if (action === 'restore-task') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreTask(id);
    if (result) {
      toast('Task restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'edit-member') {
  if (!canEditTeamMember()) {
    toast('You do not have permission to edit team members', 'error');
    return;
  }
  const id = Number(trigger.dataset.id);
  openEditMemberModal(id);
  return;
}

if (action === 'delete-member') {
  if (!canDeleteTeamMember()) {
    toast('You do not have permission to delete team members', 'error');
    return;
  }
  const id = Number(trigger.dataset.id);
  const member = state.teamMembers.find((m) => Number(m.id) === id);
  openConfirm('member', id, member ? `Member “${member.name}”` : 'This member');
  return;
}

if (action === 'open-lead-details') {
  const id = Number(trigger.dataset.id);
  closeModal(); // link may be clicked from inside a details modal (e.g. Deal Details)
  openLeadDetails(id);
  return;
}

if (action === 'back-to-crm') {
  state.selectedLeadId = null;
  localStorage.removeItem('tgora_selected_lead_id');
  setView('crm');
  return;
}

if (action === 'open-lead-modal') {
  openNewLeadModal();
  return;
}

if (action === 'edit-lead') {
  const rawId = trigger.dataset.id;
  let id = rawId !== undefined && rawId !== '' ? Number(rawId) : NaN;
  if ((!Number.isFinite(id) || id <= 0) && state.view === 'lead-details' && state.selectedLeadId) {
    id = Number(state.selectedLeadId);
  }
  if (!Number.isFinite(id) || id <= 0) {
    toast('Could not determine which lead to edit', 'error');
    return;
  }
  openEditLeadModal(id);
  return;
}

if (action === 'archive-lead') {
  const id = Number(trigger.dataset.id);
  const lead = state.crmLeads.find((l) => Number(l.id) === id);
  openConfirm('lead_archive', id, lead ? `”${lead.lead_name}”` : 'This lead');
  return;
}

if (action === 'restore-lead') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmLead(id);
    if (result) {
      toast('Lead restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'open-client-modal') {
  openNewClientModal();
  return;
}

if (action === 'edit-client') {
  const id = Number(trigger.dataset.id);
  openEditClientModal(id);
  return;
}

if (action === 'archive-client') {
  const id = Number(trigger.dataset.id);
  const client = state.crmClients.find((c) => Number(c.id) === id);
  openConfirm('client_archive', id, client ? `”${client.client_name}”` : 'This client');
  return;
}

if (action === 'restore-client') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmClient(id);
    if (result) {
      toast('Company restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'open-client-details') {
  const id = Number(trigger.dataset.id);
  closeModal(); // link may be clicked from inside a details modal (e.g. Deal Details)
  openClientDetails(id);
  return;
}

if (action === 'open-lead-details') {
  const id = Number(trigger.dataset.id);
  closeModal(); // link may be clicked from inside a details modal (e.g. Deal Details)
  openLeadDetails(id);
  return;
}

if (action === 'create-deal-from-lead') {
  const id = Number(trigger.dataset.id);
  openCreateDealFromLead(id);
  return;
}

if (action === 'back-to-client-list') {
  state.selectedClientId = null;
  localStorage.removeItem('tgora_selected_client_id');
  setView('crm');
  setCrmTab('clients');
  return;
}

if (action === 'open-contact-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  openNewContactModal(prefillClientId);
  return;
}

if (action === 'edit-contact') {
  openEditContactModal(Number(trigger.dataset.id));
  return;
}

if (action === 'archive-contact') {
  const id = Number(trigger.dataset.id);
  const contact = state.crmContacts.find(c => Number(c.id) === id);
  openConfirm('contact_archive', id, contact ? `”${contact.contact_name}”` : 'This contact');
  return;
}

if (action === 'restore-contact') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmContact(id);
    if (result) {
      toast('Contact restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'open-contact-details') {
  const id = Number(trigger.dataset.id);
  openContactDetails(id);
  return;
}

if (action === 'back-to-contact-list') {
  state.selectedContactId = null;
  localStorage.removeItem('tgora_selected_contact_id');
  setView('crm');
  setCrmTab('contacts');
  return;
}

if (action === 'open-deal-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  openNewDealModal(prefillClientId);
  return;
}

if (action === 'open-deal-details') {
  openDealDetailsModal(Number(trigger.dataset.id));
  return;
}

if (action === 'edit-deal') {
  closeModal(); // Deal Details is a modal — close it first so Edit Deal isn't stacked behind it
  openEditDealModal(Number(trigger.dataset.id));
  return;
}

if (action === 'create-project-from-deal') {
  closeModal(); // Deal Details is a modal — close it first so the Project modal isn't stacked behind it
  openCreateProjectFromDeal(Number(trigger.dataset.id));
  return;
}

if (action === 'archive-deal') {
  const id = Number(trigger.dataset.id);
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  openConfirm('deal_archive', id, deal ? `”${deal.deal_name}”` : 'This deal');
  return;
}

if (action === 'restore-deal') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmDeal(id);
    if (result) {
      toast('Deal restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'open-activity-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  const prefillLeadId = trigger.dataset.leadId ? Number(trigger.dataset.leadId) : undefined;
  const prefillDealId = trigger.dataset.dealId ? Number(trigger.dataset.dealId) : undefined;
  openNewActivityModal(prefillClientId, prefillLeadId, prefillDealId);
  return;
}

if (action === 'open-proposal-from-client') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  openNewProposalModal(prefillClientId);
  return;
}

if (action === 'edit-activity') {
  openEditActivityModal(Number(trigger.dataset.id));
  return;
}

if (action === 'archive-activity') {
  const id = Number(trigger.dataset.id);
  const activity = state.crmActivities.find(a => Number(a.id) === id);
  openConfirm('activity_archive', id, activity ? `”${activity.title}”` : 'This activity');
  return;
}

if (action === 'restore-activity') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmActivity(id);
    if (result) {
      toast('Activity restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'open-note-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  const prefillLeadId = trigger.dataset.leadId ? Number(trigger.dataset.leadId) : undefined;
  openNewNoteModal(prefillClientId, prefillLeadId);
  return;
}

if (action === 'open-proposal-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  openNewProposalModal(prefillClientId);
  return;
}

if (action === 'edit-proposal') {
  openEditProposalModal(Number(trigger.dataset.id));
  return;
}

if (action === 'archive-proposal') {
  const id = Number(trigger.dataset.id);
  const proposal = state.crmProposals.find(p => Number(p.id) === id);
  openConfirm('proposal_archive', id, proposal ? `”${proposal.proposal_title}”` : 'This proposal');
  return;
}

if (action === 'restore-proposal') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const result = await restoreCrmProposal(id);
    if (result) {
      toast('Proposal restored to Active.', 'success');
      await refreshDataAndRender();
    }
  })();
  return;
}

if (action === 'crm-kpi-nav') {
  const tab = trigger.dataset.crmTab;
  const filtersAttr = trigger.dataset.crmFilters;
  const moduleKey = CRM_TAB_FILTER_MODULES[tab];
  if (moduleKey) {
    const config = HEADER_FILTER_MODULES[moduleKey];
    // Sprint CRM-4.5F fix pass — always reset to the module's own defaults
    // first, even when this card carries no KPI-specific override (Open
    // Leads/Open Deals/Pipeline Value). Previously a bare tab-switch left
    // whatever filter a prior KPI click had set (e.g. Converted Leads'
    // status=converted) still applied when Open Leads was clicked next.
    Object.assign(state.filters[moduleKey], config.defaults);
    closeHeaderFilterPopovers(moduleKey);
    if (filtersAttr) {
      filtersAttr.split(',').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) state.filters[moduleKey][key] = value;
      });
    }
    config.render();
  }
  if (tab) setCrmTab(tab);
  return;
}

// Finance actions
if (action === 'open-finance-transaction-modal') {
  openFinanceTransactionModal();
  return;
}
if (action === 'open-split-receipt-modal') {
  openSplitReceiptModal();
  return;
}
if (action === 'open-kpi-drilldown') {
  if (e.target.closest('.kpi-info-circle')) return;
  const kpiKey = trigger.closest('[data-kpi-key]')?.dataset.kpiKey || trigger.dataset.kpiKey;
  if (kpiKey) openKpiDrilldown(kpiKey);
  return;
}
if (action === 'open-widget-drilldown') {
  if (e.target.closest('.widget-info-icon')) return;
  const widgetKey = trigger.closest('[data-widget]')?.dataset.widget || trigger.dataset.widget;
  if (widgetKey) openWidgetDrilldown(widgetKey);
  return;
}
if (action === 'kpi-nav-to') {
  const tab = trigger.dataset.tab;
  const typeFilter = trigger.dataset.typeFilter;
  if (tab) {
    if (tab === 'transactions' && typeFilter !== undefined) {
      const newType = typeFilter || 'all';
      state.filters.financeTransactions.type = newType;
      const typeEl = $('#finance-tx-type-filter');
      if (typeEl) typeEl.value = newType;
      renderFinanceTransactions();
    }
    if (tab === 'forecast') {
      // Sprint Project Commercial C3 — always reset Forecast filters to their
      // defaults first, mirroring the CRM KPI-nav reset-before-apply fix
      // (see the 'crm-kpi-nav' handler above), so a filter left over from
      // browsing the table manually never leaks into a KPI's target view.
      Object.assign(state.filters.financeForecasts, FINANCE_FORECAST_FILTER_DEFAULTS);
      if (typeFilter) state.filters.financeForecasts.type = typeFilter;
      const searchEl    = $('#finance-forecast-search');
      const typeEl       = $('#finance-forecast-type-filter');
      const statusEl      = $('#finance-forecast-status-filter');
      const archivedEl    = $('#finance-forecast-archived-filter');
      const sourceEl       = $('#finance-forecast-source-filter');
      const componentEl    = $('#finance-forecast-component-filter');
      if (searchEl)    searchEl.value    = '';
      if (typeEl)       typeEl.value      = state.filters.financeForecasts.type;
      if (statusEl)      statusEl.value    = state.filters.financeForecasts.status;
      if (archivedEl)    archivedEl.value  = state.filters.financeForecasts.archived;
      if (sourceEl)       sourceEl.value    = state.filters.financeForecasts.source;
      if (componentEl)    componentEl.value = state.filters.financeForecasts.component;
      renderFinanceForecast();
    }
    setFinanceTab(tab);
  }
  closeModal();
  return;
}
if (action === 'clear-finance-forecast-filters') {
  Object.assign(state.filters.financeForecasts, FINANCE_FORECAST_FILTER_DEFAULTS);
  const searchEl    = $('#finance-forecast-search');
  const typeEl       = $('#finance-forecast-type-filter');
  const statusEl      = $('#finance-forecast-status-filter');
  const sourceEl       = $('#finance-forecast-source-filter');
  const componentEl    = $('#finance-forecast-component-filter');
  if (searchEl)    searchEl.value    = '';
  if (typeEl)       typeEl.value      = 'all';
  if (statusEl)      statusEl.value    = 'all';
  if (sourceEl)       sourceEl.value    = 'all';
  if (componentEl)    componentEl.value = 'all';
  renderFinanceForecast();
  return;
}
if (action === 'open-account-ledger') {
  openAccountLedgerModal(Number(trigger.dataset.id));
  return;
}
if (action === 'open-finance-account-modal') {
  openFinanceAccountModal();
  return;
}
if (action === 'edit-finance-transaction') {
  openFinanceTransactionModal(Number(trigger.dataset.id));
  return;
}
if (action === 'edit-finance-account') {
  openFinanceAccountModal(Number(trigger.dataset.id));
  return;
}
if (action === 'archive-finance-transaction') {
  const id = Number(trigger.dataset.id);
  const tx = state.financeTransactions.find(t => Number(t.id) === id);
  openConfirm('finance_transaction_archive', id, tx?.description ? `”${tx.description}”` : 'This transaction');
  return;
}
if (action === 'restore-finance-transaction') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const ok = await restoreFinanceTransaction(id);
    if (ok) {
      toast('Transaction restored.', 'success');
      await loadFinanceTransactionsAndSync();
      renderFinanceView();
    }
  })();
  return;
}
if (action === 'soft-delete-finance-transaction') {
  const id = Number(trigger.dataset.id);
  const tx = state.financeTransactions.find(t => Number(t.id) === id);
  openConfirm('finance_transaction_soft_delete', id, tx?.description ? `”${tx.description}”` : 'This transaction');
  return;
}
if (action === 'permanent-delete-finance-transaction') {
  const id = Number(trigger.dataset.id);
  const tx = state.financeTransactions.find(t => Number(t.id) === id);
  openConfirm('finance_transaction_permanent_delete', id, tx?.description ? `”${tx.description}”` : 'This transaction');
  return;
}
if (action === 'open-finance-forecast-modal') {
  openFinanceForecastModal();
  return;
}
if (action === 'edit-finance-forecast') {
  openFinanceForecastModal(Number(trigger.dataset.id));
  return;
}
if (action === 'archive-finance-forecast') {
  const id = Number(trigger.dataset.id);
  const fc = state.financeForecasts.find(f => Number(f.id) === id);
  openConfirm('finance_forecast_archive', id, fc?.description ? `”${fc.description}”` : 'This forecast');
  return;
}
if (action === 'restore-finance-forecast') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const ok = await restoreFinanceForecast(id);
    if (ok) {
      toast('Forecast restored.', 'success');
      state.financeForecasts = await fetchFinanceForecasts();
      renderFinanceView();
    }
  })();
  return;
}
if (action === 'soft-delete-finance-forecast') {
  const id = Number(trigger.dataset.id);
  const fc = state.financeForecasts.find(f => Number(f.id) === id);
  openConfirm('finance_forecast_soft_delete', id, fc?.description ? `”${fc.description}”` : 'This forecast');
  return;
}
if (action === 'permanent-delete-finance-forecast') {
  const id = Number(trigger.dataset.id);
  const fc = state.financeForecasts.find(f => Number(f.id) === id);
  openConfirm('finance_forecast_permanent_delete', id, fc?.description ? `”${fc.description}”` : 'This forecast');
  return;
}
if (action === 'convert-forecast-to-tx') {
  convertForecastToTransaction(Number(trigger.dataset.id));
  return;
}

if (action === 'open-commercial-terms-modal') {
  openCommercialTermsModal();
  return;
}
if (action === 'open-payment-item-modal') {
  openPaymentItemModal();
  return;
}
if (action === 'edit-payment-item') {
  openPaymentItemModal(Number(trigger.dataset.id));
  return;
}
if (action === 'cancel-payment-item') {
  handleCancelPaymentScheduleItem(Number(trigger.dataset.id));
  return;
}
if (action === 'restore-payment-item') {
  handleRestorePaymentScheduleItem(Number(trigger.dataset.id));
  return;
}
if (action === 'open-collect-payment') {
  openCollectPaymentModal(Number(trigger.dataset.id));
  return;
}

if (action === 'generate-payment-item-forecasts') {
  handleGeneratePaymentItemForecasts(Number(trigger.dataset.id));
  return;
}
if (action === 'generate-all-eligible-forecasts') {
  handleGenerateAllEligibleForecasts();
  return;
}
if (action === 'open-forecast-schedule-review') {
  openForecastScheduleReviewModal(Number(trigger.dataset.id));
  return;
}
if (action === 'update-forecast-from-schedule') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const fc = state.financeForecasts.find((f) => Number(f.id) === id);
    const item = fc ? state.projectPaymentScheduleItems.find((i) => Number(i.id) === Number(fc.payment_schedule_item_id)) : null;
    if (!fc || !item) return;
    const result = await updateGeneratedForecastFromSchedule(id, item, fc.forecast_component, 'updated_from_schedule');
    if (result) {
      toast('Forecast updated from schedule.', 'success');
      state.financeForecasts = await fetchFinanceForecasts();
      renderProjectDetails();
      closeModal();
    }
  })();
  return;
}
if (action === 'request-reset-forecast-from-schedule') {
  const id = Number(trigger.dataset.id);
  const zone = document.querySelector(`[data-reset-zone="${id}"]`);
  if (zone) {
    zone.innerHTML = `
      <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <p class="text-xs text-rose-700 mb-2">This will discard the manual adjustment and overwrite the Forecast's amount and date with the current Payment Schedule values. This cannot be undone.</p>
        <div class="flex gap-2">
          <button type="button" data-action="confirm-reset-forecast-from-schedule" data-id="${id}" class="h-7 px-3 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg">Confirm Reset</button>
          <button type="button" data-action="cancel-reset-forecast-from-schedule" class="h-7 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>`;
  }
  return;
}
if (action === 'cancel-reset-forecast-from-schedule') {
  if (state.reviewingPaymentScheduleItemId != null) openForecastScheduleReviewModal(state.reviewingPaymentScheduleItemId);
  return;
}
if (action === 'confirm-reset-forecast-from-schedule') {
  const id = Number(trigger.dataset.id);
  (async () => {
    const fc = state.financeForecasts.find((f) => Number(f.id) === id);
    const item = fc ? state.projectPaymentScheduleItems.find((i) => Number(i.id) === Number(fc.payment_schedule_item_id)) : null;
    if (!fc || !item) return;
    const result = await updateGeneratedForecastFromSchedule(id, item, fc.forecast_component, 'reset_to_schedule');
    if (result) {
      toast('Forecast reset to schedule.', 'success');
      state.financeForecasts = await fetchFinanceForecasts();
      renderProjectDetails();
      closeModal();
    }
  })();
  return;
}
});

  // Forms
  $('#logout-btn')?.addEventListener('click', handleLogout);
  $('#project-form').addEventListener('submit', handleProjectSubmit);
  $('#member-form').addEventListener('submit', handleMemberSubmit);
  $('#task-form').addEventListener('submit', handleTaskSubmit);
  $('#lead-form')?.addEventListener('submit', handleLeadSubmit);
  $('#client-form')?.addEventListener('submit', handleClientSubmit);
  $('#client-type-select')?.addEventListener('change', (e) => updateClientIndustryDatalist(e.target.value));
  $('#client-source-select')?.addEventListener('change', (e) => updateClientReferredByVisibility(e.target.value, $('#client-form')));
  $('#contact-form')?.addEventListener('submit', handleContactSubmit);
  $('#contact-client-id')?.addEventListener('change', (e) => updateContactCompanyHelper(e.target.value));
  $('#deal-form')?.addEventListener('submit', handleDealSubmit);
  $('#deal-lead-id')?.addEventListener('change', handleDealLeadAutofill);
  // Sprint CRM-4.5D Fix Pass 2 — Related Lead is filtered to the selected
  // Client/Company. Keep the current Related Lead selected only if it still
  // belongs to the newly-selected Client; otherwise clear it.
  $('#deal-client-id')?.addEventListener('change', (e) => {
    const clientId = e.target.value ? Number(e.target.value) : null;
    const leadSel = $('#deal-lead-id');
    const currentLeadId = leadSel && leadSel.value ? Number(leadSel.value) : null;
    const currentLead = currentLeadId != null ? state.crmLeads.find(l => Number(l.id) === currentLeadId) : null;
    const stillValid = !!currentLead && clientId != null && Number(currentLead.client_id) === clientId;
    populateDealLeadSelect(clientId, stillValid ? currentLeadId : null);
  });
  // Sprint CRM-4.5E — live percentage label + Expected Close lock on Won/Lost.
  $('#deal-probability')?.addEventListener('input', updateDealProbabilityDisplay);
  $('#deal-stage')?.addEventListener('change', updateDealExpectedCloseLock);
  $('#activity-form')?.addEventListener('submit', handleActivitySubmit);
  // Sprint CRM-4.5E — Activity relations cascade: Company filters Related
  // Lead and Related Deal; picking a Lead narrows Related Deal to that
  // Lead's Deals. Current selections are kept only while they still belong
  // to the newly-chosen Company/Lead (same rule as #deal-client-id above).
  $('#activity-client-id')?.addEventListener('change', (e) => {
    const clientId = e.target.value ? Number(e.target.value) : null;
    const leadSel = $('#activity-lead-id');
    const currentLeadId = leadSel && leadSel.value ? Number(leadSel.value) : null;
    const currentLead = currentLeadId != null ? state.crmLeads.find(l => Number(l.id) === currentLeadId) : null;
    const leadStillValid = !!currentLead && clientId != null && Number(currentLead.client_id) === clientId;
    const keptLeadId = leadStillValid ? currentLeadId : null;
    populateActivityLeadSelect(clientId, keptLeadId);
    const dealSel = $('#activity-deal-id');
    const currentDealId = dealSel && dealSel.value ? Number(dealSel.value) : null;
    const currentDeal = currentDealId != null ? state.crmDeals.find(d => Number(d.id) === currentDealId) : null;
    const dealStillValid = !!currentDeal && clientId != null && Number(currentDeal.client_id) === clientId
      && (keptLeadId == null || Number(currentDeal.lead_id) === keptLeadId);
    populateActivityDealSelect(clientId, keptLeadId, dealStillValid ? currentDealId : null);
  });
  $('#activity-lead-id')?.addEventListener('change', (e) => {
    const leadId = e.target.value ? Number(e.target.value) : null;
    const cSel = $('#activity-client-id');
    const clientId = cSel && cSel.value ? Number(cSel.value) : null;
    const dealSel = $('#activity-deal-id');
    const currentDealId = dealSel && dealSel.value ? Number(dealSel.value) : null;
    const currentDeal = currentDealId != null ? state.crmDeals.find(d => Number(d.id) === currentDealId) : null;
    const dealStillValid = !!currentDeal && clientId != null && Number(currentDeal.client_id) === clientId
      && (leadId == null || Number(currentDeal.lead_id) === leadId);
    populateActivityDealSelect(clientId, leadId, dealStillValid ? currentDealId : null);
  });
  $('#note-form')?.addEventListener('submit', handleNoteSubmit);
  $('#proposal-form')?.addEventListener('submit', handleProposalSubmit);
  $('#finance-account-form')?.addEventListener('submit', handleFinanceAccountSubmit);
  $('#finance-transaction-form')?.addEventListener('submit', handleFinanceTransactionSubmit);
  $('#split-receipt-form')?.addEventListener('submit', handleSplitReceiptSubmit);
  $('#finance-forecast-form')?.addEventListener('submit', handleFinanceForecastSubmit);
  $('#commercial-terms-form')?.addEventListener('submit', handleCommercialTermsSubmit);
  $('#payment-item-form')?.addEventListener('submit', handlePaymentItemSubmit);
  $('#payment-item-form')?.elements['client_funds_amount']?.addEventListener('input', updateClientFundsPurposeRequiredIndicator);
  $('#collect-payment-form')?.addEventListener('submit', handleCollectPaymentSubmit);
  $('#confirm-delete-btn').addEventListener('click', confirmDelete);

  // CRM Leads filters
  $('#crm-leads-search')?.addEventListener('input', (e) => {
    state.filters.crmLeads.search = e.target.value;
    renderCrmLeads();
  });
  $('#crm-leads-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmLeads.archived = e.target.value;
    renderCrmLeads();
  });
  $('#crm-leads-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmLeads', 'crm-leads-search', 'crm-leads-status-filter');
  });

  // CRM Clients filters
  $('#crm-clients-search')?.addEventListener('input', (e) => {
    state.filters.crmClients.search = e.target.value;
    renderCrmClients();
  });
  $('#crm-clients-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmClients.archived = e.target.value;
    renderCrmClients();
  });
  // crm-clients-type-filter listener removed — Type is now a table header filter
  $('#crm-clients-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmClients', 'crm-clients-search', 'crm-clients-status-filter');
  });

  // CRM Contacts filters
  $('#crm-contacts-search')?.addEventListener('input', (e) => {
    state.filters.crmContacts.search = e.target.value;
    renderCrmContacts();
  });
  $('#crm-contacts-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmContacts.archived = e.target.value;
    renderCrmContacts();
  });
  $('#crm-contacts-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmContacts', 'crm-contacts-search', 'crm-contacts-status-filter');
  });

  // CRM Deals filters
  $('#crm-deals-search')?.addEventListener('input', (e) => {
    state.filters.crmDeals.search = e.target.value;
    renderCrmDeals();
  });
  $('#crm-deals-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmDeals.archived = e.target.value;
    renderCrmDeals();
  });
  $('#crm-deals-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmDeals', 'crm-deals-search', 'crm-deals-status-filter');
  });

  // CRM Activities filters
  $('#crm-activities-search')?.addEventListener('input', (e) => {
    state.filters.crmActivities.search = e.target.value;
    renderCrmActivities();
  });
  $('#crm-activities-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmActivities.archived = e.target.value;
    renderCrmActivities();
  });
  $('#crm-activities-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmActivities', 'crm-activities-search', 'crm-activities-status-filter');
  });

  // CRM Proposals filters
  $('#crm-proposals-search')?.addEventListener('input', (e) => {
    state.filters.crmProposals.search = e.target.value;
    renderCrmProposals();
  });
  $('#crm-proposals-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmProposals.archived = e.target.value;
    renderCrmProposals();
  });
  $('#crm-proposals-clear-filters')?.addEventListener('click', () => {
    clearCrmModuleFilters('crmProposals', 'crm-proposals-search', 'crm-proposals-status-filter');
  });

  // CRM Tab navigation
  document.querySelectorAll('[data-crm-tab]').forEach(btn => {
    btn.addEventListener('click', () => setCrmTab(btn.dataset.crmTab));
  });

  // Finance Tab navigation
  document.querySelectorAll('[data-finance-tab]').forEach(btn => {
    btn.addEventListener('click', () => setFinanceTab(btn.dataset.financeTab));
  });

  // Accounting Report tab navigation (Sprint 4.5A)
  document.querySelectorAll('[data-accounting-report]').forEach(btn => {
    btn.addEventListener('click', () => setAccountingReportTab(btn.dataset.accountingReport));
  });

  // Finance Transactions filters
  $('#finance-tx-type-filter')?.addEventListener('change', (e) => {
    state.filters.financeTransactions.type = e.target.value;
    renderFinanceTransactions();
  });
  $('#finance-tx-account-filter')?.addEventListener('change', (e) => {
    state.filters.financeTransactions.account = e.target.value;
    renderFinanceTransactions();
  });
  $('#finance-tx-archived-filter')?.addEventListener('change', (e) => {
    state.filters.financeTransactions.archived = e.target.value;
    renderFinanceTransactions();
  });
  $('#finance-tx-search')?.addEventListener('input', (e) => {
    state.filters.financeTransactions.search = e.target.value;
    renderFinanceTransactions();
  });

  // Transaction type sync
  $('#finance-tx-type')?.addEventListener('change', syncFinanceTxFields);

  // Finance Forecast filters
  $('#finance-forecast-search')?.addEventListener('input', (e) => {
    state.filters.financeForecasts.search = e.target.value;
    renderFinanceForecast();
  });
  $('#finance-forecast-type-filter')?.addEventListener('change', (e) => {
    state.filters.financeForecasts.type = e.target.value;
    renderFinanceForecast();
  });
  $('#finance-forecast-status-filter')?.addEventListener('change', (e) => {
    state.filters.financeForecasts.status = e.target.value;
    renderFinanceForecast();
  });
  $('#finance-forecast-archived-filter')?.addEventListener('change', (e) => {
    state.filters.financeForecasts.archived = e.target.value;
    renderFinanceForecast();
  });
  $('#finance-forecast-source-filter')?.addEventListener('change', (e) => {
    state.filters.financeForecasts.source = e.target.value;
    renderFinanceForecast();
  });
  $('#finance-forecast-component-filter')?.addEventListener('change', (e) => {
    state.filters.financeForecasts.component = e.target.value;
    renderFinanceForecast();
  });

  // Finance Date Range selector
  $('#finance-date-range')?.addEventListener('change', (e) => {
    state.financeDateRange = e.target.value;
    localStorage.setItem('tgora_finance_date_range', e.target.value);
    renderFinanceGlobalPeriodBar();
    if (e.target.value !== 'custom' || (state.financeCustomStart && state.financeCustomEnd)) {
      renderFinanceDashboard();
      renderFinanceReports();
    }
  });
  $('#finance-custom-start')?.addEventListener('change', (e) => {
    state.financeCustomStart = e.target.value;
    localStorage.setItem('tgora_finance_custom_start', e.target.value);
    if (state.financeCustomEnd) { renderFinanceDashboard(); renderFinanceReports(); renderFinanceGlobalPeriodBar(); }
  });
  $('#finance-custom-end')?.addEventListener('change', (e) => {
    state.financeCustomEnd = e.target.value;
    localStorage.setItem('tgora_finance_custom_end', e.target.value);
    if (state.financeCustomStart) { renderFinanceDashboard(); renderFinanceReports(); renderFinanceGlobalPeriodBar(); }
  });

  // Split receipt: auto-compute pass-through amount
  const splitTotalInput = $('#split-total-amount');
  const splitSvcInput   = $('#split-service-amount');
  const splitPtDisplay  = $('#split-pt-display');
  function updateSplitPt() {
    const total  = Number(splitTotalInput?.value) || 0;
    const svc    = Number(splitSvcInput?.value)   || 0;
    const pt     = Math.max(0, total - svc);
    if (splitPtDisplay) splitPtDisplay.textContent = fmtMoney(pt);
  }
  splitTotalInput?.addEventListener('input', updateSplitPt);
  splitSvcInput?.addEventListener('input',   updateSplitPt);

  // Lead form: Company -> Contact filtering + owner/source autofill (Sprint CRM-4.5D)
  $('#lead-client-id')?.addEventListener('change', (e) => {
    const clientId = e.target.value ? Number(e.target.value) : null;
    populateLeadContactSelect(clientId, null);
    renderLeadContactPreview(null);
    if (!clientId) return;
    const client = state.crmClients.find(c => Number(c.id) === clientId);
    if (!client) return;
    const form = $('#lead-form');
    if (!form) return;
    if (!form.owner_id.value && client.owner_id) form.owner_id.value = String(client.owner_id);
    if (form.source && (form.source.value === '' || form.source.value === 'unknown') && client.source) {
      form.source.value = 'existing_client';
    }
  });

  $('#lead-contact-id')?.addEventListener('change', (e) => {
    renderLeadContactPreview(e.target.value || null);
  });

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
      resetProjectDetailsFiltersForProject(entityId);

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
    resetProjectDetailsFiltersForProject(entityId);

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

$$('[data-th-popover-toggle]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    const popoverId = btn.dataset.thPopoverToggle;
    const module = btn.dataset.filterModule;
    const popover = $(`#${popoverId}`);
    if (!popover || !module) return;

    const willOpen = popover.classList.contains('hidden');

    if (willOpen) {
      openHeaderFilterPopover(module, popover);
    } else {
      closeHeaderFilterPopovers(module);
    }
  });
});

document.addEventListener('click', (e) => {
  const chipRemoveBtn = e.target.closest('[data-clear-filter]');
  if (!chipRemoveBtn) return;

  e.stopPropagation();
  clearSingleFilter(chipRemoveBtn.dataset.filterModule, chipRemoveBtn.dataset.clearFilter);
});

document.addEventListener('click', (e) => {
  const option = e.target.closest('.task-th-popover-option');
  if (!option) return;

  const popover = option.closest('.task-th-popover');
  const filterType = popover?.dataset.filterType;
  const module = popover?.dataset.filterModule;
  const config = module && HEADER_FILTER_MODULES[module];
  if (!filterType || !config) return;

  e.stopPropagation();

  const rawValue = option.dataset.value || '';
  const filters = state.filters[config.stateKey];

  filters[filterType] = config.allDefaultFilters.includes(filterType) ? (rawValue || 'all') : (rawValue || null);

  popover.classList.add('hidden');
  config.render();
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.task-th-popover') || e.target.closest('[data-th-popover-toggle]')) return;
  closeAllHeaderFilterPopovers();
});

// ---------- Kanban Drag & Drop Helpers ----------

// Transient drag state. Not in `state` — it's ephemeral UI, not app data.
let _draggedTaskId = null;
let _dragInFlight = false;

function startTaskDrag(e, taskId) {
  _draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(taskId));
  e.target.closest('[data-kanban-card]')?.classList.add('is-dragging');
}

// Called on drop: validates permission, then delegates status change to
// updateTask() which handles completed_at stamping and all notifications.
// _dragInFlight prevents a second drop from firing while the first is in-flight.
async function handleTaskDrop(e, targetStatus) {
  if (!_draggedTaskId || _dragInFlight) return;
  const taskId = _draggedTaskId;
  const task = state.tasks.find((t) => Number(t.id) === Number(taskId));
  if (!task) return;

  if ((task.status || '').toLowerCase() === targetStatus) return;

  if (!canFullyEditTask() && !canLimitedEditTask(task)) {
    toast('You do not have permission to move this task.', 'error');
    return;
  }

  _dragInFlight = true;
  try {
    await updateTask(taskId, { status: targetStatus });
    // updateTask() already toasts on error and returns null — no double-toast needed.
  } finally {
    _dragInFlight = false;
  }
}

function finishTaskDrag() {
  $$('[data-kanban-card].is-dragging').forEach((el) => el.classList.remove('is-dragging'));
  _draggedTaskId = null;
}

// ---------- Event Listeners ----------

$('#tasks-reset-filters')?.addEventListener('click', () => resetModuleFilters('tasks'));
$('#tasks-empty-reset-btn')?.addEventListener('click', () => resetModuleFilters('tasks'));

// Archive visibility toggle (Active / Archived / All)
$('#tasks-archive-toggle')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.archive-toggle-btn');
  if (!btn) return;
  const view = btn.dataset.archiveView;
  if (!view) return;
  state.filters.tasks.archiveView = view;
  renderTasks();
});

// Projects archive visibility toggle (Active / Archived / All)
$('#projects-archive-toggle')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.archive-toggle-btn');
  if (!btn) return;
  const view = btn.dataset.archiveView;
  if (!view) return;
  state.filters.projects.archiveView = view;
  renderProjects();
});

// Tasks view mode switcher (Table / Kanban)
$('#tasks-view-switcher')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-mode-btn');
  if (!btn) return;
  state.tasksViewMode = btn.dataset.viewMode;
  localStorage.setItem('tgora_tasks_view_mode', state.tasksViewMode);
  renderTasks();
});

// Kanban drag & drop — delegated from the persistent container so listeners
// survive innerHTML re-renders of the board.
const _kanbanContainer = $('#tasks-kanban-container');
if (_kanbanContainer) {
  _kanbanContainer.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-kanban-card]');
    if (!card) return;
    startTaskDrag(e, card.dataset.taskId);
  });

  _kanbanContainer.addEventListener('dragover', (e) => {
    const col = e.target.closest('[data-kanban-status]');
    if (!col) return;
    e.preventDefault();
    // Highlight only the current target column
    $$('#tasks-kanban-container [data-kanban-status]').forEach((c) => c.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });

  _kanbanContainer.addEventListener('dragleave', (e) => {
    const col = e.target.closest('[data-kanban-status]');
    if (!col) return;
    // Only remove highlight when cursor leaves the column entirely (not its children)
    if (!col.contains(e.relatedTarget)) {
      col.classList.remove('drag-over');
    }
  });

  _kanbanContainer.addEventListener('drop', (e) => {
    const col = e.target.closest('[data-kanban-status]');
    if (!col) return;
    e.preventDefault();
    $$('#tasks-kanban-container [data-kanban-status]').forEach((c) => c.classList.remove('drag-over'));
    handleTaskDrop(e, col.dataset.kanbanStatus);
  });

  _kanbanContainer.addEventListener('dragend', () => {
    finishTaskDrag();
    $$('#tasks-kanban-container [data-kanban-status]').forEach((c) => c.classList.remove('drag-over'));
  });
}

$('#member-tasks-clear-filters')?.addEventListener('click', () => {
  Object.assign(state.filters.memberTasks, { status: 'all', priority: 'all', project: null, deadline: null });
  state.memberTasksCardBase = null;
  renderMemberTasksTable();
});

$('#projects-reset-filters')?.addEventListener('click', () => resetModuleFilters('projects'));
$('#projects-empty-reset-btn')?.addEventListener('click', () => resetModuleFilters('projects'));

$('#project-details-reset-filters')?.addEventListener('click', () => resetModuleFilters('projectDetails'));
$('#project-details-tasks-empty-reset-btn')?.addEventListener('click', () => resetModuleFilters('projectDetails'));

  // Search (module-scoped: only the currently active module is affected)
  $('#global-search').addEventListener('input', (e) => {
    const value = e.target.value.trim();

    if (state.view === 'projects') {
      state.filters.projects.search = value;
      renderProjects();
    } else if (state.view === 'tasks') {
      state.filters.tasks.search = value;
      renderTasks();
    } else if (state.view === 'project-details') {
      state.filters.projectDetails.search = value;
      renderProjectDetails();
    } else if (state.view === 'team') {
      state.filters.team.search = value;
      renderTeam();
    }
  });

  // Esc to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeConfirm();
      closeSidebar();
      closeAllHeaderFilterPopovers();
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

// ---------- Monthly Task Archive (client-side scheduler substitute) ----------
// Two entry points share the eligibility logic below (isTerminalTaskStatus /
// resolveTaskOperationalDate / shouldMonthlyArchiveTask):
//   1. runMonthlyTaskArchiveIfNeeded() — Admin-only, runs on app init, sweeps
//      ALL tasks. This is the "replace with a backend cron job" stand-in.
//   2. updateTask() — Sprint 3.1C.4, runs on every save (any role with edit
//      permission), and applies the identical check to just the one task
//      being saved, so a task that's both terminal and already in a closed
//      operational month leaves Active immediately instead of waiting for
//      the next admin session or a page refresh.
// Tasks are still deliberately NEVER archived just because they turned
// terminal in the CURRENT month — unlike Projects, which archive inline on
// save regardless of month. See Sprint 3.1C.
//
// Rules:
//   - Terminal statuses only: completed, cancelled. Non-terminal tasks
//     (todo/in_progress/review/on_hold) are never touched, no matter how
//     old their deadline is — they must stay visible as open work.
//   - Catches up: each admin session archives every terminal task whose
//     operational date falls on or before the end of the last fully closed
//     calendar month (not just the immediately preceding month, so a
//     multi-month gap in admin logins is cleared in one sweep). The
//     current month is never touched.
//   - Operational date (resolveTaskOperationalDate), Sprint 3.1C.3:
//     deadline -> start_date -> created_at -> completed_at -> now. This is
//     "which month did the work belong to", NOT "when did it become
//     terminal" — a task that operationally belongs to June still archives
//     even if it's only marked completed/cancelled today. completed_at is
//     deliberately last (before "now"): Sprint 3.1C.2 made updateTask()
//     stamp it on entering either terminal status as a useful signal, but
//     it must never outrank a real deadline/start_date, or a task cancelled
//     today for a June deadline would wrongly stay Active until August.
//     completed_at is backfilled (backfillMissingCompletedAt) for completed
//     tasks missing it, purely so it remains a decent last-resort value.
//   - Sprint 3.1C.4: deadline/start_date are parsed via parseDateOnlyLocal(),
//     not a bare `new Date(string)` — see that function's comment for why a
//     date-only string silently shifts a calendar day backwards in western
//     timezones once compared against this file's local-time month
//     boundaries otherwise.
//   - start_date/created_at are read-only inputs here, never written to the
//     tasks table — their presence in the schema is unconfirmed, and
//     reading a missing property is safe in JS while writing an unknown
//     column is not (see the projects_archive_migration.sql incident).
//   - Idempotent: is_archived = false is enforced in both the JS filter and
//     the SQL update, so re-running is always safe. Eligibility is
//     re-evaluated against current data on every call — a task can become
//     terminal for an already-closed month after that month was last
//     checked (e.g. edited to completed/cancelled later), so a matching
//     localStorage marker is never used to skip the scan. The marker is
//     written purely as a diagnostic "last checked" record.
//   - Sprint 3.1C.4: a task already archived by older, pre-3.1C.3 logic
//     that no longer qualifies under the current operational-month rule is
//     deliberately left archived. Nothing here re-evaluates already-
//     archived rows (both entry points skip them by construction) — that's
//     stale data from a prior bug, not something this code auto-corrects.
//     Use the manual Restore to Active action for those rows.

const TASK_ARCHIVE_MARKER_KEY = 'tgora_task_archive_last_closed_month';

// A task status that permanently ends its lifecycle. Kept separate from
// isTerminalProjectStatus() — tasks and projects archive on different
// triggers (monthly sweep vs. immediate on save) and must stay independent.
function isTerminalTaskStatus(status) {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'cancelled';
}

// Sprint 3.1C.4: deadline/start_date come from <input type="date"> and/or a
// Postgres `date` column — bare "YYYY-MM-DD" strings with no time or
// timezone component. `new Date("YYYY-MM-DD")` parses those as UTC
// midnight, while every month-boundary in this file (getLastClosedMonthRange)
// is built with the LOCAL-time Date constructor. In any timezone west of
// UTC, that mismatch silently shifts a date-only value back by a full
// calendar day once compared — a task with a locally-picked "Jul 1"
// deadline could resolve to "Jun 30" and get wrongly swept into a closed
// month. Parsing the y/m/d components directly and building the Date via
// the local-time constructor keeps it anchored to the day the user
// actually picked. Full timestamps (completed_at, and created_at if it
// carries a timezone) already parse correctly and pass through unchanged.
function parseDateOnlyLocal(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}

// Best available date to decide which OPERATIONAL month a task belongs to
// — i.e. the month the work itself happened in, not the month it was
// marked terminal. Sprint 3.1C.3: deadline/start_date lead the fallback
// chain and completed_at is deliberately last (before "now"), so a task
// that operationally belongs to an old, closed month still archives even
// when it was only completed/cancelled today. Pure read — never writes to
// the task, so it's safe even if start_date/created_at aren't real columns
// on this table (a missing property just reads as undefined and falls
// through to the next candidate).
function resolveTaskOperationalDate(task) {
  const candidate = task?.deadline || task?.start_date || task?.created_at || task?.completed_at;
  return candidate ? parseDateOnlyLocal(candidate) : new Date();
}

// End-of-day boundary of the last fully closed calendar month, relative to `now`.
function getLastClosedMonthRange(now = new Date()) {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const start = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(currentMonthStart.getTime() - 1); // last instant before the current month began
  return { start, end };
}

function shouldMonthlyArchiveTask(task, cutoffDate) {
  if (!task || task.is_archived) return false;
  if (!isTerminalTaskStatus(task.status)) return false;
  return resolveTaskOperationalDate(task) <= cutoffDate;
}

// Sprint 3.1C reliability fix: some completed tasks (legacy rows, imports,
// or anything that became 'completed' outside the updateTask() status-
// transition path) never got completed_at stamped, which permanently
// excluded them from the archive sweep. Backfill a fallback value once per
// task, without ever touching a completed_at that's already set.
async function backfillMissingCompletedAt() {
  const candidates = state.tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed' && !t.completed_at
  );

  for (const t of candidates) {
    const fallback = t.deadline || t.updated_at || t.created_at || new Date().toISOString();

    const { error } = await supabaseClient
      .from('tasks')
      .update({ completed_at: fallback })
      .eq('id', t.id)
      .is('completed_at', null);

    if (error) {
      console.error('backfillMissingCompletedAt:', t.id, error);
    }
  }
}

async function runMonthlyTaskArchiveIfNeeded() {
  if (!isAdmin()) return;

  const now = new Date();
  const { end: closedMonthEnd } = getLastClosedMonthRange(now);
  const closedMonthKey = `${closedMonthEnd.getFullYear()}-${String(closedMonthEnd.getMonth() + 1).padStart(2, '0')}`;

  try {
    // Eligibility is always re-checked against current data, never skipped
    // purely because the closed-month marker already matches. A task can
    // become terminal (edited to completed/cancelled) for an already-closed
    // month at any later date — e.g. a task cancelled on July 1st for a
    // June deadline — so the marker alone is not a safe skip signal. This
    // scan is a cheap in-memory filter, not a network call.
    const eligibleIds = state.tasks
      .filter((t) => shouldMonthlyArchiveTask(t, closedMonthEnd))
      .map((t) => t.id);

    if (eligibleIds.length === 0) {
      // Nothing to do — record that this closed month was checked, purely
      // as a diagnostic marker. It is never used to bail out early.
      localStorage.setItem(TASK_ARCHIVE_MARKER_KEY, closedMonthKey);
      return;
    }

    await backfillMissingCompletedAt();

    const { error } = await supabaseClient
      .from('tasks')
      .update({ is_archived: true, archived_at: now.toISOString() })
      .in('id', eligibleIds)
      .eq('is_archived', false);

    if (error) {
      console.error('runMonthlyTaskArchiveIfNeeded:', error);
      return;
    }

    localStorage.setItem(TASK_ARCHIVE_MARKER_KEY, closedMonthKey);

    // Refresh state so the UI reflects newly archived tasks.
    await refreshDataAndRender();
    toast('Terminal tasks archived for the closed month.', 'success');
  } catch (err) {
    console.error('runMonthlyTaskArchiveIfNeeded unexpected error:', err);
  }
}

async function init() {
  $('#year').textContent = new Date().getFullYear();

refreshIcons();
wireEvents();
renderStaticButtonMounts();

  // Show skeleton placeholders for stat numbers initially
  ['stat-total-projects', 'stat-completed-tasks', 'stat-in-progress', 'stat-overdue'].forEach((id) => {
    const el = $(`#${id}`);
    if (el) el.innerHTML = '<span class="skeleton inline-block h-6 w-10"></span>';
  });

  try {
    const [projects, tasks, teamMembers, crmLeads, crmClients, crmContacts, crmDeals, crmActivities, crmNotes, crmProposals, crmServiceTypes] = await Promise.all([
      fetchProjects(),
      fetchTasks(),
      fetchTeamMembers(),
      fetchCrmLeads(),
      fetchCrmClients(),
      fetchCrmContacts(),
      fetchCrmDeals(),
      fetchCrmActivities(),
      fetchCrmNotes(),
      fetchCrmProposals(),
      fetchCrmServiceTypes()
    ]);

    state.projects = projects;
    state.tasks = tasks;
    state.teamMembers = teamMembers;
    state.crmLeads = crmLeads;
    state.crmClients = crmClients;
    state.crmContacts = crmContacts;
    state.crmDeals = crmDeals;
    state.crmActivities = crmActivities;
    state.crmNotes = crmNotes;
    state.crmProposals = crmProposals;
    state.crmServiceTypes = crmServiceTypes;

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    state.currentUser = user || null;

    if (user?.id) {
      const matchedMember = state.teamMembers.find(
        (member) => String(member.auth_user_id || '') === String(user.id)
      );

      state.currentMember = matchedMember || null;
      state.currentRole = (matchedMember?.role_type || 'member').toLowerCase().trim();
      // C2: deny app access on session restore if this account has no active
      // Team Member record — must run before any admin-gated data below is
      // fetched or rendered.
      if (await denyAccessIfNotActiveMember(matchedMember)) return;
    } else {
      state.currentMember = null;
      state.currentRole = null;
    }

    await cleanupOldNotifications();
    const [notifications, financeAccounts, financeCategories, financeTransactions, financeForecasts, financeSettings, financeFixedCosts, financeChartOfAccounts, projectCommercialTerms, projectPaymentScheduleItems] = await Promise.all([
      fetchNotifications(),
      fetchFinanceAccounts(),
      fetchFinanceCategories(),
      fetchFinanceTransactions(),
      fetchFinanceForecasts(),
      fetchFinanceSettings(),
      fetchFinanceFixedCosts(),
      fetchFinanceChartOfAccounts(),
      fetchProjectCommercialTerms(),
      fetchProjectPaymentScheduleItems(),
    ]);
    state.notifications       = notifications;
    state.financeAccounts     = financeAccounts;
    state.financeCategories   = financeCategories;
    state.financeTransactions = financeTransactions;
    state.financeForecasts    = financeForecasts;
    state.financeSettings     = financeSettings;
    state.financeFixedCosts   = financeFixedCosts;
    state.financeChartOfAccounts = financeChartOfAccounts;
    state.projectCommercialTerms = projectCommercialTerms;
    state.projectPaymentScheduleItems = projectPaymentScheduleItems;
    syncAccountingJournal(); // Sprint 4.5B — initial load: post every active transaction once

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

  // Run monthly archive check after role is set and initial render is done.
  await runMonthlyTaskArchiveIfNeeded();
}

// KPI / widget info icon tooltip (delegated hover)
document.addEventListener('mouseover', (e) => {
  const circle = e.target.closest('.kpi-info-circle, .widget-info-icon');
  if (!circle) return;
  let tip = document.getElementById('kpi-tooltip-popup');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'kpi-tooltip-popup';
    tip.className = 'kpi-tooltip-popup';
    document.body.appendChild(tip);
  }
  const title = circle.dataset.tooltipTitle || '';
  const desc  = circle.dataset.tooltipDesc  || '';
  tip.innerHTML = `${title ? `<p class="kpi-tt-title">${escapeHtml(title)}</p>` : ''}${desc ? `<p class="kpi-tt-desc">${escapeHtml(desc)}</p>` : ''}`;
  const rect = circle.getBoundingClientRect();
  const W = 220;
  let left = rect.right - W + window.scrollX;
  if (left < 8) left = 8;
  tip.style.left = `${left}px`;
  tip.style.top  = `${rect.bottom + 6 + window.scrollY}px`;
  tip.classList.remove('hidden');
});
document.addEventListener('mouseout', (e) => {
  const circle = e.target.closest('.kpi-info-circle, .widget-info-icon');
  if (!circle) return;
  if (e.relatedTarget && circle.contains(e.relatedTarget)) return;
  const tip = document.getElementById('kpi-tooltip-popup');
  if (tip) tip.classList.add('hidden');
});

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