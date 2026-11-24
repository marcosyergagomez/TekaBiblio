import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { readApiError } from '../../lib/api-error';
import {
  BRANCH_IDS,
  MATERIAL_TYPES,
  PAYMENT_METHODS,
  PENALTY_TYPES,
} from '../../lib/constants';
import { formatMoney, parseAmount } from '../../lib/format';
import {
  branchLabel,
  materialTypeLabel,
  membershipLevelLabel,
  paymentMethodLabel,
  penaltyTypeLabel,
} from '../../lib/labels';
import { describeResult, readDashboard, buildCheckoutPayload, type DashboardSnapshot } from './loan-risk';

type Notice = {
  tone: 'success' | 'error';
  title: string;
  detail?: string;
};

type RunTask = (label: string, task: () => Promise<unknown>) => Promise<unknown>;

function failureMessage(error: unknown, fallback: string): string {
  const apiMessage = readApiError(error);
  if (apiMessage) {
    return apiMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function StaffOpsPage() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);

  const run: RunTask = async (label, task) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await task();
      setNotice({
        tone: 'success',
        title: t('staff.resultSuccess', { label }),
        detail: describeResult(response) ?? undefined,
      });
      return response;
    } catch (error) {
      setNotice({
        tone: 'error',
        title: t('staff.resultError', {
          label,
          message: failureMessage(error, t('staff.unknownError')),
        }),
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const loadDashboard = () =>
    run(t('staff.actions.loadDashboard'), async () => {
      const response = await api.get('/reports/dashboard');
      const snapshot = readDashboard(response.data);
      if (!snapshot) {
        throw new Error(t('staff.dashboard.invalid'));
      }

      setDashboard(snapshot);
      return snapshot;
    });

  return (
    <section className="stack">
      <div className="card headline">
        <h2>{t('staff.title')}</h2>
        <p>{t('staff.description')}</p>
      </div>
      {notice ? (
        <div className={`alert ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <strong>{notice.title}</strong>
          {notice.detail ? <p>{notice.detail}</p> : null}
        </div>
      ) : null}
      <LendingDesk busy={busy} run={run} />
      <div className="grid two">
        <CreateMaterialForm busy={busy} run={run} />
        <UpdateMaterialForm busy={busy} run={run} />
        <CreatePenaltyForm busy={busy} run={run} />
        <RegisterPaymentForm busy={busy} run={run} />
        <div className="card form-grid">
          <h3>{t('staff.dashboard.title')}</h3>
          <p>{t('staff.dashboard.description')}</p>
          <button type="button" onClick={() => void loadDashboard()} disabled={busy}>
            {t('staff.actions.loadDashboard')}
          </button>
          {dashboard ? (
            <div className="kpi-grid">
              <div>
                <strong>{t('staff.dashboard.loans')}</strong>
                <p>{dashboard.income.totals.loans}</p>
              </div>
              <div>
                <strong>{t('staff.dashboard.revenue')}</strong>
                <p>
                  {formatMoney(dashboard.income.totals.totalRevenue)} {t('common.currency')}
                </p>
              </div>
              <div>
                <strong>{t('staff.dashboard.losses')}</strong>
                <p>
                  {formatMoney(dashboard.losses.totals.estimatedLossAmount)} {t('common.currency')}
                </p>
              </div>
              <div>
                <strong>{t('staff.dashboard.lostCopies')}</strong>
                <p>{dashboard.losses.totals.lostCopies}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CreateMaterialForm({ busy, run }: { busy: boolean; run: RunTask }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: 'Demo Material',
    materialType: 'LIBRO',
    releaseDate: '2024-01-01',
    homeBranchId: 'branch_centro',
    basePrice: '2.50',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const basePrice = parseAmount(form.basePrice);
    if (basePrice === null) {
      setLocalError(t('common.invalidAmount'));
      return;
    }

    setLocalError(null);
    void run(t('staff.actions.createMaterial'), async () => {
      const response = await api.post('/materials', {
        title: form.title,
        materialType: form.materialType,
        releaseDate: form.releaseDate,
        homeBranchId: form.homeBranchId,
        basePrice,
      });
      return response.data;
    });
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h3>{t('staff.forms.createMaterial.title')}</h3>
      <Field label={t('staff.forms.labels.title')}>
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.type')}>
        <select
          value={form.materialType}
          onChange={(event) => setForm((prev) => ({ ...prev, materialType: event.target.value }))}
        >
          {MATERIAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {materialTypeLabel(t, type)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('staff.forms.labels.releaseDate')}>
        <input
          value={form.releaseDate}
          onChange={(event) => setForm((prev) => ({ ...prev, releaseDate: event.target.value }))}
          type="date"
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.homeBranch')}>
        <select
          value={form.homeBranchId}
          onChange={(event) => setForm((prev) => ({ ...prev, homeBranchId: event.target.value }))}
        >
          {BRANCH_IDS.map((branchId) => (
            <option key={branchId} value={branchId}>
              {branchLabel(t, branchId)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('staff.forms.labels.basePrice')}>
        <input
          value={form.basePrice}
          onChange={(event) => setForm((prev) => ({ ...prev, basePrice: event.target.value }))}
          type="number"
          step="0.01"
          min="0"
          required
        />
      </Field>
      {localError ? <p className="error">{localError}</p> : null}
      <button type="submit" disabled={busy}>
        {t('staff.forms.createMaterial.button')}
      </button>
    </form>
  );
}

function UpdateMaterialForm({ busy, run }: { busy: boolean; run: RunTask }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ materialId: '', title: '', basePrice: '' });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {};
    if (form.title.trim()) {
      payload.title = form.title.trim();
    }

    if (form.basePrice.trim()) {
      const basePrice = parseAmount(form.basePrice);
      if (basePrice === null) {
        setLocalError(t('common.invalidAmount'));
        return;
      }
      payload.basePrice = basePrice;
    }

    if (!payload.title && payload.basePrice === undefined) {
      setLocalError(t('staff.forms.updateMaterial.missingChange'));
      return;
    }

    setLocalError(null);
    void run(t('staff.actions.updateMaterial'), async () => {
      const response = await api.patch(`/materials/${form.materialId}`, payload);
      return response.data;
    });
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h3>{t('staff.forms.updateMaterial.title')}</h3>
      <Field label={t('staff.forms.labels.materialId')}>
        <input
          value={form.materialId}
          onChange={(event) => setForm((prev) => ({ ...prev, materialId: event.target.value }))}
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.title')}>
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
      </Field>
      <Field label={t('staff.forms.labels.basePrice')}>
        <input
          value={form.basePrice}
          onChange={(event) => setForm((prev) => ({ ...prev, basePrice: event.target.value }))}
          type="number"
          step="0.01"
          min="0"
        />
      </Field>
      {localError ? <p className="error">{localError}</p> : null}
      <button type="submit" disabled={busy}>
        {t('staff.forms.updateMaterial.button')}
      </button>
    </form>
  );
}

function LendingDesk({ busy, run }: { busy: boolean; run: RunTask }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<
    { id: string; fullName: string; membershipLevel: string; homeBranchId: string }[]
  >([]);
  const [copies, setCopies] = useState<
    { id: string; title: string; branchId: string }[]
  >([]);
  const [loans, setLoans] = useState<
    { id: string; memberId: string; copyId: string; dueDate: string; status: string }[]
  >([]);
  const [memberId, setMemberId] = useState('');
  const [copyId, setCopyId] = useState('');

  const reload = async () => {
    let memberResponse;
    let materialResponse;
    let copyResponse;
    let loanResponse;
    try {
      [memberResponse, materialResponse, copyResponse, loanResponse] = await Promise.all([
        api.get('/members'),
        api.get('/materials', { params: { pageSize: 100 } }),
        api.get('/copies', { params: { status: 'AVAILABLE', pageSize: 100 } }),
        api.get('/loans', { params: { status: 'ACTIVE', pageSize: 100 } }),
      ]);
    } catch {
      setMembers([]);
      setCopies([]);
      setLoans([]);
      return;
    }
    const titles = new Map<string, string>(
      (materialResponse.data.items ?? []).map((item: { id: string; title: string }) => [
        item.id,
        item.title,
      ]),
    );
    setMembers(memberResponse.data.items ?? []);
    setCopies(
      (copyResponse.data.items ?? []).map(
        (item: { id: string; materialId: string; branchId: string }) => ({
          id: item.id,
          title: titles.get(item.materialId) ?? item.id,
          branchId: item.branchId,
        }),
      ),
    );
    setLoans(loanResponse.data.items ?? []);
  };

  useEffect(() => {
    void reload();
  }, []);

  const selectedMember = members.find((member) => member.id === memberId);
  const selectedCopy = copies.find((copy) => copy.id === copyId);

  const lend = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMember || !selectedCopy) {
      return;
    }

    void run(t('staff.actions.createLoan'), async () => {
      const response = await api.post(
        '/loans',
        buildCheckoutPayload({
          memberId: selectedMember.id,
          copyId: selectedCopy.id,
          pickupBranchId: selectedCopy.branchId,
          membershipLevel: selectedMember.membershipLevel,
        }),
      );
      await reload();
      setCopyId('');
      return response.data;
    });
  };

  const giveBack = (loanId: string) => {
    void run(t('staff.desk.returnAction'), async () => {
      const response = await api.post('/loans/return', { loanId });
      await reload();
      return response.data;
    });
  };

  const renew = (loanId: string) => {
    void run(t('staff.desk.renewAction'), async () => {
      const response = await api.post('/loans/renew', { loanId });
      await reload();
      return response.data;
    });
  };

  return (
    <div className="grid two">
      <form className="card form-grid" onSubmit={lend}>
        <h3>{t('staff.desk.lendTitle')}</h3>
        <Field label={t('staff.desk.member')}>
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
            <option value="">{t('staff.desk.choose')}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName} · {membershipLevelLabel(t, member.membershipLevel)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('staff.desk.copy')}>
          <select value={copyId} onChange={(event) => setCopyId(event.target.value)} required>
            <option value="">{t('staff.desk.choose')}</option>
            {copies.map((copy) => (
              <option key={copy.id} value={copy.id}>
                {copy.title} · {branchLabel(t, copy.branchId)}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={busy || !selectedMember || !selectedCopy}>
          {t('staff.forms.createLoan.button')}
        </button>
      </form>
      <div className="card">
        <h3>{t('staff.desk.returnTitle')}</h3>
        {loans.length === 0 ? <p className="empty">{t('staff.desk.emptyLoans')}</p> : null}
        <ul className="desk-list">
          {loans.map((loan) => (
            <li key={loan.id}>
              <span>
                {loan.copyId} · {loan.memberId}
              </span>
              <button type="button" className="secondary" disabled={busy} onClick={() => renew(loan.id)}>
                {t('staff.desk.renewAction')}
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => giveBack(loan.id)}>
                {t('staff.desk.returnAction')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreatePenaltyForm({ busy, run }: { busy: boolean; run: RunTask }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    memberId: 'mbr_bronce_01',
    penaltyType: 'DAMAGE',
    amount: '5.00',
    reason: 'Front desk incident',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseAmount(form.amount);
    if (amount === null) {
      setLocalError(t('common.invalidAmount'));
      return;
    }

    setLocalError(null);
    void run(t('staff.actions.createPenalty'), async () => {
      const response = await api.post('/penalties', { ...form, amount });
      return response.data;
    });
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h3>{t('staff.forms.createPenalty.title')}</h3>
      <Field label={t('staff.forms.labels.memberId')}>
        <input
          value={form.memberId}
          onChange={(event) => setForm((prev) => ({ ...prev, memberId: event.target.value }))}
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.penaltyType')}>
        <select
          value={form.penaltyType}
          onChange={(event) => setForm((prev) => ({ ...prev, penaltyType: event.target.value }))}
        >
          {PENALTY_TYPES.map((penaltyType) => (
            <option key={penaltyType} value={penaltyType}>
              {penaltyTypeLabel(t, penaltyType)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('staff.forms.labels.amount')}>
        <input
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          type="number"
          step="0.01"
          min="0"
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.reason')}>
        <input
          value={form.reason}
          onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          required
        />
      </Field>
      {localError ? <p className="error">{localError}</p> : null}
      <button type="submit" disabled={busy}>
        {t('staff.forms.createPenalty.button')}
      </button>
    </form>
  );
}

function RegisterPaymentForm({ busy, run }: { busy: boolean; run: RunTask }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    memberId: 'mbr_bronce_01',
    loanId: '',
    penaltyId: '',
    amount: '5.00',
    method: 'SIMULATED',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseAmount(form.amount);
    if (amount === null) {
      setLocalError(t('common.invalidAmount'));
      return;
    }

    setLocalError(null);
    void run(t('staff.actions.registerPayment'), async () => {
      const response = await api.post('/payments', {
        memberId: form.memberId,
        loanId: form.loanId || undefined,
        penaltyId: form.penaltyId || undefined,
        amount,
        method: form.method,
      });
      return response.data;
    });
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h3>{t('staff.forms.registerPayment.title')}</h3>
      <Field label={t('staff.forms.labels.memberId')}>
        <input
          value={form.memberId}
          onChange={(event) => setForm((prev) => ({ ...prev, memberId: event.target.value }))}
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.penaltyId')}>
        <input
          value={form.penaltyId}
          onChange={(event) => setForm((prev) => ({ ...prev, penaltyId: event.target.value }))}
        />
      </Field>
      <Field label={t('staff.forms.labels.loanId')}>
        <input
          value={form.loanId}
          onChange={(event) => setForm((prev) => ({ ...prev, loanId: event.target.value }))}
        />
      </Field>
      <Field label={t('staff.forms.labels.amount')}>
        <input
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          type="number"
          step="0.01"
          min="0"
          required
        />
      </Field>
      <Field label={t('staff.forms.labels.method')}>
        <select
          value={form.method}
          onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {paymentMethodLabel(t, method)}
            </option>
          ))}
        </select>
      </Field>
      {localError ? <p className="error">{localError}</p> : null}
      <button type="submit" disabled={busy}>
        {t('staff.forms.registerPayment.button')}
      </button>
    </form>
  );
}
