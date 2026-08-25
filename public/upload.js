(async () => {
  const form = document.getElementById("uploadForm");
  const msg = document.getElementById("uploadMsg");
  try {
    const me = await SC.api("/api/me");
    if (!me.user) {
      msg.textContent = "Please login first. Redirecting...";
      setTimeout(() => location.href = "/login.html?next=/upload.html", 700);
      return;
    }
    const {subjects} = await SC.api("/api/subjects");
    document.getElementById("subjectId").innerHTML = '<option value="">Select subject</option>' +
      subjects.map(s => `<option value="${s.id}">${SC.esc(s.name)}</option>`).join("");
  } catch(e) { msg.textContent = e.message; }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "Uploading...";
    try {
      const data = await SC.api("/api/notes/upload", {method:"POST", body:new FormData(form)});
      msg.textContent = data.message;
      form.reset();
    } catch(e) { msg.textContent = e.message; }
  });
})();