import { supabase } from "./supabase.js";

function raise(error) {
  if (error) throw new Error(error.message || "No se pudo completar la operación.");
}

// Supabase limita cada página; el saldo provisional necesita todos los registros.
async function listRows(table, userId, orderColumn) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    let query = supabase.from(table).select('*').eq('user_id', userId).order(orderColumn, { ascending: false });
    if (orderColumn !== 'created_at') query = query.order('created_at', { ascending: false });
    const result = await query.order('id', { ascending: false }).range(start, start + 999);
    if (result.error) return result;
    rows.push(...result.data);
    if (result.data.length < 1000) return { data: rows, error: null };
  }
}

const transactionFromDb = (row) => ({
  id: row.id,
  date: row.date,
  type: row.type,
  category: row.category,
  description: row.description,
  amount: Number(row.amount),
  currency: row.currency,
  exchangeRate: Number(row.exchange_rate),
  source: row.source,
});

const debtFromDb = (row) => ({
  id: row.id,
  creditor: row.creditor,
  originalAmount: Number(row.original_amount),
  outstandingAmount: Number(row.outstanding_amount),
  monthlyPayment: Number(row.monthly_payment),
  annualRate: Number(row.annual_rate),
  dueDay: row.due_day,
  currency: row.currency,
  status: row.status,
});

const paymentFromDb = (row) => ({
  id: row.id,
  debtId: row.debt_id,
  paymentDate: row.payment_date,
  amount: Number(row.amount),
  notes: row.notes,
});

const statementFromDb = (row) => ({
  id: row.id,
  statementDate: row.statement_date,
  institution: row.institution,
  contributedCapital: Number(row.contributed_capital),
  marketValue: Number(row.market_value),
  dividends: Number(row.dividends),
  cashBalance: Number(row.cash_balance),
  currency: row.currency,
  notes: row.notes,
});

function transactionToDb(row) {
  return {
    date: row.date,
    type: row.type,
    category: row.category,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    exchange_rate: row.exchangeRate,
  };
}

function debtToDb(row) {
  return {
    creditor: row.creditor,
    original_amount: row.originalAmount,
    outstanding_amount: row.outstandingAmount,
    monthly_payment: row.monthlyPayment,
    annual_rate: row.annualRate,
    due_day: row.dueDay,
    currency: row.currency,
    status: row.status,
  };
}

function statementToDb(row) {
  return {
    statement_date: row.statementDate,
    institution: row.institution,
    contributed_capital: row.contributedCapital,
    market_value: row.marketValue,
    dividends: row.dividends,
    cash_balance: row.cashBalance,
    currency: row.currency,
    notes: row.notes,
  };
}

export const authService = {
  getSession: () => supabase.auth.getSession(),
  onChange: (callback) => supabase.auth.onAuthStateChange((_event, session) => callback(session)),
  async signUp({ name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    raise(error);
    return data;
  },
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    raise(error);
    return data;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    raise(error);
  },
};

export const financeService = {
  async listMonthlyReports(userId) {
    const { data, error } = await supabase.from('monthly_reports').select('*')
      .eq('user_id', userId).order('month', { ascending: false });
    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      throw new Error('Los reportes mensuales todavía no están activados. Falta completar la actualización de la base de datos.');
    }
    raise(error);
    return data;
  },
  async listAll(userId) {
    const [transactions, debts, payments, statements] = await Promise.all([
      listRows('transactions', userId, 'date'),
      listRows('debts', userId, 'created_at'),
      listRows('debt_payments', userId, 'payment_date'),
      listRows('investment_statements', userId, 'statement_date'),
    ]);
    [transactions, debts, payments, statements].forEach((result) => raise(result.error));
    return {
      transactions: transactions.data.map(transactionFromDb),
      debts: debts.data.map(debtFromDb),
      debtPayments: payments.data.map(paymentFromDb),
      statements: statements.data.map(statementFromDb),
    };
  },

  async createTransaction(record) {
    const { data, error } = await supabase.from("transactions").insert(transactionToDb(record)).select().single();
    raise(error);
    return transactionFromDb(data);
  },
  async updateTransaction(id, record) {
    const { data, error } = await supabase.from("transactions").update(transactionToDb(record)).eq("id", id).select().single();
    raise(error);
    return transactionFromDb(data);
  },
  async deleteTransaction(id) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    raise(error);
  },
  async importTransactions(rows) {
    if (!rows.length) return [];
    const { data, error } = await supabase.from("transactions").insert(rows.map(transactionToDb)).select();
    raise(error);
    return data.map(transactionFromDb);
  },

  async createDebt(record) {
    const { data, error } = await supabase.from("debts").insert(debtToDb(record)).select().single();
    raise(error);
    return debtFromDb(data);
  },
  async updateDebt(id, record) {
    const { data, error } = await supabase.from("debts").update(debtToDb(record)).eq("id", id).select().single();
    raise(error);
    return debtFromDb(data);
  },
  async deleteDebt(id) {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    raise(error);
  },
  async registerDebtPayment(debtId, record) {
    const { error } = await supabase.rpc("register_debt_payment", {
      p_debt_id: debtId,
      p_amount: record.amount,
      p_payment_date: record.paymentDate,
      p_notes: record.notes,
    });
    raise(error);
  },

  async createStatement(record) {
    const { data, error } = await supabase.from("investment_statements").insert(statementToDb(record)).select().single();
    raise(error);
    return statementFromDb(data);
  },
  async updateStatement(id, record) {
    const { data, error } = await supabase.from("investment_statements").update(statementToDb(record)).eq("id", id).select().single();
    raise(error);
    return statementFromDb(data);
  },
  async deleteStatement(id) {
    const { error } = await supabase.from("investment_statements").delete().eq("id", id);
    raise(error);
  },
};
