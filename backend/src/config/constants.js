// Fixed, well-known ID for the internal equity account that funds every
// account's opening balance. Using a constant ID (instead of looking it up
// by name) means we can reference it directly with no query/race.
const SYSTEM_EQUITY_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

module.exports = { SYSTEM_EQUITY_ACCOUNT_ID };
