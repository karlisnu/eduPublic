import { useTutorsStore } from "./store/tutorsStore.js";

function TutorResultsCount() {
  const count = useTutorsStore((store) => store.items.length);
  const loading = useTutorsStore((store) => store.loading);
  const error = useTutorsStore((store) => store.error);

  if (loading || error) return null;

  return <span className="result-count">{count} perfiles</span>;
}

export default TutorResultsCount;
