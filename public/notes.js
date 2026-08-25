(async () => {
  const search = document.getElementById("search");
  const subject = document.getElementById("subject");
  const sort = document.getElementById("sort");
  const grid = document.getElementById("noteGrid");
  const empty = document.getElementById("empty");

  const [{subjects}] = await Promise.all([SC.api("/api/subjects")]);
  subject.innerHTML += subjects.map(s => `<option value="${SC.esc(s.slug)}">${SC.esc(s.name)}</option>`).join("");

  const params = new URLSearchParams(location.search);
  search.value = params.get("q") || "";
  subject.value = params.get("subject") || "";

  async function load() {
    const q = new URLSearchParams({ q: search.value, subject: subject.value, sort: sort.value });
    const {notes} = await SC.api("/api/notes?" + q.toString());
    empty.hidden = notes.length !== 0;
    grid.innerHTML = notes.map(n => `
      <article class="note-card">
        <span class="tag">${SC.esc(n.subject)}</span>
        <h3>${SC.esc(n.title)}</h3>
        <p>${SC.esc(n.description || "Shared study material.")}</p>
        <div class="note-meta"><span>By ${SC.esc(n.uploader)}</span><span>↓ ${n.downloads}</span><span>♥ ${n.helpful}</span></div>
        <div class="note-actions">
          <a class="btn btn-primary" href="/api/notes/${n.id}/download">Download</a>
          <button class="btn btn-outline helpful" data-id="${n.id}">Helpful</button>
        </div>
      </article>`).join("");

    document.querySelectorAll(".helpful").forEach(btn => btn.addEventListener("click", async () => {
      try { await SC.api(`/api/notes/${btn.dataset.id}/helpful`, {method:"POST"}); btn.textContent = "Marked ✓"; }
      catch(e) { alert(e.message); }
    }));
  }

  document.getElementById("searchBtn").addEventListener("click", load);
  search.addEventListener("keydown", e => { if(e.key === "Enter") load(); });
  subject.addEventListener("change", load);
  sort.addEventListener("change", load);
  load();
})();