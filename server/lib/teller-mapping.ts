/**
 * Teller.io Account Mapping Utility
 * 
 * Maps Teller account data to Flint's internal format, properly handling:
 * - Credit cards: ledger = amount owed (debt), displayBalance = negative
 * - Depository/Investment: ledger = cash balance, displayBalance = positive
 */

interface TellerAccount {
  id: string;
  name?: string;
  type: string;
  subtype?: string;
  status?: string;
  institution?: { name: string; id?: string };
  currency?: string;
  enrollment_id?: string;
  last_four?: string;
}

interface TellerBalance {
  ledger?: string;
  available?: string;
  account_id?: string;
  links?: any;
}

export interface MappedTellerAccount {
  id: string;
  institution: string;
  accountType: string;
  accountSubtype?: string;
  availableCredit?: number;
  owed?: number;
  cashBalance?: number;
  displayBalance: number;
  available?: number;
  ledger?: number;
  currency?: string;
  status?: string;
  last_four?: string;
}

/**
 * Maps a Teller account and its balance to Flint's internal format
 * 
 * @param account - Teller account object
 * @param balance - Teller balance object
 * @returns Mapped account with proper positive/negative balance handling
 */
export function mapTellerToFlint(
  account: TellerAccount,
  balance: TellerBalance
): MappedTellerAccount {
  const ledgerValue = balance.ledger ? parseFloat(balance.ledger) : 0;
  const availableValue = balance.available ? parseFloat(balance.available) : 0;

  // Determine account type and calculate display balance
  const isCreditCard = account.type === 'credit' || account.subtype === 'credit_card';
  
  if (isCreditCard) {
    // Credit cards: Teller reports ledger as POSITIVE debt (e.g., 2711.01)
    // - ledger: amount currently owed (positive value from Teller)
    // - available: remaining credit available
    // We map to:
    // - owed: positive amount owed (same as ledger)
    // - displayBalance: NEGATIVE to reduce net worth
    // - availableCredit: remaining credit
    
    return {
      id: account.id,
      institution: account.institution?.name || 'Unknown',
      accountType: 'credit',
      accountSubtype: account.subtype || 'credit_card',
      owed: ledgerValue, // Positive amount owed on the card (from Teller)
      availableCredit: availableValue, // Remaining credit available
      displayBalance: -ledgerValue, // Negative balance (debt reduces net worth)
      ledger: ledgerValue,
      available: availableValue,
      currency: account.currency || 'USD',
      status: account.status,
      last_four: account.last_four,
    };
  } else {
    // Depository or investment accounts: positive balances
    return {
      id: account.id,
      institution: account.institution?.name || 'Unknown',
      accountType: account.type || 'depository',
      accountSubtype: account.subtype,
      cashBalance: availableValue || ledgerValue, // Use available or ledger
      displayBalance: availableValue || ledgerValue, // Positive balance
      ledger: ledgerValue,
      available: availableValue,
      currency: account.currency || 'USD',
      status: account.status,
      last_four: account.last_four,
    };
  }
}

/**
 * Logs mapping details for debugging
 */
export function logMappingDetails(
  account: TellerAccount,
  balance: TellerBalance,
  mapped: MappedTellerAccount
): void {
  console.log('[Teller Mapper]', {
    accountId: account.id,
    type: account.type,
    subtype: account.subtype,
    rawLedger: balance.ledger,
    rawAvailable: balance.available,
    mappedDisplayBalance: mapped.displayBalance,
    mappedOwed: mapped.owed,
    mappedCashBalance: mapped.cashBalance,
  });
}
