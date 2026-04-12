import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import {
  materialTypeLabel,
  membershipLevelLabel,
  paymentMethodLabel,
  penaltyTypeLabel,
} from '../lib/labels';

const MEMBERSHIP_LEVELS = ['BRONCE', 'PLATA', 'ORO'] as const;
const PENALTY_TYPES = ['LATE_RETURN', 'RESERVATION_EXPIRE', 'LOST_COPY', 'DAMAGE'] as const;
const PAYMENT_METHODS = ['SIMULATED', 'CASH', 'CARD'] as const;

type DashboardSnapshot = {
  generatedAt: string;
  income: {
    totals: {
      loans: number;
      totalRevenue: number;
    };
  };
  losses: {
    totals: {
      lostCopies: number;
      estimatedLossAmount: number;
    };
  };
};

export function StaffOpsPage() {
  const { t } = useTranslation();
  const [materialForm, setMaterialForm] = useState({
    title: 'Demo Material',
    materialType: 'LIBRO',
    releaseDate: '2024-01-01',
    homeBranchId: 'branch_centro',
    basePrice: '2.50',
  });
  const [updateMaterialForm, setUpdateMaterialForm] = useState({
    materialId: '',
    title: '',
    basePrice: '',
  });
  const [loanForm, setLoanForm] = useState({
    memberId: 'mbr_bronce_01',
    copyId: '',
    pickupBranchId: 'branch_centro',
    membershipLevel: 'BRONCE',
  });
  const [penaltyForm, setPenaltyForm] = useState({
    memberId: 'mbr_bronce_01',
    penaltyType: 'DAMAGE',
    amount: '5.00',
    reason: 'Front desk incident',
  });
  const [paymentForm, setPaymentForm] = useState({
    memberId: 'mbr_bronce_01',
    loanId: '',
    penaltyId: '',
    amount: '5.00',
    method: 'SIMULATED',
  });

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [result, setResult] = useState<string>(t('staff.resultIdle'));
  const [working, setWorking] = useState(false);

  const run = async (label: string, task: () => Promise<unknown>) => {
    setWorking(true);
    try {
      const response = await task();
      setResult(
        t('staff.resultSuccess', {
          label,
          payload: JSON.stringify(response, null, 2),
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('staff.unknownError');
      setResult(
        t('staff.resultError', {
          label,
          message,
        }),
      );
    } finally {
      setWorking(false);
    }
  };

  const createMaterial = async (event: FormEvent) => {
    event.preventDefault();
    await run(t('staff.actions.createMaterial'), async () => {
      const response = await api.post('/materials', {
        title: materialForm.title,
        materialType: materialForm.materialType,
        releaseDate: materialForm.releaseDate,
        homeBranchId: materialForm.homeBranchId,
        basePrice: Number(materialForm.basePrice),
      });

      return response.data;
    });
  };

  const updateMaterial = async (event: FormEvent) => {
    event.preventDefault();
    await run(t('staff.actions.updateMaterial'), async () => {
      const payload: Record<string, unknown> = {};
      if (updateMaterialForm.title) {
        payload.title = updateMaterialForm.title;
      }

      if (updateMaterialForm.basePrice) {
        payload.basePrice = Number(updateMaterialForm.basePrice);
      }

      const response = await api.patch(`/materials/${updateMaterialForm.materialId}`, payload);
      return response.data;
    });
  };

  const createLoan = async (event: FormEvent) => {
    event.preventDefault();
    await run(t('staff.actions.createLoan'), async () => {
      const response = await api.post('/loans', {
        memberId: loanForm.memberId,
        copyId: loanForm.copyId,
        pickupBranchId: loanForm.pickupBranchId,
        membershipLevel: loanForm.membershipLevel,
        activeLoansCount: 0,
        debtTotal: 0,
        maxOverdueDays: 0,
        overdueLoansLast60Days: 0,
      });

      return response.data;
    });
  };

  const createPenalty = async (event: FormEvent) => {
    event.preventDefault();
    await run(t('staff.actions.createPenalty'), async () => {
      const response = await api.post('/penalties', {
        memberId: penaltyForm.memberId,
        penaltyType: penaltyForm.penaltyType,
        amount: Number(penaltyForm.amount),
        reason: penaltyForm.reason,
      });

      return response.data;
    });
  };

  const registerPayment = async (event: FormEvent) => {
    event.preventDefault();
    await run(t('staff.actions.registerPayment'), async () => {
      const response = await api.post('/payments', {
        memberId: paymentForm.memberId,
        loanId: paymentForm.loanId || undefined,
        penaltyId: paymentForm.penaltyId || undefined,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
      });

      return response.data;
    });
  };

  const loadDashboard = async () => {
    await run(t('staff.actions.loadDashboard'), async () => {
      const response = await api.get<DashboardSnapshot>('/reports/dashboard');
      setDashboard(response.data);
      return response.data;
    });
  };

  return (
    <section className="stack">
      <div className="card headline">
        <h2>{t('staff.title')}</h2>
        <p>{t('staff.description')}</p>
      </div>

      <div className="grid two">
        <form className="card form-grid" onSubmit={createMaterial}>
          <h3>{t('staff.forms.createMaterial.title')}</h3>
          <input
            value={materialForm.title}
            onChange={(event) => setMaterialForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t('staff.forms.createMaterial.placeholders.title')}
            required
          />
          <select
            value={materialForm.materialType}
            onChange={(event) => setMaterialForm((prev) => ({ ...prev, materialType: event.target.value }))}
          >
            <option value="LIBRO">{materialTypeLabel(t, 'LIBRO')}</option>
            <option value="PELICULA">{materialTypeLabel(t, 'PELICULA')}</option>
            <option value="JUEGO_PC">{materialTypeLabel(t, 'JUEGO_PC')}</option>
            <option value="JUEGO_PLAYSTATION">{materialTypeLabel(t, 'JUEGO_PLAYSTATION')}</option>
            <option value="JUEGO_XBOX">{materialTypeLabel(t, 'JUEGO_XBOX')}</option>
          </select>
          <input
            value={materialForm.releaseDate}
            onChange={(event) => setMaterialForm((prev) => ({ ...prev, releaseDate: event.target.value }))}
            type="date"
            required
          />
          <input
            value={materialForm.homeBranchId}
            onChange={(event) => setMaterialForm((prev) => ({ ...prev, homeBranchId: event.target.value }))}
            placeholder={t('staff.forms.createMaterial.placeholders.homeBranchId')}
            required
          />
          <input
            value={materialForm.basePrice}
            onChange={(event) => setMaterialForm((prev) => ({ ...prev, basePrice: event.target.value }))}
            type="number"
            step="0.01"
            min="0"
            required
          />
          <button disabled={working}>{t('staff.forms.createMaterial.button')}</button>
        </form>

        <form className="card form-grid" onSubmit={updateMaterial}>
          <h3>{t('staff.forms.updateMaterial.title')}</h3>
          <input
            value={updateMaterialForm.materialId}
            onChange={(event) => setUpdateMaterialForm((prev) => ({ ...prev, materialId: event.target.value }))}
            placeholder={t('staff.forms.updateMaterial.placeholders.materialId')}
            required
          />
          <input
            value={updateMaterialForm.title}
            onChange={(event) => setUpdateMaterialForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t('staff.forms.updateMaterial.placeholders.title')}
          />
          <input
            value={updateMaterialForm.basePrice}
            onChange={(event) => setUpdateMaterialForm((prev) => ({ ...prev, basePrice: event.target.value }))}
            type="number"
            step="0.01"
            min="0"
            placeholder={t('staff.forms.updateMaterial.placeholders.basePrice')}
          />
          <button disabled={working}>{t('staff.forms.updateMaterial.button')}</button>
        </form>

        <form className="card form-grid" onSubmit={createLoan}>
          <h3>{t('staff.forms.createLoan.title')}</h3>
          <input
            value={loanForm.memberId}
            onChange={(event) => setLoanForm((prev) => ({ ...prev, memberId: event.target.value }))}
            placeholder={t('staff.forms.createLoan.placeholders.memberId')}
            required
          />
          <input
            value={loanForm.copyId}
            onChange={(event) => setLoanForm((prev) => ({ ...prev, copyId: event.target.value }))}
            placeholder={t('staff.forms.createLoan.placeholders.copyId')}
            required
          />
          <input
            value={loanForm.pickupBranchId}
            onChange={(event) => setLoanForm((prev) => ({ ...prev, pickupBranchId: event.target.value }))}
            placeholder={t('staff.forms.createLoan.placeholders.pickupBranchId')}
            required
          />
          <select
            value={loanForm.membershipLevel}
            onChange={(event) => setLoanForm((prev) => ({ ...prev, membershipLevel: event.target.value }))}
          >
            {MEMBERSHIP_LEVELS.map((level) => (
              <option key={level} value={level}>{membershipLevelLabel(t, level)}</option>
            ))}
          </select>
          <button disabled={working}>{t('staff.forms.createLoan.button')}</button>
        </form>

        <form className="card form-grid" onSubmit={createPenalty}>
          <h3>{t('staff.forms.createPenalty.title')}</h3>
          <input
            value={penaltyForm.memberId}
            onChange={(event) => setPenaltyForm((prev) => ({ ...prev, memberId: event.target.value }))}
            placeholder={t('staff.forms.createPenalty.placeholders.memberId')}
            required
          />
          <select
            value={penaltyForm.penaltyType}
            onChange={(event) => setPenaltyForm((prev) => ({ ...prev, penaltyType: event.target.value }))}
          >
            {PENALTY_TYPES.map((penaltyType) => (
              <option key={penaltyType} value={penaltyType}>{penaltyTypeLabel(t, penaltyType)}</option>
            ))}
          </select>
          <input
            value={penaltyForm.amount}
            onChange={(event) => setPenaltyForm((prev) => ({ ...prev, amount: event.target.value }))}
            type="number"
            step="0.01"
            min="0"
            required
          />
          <input
            value={penaltyForm.reason}
            onChange={(event) => setPenaltyForm((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder={t('staff.forms.createPenalty.placeholders.reason')}
            required
          />
          <button disabled={working}>{t('staff.forms.createPenalty.button')}</button>
        </form>

        <form className="card form-grid" onSubmit={registerPayment}>
          <h3>{t('staff.forms.registerPayment.title')}</h3>
          <input
            value={paymentForm.memberId}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, memberId: event.target.value }))}
            placeholder={t('staff.forms.registerPayment.placeholders.memberId')}
            required
          />
          <input
            value={paymentForm.penaltyId}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, penaltyId: event.target.value }))}
            placeholder={t('staff.forms.registerPayment.placeholders.penaltyId')}
          />
          <input
            value={paymentForm.loanId}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, loanId: event.target.value }))}
            placeholder={t('staff.forms.registerPayment.placeholders.loanId')}
          />
          <input
            value={paymentForm.amount}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
            type="number"
            step="0.01"
            min="0"
            required
          />
          <select
            value={paymentForm.method}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{paymentMethodLabel(t, method)}</option>
            ))}
          </select>
          <button disabled={working}>{t('staff.forms.registerPayment.button')}</button>
        </form>

        <div className="card form-grid">
          <h3>{t('staff.dashboard.title')}</h3>
          <p>{t('staff.dashboard.description')}</p>
          <button onClick={loadDashboard} disabled={working}>{t('staff.actions.loadDashboard')}</button>
          {dashboard ? (
            <div className="kpi-grid">
              <div>
                <strong>{t('staff.dashboard.loans')}</strong>
                <p>{dashboard.income.totals.loans}</p>
              </div>
              <div>
                <strong>{t('staff.dashboard.revenue')}</strong>
                <p>{dashboard.income.totals.totalRevenue.toFixed(2)} {t('common.currency')}</p>
              </div>
              <div>
                <strong>{t('staff.dashboard.losses')}</strong>
                <p>{dashboard.losses.totals.estimatedLossAmount.toFixed(2)} {t('common.currency')}</p>
              </div>
              <div>
                <strong>{t('staff.dashboard.lostCopies')}</strong>
                <p>{dashboard.losses.totals.lostCopies}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h3>{t('staff.resultTitle')}</h3>
        <pre className="result-box">{result}</pre>
      </div>
    </section>
  );
}
