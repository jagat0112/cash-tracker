import React, { useEffect, useMemo, useState } from "react";

// --- Multi‑store Safe Cash Tracker (single-file Vite/React prototype)
// JSX / app.js version (no TypeScript)
//
// ✅ Features
// - Multiple stores with separate logins (users belong to a store)
// - Public can switch stores to see that store’s balance
// - Employees must select their name on every ADD/WITHDRAW
// - Admins see the full ledger per store
// - LocalStorage for demo; swap with a real backend for production
//
// 🔐 Demo users (by store)
// Store A: admin-a@store.com / admin123  (admin)
//          staff-a1@store.com / staff123  (staff)
// Store B: admin-b@store.com / admin123  (admin)
//          staff-b1@store.com / staff123  (staff)

// ---- Storage Keys ----
const STORAGE_KEYS = {
  user: "safeCash.user",
  tx: "safeCash.transactions",
  seed: "safeCash.seeded.v2",
  lastStore: "safeCash.lastStore",
};

// ---- Demo Stores & Employees ----
const STORES = [
  { id: "store-a", name: "Greenpoint" },
  { id: "store-b", name: "Long Island City" },
];

const EMPLOYEES = [
  { id: crypto.randomUUID(), storeId: "store-a", name: "Ava Patel" },
  { id: crypto.randomUUID(), storeId: "store-a", name: "Marcus Lee" },
  { id: crypto.randomUUID(), storeId: "store-b", name: "Sofia Gomez" },
  { id: crypto.randomUUID(), storeId: "store-b", name: "Noah Johnson" },
];

// ---- Demo users (email -> {password, profile}) ----
const DEMO_USERS = {
  "admin-a@store.com": {
    password: "admin123",
    profile: {
      email: "admin-a@store.com",
      name: "Store A Admin",
      role: "admin",
      storeId: "store-a",
    },
  },
  "staff-a1@store.com": {
    password: "staff123",
    profile: {
      email: "staff-a1@store.com",
      name: "Ava Patel",
      role: "staff",
      storeId: "store-a",
    },
  },
  "admin-b@store.com": {
    password: "admin123",
    profile: {
      email: "admin-b@store.com",
      name: "Store B Admin",
      role: "admin",
      storeId: "store-b",
    },
  },
  "staff-b1@store.com": {
    password: "staff123",
    profile: {
      email: "staff-b1@store.com",
      name: "Sofia Gomez",
      role: "staff",
      storeId: "store-b",
    },
  },
};

// ---- Helpers ----
function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const seedTransactions = [
  // Seed both stores to $100 opening float each
  {
    id: crypto.randomUUID(),
    storeId: "store-a",
    type: "ADD",
    amount: 100,
    comment: "Opening float kept in safe",
    employeeName: "System",
    createdBy: "seed",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    storeId: "store-b",
    type: "ADD",
    amount: 100,
    comment: "Opening float kept in safe",
    employeeName: "System",
    createdBy: "seed",
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  // Seed once for new schema
  useEffect(() => {
    const seeded = localStorage.getItem(STORAGE_KEYS.seed);
    if (!seeded) {
      localStorage.setItem(STORAGE_KEYS.tx, JSON.stringify(seedTransactions));
      localStorage.setItem(STORAGE_KEYS.seed, "true");
      localStorage.setItem(
        STORAGE_KEYS.lastStore,
        JSON.stringify(STORES[0].id)
      );
    }
  }, []);

  const [user, setUser] = useLocalStorage(STORAGE_KEYS.user, null);
  const [transactions, setTransactions] = useLocalStorage(STORAGE_KEYS.tx, []);

  // selected store for public view or when logged in
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.lastStore);
    return raw ? JSON.parse(raw) : STORES[0].id;
  });
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.lastStore,
      JSON.stringify(selectedStoreId)
    );
  }, [selectedStoreId]);

  // If user is logged in, force store to their store
  useEffect(() => {
    if (user) setSelectedStoreId(user.storeId);
  }, [user]);

  const storeOptions = STORES;
  const currentStore = useMemo(
    () => storeOptions.find((s) => s.id === selectedStoreId),
    [selectedStoreId]
  );

  const txForStore = useMemo(
    () => transactions.filter((t) => t.storeId === selectedStoreId),
    [transactions, selectedStoreId]
  );

  const balance = useMemo(
    () =>
      txForStore.reduce(
        (acc, t) => acc + (t.type === "ADD" ? t.amount : -t.amount),
        0
      ),
    [txForStore]
  );

  const isAdmin = user && user.role === "admin";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Header
        user={user}
        onLogout={() => setUser(null)}
        balance={balance}
        selectedStoreId={selectedStoreId}
        onStoreChange={setSelectedStoreId}
      />

      <main className="max-w-5xl mx-auto p-4 sm:p-8 grid gap-6">
        <PublicBalanceCard
          balance={balance}
          currentStoreName={currentStore ? currentStore.name : "Store"}
          onChangeStore={(id) => setSelectedStoreId(id)}
          selectedStoreId={selectedStoreId}
        />

        {!user && <LoginCard onLogin={setUser} />}

        {user && (
          <>
            <TransactionForm
              currentUser={user}
              employees={EMPLOYEES.filter((e) => e.storeId === user.storeId)}
              onCreate={(tx) => setTransactions((prev) => [tx, ...prev])}
            />
            {isAdmin ? (
              <AdminTransactions
                transactions={transactions}
                storeOptions={storeOptions}
                defaultStoreId={user.storeId}
              />
            ) : (
              <StaffNotice />
            )}
          </>
        )}

        <Footer />
      </main>
    </div>
  );
}

function Header({ user, onLogout, balance, selectedStoreId, onStoreChange }) {
  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-black text-white grid place-items-center font-bold">
            $
          </div>
          <div>
            <h1 className="text-lg font-semibold">Safe Cash Tracker</h1>
            <p className="text-xs text-neutral-500">
              Multi‑store transparency & control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StoreSelect value={selectedStoreId} onChange={onStoreChange} />
          <span className="inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-sm">
            <span className="opacity-60">Cash in Safe:</span>
            <strong className="tabular-nums">${balance.toFixed(2)}</strong>
          </span>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 hidden sm:block">
                {user.name} <span className="opacity-50">·</span> {user.role}{" "}
                <span className="opacity-50">·</span>{" "}
                {STORES.find((s) => s.id === user.storeId)?.name}
              </span>
              <button
                onClick={onLogout}
                className="rounded-xl px-3 py-2 text-sm bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <span className="text-sm text-neutral-500">Not signed in</span>
          )}
        </div>
      </div>
    </header>
  );
}

function StoreSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border px-3 py-2 text-sm"
    >
      {STORES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function PublicBalanceCard({
  balance,
  currentStoreName,
  onChangeStore,
  selectedStoreId,
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Public Balance – {currentStoreName}
        </h2>
        <StoreSelect value={selectedStoreId} onChange={onChangeStore} />
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        Anyone can view the current cash in the selected store's safe.
        Transactions remain private to admins of each store.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <div className="rounded-xl border p-4 bg-neutral-50">
            <div className="text-sm opacity-60">Current Balance</div>
            <div className="text-3xl font-bold tabular-nums mt-1">
              ${balance.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-60">Notes</div>
          <ul className="text-sm mt-2 list-disc list-inside space-y-1">
            <li>Each store has its own ledger and balance</li>
            <li>Employees must select their name for every entry</li>
            <li>Admins can audit all transactions per store</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function LoginCard({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    const found = DEMO_USERS[email?.trim().toLowerCase()];
    if (!found || found.password !== password) {
      setError(
        "Invalid credentials. Try admin-a@store.com / admin123, staff-a1@store.com / staff123 (or store B variants)"
      );
      return;
    }
    onLogin(found.profile);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border p-5">
      <h2 className="text-base font-semibold">Employee Login</h2>
      <p className="text-sm text-neutral-500 mb-4">
        Sign in to add or withdraw cash for your store. Only admins can view the
        store ledger.
      </p>
      <form onSubmit={submit} className="grid gap-3 max-w-md">
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="rounded-xl border px-3 py-2"
            placeholder="you@store.com"
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="rounded-xl border px-3 py-2"
            placeholder="••••••••"
            required
          />
        </label>
        <div className="text-xs text-neutral-500 space-y-1">
          <div>
            Store A demo:{" "}
            <code className="bg-neutral-100 rounded px-2 py-1">
              admin-a@store.com / admin123
            </code>{" "}
            <code className="bg-neutral-100 rounded px-2 py-1">
              staff-a1@store.com / staff123
            </code>
          </div>
          <div>
            Store B demo:{" "}
            <code className="bg-neutral-100 rounded px-2 py-1">
              admin-b@store.com / admin123
            </code>{" "}
            <code className="bg-neutral-100 rounded px-2 py-1">
              staff-b1@store.com / staff123
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="rounded-xl px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
            Sign In
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </section>
  );
}

function TransactionForm({ currentUser, employees, onCreate }) {
  const [type, setType] = useState("ADD");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [employeeName, setEmployeeName] = useState(employees[0]?.name || "");
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  useEffect(() => {
    setEmployeeName(employees[0]?.name || "");
  }, [employees]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid positive amount");
      return;
    }
    if (!comment.trim()) {
      setError("Comment is required (what is this for?)");
      return;
    }
    if (!employeeName) {
      setError("Select the employee name responsible for this transaction");
      return;
    }

    const tx = {
      id: crypto.randomUUID(),
      storeId: currentUser.storeId,
      type,
      amount: Math.round(value * 100) / 100,
      comment: comment.trim(),
      employeeName,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString(),
    };

    onCreate(tx);
    setOk(
      `${type === "ADD" ? "Added" : "Withdrew"} $${tx.amount.toFixed(
        2
      )} for ${employeeName}.`
    );
    setAmount("");
    setComment("");
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border p-5">
      <h2 className="text-base font-semibold">
        Record a Transaction –{" "}
        {STORES.find((s) => s.id === currentUser.storeId)?.name}
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Every entry requires an employee name and a comment. Only admins can
        view the full ledger.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-3 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <Toggle
            options={[
              { label: "Add to Safe", value: "ADD" },
              { label: "Withdraw from Safe", value: "WITHDRAW" },
            ]}
            value={type}
            onChange={(v) => setType(v)}
          />
          <div className="text-xs text-neutral-500">
            Signed in as{" "}
            <span className="font-medium">{currentUser.email}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="grid gap-1 sm:col-span-1">
            <span className="text-sm">Amount (USD)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              className="rounded-xl border px-3 py-2"
              placeholder="0.00"
              required
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm">Comment (required)</span>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              type="text"
              className="rounded-xl border px-3 py-2"
              placeholder="e.g., Paid plumber, customer payout, added cash from register"
              required
            />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Employee responsible</span>
            <select
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="rounded-xl border px-3 py-2"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1">
            <span className="text-sm">Store</span>
            <input
              readOnly
              className="rounded-xl border px-3 py-2 bg-neutral-50"
              value={
                STORES.find((s) => s.id === currentUser.storeId)?.name ||
                "Unknown"
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-xl px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
            Save Transaction
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
          {ok && <span className="text-sm text-green-700">{ok}</span>}
        </div>
      </form>
    </section>
  );
}

function AdminTransactions({ transactions, storeOptions, defaultStoreId }) {
  const [storeId, setStoreId] = useState(defaultStoreId);
  const tx = useMemo(
    () => transactions.filter((t) => t.storeId === storeId),
    [transactions, storeId]
  );
  const balance = useMemo(
    () =>
      tx.reduce((acc, t) => acc + (t.type === "ADD" ? t.amount : -t.amount), 0),
    [tx]
  );

  return (
    <section className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Admin – Transactions Ledger</h2>
        <div className="flex items-center gap-3">
          <StoreSelect value={storeId} onChange={setStoreId} />
          <span className="text-sm text-neutral-600">
            Balance:{" "}
            <strong className="tabular-nums">${balance.toFixed(2)}</strong>
          </span>
        </div>
      </div>
      {tx.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No transactions yet for this store.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left px-4 py-2">When</th>
                <th className="text-left px-4 py-2">Store</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Employee</th>
                <th className="text-left px-4 py-2">Comment</th>
                <th className="text-left px-4 py-2">Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {storeOptions.find((s) => s.id === t.storeId)?.name}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={classNames(
                        "px-2 py-1 rounded-lg text-xs font-medium",
                        t.type === "ADD"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      )}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    ${t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{t.employeeName}</td>
                  <td
                    className="px-4 py-2 max-w-[32ch] truncate"
                    title={t.comment}
                  >
                    {t.comment}
                  </td>
                  <td className="px-4 py-2">{t.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-500 mt-3">
        Tip: In production, move writes to a server/Cloud Function so balances
        can’t be tampered with and access control is enforced per store.
      </p>
    </section>
  );
}

function StaffNotice() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border p-5">
      <h2 className="text-base font-semibold">Staff</h2>
      <p className="text-sm text-neutral-600">
        Thanks! Your entries update the balance for your store. Only admins can
        see the detailed ledger.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="text-xs text-neutral-500 text-center py-8">
      Prototype: multi‑store, employee‑attribution. Replace localStorage with a
      real backend for production.
    </footer>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border p-1 bg-neutral-50">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={classNames(
            "px-3 py-1.5 rounded-lg text-sm",
            value === o.value
              ? "bg-white border shadow-sm"
              : "opacity-70 hover:opacity-100"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
