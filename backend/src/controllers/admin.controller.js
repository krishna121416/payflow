const { getLedgerTotals } = require('../services/ledger.service');

async function reconcile(req, res) {
  const { totalDebits, totalCredits } = await getLedgerTotals();

  res.json({
    reconciled: totalDebits.equals(totalCredits),
    total_debits: totalDebits.toFixed(2),
    total_credits: totalCredits.toFixed(2),
  });
}

module.exports = { reconcile };
