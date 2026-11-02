# EduMatch | Activity 01

Request handling, failures, environment configuration, and lifted state

## 1. A request helper

**Helper file:** `frontend/src/api/api.js`

`requestApi` centralizes HTTP response handling:

```js
const data = await readApiResponse(response);

if (!response.ok && !allowedStatuses.includes(response.status)) {
  throw new ApiError(
    response.status,
    data?.error || statusMessages[response.status] || "No se pudo completar la solicitud.",
    data,
  );
}
```

**Resource module:** `frontend/src/store/tutorsStore.js`

```js
import { API_URL, requestApi } from "../api/api.js";

const { data } = await requestApi(`${API_URL}/api/tutors${query}`, {
  credentials: "include",
  signal,
});
if (version === requestVersion && !signal?.aborted) {
  set({ items: data, loading: false, error: "" });
}
```

**Verification command** (run from `frontend/`):

```bash
grep -rn "fetch(" src | grep -v api/
```

Output: no lines (empty).

I keep the HTTP boundary in `frontend/src/api/api.js`, where `requestApi` parses responses and reports HTTP failures consistently. I use this helper from resource modules such as `tutorsStore` instead of writing `fetch` calls in each feature. The requested grep command prints no lines because the only `fetch` call is inside `src/api/`, which the filter excludes; the other frontend consumers call `requestApi`. The already-prepared login 401 and student-registration 201 examples remain part of the existing status-code explanation.

## 2. Two types of failure

**Network failure:** `frontend/src/api/api.js`

```js
let response;
try {
  response = await fetch(url, fetchOptions);
} catch (error) {
  if (error instanceof TypeError) {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.",
    );
  }
  throw error;
}
```

**HTTP failure** (a response was received, but it was not successful): `frontend/src/api/api.js`

```js
if (!response.ok && !allowedStatuses.includes(response.status)) {
  throw new ApiError(
    response.status,
    data?.error || statusMessages[response.status] || "No se pudo completar la solicitud.",
    data,
  );
}
```

[CAPTURA: app with backend stopped, showing a readable connection error and HTTP 0.]

[CAPTURA: app displaying a readable 404 message, for example “No se encontró el recurso solicitado. (HTTP 404)”.]

I classify a rejected `fetch` as a network failure and expose it as status 0 with a connection-specific message. I classify a response with `response.ok === false` as an HTTP failure and preserve the server status and any API-provided error. These cases are separate because a network failure provides no HTTP response, while an HTTP failure confirms that the server answered. I will insert the two captures above to show the distinct messages in the running app.

## 3. The 204 No Content case

**File:** `frontend/src/api/api.js`

Exact line executed before reading a response body:

```js
if (response.status === HTTP_STATUS.NO_CONTENT) return null;
```

DELETE response smoke test (fetch stubbed to return an empty 204):

```text
DELETE 204: status=204, data=null
```

This verifies response handling in `requestApi`; it does not call a live endpoint or modify database data.

I return `null` immediately when the status is 204, before attempting to parse a body. A 204 response is intentionally empty, so calling `res.json()` would reject while parsing the empty body and can produce “Unexpected end of JSON input”. I verified the helper with a DELETE request whose mocked fetch returned an empty 204 response; the console output above completed without a parse error. This smoke test proves the client handles the empty success response, but it does not claim that a real database deletion was performed.

## 4. Backend URL from an environment variable

**Client usage:** `frontend/src/api/api.js`

```js
export const API_URL = import.meta.env.VITE_API_URL || "";
```

**Example configuration only:** `frontend/.env.example`

```dotenv
# Optional absolute API origin. Leave empty to use the Vite /api proxy.
VITE_API_URL=
```

**Verification command** (run from `frontend/`):

```bash
grep -rn "localhost" src
```

Output: no lines (empty).

I read `VITE_API_URL` in the shared client and leave it blank in the example so local requests use Vite’s `/api` proxy. The source search for `localhost` is empty because the local proxy target is configured in `vite.config.mjs`, outside `src`. I do not put credentials or other secrets in this variable. Vite embeds `VITE_` variables in the client bundle, so anyone can inspect them in the browser.

## 5. Lifting state up

**File:** `frontend/src/App.jsx` (current working tree)

The parent owns the query and derives the visible results during render:

```jsx
const [subject, setSubject] = useState("");
const normalizedSubject = subject.trim().toLocaleLowerCase();
const filteredTutors = tutors.filter((tutor) =>
  !normalizedSubject
  || (tutor.subject || "").toLocaleLowerCase().includes(normalizedSubject)
);

<TutorSearchInput value={subject} onChange={setSubject} />
<TutorList tutors={filteredTutors} loading={loading} error={error} />
```

The input child edits the parent-owned value:

```jsx
function TutorSearchInput({ value, onChange }) {
  return (
    <label className="search-box">
      <span>Materia</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
```

The list child reads the filtered array:

```jsx
function TutorList({ tutors, loading, error }) {
  // Renders the tutors passed in through props.
}
```

I keep the search value in the parent because both the input and results need the same value. The parent sends `value` and filtered tutors down as props, and the input sends changes back through the `onChange` callback. `TutorList` receives the derived list and renders it without keeping a second copy of the results. I calculate `filteredTutors` during render instead of storing it in another `useState`, which prevents duplicated data from becoming stale when the query or tutor results change.

## Closing

Branch: [activity/w01-](https://github.com/karlisnu/EduMatch/tree/activity/w01-) (local branch; not pushed).

Source commits:

- `bcb9afb7c185872e8686513d49f8d6e27e2ca79a` — API helper migration and configuration.
- `5ba29d6` — academic activity document.
