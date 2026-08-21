// ---------- Cloud database (MantleDB) ----------
const NS = "adopt-cat-demo";
const KEY = "demo";
const API = (path) => `https://mantledb.sh/v2/${NS}/${path}`;
const ADMIN_PASSWORD_HASH = "2088290703";

const $ = (id) => document.getElementById(id);

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

async function loadDB() {
  try {
    const res = await fetch(API("db"), { headers: { "X-Mantle-Key": KEY } });
    const db = await res.json();
    return {
      users: db.users || [],
      requests: db.requests || [],
      cats: db.cats || [],
      notifications: db.notifications || [],
      virtualPets: db.virtualPets || {},
      donations: db.donations || [],
    };
  } catch (e) {
    console.error("Failed to load database", e);
    return { users: [], requests: [], cats: [], notifications: [], virtualPets: {}, donations: [] };
  }
}

async function saveDB(db) {
  try {
    await fetch(API("db"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Mantle-Key": KEY },
      body: JSON.stringify(db),
    });
  } catch (e) {
    console.error("Failed to save database", e);
  }
}

async function saveImage(catId, dataUrl) {
  await fetch(API(`img/${catId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Mantle-Key": KEY },
    body: JSON.stringify({ data: dataUrl }),
  });
}

async function loadImage(catId) {
  try {
    const res = await fetch(API(`img/${catId}`), { headers: { "X-Mantle-Key": KEY } });
    const img = await res.json();
    return img.data || "";
  } catch (e) {
    return "";
  }
}

async function deleteImage(catId) {
  await fetch(API(`img/${catId}`), { method: "DELETE", headers: { "X-Mantle-Key": KEY } });
}

// ---------- Admin auth ----------
function handleAdminLogin(e) {
  e.preventDefault();
  const value = $("admin-password").value;
  if (hash(value) === ADMIN_PASSWORD_HASH) {
    $("admin-password").value = "";
    $("admin-error").textContent = "";
    showDashboard();
  } else {
    $("admin-error").textContent = "Wrong password. Try again.";
  }
}

function showDashboard() {
  $("admin-login-view").classList.add("hidden");
  $("admin-dash-view").classList.remove("hidden");
  renderDashboard();
}

function showLogin() {
  $("admin-login-view").classList.remove("hidden");
  $("admin-dash-view").classList.add("hidden");
}

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function userPassword(users, username) {
  const u = users.find((x) => x.username === username);
  return u && u.pw ? u.pw : "-";
}

// ---------- Dashboard ----------
async function renderDashboard() {
  const db = await loadDB();

  $("stat-requests").textContent = db.requests.length;
  $("stat-users").textContent = db.users.length;
  $("stat-cats").textContent = db.cats.length;
  $("stat-donations").textContent = db.donations.length;
  $("stat-donated").textContent = "$" + db.donations.reduce((s, d) => s + Number(d.amount || 0), 0);

  await renderCatsTable(db);
  renderRequestsTable(db);
  renderUsersTable(db);
  renderDonationsTable(db);
}

// ---------- Manage cats ----------
async function renderCatsTable(db) {
  const body = $("cats-body");
  body.innerHTML = "";

  if (db.cats.length === 0) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted)">No cats yet. Add your first cat!</td></tr>`;
    return;
  }

  db.cats.forEach((cat) => {
    const tr = document.createElement("tr");

    const thumb = document.createElement("img");
    thumb.className = "cat-thumb";
    thumb.alt = cat.name;
    if (cat.imageKey) {
      loadImage(cat.id).then((dataUrl) => {
        if (dataUrl) thumb.src = dataUrl;
      });
    } else {
      thumb.src = cat.image;
    }

    const tdThumb = document.createElement("td");
    tdThumb.appendChild(thumb);

    tr.innerHTML = `
      <td>${cat.id}</td>
      <td>${cat.name}</td>
      <td>${escapeHTML(cat.type)}</td>
      <td>${escapeHTML(cat.colour)}</td>
      <td>${cat.age}</td>
      <td>${cat.gender}</td>`;

    const tdRemove = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "del-btn edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditCatModal(cat.id));
    const btn = document.createElement("button");
    btn.className = "del-btn";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => removeCat(cat.id, cat.name));
    tdRemove.appendChild(editBtn);
    tdRemove.appendChild(btn);

    tr.insertBefore(tdThumb, tr.children[1]);
    tr.appendChild(tdRemove);
    body.appendChild(tr);
  });
}

async function removeCat(catId, catName) {
  if (!confirm(`Remove ${catName} from the cat selection?`)) return;
  const db = await loadDB();
  const cat = db.cats.find((c) => c.id === catId);
  if (!cat) return;

  db.cats = db.cats.filter((c) => c.id !== catId);
  await saveDB(db);
  if (cat.imageKey) await deleteImage(catId);
  renderDashboard();
}

// ---------- Add cat ----------
function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const maxH = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = (h * maxW) / w;
          w = maxW;
        }
        if (h > maxH) {
          w = (w * maxH) / h;
          h = maxH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openAddCatModal() {
  $("add-cat-form").reset();
  $("cat-photo-preview").classList.add("hidden");
  $("cat-photo-label").textContent = "Click to upload a photo of the cat";
  $("add-cat-error").textContent = "";
  $("add-cat-modal").classList.remove("hidden");
}

function closeAddCatModal() {
  $("add-cat-modal").classList.add("hidden");
}

async function handleAddCat(e) {
  e.preventDefault();

  const fileInput = $("cat-photo");
  if (!fileInput.files || !fileInput.files[0]) {
    $("add-cat-error").textContent = "Please upload a photo of the cat.";
    return;
  }

  const name = $("cat-name").value.trim();
  const type = $("cat-type").value.trim();
  const colour = $("cat-colour").value.trim();
  const age = Number($("cat-age").value);
  const gender = $("cat-gender").value;
  const about = $("cat-about").value.trim();

  if (!name || !type || !colour || isNaN(age) || !gender || !about) {
    $("add-cat-error").textContent = "Please fill in all the details.";
    return;
  }

  $("add-cat-error").textContent = "Adding cat...";

  const db = await loadDB();
  const nextId = db.cats.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0) + 1;
  const cat = {
    id: nextId,
    name,
    type,
    colour,
    age,
    gender,
    about,
    imageKey: String(nextId),
  };
  db.cats.push(cat);
  const imageData = await resizeImage(fileInput.files[0]);
  await saveImage(cat.id, imageData);
  await saveDB(db);
  $("add-cat-error").textContent = "";
  closeAddCatModal();
  renderDashboard();
}

// ---------- Edit cat ----------
async function openEditCatModal(catId) {
  const db = await loadDB();
  const cat = db.cats.find((c) => c.id === catId);
  if (!cat) return;

  $("edit-cat-id").value = cat.id;
  $("edit-cat-name").value = cat.name || "";
  $("edit-cat-type").value = cat.type || "";
  $("edit-cat-colour").value = cat.colour || "";
  $("edit-cat-age").value = cat.age || "";
  $("edit-cat-gender").value = cat.gender || "";
  $("edit-cat-about").value = cat.about || "";

  $("edit-cat-photo-preview").classList.add("hidden");
  $("edit-cat-photo").value = "";
  $("edit-cat-photo-label").textContent = "Click to upload a new photo (optional)";
  $("edit-cat-error").textContent = "";
  $("edit-cat-modal").classList.remove("hidden");
}

function closeEditCatModal() {
  $("edit-cat-modal").classList.add("hidden");
}

async function handleEditCat(e) {
  e.preventDefault();

  const id = Number($("edit-cat-id").value);
  const name = $("edit-cat-name").value.trim();
  const type = $("edit-cat-type").value.trim();
  const colour = $("edit-cat-colour").value.trim();
  const age = Number($("edit-cat-age").value);
  const gender = $("edit-cat-gender").value;
  const about = $("edit-cat-about").value.trim();

  if (!name || !type || !colour || isNaN(age) || !gender || !about) {
    $("edit-cat-error").textContent = "Please fill in all the details.";
    return;
  }

  $("edit-cat-error").textContent = "Saving...";

  const db = await loadDB();
  const cat = db.cats.find((c) => c.id === id);
  if (!cat) return;

  cat.name = name;
  cat.type = type;
  cat.colour = colour;
  cat.age = age;
  cat.gender = gender;
  cat.about = about;

  const fileInput = $("edit-cat-photo");
  if (fileInput.files && fileInput.files[0]) {
    const imageData = await resizeImage(fileInput.files[0]);
    await saveImage(id, imageData);
    cat.imageKey = String(id);
  }

  await saveDB(db);
  $("edit-cat-error").textContent = "";
  closeEditCatModal();
  renderDashboard();
}

// ---------- Requests ----------
function renderRequestsTable(db) {
  const body = $("requests-body");
  body.innerHTML = "";
  const sorted = db.requests
    .filter((r) => r.status !== "Sent")
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    body.innerHTML = `<tr><td colspan="12" style="text-align:center;color:var(--muted)">No adoption requests yet.</td></tr>`;
  } else {
    sorted.forEach((r) => {
      const tr = document.createElement("tr");
      const date = new Date(r.date).toLocaleString();
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${escapeHTML(date)}</td>
        <td>${escapeHTML(r.applicantName || "")} (${escapeHTML(userPassword(db.users, r.username))})</td>
        <td>${escapeHTML(r.catName)}</td>
        <td>${escapeHTML(r.fullName)}</td>
        <td>${escapeHTML(r.phone)}</td>
        <td>${escapeHTML(r.email)}</td>
        <td>${escapeHTML(r.address)}</td>
        <td>${escapeHTML(r.reason)}</td>
        <td>${escapeHTML(String(r.pets).replace(/\b\w/g, (c) => c.toUpperCase()))}</td>
        <td><span class="admin-badge">${escapeHTML(r.status)}</span></td>
        <td>
          ${r.status === "Pending review"
            ? `<button class="del-btn send-btn" data-id="${r.id}">Send</button>`
            : ""}
          <button class="del-btn cancel-btn" data-id="${r.id}">Cancel</button>
        </td>`;
      if (r.status === "Pending review") {
        tr.querySelector(".send-btn").addEventListener("click", () => sendCatRequest(r));
      }
      tr.querySelector(".cancel-btn").addEventListener("click", () => cancelRequest(r));
      body.appendChild(tr);
    });
  }
}

// ---------- Cancel request ----------
async function cancelRequest(r) {
  if (!confirm(`Cancel the adoption request for ${r.catName} by ${r.fullName}?\n\nThe customer will be notified and the cat will return to the selection.`)) return;

  const db = await loadDB();
  const req = db.requests.find((x) => x.id === r.id);
  if (!req) return;

  db.requests = db.requests.filter((x) => x.id !== r.id);

  if (req.cat && !db.cats.some((c) => c.id === req.cat.id)) {
    db.cats.push(req.cat);
  }

  db.notifications = db.notifications || [];
  db.notifications.push({
    id: Date.now(),
    username: req.username,
    catName: req.catName,
    message: `Your adoption request for ${req.catName} was cancelled by our team. The cat is available to adopt again.`,
    date: new Date().toISOString(),
    read: false,
  });

  await saveDB(db);
  renderDashboard();
}

// ---------- Send cat ----------
async function sendCatRequest(r) {
  if (!confirm(`Mark ${r.catName} as sent?\n\nThe customer (${r.fullName}) will be notified that the cat is on the way.`)) return;

  const db = await loadDB();
  const req = db.requests.find((x) => x.id === r.id);
  if (!req) return;

  req.status = "Sent";

  db.notifications = db.notifications || [];
  db.notifications.push({
    id: Date.now(),
    username: req.username,
    catName: req.catName,
    message: `Great news! ${req.catName} is on the way. Your adoption request has been sent and your new cat will arrive soon.`,
    date: new Date().toISOString(),
    read: false,
  });

  await saveDB(db);
  renderDashboard();
}

// ---------- Donations ----------
function renderDonationsTable(db) {
  const body = $("donations-body");
  if (!body) return;
  body.innerHTML = "";
  const sorted = db.donations.slice().sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted)">No donations yet.</td></tr>`;
    return;
  }

  sorted.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(d.name || "")}</td>
      <td>${escapeHTML(userPassword(db.users, d.username))}</td>
      <td>$${escapeHTML(String(d.amount))}</td>
      <td>${escapeHTML(d.bankName || "")}</td>
      <td>${escapeHTML(d.bank || "")}</td>
      <td>${escapeHTML(new Date(d.date).toLocaleString())}</td>
      <td><button class="del-btn" data-id="${d.id}">Remove</button></td>`;
    tr.querySelector(".del-btn").addEventListener("click", () => removeDonation(d.id));
    body.appendChild(tr);
  });
}

async function removeDonation(id) {
  if (!confirm("Remove this donation record?")) return;
  const db = await loadDB();
  db.donations = db.donations.filter((d) => d.id !== id);
  await saveDB(db);
  renderDashboard();
}

// ---------- Users ----------
function renderUsersTable(db) {
  const body = $("users-body");
  body.innerHTML = "";
  if (db.users.length === 0) {
    body.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted)">No registered users yet.</td></tr>`;
  } else {
    db.users.slice().sort((a, b) => a.username.localeCompare(b.username)).forEach((u) => {
      const tr = document.createElement("tr");
      const created = u.created ? new Date(u.created).toLocaleString() : "-";
      tr.innerHTML = `
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.pw || "-")}</td>
        <td>${escapeHTML(created)}</td>`;
      body.appendChild(tr);
    });
  }
}

// ---------- Init ----------
function init() {
  $("admin-login-form").addEventListener("submit", handleAdminLogin);
  $("admin-refresh").addEventListener("click", renderDashboard);
  $("admin-logout").addEventListener("click", () => {
    $("admin-password").value = "";
    $("admin-error").textContent = "";
    showLogin();
  });

  $("add-cat-btn").addEventListener("click", openAddCatModal);
  $("add-cat-close").addEventListener("click", closeAddCatModal);
  $("add-cat-modal").addEventListener("click", (e) => {
    if (e.target === $("add-cat-modal")) closeAddCatModal();
  });
  $("add-cat-form").addEventListener("submit", handleAddCat);

  $("cat-photo").addEventListener("change", () => {
    const file = $("cat-photo").files[0];
    const label = $("cat-photo-label");
    const preview = $("cat-photo-preview");
    if (file) {
      label.textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      label.textContent = "Click to upload a photo of the cat";
      preview.classList.add("hidden");
    }
  });

  $("edit-cat-close").addEventListener("click", closeEditCatModal);
  $("edit-cat-modal").addEventListener("click", (e) => {
    if (e.target === $("edit-cat-modal")) closeEditCatModal();
  });
  $("edit-cat-form").addEventListener("submit", handleEditCat);
  $("edit-cat-photo").addEventListener("change", () => {
    const file = $("edit-cat-photo").files[0];
    const label = $("edit-cat-photo-label");
    const preview = $("edit-cat-photo-preview");
    if (file) {
      label.textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      label.textContent = "Click to upload a new photo (optional)";
      preview.classList.add("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
