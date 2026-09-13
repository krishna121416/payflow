import { useState } from 'react';
import { api } from '../api';

const ACCOUNT_TYPES = ['personal', 'business'];

export function AccountsSection({ accounts, onChanged }) {
  const [ownerName, setOwnerName] = useState('');
  const [accountType, setAccountType] = useState('personal');
  const [initialBalance, setInitialBalance] = useState('0');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createAccount({
        owner_name: ownerName,
        account_type: accountType,
        initial_balance: Number(initialBalance),
      });
      setOwnerName('');
      setInitialBalance('0');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Accounts</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Type</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-row">No accounts yet</td>
            </tr>
          )}
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>{a.owner_name}</td>
              <td>{a.account_type}</td>
              <td>{a.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          placeholder="Owner name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />
        <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Initial balance"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>Create Account</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
