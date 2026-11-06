import { useEffect, useState } from "react";
import { useTutorsStore } from "./store/tutorsStore.js";

const emptyProfile = { firstName: "", lastName: "", bio: "", experience: "", isAvailable: false };

function AdminTutorManagement({ onSessionExpired }) {
  const tutors = useTutorsStore((store) => store.adminItems);
  const loading = useTutorsStore((store) => store.adminLoading);
  const error = useTutorsStore((store) => store.adminError);
  const fetchTutors = useTutorsStore((store) => store.fetchAdminAll);
  const updateTutor = useTutorsStore((store) => store.updateAdminTutor);
  const deleteTutor = useTutorsStore((store) => store.deleteAdminTutor);
  const [editingTutorId, setEditingTutorId] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchTutors(controller.signal).catch((requestError) => {
      if (requestError.status === 401) onSessionExpired(requestError.message);
    });
    return () => controller.abort();
  }, [fetchTutors, onSessionExpired]);

  const startEditing = (tutor) => {
    setEditingTutorId(tutor.id);
    setProfile({
      firstName: tutor.first_name,
      lastName: tutor.last_name,
      bio: tutor.bio || "",
      experience: tutor.experience,
      isAvailable: Boolean(tutor.is_available),
    });
    setSubmitStatus("idle");
    setSubmitMessage("");
  };

  const saveTutor = async (event) => {
    event.preventDefault();
    if (submitStatus === "submitting") return;
    setSubmitStatus("submitting");
    setSubmitMessage("");
    try {
      await updateTutor(editingTutorId, profile);
      setSubmitStatus("success");
      setSubmitMessage("Perfil actualizado.");
      setEditingTutorId(null);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setSubmitStatus("error");
      setSubmitMessage(requestError.message);
    }
  };

  const removeTutor = async (tutor) => {
    if (submitStatus === "submitting") return;
    if (!window.confirm(`¿Eliminar permanentemente la cuenta de tutor de ${tutor.username}?`)) return;

    setSubmitStatus("submitting");
    setSubmitMessage("");
    try {
      await deleteTutor(tutor.id);
      setSubmitStatus("success");
      setSubmitMessage("Tutor eliminado.");
      if (editingTutorId === tutor.id) setEditingTutorId(null);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setSubmitStatus("error");
      setSubmitMessage(requestError.message);
    }
  };

  return (
    <section className="management-section admin-tutors">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Perfiles de tutor</p>
          <h2>Administrar tutores</h2>
        </div>
      </div>
      {loading && <p className="message">Cargando tutores...</p>}
      {error && <p className="management-alert error" role="alert">{error}</p>}
      {submitMessage && (
        <p className={`management-alert ${submitStatus}`} role={submitStatus === "error" ? "alert" : "status"}>
          {submitMessage}
        </p>
      )}
      {!loading && !error && tutors.length === 0 && (
        <p className="message">No hay perfiles de tutor registrados.</p>
      )}
      <div className="approval-list">
        {tutors.map((tutor) => (
          <article className="approval-card" key={tutor.id}>
            {editingTutorId === tutor.id ? (
              <form className="tutor-edit-form" onSubmit={saveTutor}>
                <h3>Editar {tutor.username}</h3>
                <label>Nombre
                  <input
                    value={profile.firstName}
                    onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                    pattern="\p{L}+"
                    maxLength={80}
                    required
                  />
                </label>
                <label>Apellido
                  <input
                    value={profile.lastName}
                    onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                    pattern="\p{L}+"
                    maxLength={120}
                    required
                  />
                </label>
                <label>Experiencia (máximo 100 caracteres)
                  <input
                    value={profile.experience}
                    onChange={(event) => setProfile({ ...profile, experience: event.target.value })}
                    maxLength={100}
                    required
                  />
                </label>
                <label>Descripción (máximo 100 caracteres)
                  <textarea
                    value={profile.bio}
                    onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                    maxLength={100}
                    rows={2}
                  />
                </label>
                <label className="tutor-availability-toggle">
                  <input
                    type="checkbox"
                    checked={profile.isAvailable}
                    onChange={(event) => setProfile({ ...profile, isAvailable: event.target.checked })}
                  />
                  Disponible para solicitudes
                </label>
                <div className="approval-actions">
                  <button type="submit" disabled={submitStatus === "submitting"}>
                    {submitStatus === "submitting" ? "Guardando..." : "Guardar"}
                  </button>
                  <button type="button" onClick={() => setEditingTutorId(null)} disabled={submitStatus === "submitting"}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <h3>{tutor.first_name} {tutor.last_name}</h3>
                  <p>{tutor.email} · {tutor.username}</p>
                  <p>Estado: {tutor.account_status} / {tutor.application_status}</p>
                  <p>{tutor.bio || tutor.experience}</p>
                  <span>{tutor.is_available ? "Disponible" : "No disponible"}</span>
                </div>
                <div className="approval-actions">
                  <button type="button" onClick={() => startEditing(tutor)} disabled={submitStatus === "submitting"}>
                    Editar
                  </button>
                  <button type="button" onClick={() => removeTutor(tutor)} disabled={submitStatus === "submitting"}>
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminTutorManagement;
