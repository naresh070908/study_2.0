async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatCount(n) {
  n = Number(n || 0);
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0","") + "K+" : String(n);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
window.SC = { api, formatCount, esc };

const themeBtn = document.getElementById("themeBtn");
if (themeBtn) {
  const saved = localStorage.getItem("sc-theme");
  if (saved === "dark") document.body.classList.add("dark");
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("sc-theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

const menuBtn = document.getElementById("menuBtn");
if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    const nav = document.querySelector(".desktop-nav");
    if (!nav) return;
    nav.style.display = nav.style.display === "flex" ? "" : "flex";
    nav.style.position = "absolute";
    nav.style.top = "74px";
    nav.style.left = "10px";
    nav.style.right = "10px";
    nav.style.padding = "10px";
    nav.style.background = "var(--card)";
    nav.style.border = "1px solid var(--line)";
    nav.style.borderRadius = "15px";
    nav.style.flexDirection = "column";
  });
}

async function loadHome() {
  const statsEl = document.getElementById("stats");
  if (!statsEl) return;
  try {
    const [{stats}, {subjects}] = await Promise.all([api("/api/stats"), api("/api/subjects")]);
    document.getElementById("statNotes").textContent = formatCount(stats.notes);
    document.getElementById("statStudents").textContent = formatCount(stats.students);
    document.getElementById("statSubjects").textContent = formatCount(stats.subjects);
    document.getElementById("statUploads").textContent = formatCount(stats.uploads_today);
    const grid = document.getElementById("homeSubjects");
    grid.innerHTML = subjects.slice(0,8).map((s,i) => `
      <a class="subject-card" href="/notes.html?subject=${encodeURIComponent(s.slug)}">
        <div class="subject-icon">${({"Chemistry":"🧪","Civil Engineering":"🏗️","Computer Science":"💻","Electronics":"⚡","Electrical Engineering":"⚡","Mathematics":"∑","Mechanical":"⚙️","Physics":"⚛️","English":"📖","Programming":"👨‍💻"}[s.name] || "📚")}</div>
        <b>${esc(s.name)}</b><small>${s.note_count} notes</small>
      </a>`).join("");
  } catch (e) { console.error(e); }
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year")?.replaceChildren(document.createTextNode(new Date().getFullYear()));
  loadHome();
});