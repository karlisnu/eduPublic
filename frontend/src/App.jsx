import { useCallback, useEffect, useState } from "react";
import AdminLoginPage from "./AdminLoginPage.jsx";
import Dashboard from "./Dashboard.jsx";
import LoginPage from "./LoginPage.jsx";
import { API_URL, ApiError, requestApi } from "./api.js";
import NotFoundPage from "./NotFoundPage.jsx";
import StudentRegistrationPage from "./StudentRegistrationPage.jsx";
import TutorRegistrationPage from "./TutorRegistrationPage.jsx";
import WelcomePage from "./WelcomePage.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [institutionalLoginLoading, setInstitutionalLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState("alumno");
  const [registrationRole, setRegistrationRole] = useState(null);
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const adminLoginMode = pathname === "/admin-login";
  const knownPath = pathname === "/" || adminLoginMode;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("institutional");
    const role = query.get("role") === "tutor" ? "tutor" : "alumno";
    const statusMessages = {
      unavailable: "El inicio con cuenta institucional no está configurado todavía.",
      failed: "No se pudo completar el inicio de sesión institucional. Inténtalo de nuevo.",
      conflict: "La cuenta institucional no coincide con un perfil elegible.",
      not_registered: "No encontramos un perfil para esta cuenta. Inicia el proceso con Microsoft para completar tu registro.",
      pending: "Tu cuenta está pendiente de aprobación. Recibirás acceso cuando un administrador la apruebe.",
      disabled: "La cuenta no está habilitada para iniciar sesión.",
      logout_first: "Cierra la sesión actual antes de iniciar con otra cuenta institucional.",
      exchange_failed: "Microsoft no pudo validar la cuenta institucional. Inténtalo nuevamente.",
    };

    if (status === "student_register" || status === "tutor_register") {
      const role = status === "student_register" ? "alumno" : "tutor";
      setRegistrationRole(role);
      setSelectedRole(role);
    } else if (status && statusMessages[status]) {
      setAuthError(statusMessages[status]);
      setSelectedRole(role);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (!knownPath) {
      setAuthLoading(false);
      return undefined;
    }

    requestApi(`${API_URL}/api/session`, { credentials: "include" })
      .then(({ data }) => data)
      .then(setUser)
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) return;
        setAuthError(requestError instanceof TypeError
          ? "No se pudo conectar con EduMatch. Verifica que el backend y MySQL estén activos."
          : requestError.message);
        setShowLogin(true);
      })
      .finally(() => setAuthLoading(false));
  }, [knownPath]);

  const handleLogout = async () => {
    setAuthError("");
    try {
      await requestApi(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setSelectedRole("alumno");
      setShowLogin(false);
      setRegistrationRole(null);
    } catch (requestError) {
      setAuthError(requestError.message);
    }
  };

  const handleAdminLogin = async ({ identifier, password }) => {
    setAuthError("");
    try {
      const { data } = await requestApi(`${API_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (data.role !== "admin") throw new Error("Esta cuenta no tiene acceso administrativo.");
      setUser(data);
    } catch (requestError) {
      setAuthError(requestError.message);
    }
  };

  const handleInstitutionalLogin = async (role) => {
    setAuthError("");
    setInstitutionalLoginLoading(true);
    try {
      await requestApi(`${API_URL}/api/health`, { credentials: "include" });
      window.location.assign(
        `${API_URL}/api/auth/microsoft?role=${encodeURIComponent(role)}`,
      );
    } catch (requestError) {
      setAuthError(requestError instanceof TypeError
        ? "No se pudo conectar con el servidor de EduMatch. Verifica que el backend y MySQL estén activos."
        : requestError.message);
    } finally {
      setInstitutionalLoginLoading(false);
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
    setRegistrationRole(null);
    window.history.replaceState({}, "", window.location.pathname);
    setSelectedRole(registrationRole || "alumno");
    setAuthError("");
    setShowLogin(true);
  };

  if (authLoading) {
    return <main className="login-page"><p className="message">Verificando sesión...</p></main>;
  }

  if (!knownPath) return <NotFoundPage />;

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

  if (registrationRole === "alumno") {
    return <StudentRegistrationPage onBackToLogin={returnToLogin} />;
  }

  if (registrationRole === "tutor") {
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
      institutionalLoginLoading={institutionalLoginLoading}
      onInstitutionalLogin={handleInstitutionalLogin}
      onBackToWelcome={() => {
        setShowLogin(false);
        setAuthError("");
        window.history.replaceState({}, "", window.location.pathname);
      }}
    />
  );
}

export default App;
