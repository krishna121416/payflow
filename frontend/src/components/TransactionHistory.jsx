import { useEffect, useState } from 'react';
import { api } from '../api';

export function TransactionHistory({ accounts, refreshSignal }) {
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (!accountId) return;
    setError(null);
    api
      .getTransactionHistory(accountId)
      .then((res) => setTransactions(res.transactions))
      .catch((err) => setError(err.message));
  }, [accountId, refreshSignal]);

  return (
    <section className="panel">
      <h2>Transaction History</h2>
      <label>
        Account
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.owner_name}</option>
          ))}
        </select>
      </label>

      {error && <p className="error-text">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Amount</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-row">No transactions yet</td>
            </tr>
          )}
          {transactions.map((t) => (
            <tr key={t.id}>
              <td className="mono">{t.id}</td>
              <td>{t.amount}</td>
              <td className="mono">{t.source_account_id}</td>
              <td className="mono">{t.destination_account_id}</td>
              <td>{t.status}</td>
              <td>{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
