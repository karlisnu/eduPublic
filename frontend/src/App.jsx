import { useCallback, useEffect, useState } from "react";
import AdminLoginPage from "./AdminLoginPage.jsx";
import Dashboard from "./Dashboard.jsx";
import LoginPage from "./LoginPage.jsx";
import { API_URL, readApiResponse } from "./api.js";
import TutorRegistrationPage from "./TutorRegistrationPage.jsx";
import WelcomePage from "./WelcomePage.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState("alumno");
  const [tutorRegistration, setTutorRegistration] = useState(false);
  const adminLoginMode = window.location.pathname === "/admin-login";

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("institutional");
    const role = query.get("role") === "tutor" ? "tutor" : "alumno";
    const statusMessages = {
      unavailable: "El inicio con cuenta institucional no está configurado todavía.",
      failed: "No se pudo completar el inicio de sesión institucional. Inténtalo de nuevo.",
      conflict: "La cuenta institucional no coincide con un perfil elegible.",
      not_registered: "El usuario no está registrado",
      pending: "Tu cuenta está pendiente de aprobación. Recibirás acceso cuando un administrador la apruebe.",
      disabled: "La cuenta no está habilitada para iniciar sesión.",
      logout_first: "Cierra la sesión actual antes de iniciar con otra cuenta institucional.",
      exchange_failed: "Microsoft no pudo validar la cuenta institucional. Inténtalo nuevamente.",
    };

    if (status === "tutor_register") {
      setTutorRegistration(true);
      setSelectedRole("tutor");
    } else if (status && statusMessages[status]) {
      setAuthError(statusMessages[status]);
      setSelectedRole(role);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/session`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.error || "No se pudo restaurar la sesión.");
        return data;
      })
      .then(setUser)
      .catch((requestError) => {
        setAuthError(requestError.message);
        setShowLogin(true);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = async () => {
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await readApiResponse(response);
        throw new Error(data.error || "No se pudo cerrar la sesión.");
      }
      setUser(null);
      setSelectedRole("alumno");
      setShowLogin(false);
      setTutorRegistration(false);
    } catch (requestError) {
      setAuthError(requestError.message);
    }
  };

  const handleAdminLogin = async ({ identifier, password }) => {
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, role: "admin" }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
      if (data.role !== "admin") throw new Error("Esta cuenta no tiene acceso administrativo.");
      setUser(data);
    } catch (requestError) {
      setAuthError(requestError.message);
    }
  };

  const handleSessionExpired = useCallback((message) => {
    setUser(null);
    setAuthError(message);
    setShowLogin(true);
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setAuthError("");
  };

  const returnToLogin = () => {
    setTutorRegistration(false);
    window.history.replaceState({}, "", window.location.pathname);
    setSelectedRole("tutor");
    setAuthError("");
    setShowLogin(true);
  };

  if (authLoading) {
    return <main className="login-page"><p className="message">Verificando sesión...</p></main>;
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        authError={authError}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
      />
    );
  }

  if (tutorRegistration) {
    return <TutorRegistrationPage onBackToLogin={returnToLogin} />;
  }

  if (adminLoginMode) {
    return (
      <AdminLoginPage
        error={authError}
        onLogin={handleAdminLogin}
        onBack={() => window.location.assign("/")}
      />
    );
  }

  if (!showLogin) {
    return <WelcomePage onLogin={() => setShowLogin(true)} />;
  }

  return (
    <LoginPage
      selectedRole={selectedRole}
      onSelectRole={handleSelectRole}
      authError={authError}
      onBackToWelcome={() => {
        setShowLogin(false);
        setAuthError("");
        window.history.replaceState({}, "", window.location.pathname);
      }}
    />
  );
}

export default App;
