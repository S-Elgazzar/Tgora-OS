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
  filters: {
    projects: {
      status: 'all',
      search: '',
      priority: 'all',
      client: null,
      deadline: null,
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
    },
    crmClients: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      owner: null,
    },
    crmContacts: { archived: 'active', search: '', status: 'all' },
    crmDeals:    { archived: 'active', search: '', stage: 'all', status: 'all' },
    crmActivities: { archived: 'active', search: '', type: 'all', status: 'all' },
    crmProposals:  { archived: 'active', search: '', status: 'all' },
    financeTransactions: { search: '', type: 'all', account: '', archived: 'active' },
    financeAccounts:     { search: '' },
    financeForecasts:    { search: '', type: 'all', status: 'all', archived: 'active' },
  },
  pendingDelete: null, // { type: 'project' | 'task', id }
  crmLeads: [],
  crmClients: [],
  crmContacts: [],
  crmDeals: [],
  crmActivities: [],
  crmNotes: [],
  crmProposals: [],
  crmTab: 'dashboard',
  selectedClientId: Number(localStorage.getItem('tgora_selected_client_id')) || null,
  selectedDealId: Number(localStorage.getItem('tgora_selected_deal_id')) || null,
  editingLeadId: null,
  editingClientId: null,
  editingContactId: null,
  editingDealId: null,
  editingActivityId: null,
  editingNoteId: null,
  editingProposalId: null,
  financeAccounts: [],
  financeCategories: [],
  financeTransactions: [],
  financeForecasts: [],
  financeTab: 'dashboard',
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
const renderTaskActionsCell = (task, options = {}) => {
  const { canDelete = false, canEdit = true } = options;

  return `
    <td class="px-5 py-3.5 text-right">
      <div class="inline-flex items-center gap-1">
        ${renderTaskLinkIcons(task)}

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
      text: 'New Client',
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

// ---------- CRM Leads Data Layer ----------
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
    status: 'archived',
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

async function archiveCrmClient(id) {
  return updateCrmClient(id, {
    is_archived: true,
    status: 'archived',
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
async function archiveCrmContact(id) {
  return updateCrmContact(id, { is_archived: true, status: 'archived', updated_at: new Date().toISOString() });
}

// ---------- CRM Deals Data Layer ----------
async function fetchCrmDeals() {
  const { data, error } = await supabaseClient.from('crm_deals').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCrmDeals', error); return []; }
  return data || [];
}
async function createCrmDeal(payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_deals').insert([payload]).select().single();
  if (error) { console.error('createCrmDeal', error); toast(error.message || 'Failed to create deal', 'error'); return null; }
  return data;
}
async function updateCrmDeal(id, payload) {
  if (!isAdmin()) return null;
  const { data, error } = await supabaseClient.from('crm_deals').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateCrmDeal', error); toast(error.message || 'Failed to update deal', 'error'); return null; }
  return data;
}
async function archiveCrmDeal(id) {
  return updateCrmDeal(id, { is_archived: true, updated_at: new Date().toISOString() });
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
async function archiveCrmProposal(id) {
  return updateCrmProposal(id, { is_archived: true, status: 'archived', updated_at: new Date().toISOString() });
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

function populateClientOwnerSelect() {
  const select = $('#client-owner-id');
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
  const visibleProjects = getVisibleProjects();
  const visibleTasks = getVisibleTasks();

  const totalProjects = visibleProjects.length;

  const activeProjects = visibleProjects.filter(
    (p) => (p.status || '').toLowerCase() === 'active'
  ).length;

  const onHoldProjects = visibleProjects.filter(
    (p) => (p.status || '').toLowerCase() === 'on_hold'
  ).length;

  const urgentProjects = visibleProjects.filter(
    (p) => (p.priority || '').toLowerCase() === 'urgent'
  ).length;

  const totalTasks = visibleTasks.length;

  const completedTasks = visibleTasks.filter(
    (t) => (t.status || '').toLowerCase() === 'completed'
  ).length;

  const inProgress = visibleTasks.filter(
    (t) => ['in_progress', 'review'].includes((t.status || '').toLowerCase())
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = visibleTasks.filter((t) => {
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
    totalTasksLabel.textContent = member ? 'My Tasks' : 'Total Tasks';
  }

  const totalTasksSub = $('#stat-total-tasks-sub');
  if (totalTasksSub) {
    totalTasksSub.textContent = member ? 'Assigned to you' : 'Across all projects';
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
  const recent = [...getVisibleProjects()].slice(0, 5);
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

function renderRecentTasks() {
  const container = $('#recent-tasks-list');
  const upcoming = [...getVisibleTasks()]
    .filter((t) => (t.status || '').toLowerCase() !== 'completed')
    .sort((a, b) => {
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
    return d < today && (status || '').toLowerCase() !== 'completed';
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

function getFilteredProjects() {
  let data = [...state.projects];

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

  const summaryEl = $('#projects-results-summary');
  if (summaryEl) {
    const total = state.projects.length;
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

    const isFilteredEmpty = state.projects.length > 0;

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
      'crm-leads-source-popover',
      'crm-leads-status-popover',
      'crm-leads-owner-popover',
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
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmLeadsHeaderFilters(),
    render: () => renderCrmLeads(),
  },
  crmClients: {
    stateKey: 'crmClients',
    viewName: 'crm',
    popoverIds: [
      'crm-clients-type-popover',
      'crm-clients-status-popover',
      'crm-clients-owner-popover',
    ],
    chipsContainerId: null,
    allDefaultFilters: ['type', 'status'],
    defaults: {
      archived: 'active',
      search: '',
      type: 'all',
      status: 'all',
      owner: null,
    },
    getChips: () => [],
    renderHeaderFilters: () => renderCrmClientsHeaderFilters(),
    render: () => renderCrmClients(),
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

function renderCrmLeadsHeaderFilters() {
  const f = state.filters.crmLeads;

  $('#crm-leads-source-th-filter')?.classList.toggle('active', f.source !== 'all');
  $('#crm-leads-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-leads-owner-th-filter')?.classList.toggle('active', f.owner !== null);

  syncHeaderFilterPopoverActive('crm-leads-source-popover', f.source);
  syncHeaderFilterPopoverActive('crm-leads-status-popover', f.status);

  buildHeaderFilterOptions(
    'crm-leads-owner-popover',
    'All Owners',
    state.teamMembers.map((m) => ({ value: m.id, label: m.name })),
    f.owner
  );
}

function renderCrmClientsHeaderFilters() {
  const f = state.filters.crmClients;

  $('#crm-clients-type-th-filter')?.classList.toggle('active', f.type !== 'all');
  $('#crm-clients-status-th-filter')?.classList.toggle('active', f.status !== 'all');
  $('#crm-clients-owner-th-filter')?.classList.toggle('active', f.owner !== null);

  syncHeaderFilterPopoverActive('crm-clients-type-popover', f.type);
  syncHeaderFilterPopoverActive('crm-clients-status-popover', f.status);

  buildHeaderFilterOptions(
    'crm-clients-owner-popover',
    'All Owners',
    state.teamMembers.map((m) => ({ value: m.id, label: m.name })),
    f.owner
  );
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

  if (f.source && f.source !== 'all') {
    leads = leads.filter((l) => l.source === f.source);
  }

  if (f.priority && f.priority !== 'all') {
    leads = leads.filter((l) => l.priority === f.priority);
  }

  if (f.status && f.status !== 'all') {
    leads = leads.filter((l) => (l.status || '').toLowerCase() === f.status);
  }

  if (f.owner !== null && f.owner !== undefined) {
    leads = leads.filter((l) => Number(l.owner_id) === Number(f.owner));
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

      const actionsCell = admin
        ? `<div class="inline-flex items-center gap-1">${editBtn}${archiveBtn}</div>`
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
              ${l.email ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(l.email)}</p>` : ''}
            </div>
          </td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(l.company_name || '—')}</td>
          <td class="px-5 py-3.5 text-sm text-gray-700">${labelize(l.source)}</td>
          <td class="px-5 py-3.5">${renderStatusBadge(l.status)}</td>
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

  if (f.owner !== null && f.owner !== undefined) {
    clients = clients.filter((c) => Number(c.owner_id) === Number(f.owner));
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
      const owner = state.teamMembers.find((m) => Number(m.id) === Number(c.owner_id));
      const ownerCell = owner
        ? `<div class="flex items-center gap-2">
             <div class="w-6 h-6 rounded-full ${avatarColor(owner.name)} flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">${initials(owner.name)}</div>
             <span>${escapeHtml(owner.name)}</span>
           </div>`
        : '—';

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

      const actionsCell = admin
        ? `<div class="inline-flex items-center gap-1">${editBtn}${archiveBtn}</div>`
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
          <td class="px-5 py-3.5 text-sm text-gray-700">${ownerCell}</td>
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
function renderCrmDashboard() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeLeads   = state.crmLeads.filter(l => !l.is_archived);
  const activeClients = state.crmClients.filter(c => !c.is_archived && (c.status || '').toLowerCase() === 'active');
  const openDeals     = state.crmDeals.filter(d => !d.is_archived && d.stage !== 'won' && d.stage !== 'lost');
  const wonDeals      = state.crmDeals.filter(d => !d.is_archived && d.stage === 'won');
  const lostDeals     = state.crmDeals.filter(d => !d.is_archived && d.stage === 'lost');
  const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const upcomingAct   = state.crmActivities.filter(a => !a.is_archived && a.status === 'planned' && a.activity_date && new Date(a.activity_date) >= now);
  const overdueAct    = state.crmActivities.filter(a => !a.is_archived && a.status === 'planned' && a.activity_date && new Date(a.activity_date) < now);

  // Stats grid
  const statsEl = $('#crm-dashboard-stats');
  if (statsEl) {
    const stats = [
      { label: 'Total Leads',          value: activeLeads.length,   icon: 'target',      color: 'text-indigo-600' },
      { label: 'Active Clients',        value: activeClients.length, icon: 'building-2',  color: 'text-emerald-600' },
      { label: 'Open Deals',            value: openDeals.length,     icon: 'handshake',   color: 'text-blue-600' },
      { label: 'Won Deals',             value: wonDeals.length,      icon: 'trophy',      color: 'text-amber-600' },
      { label: 'Lost Deals',            value: lostDeals.length,     icon: 'x-circle',    color: 'text-rose-600' },
      { label: 'Pipeline Value (EGP)',  value: pipelineValue.toLocaleString(), icon: 'trending-up', color: 'text-violet-600' },
      { label: 'Upcoming Activities',   value: upcomingAct.length,   icon: 'calendar',    color: 'text-sky-600' },
      { label: 'Overdue Activities',    value: overdueAct.length,    icon: 'clock',       color: overdueAct.length > 0 ? 'text-rose-600' : 'text-gray-400' },
    ];
    statsEl.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="${s.icon}" class="w-4 h-4 ${s.color}"></i>
          <p class="text-xs text-gray-500 font-medium">${s.label}</p>
        </div>
        <p class="text-2xl font-bold text-gray-900">${s.value}</p>
      </div>
    `).join('');
  }

  // Pipeline breakdown
  const pipelineEl = $('#crm-dashboard-pipeline');
  if (pipelineEl) {
    const stages = ['discovery', 'proposal', 'negotiation', 'meeting', 'won', 'lost'];
    const stageData = stages.map(stage => {
      const items = state.crmDeals.filter(d => !d.is_archived && d.stage === stage);
      const total = items.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return { stage, count: items.length, total };
    }).filter(s => s.count > 0 || ['discovery', 'proposal'].includes(s.stage));

    pipelineEl.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th class="pb-3 pr-4">Stage</th>
              <th class="pb-3 pr-4">Deals</th>
              <th class="pb-3">Value (EGP)</th>
            </tr>
          </thead>
          <tbody>
            ${stageData.map(s => `
              <tr class="border-b border-gray-50">
                <td class="py-2 pr-4 font-medium text-gray-800">${labelize(s.stage)}</td>
                <td class="py-2 pr-4 text-gray-600">${s.count}</td>
                <td class="py-2 text-gray-600">${s.total > 0 ? s.total.toLocaleString() : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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

  let contacts = state.crmContacts.filter(c =>
    f.archived === 'archived' ? c.is_archived : !c.is_archived
  );
  if (search) {
    contacts = contacts.filter(c =>
      [c.contact_name, c.title, c.phone, c.email].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.status !== 'all') {
    contacts = contacts.filter(c => (c.status || '').toLowerCase() === f.status);
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
          <p class="text-sm font-medium text-gray-900">${escapeHtml(c.contact_name)}</p>
          ${c.title ? `<p class="text-xs text-gray-500">${escapeHtml(c.title)}</p>` : ''}
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? escapeHtml(client.client_name) : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(c.phone || '—')}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${escapeHtml(c.email || '—')}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(c.status || 'active')}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-contact" data-id="${c.id}" title="Edit contact"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!c.is_archived ? `<button class="icon-btn" data-action="archive-contact" data-id="${c.id}" title="Archive contact"><i data-lucide="archive" class="w-4 h-4"></i></button>` : ''}
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

  let deals = state.crmDeals.filter(d =>
    f.archived === 'archived' ? d.is_archived : !d.is_archived
  );
  if (search) {
    deals = deals.filter(d =>
      [d.deal_name, d.notes].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.stage !== 'all') deals = deals.filter(d => d.stage === f.stage);
  if (f.status !== 'all') deals = deals.filter(d => d.status === f.status);

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
            ${!d.is_archived ? `<button class="icon-btn" data-action="archive-deal" data-id="${d.id}" title="Archive deal"><i data-lucide="archive" class="w-4 h-4"></i></button>` : ''}
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

  let activities = state.crmActivities.filter(a =>
    f.archived === 'archived' ? a.is_archived : !a.is_archived
  );
  if (search) {
    activities = activities.filter(a =>
      [a.title, a.description, a.outcome].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.type !== 'all') activities = activities.filter(a => a.activity_type === f.type);
  if (f.status !== 'all') activities = activities.filter(a => a.status === f.status);

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
          <p class="text-xs text-gray-500">${labelize(a.activity_type)}</p>
        </td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${client ? escapeHtml(client.client_name) : '—'}</td>
        <td class="px-5 py-3.5">${renderStatusBadge(a.status || 'planned')}</td>
        <td class="px-5 py-3.5 text-sm text-gray-500">${a.activity_date ? fmtDate(a.activity_date) : '—'}</td>
        <td class="px-5 py-3.5 text-sm text-gray-700">${owner ? escapeHtml(owner.name) : '—'}</td>
        <td class="px-5 py-3.5 text-right">
          ${admin ? `<div class="inline-flex items-center gap-1">
            <button class="icon-btn" data-action="edit-activity" data-id="${a.id}" title="Edit activity"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!a.is_archived ? `<button class="icon-btn" data-action="archive-activity" data-id="${a.id}" title="Archive activity"><i data-lucide="archive" class="w-4 h-4"></i></button>` : ''}
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

  let proposals = state.crmProposals.filter(p =>
    f.archived === 'archived' ? p.is_archived : !p.is_archived
  );
  if (search) {
    proposals = proposals.filter(p =>
      [p.proposal_title, p.notes].some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  if (f.status !== 'all') proposals = proposals.filter(p => p.status === f.status);

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
            ${!p.is_archived ? `<button class="icon-btn" data-action="archive-proposal" data-id="${p.id}" title="Archive proposal"><i data-lucide="archive" class="w-4 h-4"></i></button>` : ''}
          </div>` : '<span class="text-xs text-gray-400">View only</span>'}
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
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

  const status   = (lead.status   || 'new').toLowerCase();
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

  setText('lead-details-company',  lead.company_name);
  setText('lead-details-contact',  lead.contact_person);
  setText('lead-details-phone',    lead.phone);
  setText('lead-details-whatsapp', lead.whatsapp);
  setText('lead-details-email',    lead.email);
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
    if (lead.client_id) {
      const linkedClient = state.crmClients.find(c => Number(c.id) === Number(lead.client_id));
      clientChipEl.innerHTML = linkedClient
        ? `<span class="text-xs text-gray-500">Linked Client:</span>
           <button class="text-xs font-medium text-indigo-600 hover:underline" data-action="open-client-details" data-id="${linkedClient.id}">${escapeHtml(linkedClient.client_name)}</button>`
        : '<span class="text-xs text-gray-400">Linked client not found</span>';
    } else {
      clientChipEl.innerHTML = '<span class="text-xs text-gray-400">No linked client</span>';
    }
  }

  // Convert button state
  const convertBtn = $('#lead-details-convert-btn');
  if (convertBtn) {
    if (lead.client_id) {
      convertBtn.disabled = true;
      convertBtn.textContent = 'Already Converted';
      convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      convertBtn.disabled = false;
      convertBtn.textContent = 'Convert to Client';
      convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      convertBtn.dataset.id = lead.id;
    }
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

  const editBtn = $('#lead-details-edit-btn');
  if (editBtn) editBtn.dataset.id = lead.id;

  const archiveBtn = $('#lead-details-archive-btn');
  if (archiveBtn) {
    archiveBtn.dataset.id = lead.id;
    archiveBtn.classList.toggle('hidden', !!lead.is_archived);
  }

  refreshIcons();
}

async function convertLeadToClient(leadId) {
  if (!isAdmin()) return;
  const lead = state.crmLeads.find(l => Number(l.id) === leadId);
  if (!lead) { toast('Lead not found', 'error'); return; }
  if (lead.client_id) { toast('Lead is already linked to a client', 'info'); return; }

  const convertBtn = $('#lead-details-convert-btn');
  if (convertBtn) { convertBtn.disabled = true; convertBtn.textContent = 'Converting…'; }

  const now = new Date().toISOString();

  // 1. Create client
  const clientPayload = {
    client_name: lead.company_name || lead.lead_name,
    phone:        lead.phone || null,
    whatsapp:     lead.whatsapp || null,
    email:        lead.email || null,
    source:       lead.source || 'unknown',
    owner_id:     lead.owner_id || null,
    status:       'active',
    type:         'company',
    is_archived:  false,
    created_at:   now,
    updated_at:   now,
  };
  const { data: clientData, error: clientError } = await supabaseClient.from('crm_clients').insert([clientPayload]).select().single();
  if (clientError) {
    console.error('convertLeadToClient: create client', clientError);
    toast('Failed to create client', 'error');
    if (convertBtn) { convertBtn.disabled = false; convertBtn.textContent = 'Convert to Client'; }
    return;
  }

  // 2. Create primary contact
  if (lead.contact_person || lead.email || lead.phone) {
    const contactPayload = {
      client_id:    clientData.id,
      contact_name: lead.contact_person || lead.lead_name,
      phone:        lead.phone || null,
      whatsapp:     lead.whatsapp || null,
      email:        lead.email || null,
      is_archived:  false,
      created_at:   now,
      updated_at:   now,
    };
    const { error: contactError } = await supabaseClient.from('crm_contacts').insert([contactPayload]);
    if (contactError) console.error('convertLeadToClient: create contact', contactError);
  }

  // 3. Link lead to client
  const { error: linkError } = await supabaseClient.from('crm_leads').update({ client_id: clientData.id, updated_at: now }).eq('id', leadId);
  if (linkError) {
    console.error('convertLeadToClient: link lead', linkError);
    toast('Client created but lead link failed', 'error');
  } else {
    toast('Lead converted to client', 'success');
  }

  await refreshDataAndRender();
  setView('lead-details');
  renderLeadDetails();
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
  if (!client) { toast('Client not found', 'error'); return; }
  state.selectedClientId = id;
  localStorage.setItem('tgora_selected_client_id', id);
  window.history.pushState({ view: 'client-details', clientId: id }, '', `#client-details-${id}`);
  setView('client-details');
  renderClientDetails();
}

function renderClientDetails() {
  const client = state.crmClients.find(c => Number(c.id) === Number(state.selectedClientId));
  if (!client) {
    state.selectedClientId = null;
    localStorage.removeItem('tgora_selected_client_id');
    setView('crm');
    return;
  }

  const owner = state.teamMembers.find(m => Number(m.id) === Number(client.owner_id));
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

  const ownerChip = $('#client-details-owner-chip');
  if (ownerChip) {
    ownerChip.innerHTML = owner
      ? `<div class="w-6 h-6 rounded-full ${avatarColor(owner.name)} flex items-center justify-center text-white text-[10px] font-semibold">${initials(owner.name)}</div>
         <span class="text-sm text-gray-700">${escapeHtml(owner.name)}</span>`
      : '<span class="text-sm text-gray-400">No owner assigned</span>';
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
  setText('client-details-website',  client.website);
  setText('client-details-address',  client.address);
  setText('client-details-source',   labelize(client.source));
  setText('client-details-notes',    client.notes || 'No notes yet.');

  // Contacts
  const contacts = state.crmContacts.filter(c => Number(c.client_id) === Number(client.id) && !c.is_archived);
  const contactsEl = $('#client-details-contacts-list');
  if (contactsEl) {
    contactsEl.innerHTML = contacts.length === 0
      ? '<p class="text-sm text-gray-400 py-2">No contacts yet.</p>'
      : contacts.map(c => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p class="text-sm font-medium text-gray-900">${escapeHtml(c.contact_name)}</p>
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
            ${renderStatusBadge(l.status)}
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

function openDealDetailsModal(id) {
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  if (!deal) { toast('Deal not found', 'error'); return; }
  state.selectedDealId = id;

  const client = state.crmClients.find(c => Number(c.id) === Number(deal.client_id));
  const owner = state.teamMembers.find(m => Number(m.id) === Number(deal.owner_id));

  const setTxt = (elId, val) => { const el = $(`#${elId}`); if (el) el.textContent = val || '—'; };
  setTxt('deal-details-modal-name', deal.deal_name);
  setTxt('deal-details-modal-client', client ? client.client_name : '—');
  setTxt('deal-details-modal-stage', labelize(deal.stage));
  setTxt('deal-details-modal-value', deal.value != null ? `${Number(deal.value).toLocaleString()} ${deal.currency || 'EGP'}` : '—');
  setTxt('deal-details-modal-owner', owner ? owner.name : '—');
  setTxt('deal-details-modal-close', deal.expected_close_date ? fmtDate(deal.expected_close_date) : '—');
  setTxt('deal-details-modal-notes', deal.notes || 'No notes.');

  const editBtn = $('#deal-details-modal-edit-btn');
  if (editBtn) editBtn.dataset.id = deal.id;

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
    financeAccounts,
    financeCategories,
    financeTransactions,
    financeForecasts,
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
    fetchFinanceAccounts(),
    fetchFinanceCategories(),
    fetchFinanceTransactions(),
    fetchFinanceForecasts(),
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
  state.financeAccounts     = financeAccounts;
  state.financeCategories   = financeCategories;
  state.financeTransactions = financeTransactions;
  state.financeForecasts    = financeForecasts;

  // Re-derive role from the freshly-fetched team members so that external
  // role changes are reflected without a full page reload.
  if (state.currentUser?.id) {
    const rematched = state.teamMembers.find(
      (m) => String(m.auth_user_id || '') === String(state.currentUser.id)
    );
    state.currentMember = rematched || null;
    state.currentRole   = (rematched?.role_type || 'member').toLowerCase().trim();
  }

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
};
const FINANCE_FORECAST_STATUS_BG = {
  expected: 'bg-blue-50', committed: 'bg-indigo-50', received: 'bg-emerald-50', cancelled: 'bg-gray-100', overdue: 'bg-rose-50',
};
const FINANCE_FORECAST_STATUS_COLORS = {
  expected: 'text-blue-700', committed: 'text-indigo-700', received: 'text-emerald-700', cancelled: 'text-gray-500', overdue: 'text-rose-700',
};

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

function getCrmClientName(id) {
  if (!id) return '';
  return state.crmClients.find(c => Number(c.id) === Number(id))?.client_name || '';
}

function getAccountName(id) {
  if (!id) return '—';
  return state.financeAccounts.find(a => Number(a.id) === Number(id))?.account_name || '—';
}

function getCategoryName(id) {
  if (!id) return '—';
  return state.financeCategories.find(c => Number(c.id) === Number(id))?.category_name || '—';
}

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
      if (['income', 'capital_injection', 'pass_through_received'].includes(type)) balance += amt;
      else if (['expense', 'pass_through_spent'].includes(type))                   balance -= amt;
    }
  });
  return balance;
}

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
    switch (t.transaction_type) {
      case 'capital_injection':     totalCapital += amt; break;
      case 'income':                realIncome   += amt; if (thisMonth(t)) cashFlowThisMonth += amt; break;
      case 'expense':               realExpenses += amt; if (thisMonth(t)) cashFlowThisMonth -= amt; break;
      case 'pass_through_received': passThroughHeld += amt; break;
      case 'pass_through_spent':    passThroughHeld -= amt; break;
    }
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

function renderFinanceCharts(summary) {
  const fmtChartVal = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
    return String(Math.round(v));
  };

  // Income vs Expenses — grouped bar chart, last 6 months
  const barCanvas = $('#finance-income-expense-chart');
  if (barCanvas) {
    const months = [], incomeData = [], expenseData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      const y = d.getFullYear(), m = d.getMonth();
      const monthTx = state.financeTransactions.filter(t => {
        if (t.is_archived || t.status === 'cancelled') return false;
        const td = new Date(t.transaction_date);
        return td.getFullYear() === y && td.getMonth() === m;
      });
      incomeData.push( monthTx.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0));
      expenseData.push(monthTx.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
    }
    if (financeIncomeExpenseChartInstance) { financeIncomeExpenseChartInstance.destroy(); financeIncomeExpenseChartInstance = null; }
    financeIncomeExpenseChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: months,
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
            ticks: { maxRotation: 0, minRotation: 0, font: { size: 11 } },
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

  // Expenses by category doughnut
  const doughnutCanvas = $('#finance-expense-category-chart');
  if (doughnutCanvas) {
    const catTotals = {};
    state.financeTransactions
      .filter(t => !t.is_archived && t.status !== 'cancelled' && t.transaction_type === 'expense')
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
}

function renderFinanceDashboard() {
  const summary  = getFinanceSummary();
  const forecast = getFinanceForecastSummary();

  // Stat cards — actual
  const statsEl = $('#finance-dashboard-stats');
  if (statsEl) {
    const netColor = summary.netProfit >= 0 ? 'emerald' : 'rose';
    const cfColor  = summary.cashFlowThisMonth >= 0 ? 'emerald' : 'rose';
    const cards = [
      { label: 'Total Capital',          value: fmtMoney(summary.totalCapital),          icon: 'landmark',        color: 'indigo' },
      { label: 'Real Income',            value: fmtMoney(summary.realIncome),            icon: 'trending-up',     color: 'emerald' },
      { label: 'Real Expenses',          value: fmtMoney(summary.realExpenses),          icon: 'trending-down',   color: 'rose' },
      { label: 'Net Profit',             value: fmtMoney(summary.netProfit),             icon: 'bar-chart-2',     color: netColor },
      { label: 'Cash in Accounts',       value: fmtMoney(summary.totalAccountBalances), icon: 'wallet',          color: 'blue' },
      { label: 'Pass-Through Held',      value: fmtMoney(summary.passThroughHeld),      icon: 'arrow-right-left',color: 'amber' },
      { label: 'Cash Flow (This Month)', value: fmtMoney(summary.cashFlowThisMonth),    icon: 'calendar',        color: cfColor },
    ];
    statsEl.innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-card-content">
          <p class="stat-label">${c.label}</p>
          <p class="stat-value text-${c.color}-600">${c.value}</p>
        </div>
        <div class="stat-card-icon bg-${c.color}-50">
          <i data-lucide="${c.icon}" class="w-5 h-5 text-${c.color}-500"></i>
        </div>
      </div>`).join('');
  }

  // Forecast cards
  const forecastEl = $('#finance-forecast-cards');
  if (forecastEl) {
    const netFcColor = forecast.expectedNetCashflow >= 0 ? 'emerald' : 'rose';
    const fcCards = [
      { label: 'Expected Income (Month)',   value: fmtMoney(forecast.expectedIncomeThisMonth),   icon: 'calendar-check', color: 'emerald' },
      { label: 'Expected Expenses (Month)', value: fmtMoney(forecast.expectedExpensesThisMonth), icon: 'calendar-x',     color: 'rose' },
      { label: 'Expected Net Cashflow',     value: fmtMoney(forecast.expectedNetCashflow),        icon: 'activity',       color: netFcColor },
      { label: 'Weighted Expected Income',  value: fmtMoney(forecast.weightedIncome),             icon: 'percent',        color: 'indigo' },
      { label: 'Overdue Forecasts',         value: String(forecast.overdueCount),                 icon: 'alert-circle',   color: forecast.overdueCount > 0 ? 'rose' : 'gray' },
    ];
    forecastEl.innerHTML = fcCards.map(c => `
      <div class="stat-card">
        <div class="stat-card-content">
          <p class="stat-label">${c.label}</p>
          <p class="stat-value text-${c.color}-600">${c.value}</p>
        </div>
        <div class="stat-card-icon bg-${c.color}-50">
          <i data-lucide="${c.icon}" class="w-5 h-5 text-${c.color}-500"></i>
        </div>
      </div>`).join('');
  }

  // Trash counters
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

  // Account balances list
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

  // Recent transactions table
  const recentEl = $('#finance-recent-transactions');
  if (recentEl) {
    const recent = state.financeTransactions.filter(t => !t.is_archived && !t.is_deleted).slice(0, 8);
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
    const amt  = Number(t.amount) || 0;
    const type = t.transaction_type;
    let inAmt = 0, outAmt = 0;

    if (type === 'transfer') {
      if (Number(t.from_account_id) === accountId) outAmt = amt;
      else inAmt = amt;
    } else if (['income', 'capital_injection', 'pass_through_received'].includes(type)) {
      inAmt = amt;
    } else if (['expense', 'pass_through_spent'].includes(type)) {
      outAmt = amt;
    }

    runBal        += inAmt - outAmt;
    totalInflow   += inAmt;
    totalOutflow  += outAmt;
    const runSnap  = runBal;

    return `<tr class="hover:bg-gray-50 border-b border-gray-50 ${t.is_archived ? 'opacity-60' : ''}">
      <td class="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">${fmtDate(t.transaction_date)}</td>
      <td class="px-4 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">${t.transaction_number ? escapeHtml(t.transaction_number) : '—'}</td>
      <td class="px-4 py-2 text-sm">${financeTypeBadge(type)}</td>
      <td class="px-4 py-2 text-sm text-gray-600 max-w-[200px] truncate">${escapeHtml(t.description || '—')}</td>
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
      : '<tr><td colspan="7" class="px-4 py-10 text-center text-gray-400 text-sm">No transactions for this account yet.</td></tr>';
  }

  refreshIcons();
  openModal('account-ledger-modal');
}

function renderFinanceForecast() {
  const f = state.filters.financeForecasts;
  let forecasts = state.financeForecasts;

  if (f.archived === 'active')   forecasts = forecasts.filter(fc => !fc.is_archived && !fc.is_deleted);
  if (f.archived === 'archived') forecasts = forecasts.filter(fc =>  fc.is_archived && !fc.is_deleted);
  if (f.archived === 'deleted')  forecasts = forecasts.filter(fc =>  fc.is_deleted);
  if (f.type   && f.type   !== 'all') forecasts = forecasts.filter(fc => fc.forecast_type === f.type);
  if (f.status && f.status !== 'all') forecasts = forecasts.filter(fc => fc.status === f.status);
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
      const isConverted  = !!fc.linked_transaction_id;
      const isOverdue    = !isConverted && !fc.is_deleted && fc.status === 'expected' && new Date(fc.expected_date) < now;
      const displayStatus = isOverdue ? 'overdue' : fc.status;
      const clientOrProj = fc.client_name || getCrmClientName(fc.client_id) || fc.project_name || '—';
      return `<tr class="hover:bg-gray-50 ${fc.is_deleted ? 'opacity-50 bg-rose-50' : fc.is_archived ? 'opacity-60' : ''}">
        <td class="px-4 py-2 text-sm whitespace-nowrap ${isOverdue ? 'text-rose-600 font-medium' : 'text-gray-600'}">${fmtDate(fc.expected_date)}</td>
        <td class="px-4 py-2 text-sm">${forecastTypeBadge(fc.forecast_type)}</td>
        <td class="px-4 py-2 text-sm text-gray-600 max-w-[140px] truncate">${escapeHtml(clientOrProj)}</td>
        <td class="px-4 py-2 text-sm text-gray-400">${escapeHtml(getCategoryName(fc.category_id))}</td>
        <td class="px-4 py-2 text-sm font-medium text-right whitespace-nowrap">${fmtMoney(fc.amount)}</td>
        <td class="px-4 py-2 text-sm text-center text-gray-500">${Number(fc.probability).toFixed(0)}%</td>
        <td class="px-4 py-2 text-sm">${forecastStatusBadge(displayStatus)}</td>
        <td class="px-4 py-2 text-right whitespace-nowrap">
          ${fc.is_deleted ? `
            <button class="icon-btn text-emerald-600" data-action="restore-finance-forecast" data-id="${fc.id}" title="Restore"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            <button class="icon-btn text-rose-700" data-action="permanent-delete-finance-forecast" data-id="${fc.id}" title="Delete Permanently"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          ` : !fc.is_archived ? `
            <button class="icon-btn" data-action="edit-finance-forecast" data-id="${fc.id}" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${!isConverted
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
}

function renderFinanceView() {
  if (!isAdmin()) return;
  setFinanceTab(state.financeTab || 'dashboard');
  renderFinanceDashboard();
  renderFinanceTransactions();
  renderFinanceForecast();
  renderFinanceAccounts();
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
  const autoTxNum = txNumRaw || (!id
    ? `TXN-${now2.getFullYear()}${String(now2.getMonth()+1).padStart(2,'0')}${String(now2.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`
    : undefined);
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
    state.financeTransactions = await fetchFinanceTransactions();
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
    state.financeTransactions = await fetchFinanceTransactions();
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
    const oldFc = state.financeForecasts.find(f => Number(f.id) === id);
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
  if ((view === 'crm' || view === 'lead-details' || view === 'client-details') && !isAdmin()) {
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

// ---------- Lead Modal Helpers ----------
function populateLeadClientSelect() {
  const sel = $('#lead-client-id');
  if (!sel) return;
  const activeClients = state.crmClients.filter(c => !c.is_archived);
  sel.innerHTML = '<option value="">-- No linked client --</option>' +
    activeClients.map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function openNewLeadModal() {
  if (!isAdmin()) return;
  state.editingLeadId = null;
  const form = $('#lead-form');
  form.reset();
  populateLeadOwnerSelect();
  populateLeadClientSelect();
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
  form.service_interest.value  = lead.service_interest || '';
  form.expected_budget.value   = lead.expected_budget || '';
  form.priority.value          = lead.priority || 'medium';
  form.status.value            = lead.status || 'new';
  form.owner_id.value          = lead.owner_id != null ? String(lead.owner_id) : '';
  form.next_follow_up.value    = lead.next_follow_up || '';
  form.notes.value             = lead.notes || '';
  const clientSel = $('#lead-client-id');
  if (clientSel && lead.client_id != null) clientSel.value = String(lead.client_id);
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

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();

  const payload = normalizePayload(new FormData(form));

  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  else payload.client_id = null;

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
function openNewClientModal() {
  if (!isAdmin()) return;
  state.editingClientId = null;
  const form = $('#client-form');
  form.reset();
  populateClientOwnerSelect();
  $('#client-modal-title').textContent = 'New Client';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Client';
  refreshIcons();
  openModal('client-modal');
}

function openEditClientModal(id) {
  if (!isAdmin()) return;
  const client = state.crmClients.find((c) => Number(c.id) === id);
  if (!client) { toast('Client not found', 'error'); return; }
  state.editingClientId = id;
  const form = $('#client-form');
  form.reset();
  populateClientOwnerSelect();
  form.client_name.value = client.client_name || '';
  form.client_type.value = client.client_type || 'company';
  form.industry.value    = client.industry || '';
  form.website.value     = client.website || '';
  form.phone.value       = client.phone || '';
  form.whatsapp.value    = client.whatsapp || '';
  form.email.value       = client.email || '';
  form.address.value     = client.address || '';
  form.source.value      = client.source || 'unknown';
  form.owner_id.value    = client.owner_id != null ? String(client.owner_id) : '';
  form.status.value      = client.status || 'active';
  form.notes.value       = client.notes || '';
  $('#client-modal-title').textContent = 'Edit Client';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Update Client';
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

  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);

  let result = null;
  if (isEditing) {
    payload.updated_at = new Date().toISOString();
    result = await updateCrmClient(state.editingClientId, payload);
  } else {
    result = await createCrmClient(payload);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = isEditing
    ? '<i data-lucide="check" class="w-4 h-4"></i> Update Client'
    : '<i data-lucide="check" class="w-4 h-4"></i> Create Client';
  refreshIcons();

  if (!result) return;

  toast(isEditing ? 'Client updated' : 'Client created', 'success');
  state.editingClientId = null;
  form.reset();
  closeModal();
  await refreshDataAndRender();
  setView('crm');
}

// ---------- Contact Modal Helpers ----------
function populateContactClientSelect() {
  const select = $('#contact-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No client</option>' +
    state.crmClients.filter(c => !c.is_archived)
      .map(c => `<option value="${c.id}">${escapeHtml(c.client_name)}</option>`).join('');
}

function openNewContactModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingContactId = null;
  const form = $('#contact-form');
  form.reset();
  populateContactClientSelect();
  if (prefillClientId) { const sel = $('#contact-client-id'); if (sel) sel.value = prefillClientId; }
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
  const sel = $('#contact-client-id');
  if (sel) sel.value = contact.client_id != null ? String(contact.client_id) : '';
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
  select.innerHTML = '<option value="">No client</option>' +
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

function openNewDealModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingDealId = null;
  const form = $('#deal-form');
  form.reset();
  populateDealClientSelect();
  populateDealOwnerSelect();
  if (prefillClientId) { const sel = $('#deal-client-id'); if (sel) sel.value = prefillClientId; }
  $('#deal-modal-title').textContent = 'New Deal';
  const submitBtn = form.querySelector('button[type=submit]');
  if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Create Deal';
  refreshIcons();
  openModal('deal-modal');
}

function openEditDealModal(id) {
  if (!isAdmin()) return;
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  if (!deal) { toast('Deal not found', 'error'); return; }
  state.editingDealId = id;
  const form = $('#deal-form');
  form.reset();
  populateDealClientSelect();
  populateDealOwnerSelect();
  form.deal_name.value = deal.deal_name || '';
  form.stage.value = deal.stage || 'discovery';
  form.value.value = deal.value != null ? String(deal.value) : '';
  form.currency.value = deal.currency || 'EGP';
  form.expected_close_date.value = deal.expected_close_date || '';
  form.notes.value = deal.notes || '';
  const cSel = $('#deal-client-id'); if (cSel) cSel.value = deal.client_id != null ? String(deal.client_id) : '';
  const oSel = $('#deal-owner-id'); if (oSel) oSel.value = deal.owner_id != null ? String(deal.owner_id) : '';
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
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${isEditing ? 'Updating…' : 'Saving…'}`;
  refreshIcons();
  const payload = normalizePayload(new FormData(form));
  if (payload.client_id) payload.client_id = Number(payload.client_id);
  if (payload.owner_id) payload.owner_id = Number(payload.owner_id);
  if (payload.value) payload.value = Number(payload.value);
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
  await refreshDataAndRender();
  setCrmTab('deals');
}

// ---------- Activity Modal Helpers ----------
function populateActivityClientSelect() {
  const select = $('#activity-client-id');
  if (!select) return;
  select.innerHTML = '<option value="">No client</option>' +
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

function openNewActivityModal(prefillClientId) {
  if (!isAdmin()) return;
  state.editingActivityId = null;
  const form = $('#activity-form');
  form.reset();
  populateActivityClientSelect();
  populateActivityOwnerSelect();
  if (prefillClientId) { const sel = $('#activity-client-id'); if (sel) sel.value = prefillClientId; }
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
  select.innerHTML = '<option value="">No client</option>' +
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
  select.innerHTML = '<option value="">No client</option>' +
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

if (action === 'open-lead-details') {
  const id = Number(trigger.dataset.id);
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
  const id = Number(trigger.dataset.id);
  openEditLeadModal(id);
  return;
}

if (action === 'archive-lead') {
  const id = Number(trigger.dataset.id);
  const lead = state.crmLeads.find((l) => Number(l.id) === id);
  openConfirm('lead_archive', id, lead ? `”${lead.lead_name}”` : 'This lead');
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

if (action === 'open-client-details') {
  const id = Number(trigger.dataset.id);
  openClientDetails(id);
  return;
}

if (action === 'open-lead-details') {
  const id = Number(trigger.dataset.id);
  openLeadDetails(id);
  return;
}

if (action === 'convert-lead-to-client') {
  const id = Number(trigger.dataset.id);
  convertLeadToClient(id);
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
  openEditDealModal(Number(trigger.dataset.id));
  return;
}

if (action === 'archive-deal') {
  const id = Number(trigger.dataset.id);
  const deal = state.crmDeals.find(d => Number(d.id) === id);
  openConfirm('deal_archive', id, deal ? `”${deal.deal_name}”` : 'This deal');
  return;
}

if (action === 'open-activity-modal') {
  const prefillClientId = trigger.dataset.clientId ? Number(trigger.dataset.clientId) : undefined;
  openNewActivityModal(prefillClientId);
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

// Finance actions
if (action === 'open-finance-transaction-modal') {
  openFinanceTransactionModal();
  return;
}
if (action === 'open-split-receipt-modal') {
  openSplitReceiptModal();
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
      state.financeTransactions = await fetchFinanceTransactions();
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
});

  // Forms
  $('#logout-btn')?.addEventListener('click', handleLogout);
  $('#project-form').addEventListener('submit', handleProjectSubmit);
  $('#member-form').addEventListener('submit', handleMemberSubmit);
  $('#task-form').addEventListener('submit', handleTaskSubmit);
  $('#lead-form')?.addEventListener('submit', handleLeadSubmit);
  $('#client-form')?.addEventListener('submit', handleClientSubmit);
  $('#contact-form')?.addEventListener('submit', handleContactSubmit);
  $('#deal-form')?.addEventListener('submit', handleDealSubmit);
  $('#activity-form')?.addEventListener('submit', handleActivitySubmit);
  $('#note-form')?.addEventListener('submit', handleNoteSubmit);
  $('#proposal-form')?.addEventListener('submit', handleProposalSubmit);
  $('#finance-account-form')?.addEventListener('submit', handleFinanceAccountSubmit);
  $('#finance-transaction-form')?.addEventListener('submit', handleFinanceTransactionSubmit);
  $('#split-receipt-form')?.addEventListener('submit', handleSplitReceiptSubmit);
  $('#finance-forecast-form')?.addEventListener('submit', handleFinanceForecastSubmit);
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

  // CRM Contacts filters
  $('#crm-contacts-search')?.addEventListener('input', (e) => {
    state.filters.crmContacts.search = e.target.value;
    renderCrmContacts();
  });
  $('#crm-contacts-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmContacts.archived = e.target.value;
    renderCrmContacts();
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

  // CRM Activities filters
  $('#crm-activities-search')?.addEventListener('input', (e) => {
    state.filters.crmActivities.search = e.target.value;
    renderCrmActivities();
  });
  $('#crm-activities-status-filter')?.addEventListener('change', (e) => {
    state.filters.crmActivities.archived = e.target.value;
    renderCrmActivities();
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

  // CRM Tab navigation
  document.querySelectorAll('[data-crm-tab]').forEach(btn => {
    btn.addEventListener('click', () => setCrmTab(btn.dataset.crmTab));
  });

  // Finance Tab navigation
  document.querySelectorAll('[data-finance-tab]').forEach(btn => {
    btn.addEventListener('click', () => setFinanceTab(btn.dataset.financeTab));
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

  // Lead form: autofill from linked client
  $('#lead-client-id')?.addEventListener('change', (e) => {
    const clientId = Number(e.target.value);
    if (!clientId) return;
    const client = state.crmClients.find(c => Number(c.id) === clientId);
    if (!client) return;
    const form = $('#lead-form');
    if (!form) return;
    if (!form.company_name.value && client.client_name) form.company_name.value = client.client_name;
    if (!form.phone.value && client.phone) form.phone.value = client.phone;
    if (!form.whatsapp.value && client.whatsapp) form.whatsapp.value = client.whatsapp;
    if (!form.email.value && client.email) form.email.value = client.email;
    if (!form.owner_id.value && client.owner_id) form.owner_id.value = String(client.owner_id);
    if (form.source && (form.source.value === '' || form.source.value === 'unknown') && client.source) {
      form.source.value = 'existing_client';
    }
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
// Runs on app init for Admin only. Archives completed tasks at end of month ONLY.
// Replace with a backend cron job once infrastructure is available.
//
// Rules:
//   - Fires ONLY when today is the last calendar day of the current month.
//   - Does NOT run catch-up at the start of a new month.
//   - Does NOT archive tasks without a completed_at timestamp.
//   - Archives tasks completed within the current calendar month (completed_at
//     between the 1st and today of the current month, inclusive).
//   - localStorage key is written only when the archive actually runs.
async function runMonthlyTaskArchiveIfNeeded() {
  if (!isAdmin()) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Only fire on the actual last day of the month — no catch-up logic.
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isLastDay = now.getDate() === lastDayOfMonth;

  if (!isLastDay) return;

  // Idempotent: skip if archive already ran for this month.
  const lastArchiveMonth = localStorage.getItem('tgora_last_task_archive_month') || '';
  if (lastArchiveMonth === currentMonthKey) return;

  try {
    // Archive completed tasks whose completed_at falls within the current month.
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
    const endOfDay = new Date(currentYear, currentMonth, lastDayOfMonth, 23, 59, 59, 999).toISOString();

    const { error } = await supabaseClient
      .from('tasks')
      .update({ is_archived: true, archived_at: now.toISOString() })
      .eq('status', 'completed')
      .eq('is_archived', false)
      .not('completed_at', 'is', null)
      .gte('completed_at', startOfMonth)
      .lte('completed_at', endOfDay);

    if (error) {
      console.error('runMonthlyTaskArchiveIfNeeded:', error);
      return;
    }

    // Write marker only on success.
    localStorage.setItem('tgora_last_task_archive_month', currentMonthKey);

    // Refresh state so the UI reflects newly archived tasks.
    await refreshDataAndRender();
    toast('Completed tasks archived for the month.', 'success');
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
    const [projects, tasks, teamMembers, crmLeads, crmClients, crmContacts, crmDeals, crmActivities, crmNotes, crmProposals] = await Promise.all([
      fetchProjects(),
      fetchTasks(),
      fetchTeamMembers(),
      fetchCrmLeads(),
      fetchCrmClients(),
      fetchCrmContacts(),
      fetchCrmDeals(),
      fetchCrmActivities(),
      fetchCrmNotes(),
      fetchCrmProposals()
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
    } else {
      state.currentMember = null;
      state.currentRole = null;
    }

    await cleanupOldNotifications();
    const [notifications, financeAccounts, financeCategories, financeTransactions, financeForecasts] = await Promise.all([
      fetchNotifications(),
      fetchFinanceAccounts(),
      fetchFinanceCategories(),
      fetchFinanceTransactions(),
      fetchFinanceForecasts(),
    ]);
    state.notifications       = notifications;
    state.financeAccounts     = financeAccounts;
    state.financeCategories   = financeCategories;
    state.financeTransactions = financeTransactions;
    state.financeForecasts    = financeForecasts;

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