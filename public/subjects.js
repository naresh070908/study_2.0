(async () => {
  const { subjects } = await SC.api("/api/subjects");
  const grid = document.getElementById("subjectsGrid");
  grid.innerHTML = subjects.map((s, i) => `
    <a class="subject-card" href="/notes.html?subject=${encodeURIComponent(s.slug)}">
      <div class="subject-icon">${({ "Chemistry": "🧪", "Civil Engineering": "🏗️", "Computer Science": "💻", "Electronics": "⚡", "Mathematics": "∑", "Mechanical": "⚙️", "Physics": "⚛️", "English": "📖", "Programming": "👨‍💻" }[s.name] || "📚")}</div>
      <h3>${SC.esc(s.name)}</h3>
      <p>${s.note_count} approved notes available</p>
      <b style="color:var(--blue);font-size:12px">Explore →</b>
    </a>`).join("");
})();