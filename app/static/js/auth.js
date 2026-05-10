const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const API_BASE = "";
const DASHBOARD_URL = "/dashboard";

const existingToken = localStorage.getItem("access_token");
if (existingToken) {
  window.location.href = DASHBOARD_URL;
}

const setMessage = (message, isError = false) => {
  loginMessage.textContent = message;
  loginMessage.style.color = isError ? "#c0392b" : "#1f7a68";
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";

  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      setMessage(result.message || "Login failed", true);
      return;
    }

    localStorage.setItem("access_token", result.data.access_token);
    setMessage("Login successful. Redirecting...");
    window.location.href = DASHBOARD_URL;
  } catch (error) {
    setMessage("Unable to login. Check your connection.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign in";
  }
});
