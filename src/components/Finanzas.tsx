import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { Transaction, Budget } from "../db";
import {
  addTransaction,
  getTransactionsByMonth,
  deleteTransaction,
  getMonthlySummary,
  getCategories,
  setBudget,
  getBudgets,
} from "../db";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  Filler,
);

type Tab = "registrar" | "resumen" | "presupuestos";

const Finanzas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("registrar");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"ingreso" | "gasto">("gasto");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const categoriesList = [
    "Alimentos",
    "Transporte",
    "Vivienda",
    "Servicios",
    "Salud",
    "Educación",
    "Entretenimiento",
    "Ropa",
    "Tecnología",
    "Hogar",
    "Café",
    "Comidas fuera",
    "Supermercado",
    "Farmacia",
    "Gimnasio",
    "Suscripciones",
    "Viajes",
    "Regalos",
    "Ahorro",
    "Otros",
  ];

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [monthTransactions, monthlySummary, allCategories, monthBudgets] =
        await Promise.all([
          getTransactionsByMonth(selectedMonth),
          getMonthlySummary(selectedMonth),
          getCategories(),
          getBudgets(selectedMonth),
        ]);

      setTransactions(monthTransactions);
      setSummary(monthlySummary);
      setCategories(allCategories);
      setBudgets(monthBudgets);
    } catch (err) {
      setError("Error al cargar datos financieros");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) {
      setError("Completa los campos obligatorios");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const time = new Date().toLocaleTimeString();

      await addTransaction({
        type,
        category,
        amount: amountNum,
        description: description || category,
        date: today,
        time,
        notes: notes || undefined,
      });

      setCategory("");
      setAmount("");
      setDescription("");
      setNotes("");
      await loadData();
      setError(null);
    } catch (err) {
      setError("Error al agregar transacción");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Eliminar esta transacción?")) {
      try {
        await deleteTransaction(id);
        await loadData();
      } catch (err) {
        setError("Error al eliminar transacción");
        console.error(err);
      }
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategory || !budgetAmount) {
      setError("Completa todos los campos");
      return;
    }

    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido");
      return;
    }

    try {
      await setBudget(budgetCategory, amountNum, selectedMonth);
      setBudgetCategory("");
      setBudgetAmount("");
      await loadData();
      setError(null);
    } catch (err) {
      setError("Error al guardar presupuesto");
      console.error(err);
    }
  };

  const expensesChartData = {
    labels: Object.keys(summary?.expensesByCategory || {}),
    datasets: [
      {
        label: "Gastos por categoría",
        data: Object.values(summary?.expensesByCategory || {}),
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(199, 199, 199, 0.8)",
          "rgba(83, 102, 255, 0.8)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const balanceChartData = {
    labels: ["Ingresos", "Gastos", "Balance"],
    datasets: [
      {
        label: "Resumen mensual",
        data: [
          summary?.totalIncome || 0,
          summary?.totalExpenses || 0,
          summary?.balance || 0,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(59, 130, 246, 0.8)",
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(239, 68, 68)",
          "rgb(59, 130, 246)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + value;
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 10,
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">💰 Finanzas</h2>

      <div className="bg-white border-b border-gray-200 rounded-lg">
        <div className="flex">
          <button
            onClick={() => setActiveTab("registrar")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === "registrar"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📝 Registrar
          </button>
          <button
            onClick={() => setActiveTab("resumen")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === "resumen"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Resumen
          </button>
          <button
            onClick={() => setActiveTab("presupuestos")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === "presupuestos"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎯 Presupuestos
          </button>
        </div>
      </div>

      {activeTab === "registrar" && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Registrar transacción
          </h3>

          <form onSubmit={handleAddTransaction} className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("gasto")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  type === "gasto"
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                💸 Gasto
              </button>
              <button
                type="button"
                onClick={() => setType("ingreso")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  type === "ingreso"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                💰 Ingreso
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Monto</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$ 0.00"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Compras del supermercado"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar transacción
            </button>
          </form>

          {error && (
            <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}
        </div>
      )}

      {activeTab === "resumen" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm text-gray-600 mb-1">Mes</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-xl font-bold text-green-600">
                    ${summary?.totalIncome.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                  <p className="text-sm text-gray-500">Gastos</p>
                  <p className="text-xl font-bold text-red-600">
                    ${summary?.totalExpenses.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-4 text-center border ${
                    (summary?.balance || 0) >= 0
                      ? "bg-blue-50 border-blue-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <p className="text-sm text-gray-500">Balance</p>
                  <p
                    className={`text-xl font-bold ${
                      (summary?.balance || 0) >= 0
                        ? "text-blue-600"
                        : "text-orange-600"
                    }`}
                  >
                    ${summary?.balance.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(summary?.expensesByCategory || {}).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Gastos por categoría
                    </h4>
                    <div className="h-64">
                      <Doughnut
                        data={expensesChartData}
                        options={doughnutOptions}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Resumen mensual
                  </h4>
                  <div className="h-64">
                    <Bar data={balanceChartData} options={barOptions} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Transacciones del mes
                </h4>
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">
                    No hay transacciones este mes
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          t.type === "ingreso"
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-lg ${
                                t.type === "ingreso"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {t.type === "ingreso" ? "💰" : "💸"}
                            </span>
                            <span className="font-medium text-gray-800">
                              {t.category}
                            </span>
                            <span className="text-sm text-gray-500">
                              • {t.description}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {t.date} • {t.time}
                            {t.notes && ` • 📝 ${t.notes}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold ${
                              t.type === "ingreso"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {t.type === "ingreso" ? "+" : "-"}$
                            {t.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleDelete(t.id!)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "presupuestos" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Configurar presupuesto
            </h3>

            <form onSubmit={handleSetBudget} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Categoría
                </label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Presupuesto mensual
                </label>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="$ 0.00"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  step="0.01"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Guardar presupuesto
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="font-semibold text-gray-700 mb-3">
              Presupuestos del mes
            </h4>
            {budgets.length === 0 ? (
              <p className="text-center text-gray-400 py-4">
                No hay presupuestos configurados
              </p>
            ) : (
              <div className="space-y-3">
                {budgets.map((b) => {
                  const spent = summary?.expensesByCategory[b.category] || 0;
                  const percentage =
                    b.amount > 0 ? (spent / b.amount) * 100 : 0;
                  const isOverBudget = percentage > 100;

                  return (
                    <div key={b.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">
                          {b.category}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isOverBudget ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          ${spent.toFixed(2)} / ${b.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isOverBudget ? "bg-red-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(percentage)}% utilizado
                        {isOverBudget && " ⚠️ Excedido"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;
