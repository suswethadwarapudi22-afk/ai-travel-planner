import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ExpenseSplitter() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const tripDetails = state?.tripDetails || {};
  const storageKey = `expenses-${tripDetails.destination}-${tripDetails.days}`;

  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ description: '', amount: '', paidBy: '', splitAmong: [] });
  const [showForm, setShowForm] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      setMembers(data.members || []);
      setExpenses(data.expenses || []);
    }
  }, [storageKey]);

  // Save to localStorage
  const save = (m, e) => {
    localStorage.setItem(storageKey, JSON.stringify({ members: m, expenses: e }));
  };

  const addMember = () => {
    if (!newMember.trim() || members.includes(newMember.trim())) return;
    const updated = [...members, newMember.trim()];
    setMembers(updated);
    save(updated, expenses);
    setNewMember('');
  };

  const removeMember = (name) => {
    const updated = members.filter((m) => m !== name);
    setMembers(updated);
    save(updated, expenses);
  };

  const toggleSplitMember = (name) => {
    setForm((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(name)
        ? prev.splitAmong.filter((m) => m !== name)
        : [...prev.splitAmong, name],
    }));
  };

  const addExpense = () => {
    if (!form.description || !form.amount || !form.paidBy || form.splitAmong.length === 0) return;
    const expense = {
      id: Date.now(),
      description: form.description,
      amount: parseFloat(form.amount),
      paidBy: form.paidBy,
      splitAmong: form.splitAmong,
      perPerson: parseFloat(form.amount) / form.splitAmong.length,
    };
    const updated = [...expenses, expense];
    setExpenses(updated);
    save(members, updated);
    setForm({ description: '', amount: '', paidBy: '', splitAmong: [] });
    setShowForm(false);
  };

  const deleteExpense = (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    save(members, updated);
  };

  // Calculate balances
  const calculateBalances = () => {
    const balance = {};
    members.forEach((m) => (balance[m] = 0));

    expenses.forEach((exp) => {
      balance[exp.paidBy] += exp.amount;
      exp.splitAmong.forEach((m) => {
        balance[m] -= exp.perPerson;
      });
    });

    return balance;
  };

  // Settle up suggestions
  const calculateSettlements = () => {
    const balance = calculateBalances();
    const creditors = Object.entries(balance).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(balance).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]);

    const settlements = [];
    const c = creditors.map(([n, v]) => [n, v]);
    const d = debtors.map(([n, v]) => [n, -v]);

    let ci = 0, di = 0;
    while (ci < c.length && di < d.length) {
      const amount = Math.min(c[ci][1], d[di][1]);
      settlements.push({ from: d[di][0], to: c[ci][0], amount: amount.toFixed(2) });
      c[ci][1] -= amount;
      d[di][1] -= amount;
      if (c[ci][1] < 0.01) ci++;
      if (d[di][1] < 0.01) di++;
    }
    return settlements;
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balances = members.length > 0 ? calculateBalances() : {};
  const settlements = members.length > 0 ? calculateSettlements() : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-blue-600 mb-4 font-medium">
          ← Back
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6 text-white mb-4">
          <h2 className="text-2xl font-bold">💸 Group Expense Splitter</h2>
          <p className="opacity-90 text-sm mt-1">
            {tripDetails.destination ? `${tripDetails.source} → ${tripDetails.destination}` : 'Trip Expenses'}
          </p>
          <p className="text-lg font-semibold mt-2">Total Spent: ₹{totalExpenses.toFixed(2)}</p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-3">👥 Group Members</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Enter name"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
            />
            <button
              onClick={addMember}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.length === 0 && <p className="text-sm text-gray-400">Add members to get started</p>}
            {members.map((m) => (
              <span key={m} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {m}
                <button onClick={() => removeMember(m)} className="text-green-600 hover:text-red-500 font-bold ml-1">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Add Expense */}
        {members.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900">🧾 Expenses</h3>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                {showForm ? 'Cancel' : '+ Add Expense'}
              </button>
            </div>

            {showForm && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="What was this expense? (e.g. Hotel, Dinner)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Paid by</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.paidBy}
                    onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                  >
                    <option value="">Select who paid</option>
                    {members.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Split among</label>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleSplitMember(m)}
                        className={`px-3 py-1 rounded-full text-sm border transition ${
                          form.splitAmong.includes(m)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addExpense}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  ✓ Add Expense
                </button>
              </div>
            )}

            {/* Expense List */}
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No expenses added yet</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-start justify-between bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{exp.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paid by <span className="font-medium text-green-700">{exp.paidBy}</span> · ₹{exp.perPerson.toFixed(2)}/person
                      </p>
                      <p className="text-xs text-gray-400">Split: {exp.splitAmong.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">₹{exp.amount.toFixed(2)}</span>
                      <button onClick={() => deleteExpense(exp.id)} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Balances */}
        {members.length >= 2 && expenses.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h3 className="font-bold text-gray-900 mb-3">📊 Individual Balances</h3>
              <div className="space-y-2">
                {Object.entries(balances).map(([name, balance]) => (
                  <div key={name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <span className="font-medium text-gray-800">{name}</span>
                    <span className={`font-bold text-sm px-3 py-1 rounded-full ${
                      balance > 0.01 ? 'bg-green-100 text-green-700' :
                      balance < -0.01 ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {balance > 0.01 ? `gets back ₹${balance.toFixed(2)}` :
                       balance < -0.01 ? `owes ₹${(-balance).toFixed(2)}` :
                       'settled ✓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h3 className="font-bold text-gray-900 mb-3">✅ Settle Up</h3>
              {settlements.length === 0 ? (
                <p className="text-green-600 font-medium text-center py-2">Everyone is settled! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {settlements.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm">
                      <span className="font-semibold text-red-600">{s.from}</span>
                      <span className="text-gray-500">pays</span>
                      <span className="font-semibold text-green-600">{s.to}</span>
                      <span className="ml-auto font-bold text-gray-800">₹{s.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}