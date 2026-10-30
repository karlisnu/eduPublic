import { useSyncExternalStore } from "react";
import { API_URL, requestApi } from "../api.js";

const REFRESH_INTERVAL_MS = 5000;
const listeners = new Set();
let refreshTimer;
let requestVersion = 0;
const pendingRequests = new Set();

let state = {
  tutorId: null,
  weekStart: null,
  slots: [],
  loading: false,
  error: "",
};

function setState(updates) {
  state = { ...state, ...updates };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadAvailability(tutorId, weekStart, showLoading = false) {
  const key = `${tutorId}:${weekStart}`;
  if (pendingRequests.has(key)) return;
  pendingRequests.add(key);
  const version = ++requestVersion;
  if (showLoading) setState({ loading: true, error: "" });

  try {
    const { data } = await requestApi(
      `${API_URL}/api/tutor-management/tutors/${tutorId}/availability?weekStart=${encodeURIComponent(weekStart)}`,
      { credentials: "include" },
    );
    if (version !== requestVersion) return;
    setState({
      tutorId,
      weekStart,
      slots: data.slots,
      loading: false,
      error: "",
    });
  } catch (error) {
    if (version !== requestVersion) return;
    setState({ loading: false, error: error.message });
  } finally {
    pendingRequests.delete(key);
  }
}

export function startTutorAvailabilitySync(tutorId, weekStart) {
  window.clearInterval(refreshTimer);
  requestVersion += 1;
  setState({ tutorId, weekStart, slots: [], loading: true, error: "" });
  void loadAvailability(tutorId, weekStart, true);
  refreshTimer = window.setInterval(
    () => void loadAvailability(tutorId, weekStart),
    REFRESH_INTERVAL_MS,
  );

  return () => {
    if (state.tutorId !== tutorId || state.weekStart !== weekStart) return;
    window.clearInterval(refreshTimer);
    requestVersion += 1;
    setState({ tutorId: null, weekStart: null, slots: [], loading: false, error: "" });
  };
}

export function useTutorAvailabilityStore(selector) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}
