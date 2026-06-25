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
    selectedProjectId: null,
  },
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

// canDelete must be computed by the caller (e.g. isAdmin() || isManager()) —
// this helper deliberately does not contain role logic.
const renderTaskActionsCell = (task, options = {}) => {
  const { canDelete = false } = options;

  return `
    <td class="px-5 py-3.5 text-right">
      <div class="inline-flex items-center gap-1">
        ${renderTaskLinkIcons(task)}

        <button class="icon-btn" data-action="edit-task" data-id="${task.id}" title="Edit task">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>

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

  let query = supabaseClient.from('notifications').select('*');

  // Admin/Manager see all notifications; Members only see their own.
  if (!(isAdmin() || isManager())) {
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

    data = data.filter((p) => {
      if (state.filters.projects.deadline === 'no_deadline') {
        return !p.deadline;
      }

      if (!p.deadline) return false;

      const d = new Date(p.deadline);
      d.setHours(0, 0, 0, 0);

      if (state.filters.projects.deadline === 'overdue') {
        return d < today && (p.status || '').toLowerCase() !== 'completed';
      }

      if (state.filters.projects.deadline === 'due_today') {
        return d.getTime() === today.getTime();
      }

      if (state.filters.projects.deadline === 'due_this_week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return d >= today && d < weekFromNow;
      }

      return true;
    });
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

    data = data.filter((t) => {
      if (state.filters.tasks.deadline === 'no_deadline') {
        return !t.deadline;
      }

      if (!t.deadline) return false;

      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);

      if (state.filters.tasks.deadline === 'overdue') {
        return d < today && (t.status || '').toLowerCase() !== 'completed';
      }

      if (state.filters.tasks.deadline === 'due_today') {
        return d.getTime() === today.getTime();
      }

      if (state.filters.tasks.deadline === 'due_this_week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return d >= today && d < weekFromNow;
      }

      return true;
    });
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
    },
    getChips: () => getTaskActiveFilterChips(),
    renderHeaderFilters: () => renderTasksHeaderFilters(),
    render: () => renderTasks(),
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

    data = data.filter((t) => {
      if (f.deadline === 'no_deadline') {
        return !t.deadline;
      }

      if (!t.deadline) return false;

      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);

      if (f.deadline === 'overdue') {
        return d < today && (t.status || '').toLowerCase() !== 'completed';
      }

      if (f.deadline === 'due_today') {
        return d.getTime() === today.getTime();
      }

      if (f.deadline === 'due_this_week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return d >= today && d < weekFromNow;
      }

      return true;
    });
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

function renderTasks() {
  const tbody = $('#tasks-table-body');
  const empty = $('#tasks-empty');
  const data = getFilteredTasks();

  const summaryEl = $('#tasks-results-summary');
  if (summaryEl) {
    const total = getVisibleTasks().length;
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

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');

    const isFilteredEmpty = getVisibleTasks().length > 0;

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

    $('#tasks-empty-new-task-btn')?.classList.toggle('hidden', isFilteredEmpty);
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

          ${renderTaskActionsCell(t, { canDelete: canDeleteTask(t) })}
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

function getVisibleTasks() {
  if (isAdmin() || isManager()) {
    return state.tasks;
  }

  const member = getCurrentMember();
  if (!member) return [];

  const memberName = (member.name || '').toLowerCase().trim();

  return state.tasks.filter(
    (t) => (t.assigned_to || '').toLowerCase().trim() === memberName
  );
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

function canLimitedEditTask(task) {
  return isMember() && isOwnTask(task);
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
// Performance features gated by canAccessPerformance().
function canViewPerformanceRanking() {
  return isAdmin() || isManager() || isMember();
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

  if (isMember()) {
    return TASK_MEMBER_EDITABLE_FIELDS.includes(fieldName);
  }

  return false;
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

  if (!canFullyEditTask() && !canLimitedEditTask(task)) {
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

$('#tasks-reset-filters')?.addEventListener('click', () => resetModuleFilters('tasks'));
$('#tasks-empty-reset-btn')?.addEventListener('click', () => resetModuleFilters('tasks'));

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
      // renderTeam() does not consume search yet — reserved for future use.
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