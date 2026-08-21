// ---------- Cloud database (MantleDB) ----------
// All users, requests and cats are stored here, shared across every browser.
const NS = "adopt-cat-demo";
const KEY = "demo";
const SESSION_KEY = "cat_session";
const API = (path) => `https://mantledb.sh/v2/${NS}/${path}`;

async function loadDB() {
  try {
    const res = await fetch(API("db"), { headers: { "X-Mantle-Key": KEY } });
    const db = await res.json();
    return {
      users: db.users || [],
      requests: db.requests || [],
      cats: db.cats,
      notifications: db.notifications || [],
      virtualPets: db.virtualPets || {},
      donations: db.donations || [],
    };
  } catch (e) {
    console.error("Failed to load database", e);
    return { users: [], requests: [], cats: undefined, notifications: [], virtualPets: {}, donations: [] };
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

async function loadImage(catId) {
  try {
    const res = await fetch(API(`img/${catId}`), { headers: { "X-Mantle-Key": KEY } });
    const img = await res.json();
    return img.data || "";
  } catch (e) {
    return "";
  }
}

// ---------- Session helpers (local, per browser) ----------
function readSession() {
  return localStorage.getItem(SESSION_KEY);
}

function writeSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

// ---------- Simple password hash (demo only, not real security) ----------
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

// ---------- Built-in seed cats (local images) ----------
const SEED_CATS = [
  { id: 1, name: "Milo", type: "Domestic Shorthair", colour: "Orange", age: 2, gender: "male", image: "images/cat1.jpg", about: "Playful and friendly. Loves belly rubs and chasing toy mice." },
  { id: 2, name: "Luna", type: "Siamese", colour: "Cream", age: 1, gender: "female", image: "images/cat2.jpg", about: "Sweet and chatty. Will tell you all about her day." },
  { id: 3, name: "Oliver", type: "British Shorthair", colour: "Grey", age: 4, gender: "male", image: "images/cat3.jpg", about: "Calm and gentle. Perfect couch companion." },
  { id: 4, name: "Bella", type: "Persian", colour: "White", age: 6, gender: "female", image: "images/cat4.jpg", about: "Quiet and elegant. Enjoys being brushed." },
  { id: 5, name: "Simba", type: "Maine Coon", colour: "Brown", age: 3, gender: "male", image: "images/cat5.jpg", about: "Big and fluffy. A gentle giant who loves attention." },
  { id: 6, name: "Chloe", type: "Ragdoll", colour: "Cream", age: 2, gender: "female", image: "images/cat6.jpg", about: "Goes limp when held. Very affectionate." },
  { id: 7, name: "Shadow", type: "Domestic Shorthair", colour: "Black", age: 8, gender: "male", image: "images/cat7.jpg", about: "A senior gentleman looking for a quiet home." },
  { id: 8, name: "Daisy", type: "Calico", colour: "Calico", age: 1, gender: "female", image: "images/cat8.jpg", about: "Energetic kitten who loves to play." },
  { id: 9, name: "Whiskers", type: "Tabby", colour: "Tabby", age: 5, gender: "male", image: "images/cat9.jpg", about: "Independent but loyal once he trusts you." },
  { id: 10, name: "Mittens", type: "Tuxedo", colour: "Black & White", age: 3, gender: "female", image: "images/cat10.jpg", about: "Clever and curious. Loves exploring high shelves." },
  { id: 11, name: "Pepper", type: "Domestic Shorthair", colour: "Black", age: 1, gender: "male", image: "images/cat11.jpg", about: "A little pepper with lots of energy." },
  { id: 12, name: "Mochi", type: "Siamese", colour: "Chocolate", age: 9, gender: "female", image: "images/cat12.jpg", about: "Sweet senior who wants a warm lap to nap on." },
  { id: 13, name: "Oreo", type: "Tuxedo", colour: "Black & White", age: 2, gender: "male", image: "images/cat13.jpg", about: "A cheeky little explorer who loves treats." },
  { id: 14, name: "Nala", type: "Tabby", colour: "Orange", age: 4, gender: "female", image: "images/cat14.jpg", about: "A relaxed girl who enjoys sunny windowsills." },
  { id: 15, name: "Ginger", type: "Domestic Longhair", colour: "Orange", age: 7, gender: "male", image: "images/cat15.jpg", about: "Fluffy and laid back. A great lap warmer." },
  { id: 16, name: "Poppy", type: "Calico", colour: "Calico", age: 2, gender: "female", image: "images/cat16.jpg", about: "Full of energy and always up for a game." },
];

// ---------- Element shortcuts ----------
const $ = (id) => document.getElementById(id);

// ---------- App state ----------
let cats = [];
let currentUser = null;
let ADOPTED = new Set();
let notifications = [];

function ageGroup(age) {
  if (age < 1) return "kitten";
  if (age <= 7) return "adult";
  return "senior";
}

function ageLabel(age) {
  return age + (age === 1 ? " year" : " years");
}

// ---------- Populate filter options ----------
function initFilters() {
  const typeSelect = $("filter-type");
  const colourSelect = $("filter-colour");
  typeSelect.innerHTML = '<option value="all">All types</option>';
  colourSelect.innerHTML = '<option value="all">All colours</option>';

  const types = [...new Set(cats.map((c) => c.type))].sort();
  const colours = [...new Set(cats.map((c) => c.colour))].sort();

  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  colours.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    colourSelect.appendChild(opt);
  });
}

// ---------- Filtering ----------
function applyFilters() {
  const type = $("filter-type").value;
  const colour = $("filter-colour").value;
  const age = $("filter-age").value;
  const gender = $("filter-gender").value;

  const results = cats.filter((cat) => {
    if (ADOPTED.has(cat.id)) return false;
    if (type !== "all" && cat.type !== type) return false;
    if (colour !== "all" && cat.colour !== colour) return false;
    if (age !== "all" && ageGroup(cat.age) !== age) return false;
    if (gender !== "all" && cat.gender !== gender) return false;
    return true;
  });

  renderCats(results);
}

function renderCats(list) {
  const grid = $("cat-list");
  grid.innerHTML = "";

  if (list.length === 0) {
    $("no-results").classList.remove("hidden");
    return;
  }
  $("no-results").classList.add("hidden");

  list.forEach((cat, index) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.animationDelay = (index * 70) + "ms";
    card.innerHTML = `
      <div class="cat-art"><img class="cat-img" alt="${cat.name} the ${cat.type}" loading="lazy"></div>
      <div class="cat-body">
        <div class="cat-name">${cat.name}</div>
        <div class="cat-meta">
          <span class="badge">${cat.type}</span>
          <span class="badge">${cat.colour}</span>
          <span class="badge age">${ageLabel(cat.age)}</span>
          <span class="badge gender">${cat.gender[0].toUpperCase() + cat.gender.slice(1)}</span>
        </div>
        <p class="cat-about">${cat.about}</p>
        <button class="btn btn-primary adopt-btn" data-id="${cat.id}">Adopt Me</button>
      </div>`;

    const img = card.querySelector(".cat-img");
    if (cat.imageKey) {
      loadImage(cat.id).then((dataUrl) => {
        if (dataUrl) img.src = dataUrl;
      });
    } else {
      img.src = cat.image;
    }

    card.querySelector(".adopt-btn").addEventListener("click", () => openAdoptModal(cat.id));
    grid.appendChild(card);
  });
}

// ---------- Auth UI ----------
function switchTab(tab) {
  $("tab-login").classList.toggle("active", tab === "login");
  $("tab-register").classList.toggle("active", tab === "register");
  $("login-form").classList.toggle("hidden", tab !== "login");
  $("register-form").classList.toggle("hidden", tab !== "register");
  $("auth-error").textContent = "";
}

function setError(msg) {
  $("auth-error").textContent = msg;
}

// ---------- Login / Register ----------
async function handleLogin(e) {
  e.preventDefault();
  const username = $("login-username").value.trim();
  const password = $("login-password").value;

  const db = await loadDB();
  const user = db.users.find((u) => u.username === username.toLowerCase());
  if (!user) return setError("No account found with that username.");
  if (user.passwordHash !== hash(password)) return setError("Wrong password. Try again.");

  startSession(user);
}

async function handleRegister(e) {
  e.preventDefault();
  const username = $("reg-username").value.trim();
  const password = $("reg-password").value;

  if (username.length < 3) return setError("Username must be at least 3 characters.");
  if (password.length < 4) return setError("Password must be at least 4 characters.");

  const db = await loadDB();
  const key = username.toLowerCase();
  if (db.users.some((u) => u.username === key)) return setError("That username is already taken.");

  const user = { username: key, name: username, pw: password, passwordHash: hash(password), created: new Date().toISOString() };
  db.users.push(user);
  await saveDB(db);
  startSession(user);
}

function startSession(user) {
  currentUser = user;
  writeSession(user.username);
  $("user-name").textContent = user.name;
  $("auth-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  switchView("catalog");
  loadNotifications();
  startNotificationPolling();
  loadPet().then(() => {
    renderPet();
    startPetLoop();
  });
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  stopNotificationPolling();
  stopPetLoop();
  pet = null;
  $("notif-panel").classList.add("hidden");
  $("app-view").classList.add("hidden");
  $("auth-view").classList.remove("hidden");
  $("login-form").reset();
  $("register-form").reset();
  switchTab("login");
}

// ---------- View switching ----------
async function switchView(view) {
  $("catalog-view").classList.toggle("hidden", view !== "catalog");
  $("donation-view").classList.toggle("hidden", view !== "donation");
  $("requests-view").classList.toggle("hidden", view !== "requests");
  $("about-view").classList.toggle("hidden", view !== "about");
  $("help-view").classList.toggle("hidden", view !== "help");
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  if (view === "requests") await renderMyRequests();
  if (view === "donation") await syncPetView();
}

// ---------- Adoption modal ----------
let selectedCat = null;

function openAdoptModal(catId) {
  selectedCat = cats.find((c) => c.id === catId);
  if (!selectedCat) return;

  $("adopt-cat-name").textContent = selectedCat.name;
  $("adopt-cat-detail").textContent =
    `${selectedCat.type} | ${selectedCat.colour} | ${ageLabel(selectedCat.age)} | ${selectedCat.gender}`;
  $("adopt-agree-cat").textContent = selectedCat.name;
  $("adopt-error").textContent = "";
  $("adopt-form").reset();
  $("adopt-modal").classList.remove("hidden");
}

function closeAdoptModal() {
  $("adopt-modal").classList.add("hidden");
  selectedCat = null;
}

async function submitAdoption(e) {
  e.preventDefault();

  const fullName = $("adopt-fullname").value.trim();
  const phone = $("adopt-phone").value.trim();
  const email = $("adopt-email").value.trim();
  const address = $("adopt-address").value.trim();
  const reason = $("adopt-reason").value.trim();
  const pets = $("adopt-pets").value;
  const agree = $("adopt-agree").checked;

  if (!agree) {
    $("adopt-error").textContent = "Please tick the box to confirm you will keep the cat safe.";
    return;
  }
  if (pets === "") {
    $("adopt-error").textContent = "Please tell us about other pets in your home.";
    return;
  }

  const db = await loadDB();
  const request = {
    id: Date.now(),
    username: currentUser.username,
    applicantName: currentUser.name,
    catId: selectedCat.id,
    catName: selectedCat.name,
    cat: { ...selectedCat },
    fullName,
    phone,
    email,
    address,
    reason,
    pets,
    date: new Date().toISOString(),
    status: "Pending review",
  };
  db.requests.push(request);
  db.cats = db.cats.filter((c) => c.id !== selectedCat.id);
  await saveDB(db);

  ADOPTED.add(selectedCat.id);
  cats = db.cats;
  $("hero-count").textContent = cats.filter((c) => !ADOPTED.has(c.id)).length;
  $("success-cat").textContent = selectedCat.name;
  closeAdoptModal();
  $("success-modal").classList.remove("hidden");
  applyFilters();
}

// ---------- Requests ----------
function requestCardHTML(r) {
  const date = new Date(r.date).toLocaleString();
  const pets = String(r.pets).replace(/\b\w/g, (c) => c.toUpperCase());
  return `
    <h3>Adoption request for <span class="req-cat">${r.catName}</span></h3>
    <div class="req-meta">
      Applicant: ${r.fullName} &middot; Phone: ${r.phone} &middot; Email: ${r.email}<br>
      Address: ${r.address}<br>
      Reason: ${r.reason}<br>
      Other pets: ${pets}
    </div>
    <div class="req-date">Submitted: ${date}</div>
    <span class="req-status">${r.status}</span>`;
}

async function renderMyRequests() {
  const list = $("requests-list");
  const db = await loadDB();
  const requests = db.requests
    .filter((r) => r.username === currentUser.username && r.status !== "Sent")
    .sort((a, b) => b.date.localeCompare(a.date));

  if (requests.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <p>You have not submitted any adoption requests yet.</p>
      <p>Browse the cats and adopt your new friend!</p>
    </div>`;
    return;
  }

  list.innerHTML = "";
  requests.forEach((r) => {
    const card = document.createElement("div");
    card.className = "request-card";
    card.innerHTML = requestCardHTML(r);
    list.appendChild(card);
  });
}

// ---------- Notifications ----------
let seenNotifIds = new Set();
let notifTimer = null;

async function loadNotifications() {
  if (!currentUser) return;
  const db = await loadDB();
  notifications = (db.notifications || []).filter((n) => n.username === currentUser.username);
  seenNotifIds = new Set(notifications.map((n) => n.id));
  updateBell();

  const unread = notifications.filter((n) => !n.read).length;
  if (unread > 0) showToast(`${unread} new notification${unread === 1 ? "" : "s"}`);
}

function startNotificationPolling() {
  stopNotificationPolling();
  notifTimer = setInterval(pollNotifications, 15000);
}

function stopNotificationPolling() {
  if (notifTimer) {
    clearInterval(notifTimer);
    notifTimer = null;
  }
}

async function pollNotifications() {
  if (!currentUser) return;
  const db = await loadDB();
  const mine = (db.notifications || []).filter((n) => n.username === currentUser.username);
  const fresh = mine.filter((n) => !n.read && !seenNotifIds.has(n.id));

  notifications = mine;
  updateBell();
  if (!$("notif-panel").classList.contains("hidden")) renderNotifications();

  if (fresh.length > 0) {
    fresh.forEach((n) => seenNotifIds.add(n.id));
    if (fresh.length === 1) {
      showToast(fresh[0].message);
    } else {
      showToast(`${fresh.length} new notifications: ${fresh.map((n) => n.catName).join(", ")}`);
    }
  }
}

function updateBell() {
  const unread = notifications.filter((n) => !n.read).length;
  const badge = $("bell-badge");
  badge.textContent = unread;
  badge.classList.toggle("hidden", unread === 0);
}

function renderNotifications() {
  const list = $("notif-list");
  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">You have no notifications.</div>`;
    return;
  }
  list.innerHTML = "";
  notifications.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach((n) => {
    const div = document.createElement("div");
    div.className = "notif-item" + (n.read ? "" : " unread");
    div.title = n.read ? "" : "Click to mark as read";
    div.innerHTML = `<p>${n.message}</p><span>${new Date(n.date).toLocaleString()}</span>`;
    if (!n.read) {
      div.addEventListener("click", () => markOneRead(n.id));
    }
    list.appendChild(div);
  });
}

function toggleNotifPanel() {
  const panel = $("notif-panel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) {
    renderNotifications();
  }
}

async function markOneRead(id) {
  const db = await loadDB();
  (db.notifications || []).forEach((n) => {
    if (n.id === id) n.read = true;
  });
  await saveDB(db);
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
  updateBell();
  renderNotifications();
}

async function markAllRead() {
  if (!notifications.some((n) => !n.read)) return;
  const db = await loadDB();
  (db.notifications || []).forEach((n) => {
    if (n.username === currentUser.username) n.read = true;
  });
  await saveDB(db);
  notifications.forEach((n) => (n.read = true));
  updateBell();
  renderNotifications();
}

// ---------- Virtual Pet (Donation) ----------
const PET_CFG = {
  hungerPerSec: 1 / 30,
  thirstPerSec: 1 / 20,
  healthDropPerSec: 1 / 5,
  foodCost: 10,
  waterCost: 10,
  potionCost: 20,
  foodGain: 30,
  waterGain: 30,
  potionGain: 50,
};

let pet = null;
let petTickTimer = null;
let petSaveTimer = null;
let actionLock = null;
let lastTopUpAt = 0;

function lockAction(id) {
  if (actionLock) return false;
  actionLock = id;
  return true;
}

function unlockAction() {
  actionLock = null;
}

function defaultPet(user) {
  const names = SEED_CATS.map((c) => c.name);
  return {
    username: user.username,
    name: names[Math.floor(Math.random() * names.length)],
    alive: true,
    health: 100,
    hunger: 100,
    thirst: 100,
    money: 0,
    inventory: { food: 0, water: 0, potion: 0 },
    updatedAt: Date.now(),
  };
}

function applyPetDecay(p, now) {
  const elapsed = Math.max(0, now - (p.updatedAt || now)) / 1000;
  if (elapsed > 0) {
    p.hunger = Math.max(0, p.hunger - elapsed * PET_CFG.hungerPerSec);
    p.thirst = Math.max(0, p.thirst - elapsed * PET_CFG.thirstPerSec);
    if (p.hunger <= 0 || p.thirst <= 0) {
      p.health = Math.max(0, p.health - elapsed * PET_CFG.healthDropPerSec);
    }
  }
  if (p.health <= 0) {
    p.health = 0;
    p.alive = false;
  }
  p.updatedAt = now;
}

async function persistPet() {
  if (!pet) return;
  const db = await loadDB();
  db.virtualPets = db.virtualPets || {};
  db.virtualPets[pet.username] = pet;
  await saveDB(db);
}

async function loadPet() {
  if (!currentUser) return;
  const db = await loadDB();
  db.virtualPets = db.virtualPets || {};
  if (!db.virtualPets[currentUser.username]) {
    db.virtualPets[currentUser.username] = defaultPet(currentUser);
    await saveDB(db);
  }
  pet = db.virtualPets[currentUser.username];
  return pet;
}

function petStatusText() {
  if (!pet.alive) return "Deceased";
  if (pet.hunger <= 0 || pet.thirst <= 0) return "Sick! Feed it now";
  if (pet.hunger < 25) return "Very hungry";
  if (pet.thirst < 25) return "Very thirsty";
  if (pet.hunger < 60) return "Hungry";
  if (pet.thirst < 60) return "Thirsty";
  if (pet.health < 30) return "Unwell";
  return "Happy and healthy";
}

function petExpression() {
  if (!pet.alive) return "dead";
  if (pet.hunger <= 0 || pet.thirst <= 0) return "sick";
  if (pet.health < 30) return "sick";
  if (pet.hunger < 40 || pet.thirst < 40) return "worried";
  return "happy";
}

function petAvatarSVG(expr) {
  const ok = expr === "happy" || expr === "worried";
  const body = ok ? "#f6a821" : "#e3bd86";
  const inner = ok ? "#ffd9a0" : "#f0dbc0";
  const cheek = ok ? "#ff9fb2" : "#d9c2a8";
  const eye = ok ? "#5a3a1a" : "#8a6b42";
  const stroke = eye;

  const openEyes = `
      <circle cx="78" cy="96" r="7" fill="${eye}"/>
      <circle cx="76" cy="93" r="2.4" fill="#fff"/>
      <circle cx="122" cy="96" r="7" fill="${eye}"/>
      <circle cx="120" cy="93" r="2.4" fill="#fff"/>`;

  const xEyes = `
      <g stroke="${stroke}" stroke-width="3" stroke-linecap="round">
        <path d="M72 90 l12 12"/>
        <path d="M84 90 l-12 12"/>
        <path d="M116 90 l12 12"/>
        <path d="M128 90 l-12 12"/>
      </g>`;

  const mouthHappy = `<path d="M88 118 Q100 130 112 118" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>`;
  const mouthWorried = `<path d="M88 122 Q100 112 112 122" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>
      <path d="M143 72 q4 5 9 1" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
  const mouthSick = `<path d="M92 118 L98 124 L104 118 L110 124" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
  const mouthDead = `<path d="M95 122 L105 122" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="100" cy="131" rx="7" ry="8" fill="#ff7a90"/>`;

  let eyes = openEyes;
  let mouth = mouthHappy;
  if (expr === "sick") {
    eyes = xEyes;
    mouth = mouthSick;
  }
  if (expr === "dead") {
    eyes = xEyes;
    mouth = mouthDead;
  }
  if (expr === "worried") mouth = mouthWorried;

  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <path d="M45 64 L35 16 L78 44 Z" fill="${body}"/>
    <path d="M50 58 L42 30 L70 46 Z" fill="${inner}"/>
    <path d="M155 64 L165 16 L122 44 Z" fill="${body}"/>
    <path d="M150 58 L158 30 L130 46 Z" fill="${inner}"/>
    <path d="M164 92 q22 10 6 30 q-12 12 -30 4" fill="none" stroke="${body}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="100" cy="104" rx="62" ry="60" fill="${body}"/>
    <ellipse cx="100" cy="176" rx="58" ry="40" fill="${body}"/>
    <ellipse cx="100" cy="176" rx="34" ry="24" fill="${inner}"/>
    <ellipse cx="74" cy="194" rx="16" ry="10" fill="${body}"/>
    <ellipse cx="126" cy="194" rx="16" ry="10" fill="${body}"/>
    ${eyes}
    <circle cx="66" cy="114" r="9" fill="${cheek}" opacity="0.85"/>
    <circle cx="134" cy="114" r="9" fill="${cheek}" opacity="0.85"/>
    <path d="M28 96 q-10 -2 -14 -8" stroke="${stroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M28 112 q-10 2 -14 8" stroke="${stroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M172 96 q10 -2 14 -8" stroke="${stroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M172 112 q10 2 14 8" stroke="${stroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${mouth}
  </svg>`;
}

function renderPet() {
  if (!pet) return;
  const alive = pet.alive;
  const expr = petExpression();
  $("pet-avatar").innerHTML = petAvatarSVG(expr);
  $("pet-avatar").className = "pet-avatar" + (expr === "happy" ? "" : " " + expr);
  $("pet-name").textContent = pet.name + (alive ? "" : " (deceased)");
  $("pet-status").textContent = petStatusText();
  $("pet-status").className = "pet-status" + (alive ? "" : " dead");
  $("bar-health").style.width = pet.health + "%";
  $("bar-hunger").style.width = pet.hunger + "%";
  $("bar-thirst").style.width = pet.thirst + "%";
  $("health-num").textContent = Math.round(pet.health);
  $("hunger-num").textContent = Math.round(pet.hunger);
  $("thirst-num").textContent = Math.round(pet.thirst);
  $("pet-money").textContent = pet.money;
  $("pet-dead").classList.toggle("hidden", alive);
  renderInventory();
}

function renderInventory() {
  const list = $("inventory-list");
  const items = [
    { key: "food", label: "Food", effect: "+30 hunger" },
    { key: "water", label: "Water", effect: "+30 thirst" },
    { key: "potion", label: "Health Potion", effect: "+50 health" },
  ];
  const total = items.reduce((s, it) => s + pet.inventory[it.key], 0);
  if (total === 0) {
    list.innerHTML = `<div class="empty-state"><p>Your inventory is empty.</p><p>Buy items from the shop and they will be stored here.</p></div>`;
    return;
  }
  list.innerHTML = "";
  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <span class="inv-label"><strong>${it.label}</strong><em>${it.effect}</em></span>
      <span class="inv-count">x${pet.inventory[it.key]}</span>
      <button class="btn btn-primary btn-sm inv-use" data-item="${it.key}"${pet.inventory[it.key] === 0 ? " disabled" : ""}>Use</button>`;
    list.appendChild(row);
  });
}

function petTick() {
  if (!pet) return;
  if (pet.alive) applyPetDecay(pet, Date.now());
  renderPet();
}

async function buyItem(item) {
  if (!lockAction("buy")) return;
  try {
    if (!pet || !pet.alive) {
      showToast("Your pet has passed away. Adopt a new pet first.");
      return;
    }
    const cost = PET_CFG[item + "Cost"];
    if (pet.money < cost) {
      showToast("Not enough money. Top up your balance first.");
      return;
    }
    pet.money -= cost;
    pet.inventory[item] += 1;
    await persistPet();
    renderPet();
    showToast("Bought " + item + ". It is now in your inventory.");
  } finally {
    unlockAction();
  }
}

async function useItem(item) {
  if (!lockAction("use")) return;
  try {
    if (!pet || pet.inventory[item] <= 0) return;
    if (!pet.alive) {
      showToast("Your pet has passed away.");
      return;
    }
    pet.inventory[item] -= 1;
    if (item === "food") pet.hunger = Math.min(100, pet.hunger + PET_CFG.foodGain);
    if (item === "water") pet.thirst = Math.min(100, pet.thirst + PET_CFG.waterGain);
    if (item === "potion") pet.health = Math.min(100, pet.health + PET_CFG.potionGain);
    await persistPet();
    renderPet();
    showToast("Used " + item + ".");
  } finally {
    unlockAction();
  }
}

function topupError(msg) {
  $("topup-error").textContent = msg;
}

function openTopUpModal() {
  $("topup-form").reset();
  topupError("");
  $("topup-modal").classList.remove("hidden");
}

function closeTopUpModal() {
  $("topup-modal").classList.add("hidden");
}

async function handleTopUp(e) {
  e.preventDefault();
  if (!lockAction("topup")) return;
  if (Date.now() - lastTopUpAt < 1000) {
    unlockAction();
    return;
  }
  const submitBtn = e.submitter || $("topup-form").querySelector("button[type=submit]");
  if (submitBtn) submitBtn.disabled = true;
  try {
    const bank = $("topup-bank").value.trim();
    const bankName = $("topup-bankname").value.trim();
    const amount = Number($("topup-amount").value);
    const confirm = Number($("topup-confirm").value);
    const confirmTick = $("topup-confirmtick").value;

    if (!bank || !bankName) return topupError("Please fill in your bank account and bank name.");
    if (!(amount > 0)) return topupError("Please enter a valid top-up amount.");
    if (!(confirm > 0)) return topupError("Please enter the confirmation amount again.");
    if (confirm !== amount) return topupError("The confirmation amount does not match the top-up amount.");
    if (!confirmTick) return topupError("Please select a confirmation option.");
    if (confirmTick === "no") return topupError("You did not confirm the details, so no top-up was made.");

    pet.money += amount;
    const db = await loadDB();
    db.virtualPets = db.virtualPets || {};
    db.virtualPets[pet.username] = pet;
    db.donations = db.donations || [];
    db.donations.push({
      id: Date.now(),
      username: currentUser.username,
      name: currentUser.name,
      bank,
      bankName,
      amount,
      date: new Date().toISOString(),
    });
    await saveDB(db);
    lastTopUpAt = Date.now();
    renderPet();
    closeTopUpModal();
    showToast("Top-up successful. $" + amount + " added to your balance.");
  } finally {
    unlockAction();
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function revivePet() {
  if (!currentUser) return;
  const fresh = defaultPet(currentUser);
  fresh.money = pet.money;
  fresh.inventory = pet.inventory;
  pet = fresh;
  await persistPet();
  renderPet();
  showToast("Welcome back! " + pet.name + " is ready to be cared for.");
}

async function syncPetView() {
  await loadPet();
  if (pet) {
    applyPetDecay(pet, Date.now());
    renderPet();
  }
}

function startPetLoop() {
  stopPetLoop();
  petTickTimer = setInterval(petTick, 2000);
  petSaveTimer = setInterval(persistPet, 15000);
}

function stopPetLoop() {
  if (petTickTimer) {
    clearInterval(petTickTimer);
    petTickTimer = null;
  }
  if (petSaveTimer) {
    clearInterval(petSaveTimer);
    petSaveTimer = null;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.remove("toast-show");
  void toast.offsetWidth;
  toast.classList.add("toast-show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 6000);
}

// ---------- Init ----------
function scrollToFilters() {
  const el = $("filters");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.scrollToFilters = scrollToFilters;

async function init() {
  $("tab-login").addEventListener("click", () => switchTab("login"));
  $("tab-register").addEventListener("click", () => switchTab("register"));
  $("login-form").addEventListener("submit", handleLogin);
  $("register-form").addEventListener("submit", handleRegister);
  $("logout-btn").addEventListener("click", logout);

  $("brand-link").addEventListener("click", () => switchView("catalog"));
  $("brand-link").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      switchView("catalog");
    }
  });

  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.addEventListener("click", () => switchView(b.dataset.view));
  });

  ["filter-type", "filter-colour", "filter-age", "filter-gender"].forEach((id) => {
    $(id).addEventListener("change", applyFilters);
  });
  $("reset-filters").addEventListener("click", () => {
    $("filter-type").value = "all";
    $("filter-colour").value = "all";
    $("filter-age").value = "all";
    $("filter-gender").value = "all";
    applyFilters();
  });

  $("adopt-form").addEventListener("submit", submitAdoption);
  $("modal-close").addEventListener("click", closeAdoptModal);
  $("adopt-modal").addEventListener("click", (e) => {
    if (e.target === $("adopt-modal")) closeAdoptModal();
  });
  $("success-close").addEventListener("click", () => $("success-modal").classList.add("hidden"));

  $("bell-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotifPanel();
  });
  $("notif-mark-all").addEventListener("click", (e) => {
    e.stopPropagation();
    markAllRead();
  });
  document.addEventListener("click", (e) => {
    if (!$("bell-wrap").contains(e.target)) {
      $("notif-panel").classList.add("hidden");
    }
  });

  document.querySelectorAll(".shop-item").forEach((b) => {
    b.addEventListener("click", () => buyItem(b.dataset.item));
  });
  $("inventory-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".inv-use");
    if (btn) useItem(btn.dataset.item);
  });
  $("topup-form").addEventListener("submit", handleTopUp);
  $("open-topup-btn").addEventListener("click", openTopUpModal);
  $("topup-close").addEventListener("click", closeTopUpModal);
  $("topup-modal").addEventListener("click", (e) => {
    if (e.target === $("topup-modal")) closeTopUpModal();
  });
  $("revive-btn").addEventListener("click", revivePet);

  const db = await loadDB();
  if (db.cats === undefined) {
    db.cats = SEED_CATS.map((c) => ({ ...c }));
    await saveDB(db);
  }
  cats = db.cats;
  ADOPTED = new Set(db.requests.map((r) => r.catId));
  $("hero-count").textContent = cats.filter((c) => !ADOPTED.has(c.id)).length;

  initFilters();
  applyFilters();

  const saved = readSession();
  if (saved) {
    const user = db.users.find((u) => u.username === saved);
    if (user) startSession(user);
  }
}

document.addEventListener("DOMContentLoaded", init);
