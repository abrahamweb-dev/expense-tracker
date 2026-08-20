const SUPABASE_URL = "https://dkbelrbqlhoeypcevfpd.supabase.co";
const SUPABASE_KEY = "sb_publishable_gN4EcKgUMpj_DGtxe7242w_U8dw2ySQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORY_META = {
  Food:          { icon: "🍔", color: "#e63946" },
  Transport:     { icon: "🚌", color: "#4cc9f0" },
  Housing:       { icon: "🏠", color: "#f4a261" },
  Entertainment: { icon: "🎬", color: "#9d4edd" },
  Health:        { icon: "💊", color: "#2ecc71" },
  Other:         { icon: "📦", color: "#888888" }
};

const expenseForm = document.getElementById("expenseForm");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("expenseDate");
const noteInput = document.getElementById("note");
const filterCategory = document.getElementById("filterCategory");
const sortOrder = document.getElementById("sortOrder");

const expenseListEl = document.getElementById("expenseList");
const emptyStateEl = document.getElementById("emptyState");
const loadingStateEl = document.getElementById("loadingState");
const totalAmountEl = document.getElementById("totalAmount");
const breakdownSection = document.getElementById("breakdownSection");
const chartLegend = document.getElementById("chartLegend");

let allExpenses = [];
let categoryChart = null;

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.Other;
}

function sortExpenses(list) {
  const sorted = [...list];

  switch (sortOrder.value) {
    case "oldest":
      sorted.sort(
        (a, b) =>
          new Date(a.expense_date) - new Date(b.expense_date)
      );
      break;

    case "highest":
      sorted.sort(
        (a, b) => Number(b.amount) - Number(a.amount)
      );
      break;

    case "lowest":
      sorted.sort(
        (a, b) => Number(a.amount) - Number(b.amount)
      );
      break;

    default:
      sorted.sort(
        (a, b) =>
          new Date(b.expense_date) - new Date(a.expense_date)
      );
  }

  return sorted;
}

function renderExpenses() {
  const filter = filterCategory.value;

  let filtered =
    filter === "all"
      ? allExpenses
      : allExpenses.filter(e => e.category === filter);

  filtered = sortExpenses(filtered);

  expenseListEl.innerHTML = "";

  emptyStateEl.style.display =
    filtered.length === 0 ? "block" : "none";

  filtered.forEach(expense => {
    const meta = getMeta(expense.category);

    const item = document.createElement("div");

    item.className = "expense-item";
    item.style.borderLeftColor = meta.color;

    item.innerHTML = `
      <div class="expense-left">
        <div
          class="expense-icon"
          style="background:${meta.color}22; color:${meta.color};"
        >
          ${meta.icon}
        </div>

        <div class="expense-info">
          <span class="expense-category">
            ${expense.category}
          </span>

          <span class="expense-note">
            ${expense.note ? expense.note : ""}
          </span>

          <span class="expense-date">
            ${formatDate(expense.expense_date)}
          </span>
        </div>
      </div>

      <div class="expense-right">
        <span class="expense-amount">
          $${Number(expense.amount).toFixed(2)}
        </span>

        <button
          class="btn-delete"
          data-id="${expense.id}"
        >
          ✕
        </button>
      </div>
    `;

    expenseListEl.appendChild(item);
  });

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteExpense(btn.dataset.id);
    });
  });

  updateTotal(filtered);
  updateBreakdown(allExpenses);
}

function updateTotal(list) {
  const total = list.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  totalAmountEl.textContent = `$${total.toFixed(2)}`;

  totalAmountEl.classList.add("pulse");

  setTimeout(() => {
    totalAmountEl.classList.remove("pulse");
  }, 250);
}

function updateBreakdown(list) {
  if (list.length === 0) {
    breakdownSection.style.display = "none";
    return;
  }

  breakdownSection.style.display = "block";

  const totalsByCategory = {};

  list.forEach(e => {
    totalsByCategory[e.category] =
      (totalsByCategory[e.category] || 0) +
      Number(e.amount);
  });

  const labels = Object.keys(totalsByCategory);

  const values = labels.map(
    l => totalsByCategory[l]
  );

  const colors = labels.map(
    l => getMeta(l).color
  );

  chartLegend.innerHTML = "";

  labels.forEach((label, i) => {
    const row = document.createElement("div");

    row.className = "legend-item";

    row.innerHTML = `
      <div class="legend-left">
        <span
          class="legend-dot"
          style="background:${colors[i]}"
        ></span>

        <span>
          ${getMeta(label).icon} ${label}
        </span>
      </div>

      <span class="legend-amount">
        $${values[i].toFixed(2)}
      </span>
    `;

    chartLegend.appendChild(row);
  });

  const ctx =
    document
      .getElementById("categoryChart")
      .getContext("2d");

  if (categoryChart) {
    categoryChart.data.labels = labels;

    categoryChart.data.datasets[0].data =
      values;

    categoryChart.data.datasets[0].backgroundColor =
      colors;

    categoryChart.update();

  } else {

    categoryChart = new Chart(ctx, {
      type: "doughnut",

      data: {
        labels: labels,

        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "#1a1a1a",
          borderWidth: 3
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "68%",

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            callbacks: {
              label: context =>
                `$${context.parsed.toFixed(2)}`
            }
          }
        }
      }
    });
  }
}

async function fetchExpenses() {
  loadingStateEl.style.display = "block";
  expenseListEl.style.display = "none";

  const { data, error } =
    await supabaseClient
      .from("expenses")
      .select("*")
      .order("expense_date", {
        ascending: false
      });

  loadingStateEl.style.display = "none";
  expenseListEl.style.display = "block";

  if (error) {
    console.error(
      "Error fetching expenses:",
      error
    );
    return;
  }

  allExpenses = data;

  renderExpenses();
}

async function addExpense(expense) {
  const { error } =
    await supabaseClient
      .from("expenses")
      .insert([expense]);

  if (error) {
    console.error(
      "Error adding expense:",
      error
    );

    alert(
      "Couldn't add expense — try again."
    );

    return false;
  }

  return true;
}

async function deleteExpense(id) {
  const { error } =
    await supabaseClient
      .from("expenses")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(
      "Error deleting expense:",
      error
    );

    alert(
      "Couldn't delete expense — try again."
    );

    return;
  }

  await fetchExpenses();
}

expenseForm.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const newExpense = {
      amount: parseFloat(amountInput.value),
      category: categoryInput.value,
      expense_date: dateInput.value,
      note:
        noteInput.value.trim() || null
    };

    const success =
      await addExpense(newExpense);

    if (success) {
      expenseForm.reset();
      await fetchExpenses();
    }
  }
);

filterCategory.addEventListener(
  "change",
  renderExpenses
);

sortOrder.addEventListener(
  "change",
  renderExpenses
);

fetchExpenses();
