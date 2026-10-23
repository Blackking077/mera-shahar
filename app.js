// ---------------- Mera Shahar, Meri Pehchan ----------------
const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];
const SMALL_ON_MAP = new Set(["Delhi","Chandigarh","Puducherry","Lakshadweep","Goa","Sikkim","Dadra and Nagar Haveli and Daman and Diu","Andaman and Nicobar Islands"]);

const CATS = {
  khana:    { label: "Khana",        emoji: "🍛" },
  jagah:    { label: "Famous Jagah", emoji: "🏛️" },
  tyohar:   { label: "Tyohar & Mela",emoji: "🎉" },
  kala:     { label: "Kala & Hunar", emoji: "🎨" },
  prakriti: { label: "Prakriti",     emoji: "🌄" },
  other:    { label: "Kuch Khaas",   emoji: "✨" }
};
const AVATAR_COLORS = ["#2f9e44","#dd8f0e","#2563eb","#db2777","#7c3aed","#0891b2","#b3540e","#3f7d2c"];

let allPosts = [];
let me = null;                 // login hua user (nahi to null)
let myStats = null;
let token = localStorage.getItem("ms_token") || null;
const filter = { state: null, category: "all", query: "", sort: "new" };
let uploadedImage = null;
let currentPost = null;
let mapLoaded = false;

// ---------------- helpers ----------------
const $ = (id) => document.getElementById(id);
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function avatarColor(name){
  let h = 0; for (const ch of String(name || "?")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarHTML(name, cls=""){
  return `<span class="avatar ${cls}" style="background:${avatarColor(name)}">${esc((name||"?").trim().charAt(0).toUpperCase())}</span>`;
}
function relativeTime(ts){
  const diff = Math.max(0, Math.floor(Date.now()/1000) - ts);
  if (diff < 60) return "abhi-abhi";
  if (diff < 3600) return Math.floor(diff/60) + " minute pehle";
  if (diff < 86400) return Math.floor(diff/3600) + " ghante pehle";
  const d = Math.floor(diff/86400);
  if (d === 1) return "Kal";
  if (d < 7) return d + " din pehle";
  if (d < 30) return Math.floor(d/7) + " hafte pehle";
  if (d < 365) return Math.floor(d/30) + " mahine pehle";
  return Math.floor(d/365) + " saal pehle";
}
function toast(msg, ms=3400){
  const t = $("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.add("hidden"), ms);
}
function catOf(p){ return CATS[p.category] || CATS.other; }
function likesTotal(p){ return (p.likes || 0) + ((p.likedBy || []).length); }
function isLiked(p){ return !!(me && (p.likedBy || []).includes(me.id)); }
function isMine(p){ return !!(me && p.authorId && p.authorId === me.id); }
function commentsOf(p){ return p.comments || []; }
function scrollToId(id){ document.getElementById(id)?.scrollIntoView({behavior:"smooth", block:"start"}); }
function stateCounts(){
  const counts = {};
  allPosts.forEach(p => counts[p.state] = (counts[p.state] || 0) + 1);
  return counts;
}

// ---------------- API ----------------
async function api(path, opts = {}){
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  return fetch(path, { ...opts, headers });
}
async function loadMe(){
  if (!token){ me = null; return; }
  try{
    const res = await api("api/me");
    if (!res.ok) throw new Error();
    const d = await res.json();
    me = d.user; myStats = d.stats;
  }catch(e){
    token = null; localStorage.removeItem("ms_token"); me = null;
  }
}
async function loadPosts(){
  try{
    const res = await fetch("api/posts");
    if (!res.ok) throw new Error();
    allPosts = await res.json();
  }catch(e){
    $("feedGrid").innerHTML = '<div class="loading">😔 Posts load nahi ho payi. Server chal raha hai kya? Page ko refresh karke dobara try karein.</div>';
    return;
  }
  renderStats(); renderStates(); renderFeed(); updateMapColors(); renderMapPanel();
}
function renderStats(){
  $("statPosts").textContent = allPosts.length;
  $("statStates").textContent = new Set(allPosts.map(p => p.state)).size;
  $("statCities").textContent = new Set(allPosts.map(p => (p.city||"").toLowerCase().trim())).size;
  $("statLikes").textContent = allPosts.reduce((a,p) => a + likesTotal(p), 0);
  $("statComments").textContent = allPosts.reduce((a,p) => a + commentsOf(p).length, 0);
}

// ---------------- AUTH UI ----------------
function renderAuthArea(){
  const box = $("authArea");
  if (me){
    box.innerHTML = `
      <button class="user-chip" onclick="openProfile()" title="Mera Profile">${avatarHTML(me.name)} ${esc(me.name.split(" ")[0])}</button>
      <button class="btn btn-small" onclick="logout()">Logout</button>`;
  } else {
    box.innerHTML = `
      <button class="btn btn-small" onclick="openAuth('login')">Login</button>
      <button class="btn btn-small btn-primary" onclick="openAuth('register')">🪪 Account Bana</button>`;
  }
  renderPostAsBanner();
}
function renderPostAsBanner(){
  const b = $("postAsBanner");
  if (!b) return;
  if (me){
    b.className = "post-as in";
    b.innerHTML = `${avatarHTML(me.name)}<span>Aap <b>${esc(me.name)}</b> (@${esc(me.username)}) ke naam se post kar rahe hain.</span>`;
  } else {
    b.className = "post-as out";
    b.innerHTML = `<span>🔒 Post karne ke liye pehle apna <b>muft account</b> banao ya login karo (30 second lagega).</span>
      <button type="button" class="btn btn-small btn-primary" onclick="openAuth('register')">Account Bana / Login</button>`;
  }
}
function requireLogin(actionMsg){
  if (me) return true;
  toast("🔒 " + (actionMsg || "Iske liye pehle login karo — muft account 30 second mein banta hai!"), 4200);
  openAuth("register");
  return false;
}
function openAuth(tab = "login"){
  showAuthTab(tab);
  $("authModal").classList.remove("hidden");
}
function closeAuth(){ $("authModal").classList.add("hidden"); }
function showAuthTab(tab){
  const isLogin = tab === "login";
  $("tabLogin").classList.toggle("active", isLogin);
  $("tabRegister").classList.toggle("active", !isLogin);
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("registerForm").classList.toggle("hidden", isLogin);
  $("authTitle").textContent = isLogin ? "Namaste! Login Karein" : "Apna Muft Account Bana";
  $("authSub").textContent = isLogin
    ? "Post dalne, like aur comment karne ke liye login zaroori hai."
    : "Bas naam, username aur password — koi OTP nahi, koi fees nahi!";
}
async function handleLogin(e){
  e.preventDefault();
  const err = $("loginError"); err.classList.add("hidden");
  const btn = $("loginBtn"); btn.disabled = true; btn.textContent = "⏳ Ruko...";
  try{
    const res = await api("api/login", { method:"POST", body: JSON.stringify({
      username: $("lUsername").value.trim(), password: $("lPassword").value }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Login nahi ho paya");
    token = d.token; localStorage.setItem("ms_token", token);
    await loadMe(); renderAuthArea(); renderFeed(); closeAuth();
    e.target.reset();
    toast("👋 Namaste " + me.name.split(" ")[0] + "! Login ho gaya. Ab post, like, comment — Sab khula hai!");
  }catch(errr){
    err.textContent = "⚠️ " + errr.message; err.classList.remove("hidden");
  }finally{ btn.disabled = false; btn.textContent = "Login Karein"; }
}
async function handleRegister(e){
  e.preventDefault();
  const err = $("registerError"); err.classList.add("hidden");
  const btn = $("registerBtn"); btn.disabled = true; btn.textContent = "⏳ Account ban raha hai...";
  try{
    const res = await api("api/register", { method:"POST", body: JSON.stringify({
      name: $("rName").value.trim(), username: $("rUsername").value.trim(),
      password: $("rPassword").value, state: $("rState").value, city: $("rCity").value.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Account nahi ban paya");
    token = d.token; localStorage.setItem("ms_token", token);
    await loadMe(); renderAuthArea(); renderFeed(); closeAuth();
    e.target.reset();
    toast("🎉 Badhaai ho " + me.name.split(" ")[0] + "! Aapka account taiyaar hai. Ab apni pehli post dalo!", 4800);
    scrollToId("add");
    // profile se Rajya/shahar form mein pehle se bhar dein
    if (me.state) $("fState").value = me.state;
    if (me.city) $("fCity").value = me.city;
  }catch(errr){
    err.textContent = "⚠️ " + errr.message; err.classList.remove("hidden");
  }finally{ btn.disabled = false; btn.textContent = "🎉 Muft Account Bana"; }
}
async function logout(){
  try{ await api("api/logout", { method:"POST" }); }catch(e){}
  token = null; me = null; myStats = null;
  localStorage.removeItem("ms_token");
  closeProfile(); renderAuthArea(); renderFeed();
  toast("👋 Logout ho gaya. Phir milenge!");
}

// ---------------- PROFILE ----------------
async function openProfile(){
  if (!requireLogin("Profile dekhne ke liye login karo")) return;
  await loadMe();
  const s = myStats || { myPosts:0, likesReceived:0, commentsReceived:0, commentsMade:0 };
  const myPosts = allPosts.filter(p => p.authorId === me.id)
    .sort((a,b) => b.createdAt - a.createdAt);
  const stateOptions = '<option value="">— Rajya chunein —</option>' + STATES.map(st =>
    `<option value="${esc(st)}" ${st === me.state ? "selected":""}>${esc(st)}</option>`).join("");
  $("profileContent").innerHTML = `
    <div class="profile-head">
      ${avatarHTML(me.name, "big-av")}
      <div>
        <h2>${esc(me.name)}</h2>
        <div class="puname">@${esc(me.username)}</div>
        <div class="pplace">${me.city || me.state ? "📍 " + esc([me.city, me.state].filter(Boolean).join(", ")) : "📍 Apni jagah profile mein jodo"}</div>
        ${me.bio ? `<div class="pplace">“${esc(me.bio)}”</div>` : ""}
      </div>
    </div>
    <div class="profile-body">
      <div class="pstats">
        <div class="pstat"><b>${s.myPosts}</b><span>📸 Meri Posts</span></div>
        <div class="pstat"><b>${s.likesReceived}</b><span>❤️ Mile Likes</span></div>
        <div class="pstat"><b>${s.commentsReceived}</b><span>💬 Mile Comments</span></div>
        <div class="pstat"><b>${s.commentsMade}</b><span>✍️ Kiye Comments</span></div>
      </div>
      <h3>📝 MERI Posts</h3>
      ${myPosts.length ? myPosts.map(p => `
        <button class="mypost-row" onclick="closeProfile(); openModal('${p.id}')">
          <span>${catOf(p).emoji}</span>
          <span><b>${esc(p.title)}</b><br><span style="color:var(--muted);font-size:.8rem">📍 ${esc(p.city)}, ${esc(p.state)}</span></span>
          <span class="mstats">❤️ ${likesTotal(p)} 💬 ${commentsOf(p).length}</span>
        </button>`).join("")
        : '<p style="color:var(--muted)">Abhi ek bhi post nahi dali. <b>Pehli post abhi dalo!</b> neeche wala button dbaiye.</p>'}
      <button class="btn btn-primary btn-big" onclick="closeProfile(); startPost()">➕ Nayi Post Dalein</button>

      <h3>🪪 Profile Badlein</h3>
      <div class="form-grid">
        <div class="field"><label for="pName">Naam</label><input id="pName" type="text" maxlength="40" value="${esc(me.name)}"></div>
        <div class="field"><label for="pState">Rajya</label><select id="pState">${stateOptions}</select></div>
        <div class="field"><label for="pCity">Gaon / Shahar</label><input id="pCity" type="text" maxlength="60" value="${esc(me.city || "")}"></div>
        <div class="field"><label for="pBio">Apke baare mein ek line</label><input id="pBio" type="text" maxlength="200" value="${esc(me.bio || "")}" placeholder="Jaise: Kisan hoon, apne gaon se bahut pyaar hai"></div>
      </div>
      <p class="form-error hidden" id="profileError"></p>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveProfile()">💾 Save Karein</button>
        <button class="btn" onclick="logout()">Logout</button>
      </div>
    </div>`;
  $("profileModal").classList.remove("hidden");
}
function closeProfile(){ $("profileModal").classList.add("hidden"); }
async function saveProfile(){
  const err = $("profileError"); err.classList.add("hidden");
  try{
    const res = await api("api/me", { method:"PUT", body: JSON.stringify({
      name: $("pName").value.trim(), state: $("pState").value,
      city: $("pCity").value.trim(), bio: $("pBio").value.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Save nahi ho paya");
    me = d.user; myStats = d.stats;
    allPosts.forEach(p => { if (p.authorId === me.id) p.author = me.name; });
    commentsOfAllUpdateName();
    renderAuthArea(); renderFeed();
    toast("✅ Profile save ho gaya!");
    openProfile();
  }catch(e){
    err.textContent = "⚠️ " + e.message; err.classList.remove("hidden");
  }
}
function commentsOfAllUpdateName(){
  allPosts.forEach(p => commentsOf(p).forEach(c => { if (c.userId === me.id) c.author = me.name; }));
}

// ---------------- MAP ----------------
function colorForCount(c){
  if (!c) return "#e9f4e1";
  if (c === 1) return "#c9e7b9";
  if (c === 2) return "#9ed48d";
  if (c <= 4) return "#63b968";
  return "#2f9e44";
}
async function loadMap(){
  const svg = $("indiaMap");
  try{
    const res = await fetch("assets/india-states-official.geo.json");
    if (!res.ok) throw new Error();
    const geo = await res.json();

    // saare coordinates ikatthe karke seema (bbox) nikalein
    let minLon=180, maxLon=-180, minLat=90, maxLat=-90;
    const eachCoord = (coords) => {
      if (typeof coords[0] === "number"){
        minLon=Math.min(minLon,coords[0]); maxLon=Math.max(maxLon,coords[0]);
        minLat=Math.min(minLat,coords[1]); maxLat=Math.max(maxLat,coords[1]);
      } else coords.forEach(eachCoord);
    };
    geo.features.forEach(f => eachCoord(f.geometry.coordinates));
    const kx = Math.cos(((minLat+maxLat)/2) * Math.PI/180);
    const rangeX = (maxLon-minLon)*kx, rangeY = (maxLat-minLat);
    const W = 640, pad = 8, scale = (W-2*pad)/rangeX, H = Math.round(rangeY*scale + 2*pad);
    const pt = (lon,lat) => (pad + (lon-minLon)*kx*scale).toFixed(1) + "," + (pad + (maxLat-lat)*scale).toFixed(1);
    const ringPath = (ring) => ring.map((c,i) => (i ? "L" : "M") + pt(c[0], c[1])).join("") + "Z";
    const geomPath = (g) => g.type === "Polygon"
      ? g.coordinates.map(ringPath).join("")
      : g.coordinates.map(poly => poly.map(ringPath).join("")).join("");

    const counts = stateCounts();
    let paths = "", dots = "";
    for (const f of geo.features){
      const name = f.properties.name;
      paths += `<path d="${geomPath(f.geometry)}" data-state="${esc(name)}" fill="${colorForCount(counts[name]||0)}" class="${filter.state===name ? "selected":""}${(name==="Andaman and Nicobar Islands"||name==="Lakshadweep") ? " island":""}"><title>${esc(name)}</title></path>`;
      if (SMALL_ON_MAP.has(name)){
        // chhote Rajya/UT ke liye bada click-dot
        let sx=0, sy=0, n=0;
        const walk = (c) => { if (typeof c[0]==="number"){ sx+=c[0]; sy+=c[1]; n++; } else c.forEach(walk); };
        walk(f.geometry.coordinates);
        const [cx, cy] = pt(sx/n, sy/n).split(",");
        dots += `<circle cx="${cx}" cy="${cy}" r="8" data-state="${esc(name)}" fill="rgba(47,158,68,.75)" stroke="#fff" stroke-width="1.4" style="cursor:pointer"><title>${esc(name)}</title></circle>`;
      }
    }
    let labels = "";
    {
      const [ax, ay] = pt(94.35, 11.6).split(",");
      labels += `<text class="map-label" x="${ax}" y="${ay}">Andaman<tspan x="${ax}" dy="13">&amp; Nicobar</tspan></text>`;
      const [lx, ly] = pt(71.95, 10.7).split(",");
      labels += `<text class="map-label" x="${lx}" y="${ly}" text-anchor="end">Lakshadweep</text>`;
    }
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = paths + dots + labels;
    mapLoaded = true;
    $("mapLoading")?.classList.add("hidden");

    const tooltip = $("mapTooltip"), box = svg.closest(".map-box");
    svg.addEventListener("mousemove", (e) => {
      const name = e.target.dataset?.state;
      if (!name){ tooltip.classList.add("hidden"); return; }
      const c = stateCounts()[name] || 0;
      tooltip.innerHTML = `📍 ${esc(name)}<br><span style="font-weight:400;font-size:.78rem">${c ? "📸 " + c + " post — dekhne ke liye click karo" : "Abhi koi post nahi — pehli aap dalo!"}</span>`;
      const r = box.getBoundingClientRect();
      tooltip.style.left = (e.clientX - r.left) + "px";
      tooltip.style.top = (e.clientY - r.top) + "px";
      tooltip.classList.remove("hidden");
    });
    svg.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
    svg.addEventListener("click", (e) => {
      const name = e.target.dataset?.state;
      if (name) selectState(name, true);
    });
  }catch(e){
    svg.closest(".map-box").innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px">😔 Naksha load nahi ho paya — neeche wali list se Rajya chunein.</p>';
  }
}
function updateMapColors(){
  if (!mapLoaded) return;
  const counts = stateCounts();
  document.querySelectorAll("#indiaMap path").forEach(p => {
    p.setAttribute("fill", colorForCount(counts[p.dataset.state] || 0));
    p.classList.toggle("selected", filter.state === p.dataset.state);
  });
}
function renderMapPanel(){
  const panel = $("mapPanel");
  const s = filter.state;
  if (!s){
    panel.innerHTML = `<div class="map-panel-empty">
      <div class="step-emoji">👆</div><h3>Ek Rajya chunein</h3>
      <p>Nakshe par kisi Rajya ko dabao — yahan us Rajya ki mashhoor posts dikhengi.</p></div>`;
    return;
  }
  const posts = allPosts.filter(p => p.state === s);
  const top = [...posts].sort((a,b) => likesTotal(b) - likesTotal(a)).slice(0, 3);
  panel.innerHTML = `
    <div class="mp-state">📍 ${esc(s)}</div>
    <div class="mp-count">${posts.length ? "📸 " + posts.length + " post" + (posts.length>1 ? "s":"") + " yahan se aayi hain" : "🌱 is Rajya se abhi koi post nahi aayi"}</div>
    ${top.length ? "<p style='font-weight:700;color:var(--forest);margin-bottom:9px'>⭐ Sabse pasand ki gayi:</p>" + top.map(p => `
      <button class="mp-post" onclick="openModal('${p.id}')">
        ${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span class="mp-emoji cat-${esc(p.category)}">${catOf(p).emoji}</span>`}
        <span><b>${esc(p.title)}</b><span>📍 ${esc(p.city)} • ❤️ ${likesTotal(p)} • 💬 ${commentsOf(p).length}</span></span>
      </button>`).join("")
      : '<p style="color:var(--muted)">Pehli post aap dalo aur apne Rajya ko nakshe par hara-bhara kar do! 🌿</p>'}
    <div class="mp-actions">
      ${posts.length ? '<button class="btn btn-primary" onclick="scrollToId(\'feed\')">📸 Saari Posts Dekho</button>' : ""}
      <button class="btn" onclick="startPost('${esc(s).replace(/'/g,"\\'")}')">➕ Is Rajya se Post Karo</button>
      <button class="btn" onclick="clearStateFilter()">✕ Chunaav Hatayein</button>
    </div>`;
}

// ---------------- states list + filter ----------------
function renderStates(){
  const q = $("stateSearch").value.trim().toLowerCase();
  const counts = stateCounts();
  $("statesGrid").innerHTML = STATES
    .filter(s => !q || s.toLowerCase().includes(q))
    .map(s => {
      const c = counts[s] || 0;
      return `<button class="state-card ${filter.state===s ? "active":""}" onclick="selectState('${esc(s).replace(/'/g,"\\'")}')">
        <span class="sname">${esc(s)}</span>
        <span class="scount ${c ? "has":""}">${c ? "📸 " + c + " post" + (c>1?"s":"") : "Pehli post aap dalo!"}</span>
      </button>`;
    }).join("");
}
function selectState(s, fromMap = false){
  filter.state = (filter.state === s) ? null : s;
  updateActiveFilter(); renderStates(); renderFeed(); updateMapColors(); renderMapPanel();
  if (filter.state){
    toast("🗺️ " + s + " chuna gaya" + (fromMap ? " — neeche iski posts aa gayi hain" : ""));
    if (!fromMap) scrollToId("feed");
  }
}
function clearStateFilter(){
  filter.state = null; updateActiveFilter(); renderStates(); renderFeed(); updateMapColors(); renderMapPanel();
}
function updateActiveFilter(){
  const box = $("activeFilter");
  if (filter.state){
    $("activeFilterText").textContent = "📍 Sirf " + filter.state + " ki posts dikh rahi hain";
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
}

// ---------------- feed ----------------
function filteredPosts(){
  let list = [...allPosts];
  if (filter.state) list = list.filter(p => p.state === filter.state);
  if (filter.category !== "all") list = list.filter(p => p.category === filter.category);
  if (filter.query){
    const q = filter.query.toLowerCase();
    list = list.filter(p => [p.title, p.city, p.state, p.description, p.author]
      .some(v => (v||"").toLowerCase().includes(q)));
  }
  if (filter.sort === "new") list.sort((a,b) => b.createdAt - a.createdAt);
  if (filter.sort === "old") list.sort((a,b) => a.createdAt - b.createdAt);
  if (filter.sort === "likes") list.sort((a,b) => likesTotal(b) - likesTotal(a));
  if (filter.sort === "comments") list.sort((a,b) => commentsOf(b).length - commentsOf(a).length);
  return list;
}
function renderFeed(){
  const list = filteredPosts();
  $("feedEmpty").classList.toggle("hidden", list.length > 0);
  $("feedSub").textContent = list.length
    ? list.length + " post" + (list.length>1?"s":"") + " mili — post par click karke pura padhein aur comment karein."
    : "Poore Bharat se aayi kahaniyaan.";
  $("feedGrid").innerHTML = list.map(cardHTML).join("");
}
function cardHTML(p){
  const c = catOf(p);
  const img = p.image
    ? `<img class="post-img" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`
    : `<div class="no-img cat-${esc(p.category)}"><span class="big-emoji">${c.emoji}</span><span class="no-img-title">📍 ${esc(p.city)}, ${esc(p.state)}</span></div>`;
  const liked = isLiked(p);
  return `<article class="card">
    <div class="card-imgwrap" onclick="openModal('${p.id}')">
      ${img}
      <span class="badge-cat">${c.emoji} ${c.label}</span>
      ${isMine(p) ? '<span class="badge-mine">⭐ Aapki Post</span>' : ""}
    </div>
    <div class="card-body">
      <div class="card-loc">📍 ${esc(p.city)}, ${esc(p.state)}</div>
      <h3 onclick="openModal('${p.id}')">${esc(p.title)}</h3>
      <p class="card-desc">${esc(p.description)}</p>
      <div class="card-foot">
        <div class="author">
          ${avatarHTML(p.author)}
          <span><span class="aname">${esc(p.author)}</span><span class="post-time">${relativeTime(p.createdAt)}</span></span>
        </div>
        <div class="foot-actions">
          <button class="cmt-count" onclick="openModal('${p.id}')" title="Comments padhein/likhein">💬 ${commentsOf(p).length}</button>
          <button class="like-btn ${liked ? "liked":""}" id="like-${p.id}" onclick="toggleLike('${p.id}')" title="Pasand karein">${liked ? "❤️":"🤍"} ${likesTotal(p)}</button>
        </div>
      </div>
    </div>
  </article>`;
}

// ---------------- like ----------------
async function toggleLike(id){
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  if (!requireLogin("Like karne ke liye pehle login karo")) return;
  post.likedBy = post.likedBy || [];
  const wasLiked = post.likedBy.includes(me.id);
  if (wasLiked) post.likedBy = post.likedBy.filter(x => x !== me.id);
  else post.likedBy.push(me.id);
  refreshLikeUI(post); renderStats();
  try{
    const res = await api(`api/posts/${id}/like`, { method:"POST", body:"{}" });
    if (res.status === 401) throw new Error("loginExpired");
    if (!res.ok) throw new Error();
  }catch(e){
    // wapas purani halat
    if (wasLiked) post.likedBy.push(me.id); else post.likedBy = post.likedBy.filter(x => x !== me.id);
    refreshLikeUI(post); renderStats();
    if (e.message === "loginExpired"){ token=null; me=null; localStorage.removeItem("ms_token"); renderAuthArea(); openAuth("login"); }
  }
}
function refreshLikeUI(post){
  const liked = isLiked(post);
  document.querySelectorAll(`#like-${post.id}, #mlike-${post.id}`).forEach(b => {
    b.classList.toggle("liked", liked);
    b.innerHTML = `${liked ? "❤️":"🤍"} ${likesTotal(post)}` + (b.id.startsWith("mlike") ? " pasand" : "");
  });
}

// ---------------- post modal + comments ----------------
function commentHTML(p, c){
  const canDelete = me && (c.userId === me.id || p.authorId === me.id);
  return `<div class="comment">
    ${avatarHTML(c.author)}
    <div class="cbody">
      <div class="chead"><b>${esc(c.author)}</b>${c.username ? `<span class="ctime">@${esc(c.username)}</span>` : ""}<span class="ctime">${relativeTime(c.createdAt)}</span>
      ${canDelete ? `<button class="cdel" onclick="deleteComment('${p.id}','${c.id}')" title="Comment hatayein">🗑️ Hatayein</button>` : ""}</div>
      <p>${esc(c.text)}</p>
    </div>
  </div>`;
}
function openModal(id){
  const p = allPosts.find(x => x.id === id);
  if (!p) return;
  currentPost = p;
  const c = catOf(p);
  const img = p.image
    ? `<img class="m-img" src="${esc(p.image)}" alt="${esc(p.title)}">`
    : `<div class="no-img cat-${esc(p.category)}"><span class="big-emoji">${c.emoji}</span></div>`;
  const liked = isLiked(p);
  const comments = [...commentsOf(p)].sort((a,b) => a.createdAt - b.createdAt);
  $("modalContent").innerHTML = `
    ${img}
    <div class="modal-body">
      <span class="badge-cat" style="position:static;display:inline-block">${c.emoji} ${c.label}</span>
      <h2>${esc(p.title)}</h2>
      <div class="modal-loc">📍 ${esc(p.city)}, ${esc(p.state)}</div>
      <div class="modal-meta">
        <div class="author">
          ${avatarHTML(p.author)}
          <span>${esc(p.author)}${p.username ? ` <span class="post-time" style="display:inline">@${esc(p.username)}</span>` : ""}<span class="post-time">${relativeTime(p.createdAt)} post ki</span></span>
        </div>
      </div>
      <p class="modal-desc">${esc(p.description)}</p>
      <div class="modal-actions">
        <button class="like-btn ${liked ? "liked":""}" id="mlike-${p.id}" onclick="toggleLike('${p.id}')">${liked ? "❤️":"🤍"} ${likesTotal(p)} pasand</button>
        <button class="btn btn-green" onclick="shareWhatsApp()">💬 WhatsApp par Share</button>
        <button class="btn" onclick="copyText()">🔗 Link Copy</button>
        ${isMine(p) ? `<button class="btn btn-danger" onclick="deletePost('${p.id}')">🗑️ Apni Post Hatayein</button>` : ""}
      </div>

      <div class="comments">
        <h3>💬 Comments (${comments.length})</h3>
        <div id="commentsList">
          ${comments.length ? comments.map(cm => commentHTML(p, cm)).join("") : '<p class="no-cmt">Abhi koi comment nahi — pehle aap kuch likho! 😊</p>'}
        </div>
        ${me ? `
        <div class="comment-form">
          ${avatarHTML(me.name)}
          <textarea id="cmtText" rows="2" maxlength="500" placeholder="${esc(me.name.split(" ")[0])}, apni baat likho... (jaise: main bhi gaya hoon yahan!)"></textarea>
          <button class="btn btn-primary" onclick="submitComment('${p.id}')">Bhejo ➤</button>
        </div>` : `
        <div class="login-cta"><span>💬 Comment karne ke liye login karo — account muft hai!</span>
          <button class="btn btn-small btn-primary" onclick="openAuth('register')">Account Bana / Login</button></div>`}
      </div>
    </div>`;
  $("detailModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("detailModal").scrollTop = 0;
}
function closeModal(){
  $("detailModal").classList.add("hidden");
  document.body.style.overflow = "";
  renderFeed(); updateMapColors(); renderMapPanel();
}
async function submitComment(postId){
  const ta = $("cmtText");
  const text = ta.value.trim();
  if (!text){ toast("✍️ Pehle comment mein kuch likho!"); ta.focus(); return; }
  try{
    const res = await api(`api/posts/${postId}/comments`, { method:"POST", body: JSON.stringify({ text }) });
    const d = await res.json().catch(() => ({}));
    if (res.status === 401){ openAuth("login"); throw new Error("Login khatam ho gaya, dobara login karo"); }
    if (!res.ok) throw new Error(d.error || "Comment nahi gaya");
    const p = allPosts.find(x => x.id === postId);
    p.comments = commentsOf(p); p.comments.push(d);
    renderStats(); openModal(postId);
    const list = $("commentsList"); if (list) list.lastElementChild?.scrollIntoView({behavior:"smooth", block:"center"});
    toast("💬 Aapka comment lag gaya!");
  }catch(e){ toast("😔 " + e.message); }
}
async function deleteComment(postId, cid){
  if (!confirm("ye comment hata dein?")) return;
  try{
    const res = await api(`api/posts/${postId}/comments/${cid}`, { method:"DELETE" });
    if (!res.ok) throw new Error();
    const p = allPosts.find(x => x.id === postId);
    p.comments = commentsOf(p).filter(c => c.id !== cid);
    renderStats(); openModal(postId);
    toast("🗑️ Comment hata diya.");
  }catch(e){ toast("Comment nahi hata, dobara try karein."); }
}
async function deletePost(id){
  if (!confirm("Kya aap sach mein apni ye post hatana chahte hain? Uske saare comments bhi hat jaayenge.")) return;
  try{
    const res = await api(`api/posts/${id}`, { method:"DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Post nahi hati");
    allPosts = allPosts.filter(p => p.id !== id);
    closeModal(); renderStats(); renderStates(); renderFeed(); updateMapColors(); renderMapPanel();
    toast("🗑️ Post hata di gayi.");
  }catch(e){ toast("😔 " + e.message); }
}
function shareText(){
  if (!currentPost) return "";
  return `🇮🇳 ${currentPost.title} — ${currentPost.city}, ${currentPost.state}\n\n${currentPost.description}\n\n👉 "Mera Shahar, Meri Pehchan" par aur bhi dekho: ${location.href.split("#")[0]}`;
}
function shareWhatsApp(){ window.open("https://wa.me/?text=" + encodeURIComponent(shareText()), "_blank"); }
async function copyText(){
  try{ await navigator.clipboard.writeText(shareText()); toast("🔗 Copy ho gaya! Kahin bhi paste karke share karo."); }
  catch(e){ toast("Copy nahi ho paya, browser ne roka 😅"); }
}

// ---------------- new post ----------------
function startPost(preState){
  if (!requireLogin("Post karne ke liye pehle apna muft account Bana — sirf 30 second!")) return;
  if (preState) $("fState").value = preState;
  else if (!$("fState").value && me.state) $("fState").value = me.state;
  if (!$("fCity").value && me.city) $("fCity").value = me.city;
  scrollToId("add");
  setTimeout(() => $("fTitle").focus({preventScroll:true}), 600);
}
function handleFile(file){
  if (!file) return;
  if (!file.type.startsWith("image/")){ toast("⚠️ Sirf photo (image) file chunein."); return; }
  if (file.size > 12 * 1024 * 1024){ toast("⚠️ Photo bahut badi hai (12 MB se zyada). Chhoti photo Kheecho."); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      let w = img.width, h = img.height;
      const scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      uploadedImage = canvas.toDataURL("image/jpeg", 0.82);
      $("imgPreview").src = uploadedImage;
      $("dropHint").classList.add("hidden");
      $("imgPreviewWrap").classList.remove("hidden");
    };
    img.onerror = () => toast("⚠️ Ye photo khul nahi payi, doosri photo try karein.");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function clearImage(){
  uploadedImage = null;
  $("fImage").value = "";
  $("dropHint").classList.remove("hidden");
  $("imgPreviewWrap").classList.add("hidden");
}
async function submitForm(e){
  e.preventDefault();
  if (!me){ requireLogin("Post karne ke liye pehle login karo"); return; }
  const err = $("formError");
  const showErr = (m) => { err.textContent = m; err.classList.remove("hidden"); err.scrollIntoView({behavior:"smooth", block:"center"}); };
  err.classList.add("hidden");

  const payload = {
    state: $("fState").value,
    city: $("fCity").value.trim(),
    category: $("fCategory").value,
    title: $("fTitle").value.trim(),
    description: $("fDesc").value.trim(),
    image: uploadedImage
  };
  if (!payload.state) return showErr("⚠️ Pehle apna Rajya chunein.");
  if (payload.city.length < 2) return showErr("⚠️ Apne gaon ya shahar ka naam likhein.");
  if (payload.title.length < 4) return showErr("⚠️ Famous cheez ka naam (title) thoda sa lamba likhein.");
  if (payload.description.length < 30) return showErr("⚠️ Uske baare mein kam se kam 2-3 line (30 akshar) to likho! Logon ko padhkar mazaa aana chahiye.");

  const btn = $("submitBtn");
  btn.disabled = true; btn.textContent = "⏳ Publish ho raha hai...";
  try{
    const res = await api("api/posts", { method:"POST", body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401){ openAuth("login"); throw new Error("Login khatam ho gaya lagta hai — dobara login karke publish karo."); }
    if (!res.ok) throw new Error(data.error || "Server se galti aayi");
    allPosts.unshift(data);
    e.target.reset(); clearImage(); $("descCount").textContent = "0 / 1500";
    filter.state = null; filter.category = "all"; filter.query = "";
    $("feedSearch").value = "";
    document.querySelectorAll("#catChips .chip").forEach(ch => ch.classList.toggle("active", ch.dataset.cat === "all"));
    updateActiveFilter(); renderStats(); renderStates(); renderFeed(); updateMapColors(); renderMapPanel();
    toast("🎉 Badhaai ho! Aapki post publish ho gayi — ab poora Bharat dekhega!", 4800);
    scrollToId("feed");
  }catch(errr){
    showErr("😔 " + (errr.message || "Publish nahi ho paya. Dobara try karein."));
  }finally{
    btn.disabled = false; btn.textContent = "🚀 Publish Karein — Duniya ko Dikhao!";
  }
}

// ---------------- search ----------------
function applyHeroSearch(){
  const q = $("heroSearch").value.trim();
  filter.query = q; $("feedSearch").value = q;
  renderFeed(); scrollToId("feed");
}

// ---------------- init ----------------
async function init(){
  const stateOpts = (placeholder) => `<option value="">${placeholder}</option>` +
    STATES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  $("fState").innerHTML = stateOpts("— Apna Rajya chunein —");
  $("rState").innerHTML = stateOpts("— Rajya (chaho to) —");

  $("stateSearch").addEventListener("input", renderStates);
  $("feedSearch").addEventListener("input", (e) => { filter.query = e.target.value.trim(); renderFeed(); });
  $("heroSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") applyHeroSearch(); });
  $("sortSelect").addEventListener("change", (e) => { filter.sort = e.target.value; renderFeed(); });
  document.querySelectorAll("#catChips .chip").forEach(ch => {
    ch.addEventListener("click", () => {
      document.querySelectorAll("#catChips .chip").forEach(x => x.classList.remove("active"));
      ch.classList.add("active");
      filter.category = ch.dataset.cat;
      renderFeed(); scrollToId("feed");
    });
  });

  $("fDesc").addEventListener("input", (e) => $("descCount").textContent = e.target.value.length + " / 1500");
  $("postForm").addEventListener("submit", submitForm);
  $("loginForm").addEventListener("submit", handleLogin);
  $("registerForm").addEventListener("submit", handleRegister);

  const Kheecho = $("dropZone");
  Kheecho.addEventListener("click", (e) => { if (e.target.id !== "removeImgBtn") $("fImage").click(); });
  $("fImage").addEventListener("change", (e) => handleFile(e.target.files[0]));
  $("removeImgBtn").addEventListener("click", (e) => { e.stopPropagation(); clearImage(); });
  ["dragenter","dragover"].forEach(ev => Kheecho.addEventListener(ev, (e) => { e.preventDefault(); Kheecho.classList.add("drag"); }));
  ["dragleave","drop"].forEach(ev => Kheecho.addEventListener(ev, (e) => { e.preventDefault(); Kheecho.classList.remove("drag"); }));
  Kheecho.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

  [["detailModal", closeModal],["authModal", closeAuth],["profileModal", closeProfile]].forEach(([id, fn]) => {
    $(id).addEventListener("click", (e) => { if (e.target.id === id) fn(); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("authModal").classList.contains("hidden")) closeAuth();
    else if (!$("profileModal").classList.contains("hidden")) closeProfile();
    else closeModal();
  });

  await loadMe();
  renderAuthArea();
  loadPosts();
  loadMap();
}
document.addEventListener("DOMContentLoaded", init);
