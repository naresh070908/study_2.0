const tabs = document.querySelectorAll(".tab");
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(t => t.classList.remove("active")); tab.classList.add("active");
  const login = tab.dataset.tab === "login";
  document.getElementById("loginForm").hidden = !login;
  document.getElementById("registerForm").hidden = login;
}));

async function authSubmit(form, endpoint, msgId) {
  const msg = document.getElementById(msgId);
  try {
    const body = Object.fromEntries(new FormData(form).entries());
    await SC.api(endpoint, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
    const next = new URLSearchParams(location.search).get("next") || "/";
    location.href = next;
  } catch(e) { msg.textContent = e.message; }
}
document.getElementById("loginForm").addEventListener("submit", e => { e.preventDefault(); authSubmit(e.target, "/api/auth/login", "loginMsg"); });
document.getElementById("registerForm").addEventListener("submit", e => { e.preventDefault(); authSubmit(e.target, "/api/auth/register", "registerMsg"); });