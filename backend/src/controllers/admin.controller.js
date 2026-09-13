const { getLedgerTotals } = require('../services/ledger.service');

// The core double-entry guarantee, checked independently rather than
// assumed: every successful transaction writes one debit and one credit,
// so summing each side across the WHOLE ledger should always match. If a
// bug ever let a transaction write a debit without its matching credit (or
// vice versa), this endpoint is what would catch it.
async function reconcile(req, res) {
  const { totalDebits, totalCredits } = await getLedgerTotals();

  res.json({
    reconciled: totalDebits.equals(totalCredits),
    total_debits: totalDebits.toFixed(2),
    total_credits: totalCredits.toFixed(2),
  });
}

module.exports = { reconcile };
