async function loadAdmin() {
  try {
    const me = await SC.api("/api/me");
    if (!me.user || me.user.role !== "admin") {
      location.href = "/login.html?next=/admin";
      return;
    }
    const {stats} = await SC.api("/api/admin/overview");
    document.getElementById("adminStats").innerHTML = [
      ["Students", stats.students], ["Total Notes", stats.total_notes],
      ["Pending Review", stats.pending], ["Reports", stats.reports]
    ].map(x => `<div class="admin-stat"><strong>${x[1]}</strong><small>${x[0]}</small></div>`).join("");
    await loadNotes("pending"); await loadReports();
  } catch(e) { alert(e.message); }
}

async function loadNotes(status) {
  document.querySelectorAll(".admin-tabs button").forEach(b => b.classList.toggle("active", b.dataset.status === status));
  const {notes} = await SC.api(`/api/admin/notes?status=${status}`);
  const box = document.getElementById("adminNotes");
  box.innerHTML = notes.length ? notes.map(n => `
    <article class="admin-item">
      <div><h3>${SC.esc(n.title)}</h3><p>${SC.esc(n.subject)} · ${SC.esc(n.uploader)} · ${SC.esc(n.original_name)}</p><p>${SC.esc(n.description || "No description")}</p></div>
      <div class="admin-actions">
        ${status === "pending" ? `<button class="approve" onclick="changeStatus(${n.id},'approved')">Approve</button><button class="reject" onclick="changeStatus(${n.id},'rejected')">Reject</button>` : ""}
        <button onclick="deleteNote(${n.id})">Delete</button>
      </div>
    </article>`).join("") : `<div class="empty card"><h3>No ${status} notes</h3></div>`;
}

async function changeStatus(id,status){try{await SC.api(`/api/admin/notes/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});loadAdmin();}catch(e){alert(e.message)}}
async function deleteNote(id){if(!confirm("Delete this note permanently?"))return;try{await SC.api(`/api/admin/notes/${id}`,{method:"DELETE"});loadAdmin();}catch(e){alert(e.message)}}
async function loadReports(){const {reports}=await SC.api("/api/admin/reports");document.getElementById("reports").innerHTML=reports.length?reports.map(r=>`<div class="report-row"><b>${SC.esc(r.title)}</b> — ${SC.esc(r.reason)}<small>Reported by ${SC.esc(r.reporter||"User")} · ${SC.esc(r.created_at)}</small></div>`).join(""):"<p>No reports.</p>"}
document.querySelectorAll(".admin-tabs button").forEach(b=>b.addEventListener("click",()=>loadNotes(b.dataset.status)));
document.getElementById("logoutBtn").addEventListener("click",async()=>{await SC.api("/api/auth/logout",{method:"POST"});location.href="/";});
loadAdmin();