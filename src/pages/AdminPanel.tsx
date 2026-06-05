import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../api/client';
import { exceptionsApi } from '../api/exceptions';
import { metricsApi } from '../api/metrics';
import { restaurantsApi } from '../api/restaurants';
import { schedulesApi } from '../api/schedules';
import type {
  CampusEnum,
  ExceptionTypeEnum,
  MealPeriodEnum,
  MetricsSummary,
  Restaurant,
  RestaurantSchedule,
  ScheduleException,
} from '../api/types';
import { MetricsBanner } from '../components/MetricsBanner';
import { useAdmin } from '../context/AdminContext';
import {
  CAMPUS_LABELS_SHORT as CAMPUS_LABELS,
  CAMPUS_OPTIONS,
  MEAL_PERIOD_LABEL,
  WEEKDAY_FULL as WEEKDAY_LABELS,
} from '../lib/constants';
import { useFocusTrap } from '../lib/useFocusTrap';
import { usePageTitle } from '../lib/usePageTitle';

type Tab = 'restaurants' | 'schedules' | 'exceptions';

// ── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="siis-field">
      <span className="siis-field-label">{label}</span>
      {children}
    </label>
  );
}

function AdminForm({
  title, error, onCancel, onSubmit, children,
}: {
  title: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="siis-admin-form">
      <div className="siis-admin-form__header">
        <h3 className="siis-admin-form__title">{title}</h3>
      </div>
      <div className="siis-admin-form__body">
        {children}
        {error && (
          <div className="siis-admin-form__error">
            <span aria-hidden="true">⚠</span>
            <p>{error}</p>
          </div>
        )}
        <div className="siis-admin-form__actions">
          <button type="button" onClick={onSubmit} className="siis-admin-save-btn">Salvar</button>
          <button type="button" onClick={onCancel} className="siis-admin-cancel-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="siis-admin-add-btn">
      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>+</span>
      {label}
    </button>
  );
}

// ── Auth gate ────────────────────────────────────────────────────────────────

function AuthGateModal({ onClose }: { onClose?: () => void }) {
  const { setAdminKey } = useAdmin();
  const [key, setKey] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { onEscape: onClose, autoFocus: false });

  const submit = () => {
    if (!key) return;
    setAdminKey(key);
    onClose?.();
  };

  const titleId = 'auth-modal-title';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div ref={dialogRef} className="siis-panel" style={{ width: '100%', maxWidth: 340 }}>
        <div className="siis-panel-header">
          <span id={titleId} className="siis-panel-title">
            {onClose ? 'ALTERAR CHAVE' : 'ACESSO ADMINISTRATIVO'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{
                fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1,
                color: 'var(--text3)', background: 'transparent',
                border: 'none', cursor: 'pointer', padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
            letterSpacing: 1, textAlign: 'center', margin: 0,
          }}>
            {onClose ? 'INSIRA A NOVA CHAVE DE ADMINISTRADOR' : 'INSIRA A CHAVE DE ADMINISTRADOR'}
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••••••••••"
            autoFocus
            aria-label="Chave de administrador"
            style={{
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 4,
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '10px 12px', background: 'var(--surface2)',
              color: 'var(--text)', width: '100%', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button type="button" onClick={submit} disabled={!key} className="siis-submit-btn">
            {onClose ? 'SALVAR CHAVE' : 'ENTRAR'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Restaurants tab ──────────────────────────────────────────────────────────

function RestaurantsTab() {
  const { adminKey } = useAdmin();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', campus: 'PALMARES' as CampusEnum,
    lat: '', lng: '', geofence_radius_m: '80', is_active: true,
  });

  const load = useCallback(async () => {
    const list = await restaurantsApi.list().catch(() => []);
    setRestaurants(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = (r?: Restaurant) => {
    setForm({
      name: r?.name ?? '',
      campus: r?.campus ?? 'PALMARES',
      lat: r ? String(r.lat) : '',
      lng: r ? String(r.lng) : '',
      geofence_radius_m: r ? String(r.geofence_radius_m) : '80',
      is_active: r?.is_active ?? true,
    });
    setApiError(null);
  };

  const parseFormNumbers = () => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const radius = parseInt(form.geofence_radius_m);
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      setApiError('Informe valores numéricos válidos para latitude, longitude e raio.');
      return null;
    }
    return { lat, lng, geofence_radius_m: radius };
  };

  const handleCreate = async () => {
    const nums = parseFormNumbers();
    if (!nums) return;
    try {
      await restaurantsApi.create({
        name: form.name || undefined,
        campus: form.campus,
        ...nums,
        is_active: form.is_active,
      }, adminKey);
      setShowCreate(false);
      load();
    } catch (err) {
      console.error('[AdminPanel] Erro ao criar restaurante:', err);
      setApiError(err instanceof ApiError ? err.detail : 'Erro ao criar restaurante.');
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const nums = parseFormNumbers();
    if (!nums) return;
    try {
      await restaurantsApi.update(editing.public_id, {
        name: form.name || undefined,
        campus: form.campus,
        ...nums,
        is_active: form.is_active,
      }, adminKey);
      setEditing(null);
      load();
    } catch (err) {
      console.error('[AdminPanel] Erro ao atualizar restaurante:', err);
      setApiError(err instanceof ApiError ? err.detail : 'Erro ao atualizar restaurante.');
    }
  };

  if (loading) return <div className="siis-admin-empty">Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="siis-admin-row-header">
        <span className="siis-admin-count">
          {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
        </span>
        <AddButton
          onClick={() => { resetForm(); setShowCreate(true); setEditing(null); }}
          label="Novo restaurante"
        />
      </div>

      {(showCreate || editing) && (
        <AdminForm
          title={editing ? `Editar — ${editing.name}` : 'Novo restaurante'}
          error={apiError}
          onCancel={() => { setShowCreate(false); setEditing(null); setApiError(null); }}
          onSubmit={editing ? handleUpdate : handleCreate}
        >
          <Field label="Nome (opcional)">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`RU ${CAMPUS_LABELS[form.campus]}`} className="siis-input" />
          </Field>
          <Field label="Campus">
            <select value={form.campus}
              onChange={(e) => setForm({ ...form, campus: e.target.value as CampusEnum })}
              className="siis-select">
              {CAMPUS_OPTIONS.map((c) => <option key={c} value={c}>{CAMPUS_LABELS[c]}</option>)}
            </select>
          </Field>
          <div className="siis-grid-2">
            <Field label="Latitude">
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })}
                type="number" step="any" placeholder="-3.747360" className="siis-input" />
            </Field>
            <Field label="Longitude">
              <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })}
                type="number" step="any" placeholder="-38.523060" className="siis-input" />
            </Field>
          </div>
          <Field label="Raio do geofence (m)">
            <input value={form.geofence_radius_m}
              onChange={(e) => setForm({ ...form, geofence_radius_m: e.target.value })}
              type="number" min="0" max="120" className="siis-input" />
          </Field>
          <label className="siis-admin-checkbox-label">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Restaurante ativo
          </label>
        </AdminForm>
      )}

      {restaurants.length === 0 ? (
        <div className="siis-admin-empty">Nenhum restaurante cadastrado.</div>
      ) : (
        <ul className="siis-admin-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {restaurants.map((r) => (
            <li key={r.public_id} className="siis-admin-list-item">
              <div>
                <p className="siis-admin-item-name">{r.name}</p>
                <p className="siis-admin-item-meta">
                  {CAMPUS_LABELS[r.campus]}
                  {!r.is_active && <span style={{ marginLeft: 8 }}>· inativo</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(r); setEditing(r); setShowCreate(false); }}
                className="siis-admin-edit-btn"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Schedules tab ────────────────────────────────────────────────────────────

function SchedulesTab() {
  const { adminKey } = useAdmin();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRu, setSelectedRu] = useState('');
  const [schedules, setSchedules] = useState<RestaurantSchedule[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RestaurantSchedule | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [form, setForm] = useState({
    weekday: '0', meal_period: 'LUNCH' as MealPeriodEnum,
    opens_at: '11:00', closes_at: '14:00', is_active: true,
  });

  useEffect(() => { restaurantsApi.list().then(setRestaurants).catch(() => {}); }, []);

  const loadSchedules = useCallback(async (ruId: string) => {
    if (!ruId) return;
    setSchedules(await schedulesApi.list(ruId).catch(() => []));
  }, []);

  useEffect(() => { loadSchedules(selectedRu); }, [selectedRu, loadSchedules]);

  const resetForm = (s?: RestaurantSchedule) => {
    setForm({
      weekday: s ? String(s.weekday) : '0',
      meal_period: s?.meal_period ?? 'LUNCH',
      opens_at: s?.opens_at.slice(0, 5) ?? '11:00',
      closes_at: s?.closes_at.slice(0, 5) ?? '14:00',
      is_active: s?.is_active ?? true,
    });
    setApiError(null);
  };

  const handleCreate = async () => {
    try {
      await schedulesApi.create(selectedRu, {
        weekday: parseInt(form.weekday),
        meal_period: form.meal_period,
        opens_at: form.opens_at,
        closes_at: form.closes_at,
        is_active: form.is_active,
      }, adminKey);
      setShowCreate(false);
      loadSchedules(selectedRu);
    } catch (err) {
      console.error('[AdminPanel] Erro ao criar horário:', err);
      setApiError(err instanceof ApiError ? err.detail : 'Erro ao criar horário.');
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await schedulesApi.update(selectedRu, editing.public_id, {
        weekday: parseInt(form.weekday),
        meal_period: form.meal_period,
        opens_at: form.opens_at,
        closes_at: form.closes_at,
        is_active: form.is_active,
      }, adminKey);
      setEditing(null);
      loadSchedules(selectedRu);
    } catch (err) {
      console.error('[AdminPanel] Erro ao atualizar horário:', err);
      setApiError(err instanceof ApiError ? err.detail : 'Erro ao atualizar horário.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Restaurante">
        <select value={selectedRu} onChange={(e) => setSelectedRu(e.target.value)} className="siis-select">
          <option value="">Selecionar restaurante...</option>
          {restaurants.map((r) => <option key={r.public_id} value={r.public_id}>{r.name}</option>)}
        </select>
      </Field>

      {selectedRu && (
        <>
          <div className="siis-admin-row-header">
            <span className="siis-admin-count">
              {schedules.length} horário{schedules.length !== 1 ? 's' : ''}
            </span>
            <AddButton onClick={() => { resetForm(); setShowCreate(true); setEditing(null); }} label="Novo horário" />
          </div>

          {(showCreate || editing) && (
            <AdminForm
              title={editing ? 'Editar horário' : 'Novo horário'}
              error={apiError}
              onCancel={() => { setShowCreate(false); setEditing(null); setApiError(null); }}
              onSubmit={editing ? handleUpdate : handleCreate}
            >
              <div className="siis-grid-2">
                <Field label="Dia da semana">
                  <select value={form.weekday}
                    onChange={(e) => setForm({ ...form, weekday: e.target.value })}
                    className="siis-select">
                    {WEEKDAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Período">
                  <select value={form.meal_period}
                    onChange={(e) => setForm({ ...form, meal_period: e.target.value as MealPeriodEnum })}
                    className="siis-select">
                    {(Object.keys(MEAL_PERIOD_LABEL) as MealPeriodEnum[]).map((k) => (
                      <option key={k} value={k}>{MEAL_PERIOD_LABEL[k]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="siis-grid-2">
                <Field label="Abertura">
                  <input type="time" value={form.opens_at}
                    onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                    className="siis-input" />
                </Field>
                <Field label="Fechamento">
                  <input type="time" value={form.closes_at}
                    onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                    className="siis-input" />
                </Field>
              </div>
              <label className="siis-admin-checkbox-label">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Ativo
              </label>
            </AdminForm>
          )}

          <ul className="siis-admin-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {schedules.map((s) => (
              <li key={s.public_id} className="siis-admin-list-item">
                <div>
                  <p className="siis-admin-item-name">
                    {WEEKDAY_LABELS[s.weekday]} — {MEAL_PERIOD_LABEL[s.meal_period]}
                  </p>
                  <p className="siis-admin-item-meta">
                    {s.opens_at.slice(0, 5)} – {s.closes_at.slice(0, 5)}
                    {!s.is_active && ' · inativo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(s); setEditing(s); setShowCreate(false); }}
                  className="siis-admin-edit-btn"
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Exceptions tab ───────────────────────────────────────────────────────────

function ExceptionsTab() {
  const { adminKey } = useAdmin();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRu, setSelectedRu] = useState('');
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [form, setForm] = useState({
    exception_date: new Date().toISOString().slice(0, 10),
    exception_type: 'CLOSED' as ExceptionTypeEnum,
    meal_period: '' as MealPeriodEnum | '',
    opens_at: '', closes_at: '', reason: '',
  });

  useEffect(() => { restaurantsApi.list().then(setRestaurants).catch(() => {}); }, []);

  const loadExceptions = useCallback(async (ruId: string) => {
    if (!ruId) return;
    setExceptions(await exceptionsApi.list(ruId).catch(() => []));
  }, []);

  useEffect(() => { loadExceptions(selectedRu); }, [selectedRu, loadExceptions]);

  const handleCreate = async () => {
    try {
      await exceptionsApi.create(selectedRu, {
        exception_date: form.exception_date,
        exception_type: form.exception_type,
        meal_period: form.meal_period || null,
        opens_at: form.exception_type === 'CUSTOM_HOURS' ? form.opens_at || null : null,
        closes_at: form.exception_type === 'CUSTOM_HOURS' ? form.closes_at || null : null,
        reason: form.reason || null,
      }, adminKey);
      setShowCreate(false);
      loadExceptions(selectedRu);
    } catch (err) {
      console.error('[AdminPanel] Erro ao criar exceção:', err);
      setApiError(err instanceof ApiError ? err.detail : 'Erro ao criar exceção.');
    }
  };

  const EXCEPTION_TYPE_LABEL: Record<ExceptionTypeEnum, string> = {
    CLOSED: 'Fechado',
    CUSTOM_HOURS: 'Horário especial',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Restaurante">
        <select value={selectedRu} onChange={(e) => setSelectedRu(e.target.value)} className="siis-select">
          <option value="">Selecionar restaurante...</option>
          {restaurants.map((r) => <option key={r.public_id} value={r.public_id}>{r.name}</option>)}
        </select>
      </Field>

      {selectedRu && (
        <>
          <div className="siis-admin-row-header">
            <span className="siis-admin-count">
              {exceptions.length} exceção{exceptions.length !== 1 ? 'ões' : ''}
            </span>
            <AddButton onClick={() => { setShowCreate(true); setApiError(null); }} label="Nova exceção" />
          </div>

          {showCreate && (
            <AdminForm
              title="Nova exceção de horário"
              error={apiError}
              onCancel={() => { setShowCreate(false); setApiError(null); }}
              onSubmit={handleCreate}
            >
              <div className="siis-grid-2">
                <Field label="Data">
                  <input type="date" value={form.exception_date}
                    onChange={(e) => setForm({ ...form, exception_date: e.target.value })}
                    className="siis-input" />
                </Field>
                <Field label="Tipo">
                  <select value={form.exception_type}
                    onChange={(e) => setForm({ ...form, exception_type: e.target.value as ExceptionTypeEnum })}
                    className="siis-select">
                    {(Object.keys(EXCEPTION_TYPE_LABEL) as ExceptionTypeEnum[]).map((k) => (
                      <option key={k} value={k}>{EXCEPTION_TYPE_LABEL[k]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Período (vazio = dia inteiro)">
                <select value={form.meal_period}
                  onChange={(e) => setForm({ ...form, meal_period: e.target.value as MealPeriodEnum | '' })}
                  className="siis-select">
                  <option value="">Dia inteiro</option>
                  {(Object.keys(MEAL_PERIOD_LABEL) as MealPeriodEnum[]).map((k) => (
                    <option key={k} value={k}>{MEAL_PERIOD_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
              {form.exception_type === 'CUSTOM_HOURS' && (
                <div className="siis-grid-2">
                  <Field label="Abertura">
                    <input type="time" value={form.opens_at}
                      onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                      className="siis-input" />
                  </Field>
                  <Field label="Fechamento">
                    <input type="time" value={form.closes_at}
                      onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                      className="siis-input" />
                  </Field>
                </div>
              )}
              <Field label="Motivo (opcional)">
                <input value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ex: Feriado nacional" className="siis-input" />
              </Field>
            </AdminForm>
          )}

          <ul className="siis-admin-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {exceptions.map((ex) => (
              <li key={ex.public_id} className="siis-admin-list-item siis-admin-list-item--block">
                <div style={{ flex: 1 }}>
                  <p className="siis-admin-item-name">
                    {new Date(ex.exception_date + 'T12:00').toLocaleDateString('pt-BR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </p>
                  <div className="siis-admin-tags">
                    <span className="siis-admin-tag">{EXCEPTION_TYPE_LABEL[ex.exception_type]}</span>
                    <span className="siis-admin-tag">
                      {ex.meal_period ? MEAL_PERIOD_LABEL[ex.meal_period] : 'Dia inteiro'}
                    </span>
                    {ex.opens_at && ex.closes_at && (
                      <span className="siis-admin-tag siis-admin-tag--blue">
                        {ex.opens_at.slice(0, 5)} – {ex.closes_at.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  {ex.reason && (
                    <p className="siis-admin-item-meta" style={{ marginTop: 4 }}>{ex.reason}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function AdminPanel() {
  usePageTitle('Admin');
  const { isAdmin } = useAdmin();
  const [tab, setTab] = useState<Tab>('restaurants');
  const [showChangeKey, setShowChangeKey] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    metricsApi.summary(ac.signal)
      .then(setMetrics)
      .catch(() => setMetrics(null))
      .finally(() => setMetricsLoading(false));
    return () => { ac.abort(); };
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'restaurants', label: 'RESTAURANTES' },
    { id: 'schedules', label: 'HORÁRIOS' },
    { id: 'exceptions', label: 'EXCEÇÕES' },
  ];

  return (
    <>
      {!isAdmin && <AuthGateModal />}
      {isAdmin && showChangeKey && <AuthGateModal onClose={() => setShowChangeKey(false)} />}

      <div style={{
        filter: isAdmin ? 'none' : 'blur(3px)',
        pointerEvents: isAdmin ? 'auto' : 'none',
        userSelect: isAdmin ? 'auto' : 'none',
        transition: 'filter 0.25s ease',
      }}>
        <MetricsBanner metrics={metrics} loading={metricsLoading} />

        <div className="siis-panel" style={{ marginBottom: 16 }}>
          <div className="siis-panel-header">
            <span className="siis-panel-title">PAINEL ADMIN</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowChangeKey(true)}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                  color: 'var(--text3)', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  cursor: 'pointer', padding: '4px 10px', letterSpacing: 1,
                }}
              >
                ALTERAR CHAVE
              </button>
            )}
          </div>
          <div style={{ display: 'flex', background: 'var(--surface2)' }}>
            {TABS.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id)}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: 1.5, padding: '12px 20px',
                  border: 'none', background: 'transparent',
                  borderBottom: tab === id ? '2px solid var(--blue)' : '2px solid transparent',
                  color: tab === id ? 'var(--blue)' : 'var(--text3)',
                  cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {tab === 'restaurants' && <RestaurantsTab />}
          {tab === 'schedules' && <SchedulesTab />}
          {tab === 'exceptions' && <ExceptionsTab />}
        </div>
      </div>
    </>
  );
}
