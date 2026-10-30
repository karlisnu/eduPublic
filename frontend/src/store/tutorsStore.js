import { create } from "zustand";
import { API_URL, requestApi } from "../api.js";

let requestVersion = 0;

export const useTutorsStore = create((set) => ({
  items: [],
  loading: false,
  error: "",
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
}));
