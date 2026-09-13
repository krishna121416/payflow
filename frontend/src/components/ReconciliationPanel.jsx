import { useEffect, useState } from 'react';
import { api } from '../api';

export function ReconciliationPanel({ refreshSignal }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    api.reconcile().then(setData).catch((err) => setError(err.message));
  }

  useEffect(load, [refreshSignal]);

  return (
    <section className="panel">
      <h2>Reconciliation</h2>
      <p className="hint">
        Independently sums every debit and every credit across the whole ledger.
        They must always be equal - that's the double-entry guarantee.
      </p>
      <button type="button" onClick={load}>Refresh</button>
      {error && <p className="error-text">{error}</p>}
      {data && (
        <div className="reconcile-grid">
          <div>
            <span className="label">Total Debits</span>
            <span className="value">{data.total_debits}</span>
          </div>
          <div>
            <span className="label">Total Credits</span>
            <span className="value">{data.total_credits}</span>
          </div>
          <div>
            <span className="label">Status</span>
            <span className={data.reconciled ? 'badge badge-ok' : 'badge badge-bad'}>
              {data.reconciled ? 'Reconciled' : 'MISMATCH'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
