import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function calculateSettlements(balances) {
  const creditors = balances
    .filter((b) => b.balance > 1)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -1)
    .map((b) => ({ name: b.name, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);
  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amount) });
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance < 1) i++;
    if (creditors[j].balance < 1) j++;
  }
  return settlements;
}

function ExpenseSplitter() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tripDetails = state?.tripDetails;

  const splitStorageKey = `split-v2-${tripDetails?.destination}-${tripDetails?.days}`;

  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', paidBy: '' });
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    if (!tripDetails) return;
    const savedSplit = localStorage.getItem(splitStorageKey);
    if (savedSplit) {
      const parsed = JSON.parse(savedSplit);
      setMembers(parsed.members || []);
      setExpenses(parsed.expenses || []);
    } else {
      const defaultMembers = Array.from(
        { length: Number(tripDetails.groupSize) || 2 },
        (_, i) => `Person ${i + 1}`
      );
      setMembers(defaultMembers);
      setExpenses([]);
    }
    // eslint-disable-next-line
  }, [splitStorageKey]);

  if (!state || !tripDetails) {
    navigate('/dashboard');
    return null;
  }

  const persistSplit = (m, e) => {
    localStorage.setItem(splitStorageKey, JSON.stringify({ members: m, expenses: e }));
  };

  const addMember = () => {
    const name = newMemberName.trim().toUpperCase();
    if (!name || members.includes(name)) return;
    const updated = [...members, name];
    setMembers(updated);
    persistSplit(updated, expenses);
    setNewMemberName('');
  };

  const removeMember = (name) => {
    const updatedMembers = members.filter((m) => m !== name);
    const updatedExpenses = expenses.filter((e) => e.paidBy !== name);
    setMembers(updatedMembers);
    setExpenses(updatedExpenses);
    persistSplit(updatedMembers, updatedExpenses);
  };

  const addExpenseHandler = () => {
    const amount = parseFloat(newExpense.amount);
    if (!newExpense.description.trim() || !amount || amount <= 0 || !newExpense.paidBy) {
      alert('Please fill in all fields!');
      return;
    }
    const updated = [
      ...expenses,
      {
        id: Date.now(),
        description: newExpense.description.trim(),
        amount,
        paidBy: newExpense.paidBy,
      },
    ];
    setExpenses(updated);
    persistSplit(members, updated);
    setNewExpense({ description: '', amount: '', paidBy: '' });
    setShowAddExpense(false);
  };

  const deleteExpense = (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    persistSplit(members, updated);
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonShare = members.length ? totalExpense / members.length : 0;
  const balances = members.map((name) => {
    const paid = expenses.filter((e) => e.paidBy === name).reduce((sum, e) => sum + e.amount, 0);
    return { name, paid, balance: paid - perPersonShare };
  });
  const settlements = calculateSettlements(balances);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 mb-4 font-medium"
        >
          ← Back to Itinerary
        </button>

        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6 text-white mb-4">
          <h2 className="text-2xl font-bold">💸 Group Expense Splitter</h2>
          <p className="opacity-90">
            {tripDetails.source} → {tripDetails.destination} · {tripDetails.groupSize} people
          </p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>👥</span> Group Members
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {members.map((name) => (
              <span key={name} className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full flex items-center gap-1 border border-green-200">
                {name}
                <button onClick={() => removeMember(name)} className="text-green-400 hover:text-red-500 ml-1 font-bold">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add member name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={addMember}
              className="bg-green-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🧾</span> Expenses
              {totalExpense > 0 && (
                <span className="text-sm text-gray-500 font-normal">· Total ₹{totalExpense.toFixed(0)}</span>
              )}
            </h3>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              {showAddExpense ? 'Cancel' : '+ Add Expense'}
            </button>
          </div>

          {showAddExpense && (
            <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-2">
              <input
                type="text"
                placeholder="Description (e.g. Hotel, Lunch, Taxi)"
                value={newExpense.description}
                onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <div>
                <p className="text-xs text-gray-500 mb-1">Paid by:</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((name) => (
                    <button
                      key={name}
                      onClick={() => setNewExpense((p) => ({ ...p, paidBy: name }))}
                      className={`px-3 py-1 rounded-full text-sm border transition ${
                        newExpense.paidBy === name
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={addExpenseHandler}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                ✓ Add Expense
              </button>
            </div>
          )}

          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.description}</p>
                  <p className="text-xs text-gray-500">paid by {e.paidBy}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">₹{e.amount}</span>
                  <button onClick={() => deleteExpense(e.id)} className="text-gray-300 hover:text-red-500">✕</button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4">No expenses added yet</p>
            )}
          </div>
        </div>

        {/* Summary */}
        {totalExpense > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>📊</span> Summary
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700">Total spent: <span className="font-bold text-gray-900">₹{totalExpense.toFixed(0)}</span></p>
              <p className="text-sm text-gray-700">Fair share per person: <span className="font-bold text-gray-900">₹{perPersonShare.toFixed(0)}</span></p>
            </div>

            <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase">Individual Balance</h4>
            <div className="space-y-2 mb-4">
              {balances.map((b) => (
                <div key={b.name} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-500">paid ₹{b.paid.toFixed(0)}</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                    b.balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {b.balance >= 0 ? `+ ₹${b.balance.toFixed(0)}` : `- ₹${Math.abs(b.balance).toFixed(0)}`}
                  </span>
                </div>
              ))}
            </div>

            {settlements.length > 0 && (
              <>
                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase">💵 Settle Up</h4>
                <div className="space-y-2">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
                      <p className="text-sm text-gray-800">
                        <span className="font-bold text-red-600">{s.from}</span>
                        <span className="text-gray-500"> pays </span>
                        <span className="font-bold text-green-600">{s.to}</span>
                      </p>
                      <span className="font-bold text-gray-900">₹{s.amount}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseSplitter;