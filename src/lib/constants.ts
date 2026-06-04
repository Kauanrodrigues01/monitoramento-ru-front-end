import type { CampusEnum, ExceptionTypeEnum, MealPeriodEnum } from '../api/types';

// ── Campus ────────────────────────────────────────────────────────────────────

export const CAMPUS_OPTIONS: CampusEnum[] = ['PALMARES', 'AURORAS', 'LIBERDADE'];

/** Formato de exibição em cards e dashboard (tudo maiúsculo) */
export const CAMPUS_LABELS: Record<CampusEnum, string> = {
  PALMARES: 'CAMPUS PALMARES',
  AURORAS:  'CAMPUS AURORAS',
  LIBERDADE: 'CAMPUS LIBERDADE',
};

/** Formato em título — usado em SchedulesPage */
export const CAMPUS_LABELS_TITLE: Record<CampusEnum, string> = {
  PALMARES: 'Campus Palmares',
  AURORAS:  'Campus Auroras',
  LIBERDADE: 'Campus Liberdade',
};

/** Nome curto — usado em formulários de admin */
export const CAMPUS_LABELS_SHORT: Record<CampusEnum, string> = {
  PALMARES: 'Palmares',
  AURORAS:  'Auroras',
  LIBERDADE: 'Liberdade',
};

// ── Dias da semana ─────────────────────────────────────────────────────────────

/** Abreviações de Seg–Sáb (índices 0–5, sem domingo) */
export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Abreviações de Seg–Dom (índices 0–6) */
export const WEEKDAY_SHORT_WITH_SUN = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

/** Nomes completos de Seg–Sáb — usado em selects de admin */
export const WEEKDAY_FULL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

// ── Períodos de refeição ───────────────────────────────────────────────────────

export const MEAL_PERIOD_LABEL: Record<MealPeriodEnum, string> = {
  LUNCH:  'Almoço',
  DINNER: 'Jantar',
};

// ── Exceções ───────────────────────────────────────────────────────────────────

export const EXCEPTION_LABEL: Record<ExceptionTypeEnum, string> = {
  CLOSED:        'Fechado',
  CUSTOM_HOURS:  'Horário especial',
};

// ── Horários de pico (para heatmap semanal) ───────────────────────────────────

export const PEAK_HOURS = [7, 8, 11, 12, 13, 17, 18] as const;

// ── Tempos ────────────────────────────────────────────────────────────────────

/** Intervalo de auto-refresh do dashboard em ms */
export const DASHBOARD_REFRESH_MS = 30_000;

/** Tempo para auto-dismiss de toasts em ms */
export const TOAST_DISMISS_MS = 4_000;

/** Timeout de GPS em ms */
export const GEO_TIMEOUT_MS = 10_000;

/** Janela de frescor de dados — acima disso, exibe alerta de dados antigos (minutos) */
export const DATA_FRESHNESS_THRESHOLD_MIN = 10;
