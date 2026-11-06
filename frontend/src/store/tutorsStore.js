import { create } from "zustand";
import {
  API_URL,
  deleteAdminTutor,
  getAdminTutors,
  registerTutor,
  requestApi,
  updateAdminTutor,
} from "../api/api.js";

let requestVersion = 0;
let adminRequestVersion = 0;

export const useTutorsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: "",
  adminItems: [],
  adminLoading: false,
  adminError: "",
  fetchAll: async (subject, signal) => {
    const version = ++requestVersion;
    const query = subject.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : "";
    set({ loading: true, error: "" });

    try {
      const { data } = await requestApi(`${API_URL}/api/tutors${query}`, {
        credentials: "include",
        signal,
      });
      if (version === requestVersion && !signal?.aborted) {
        set({ items: data, loading: false, error: "" });
      }
    } catch (error) {
      if (version === requestVersion && !signal?.aborted) {
        set({ loading: false, error: error.message });
      }
      throw error;
    } finally {
      if (version === requestVersion) {
        set({ loading: false });
      }
    }
  },
  fetchAdminAll: async (signal) => {
    const version = ++adminRequestVersion;
    set({ adminLoading: true, adminError: "" });

    try {
      const { data } = await getAdminTutors(signal);
      if (version === adminRequestVersion && !signal?.aborted) {
        set({ adminItems: data, adminLoading: false, adminError: "" });
      }
    } catch (error) {
      if (version === adminRequestVersion && !signal?.aborted) {
        set({ adminLoading: false, adminError: error.message });
      }
      throw error;
    } finally {
      if (version === adminRequestVersion) set({ adminLoading: false });
    }
  },
  registerTutor: async (profile) => {
    const { data } = await registerTutor(profile);
    return data;
  },
  updateAdminTutor: async (id, profile) => {
    const result = await updateAdminTutor(id, profile);
    try {
      await get().fetchAdminAll();
    } catch (error) {
      const refreshError = new Error(
        `El perfil se guardó, pero no se pudo actualizar la lista: ${error.message}`,
      );
      refreshError.status = error.status;
      throw refreshError;
    }
    return result.data;
  },
  deleteAdminTutor: async (id) => {
    const result = await deleteAdminTutor(id);
    try {
      await get().fetchAdminAll();
    } catch (error) {
      const refreshError = new Error(
        `El tutor se eliminó, pero no se pudo actualizar la lista: ${error.message}`,
      );
      refreshError.status = error.status;
      throw refreshError;
    }
    return result.data;
  },
}));
