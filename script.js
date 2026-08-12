const SUPABASE_URL = "https://dkbelrbqlhoeypcevfpd.supabase.co";
const SUPABASE_KEY = "sb_publishable_gN4EcKgUMpj_DGtxe7242w_U8dw2ySQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const expenseForm = document.getElementById("expenseForm");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("expenseDate");
const noteInput = document.getElementById("note");
const filterCategory = document.getElementById("filterCategory");

const expenseListEl = document.getElementById("expenseList");
const emptyStateEl = document.getElementById("emptyState");
const totalAmountEl = document.getElementById("totalAmount");

let allExpenses = [];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderExpenses() {
  const filter = filterCategory.value;
  const filtered = filter === "all"
    ? allExpenses
    : allExpenses.filter(e => e.category === filter);

  expenseListEl.innerHTML = "";

  if (filtered.length === 0) {
    emptyStateEl.style.display = "block";
  } else {
    emptyStateEl.style.display = "none";
  }

  filtered.forEach(expense => {
    const item = document.createElement("div");
    item.className = "expense-item";
    item.dataset.category = expense.category;

    item.innerHTML = `
      <div class="expense-info">
        <span class="expense-category">${expense.category}</span>
        <span class="expense-note">${expense.note ? expense.note : ""}</span>
        <span class="expense-date">${formatDate(expense.expense_date)}</span>
      </div>
      <div class="expense-right">
        <span class="expense-amount">$${Number(expense.amount).toFixed(2)}</span>
        <button class="btn-delete" data-id="${expense.id}">✕</button>
      </div>
    `;

    expenseListEl.appendChild(item);
  });

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
  });

  updateTotal(filtered);
}

function updateTotal(list) {
  const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
  totalAmountEl.textContent = `$${total.toFixed(2)}`;
}

async function fetchExpenses() {
  const { data, error } = await supabaseClient
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return;
  }

  allExpenses = data;
  renderExpenses();
}

async function addExpense(expense) {
  const { error } = await supabaseClient
    .from("expenses")
    .insert([expense]);

  if (error) {
    console.error("Error adding expense:", error);
    alert("Couldn't add expense — try again.");
    return false;
  }
  return true;
}

async function deleteExpense(id) {
  const { error } = await supabaseClient
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    alert("Couldn't delete expense — try again.");
    return;
  }

  await fetchExpenses();
}

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newExpense = {
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    expense_date: dateInput.value,
    note: noteInput.value.trim() || null
  };

  const success = await addExpense(newExpense);

  if (success) {
    expenseForm.reset();
    await fetchExpenses();
  }
});

filterCategory.addEventListener("change", renderExpenses);

fetchExpenses();