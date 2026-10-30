Universidad Estatal de Sonora

Universidad Estatal de Sonora\
Frontend Frameworks · Session 3

Frontend 061CE017 · M2 · Store with Zustand

# Find your store

First you learn what a store is, in plain words. Then you search your own project to see if you already have one. If you do not, you will see how to add it.

Part 1 · Read first · 5 min

## What is a store?

### The problem

**Picture this:** your app has a list of activities. The page shows the list. The header shows "12 activities". Both need the same data. If each one asks the server on its own, the server gets asked twice, and the two parts of the screen can end up showing different numbers.

You could pass the list from one component to the next, down through every level, but that gets messy fast. Beginners often fix it by copying the list into each component. Now there are three copies, and they stop matching.

### The idea

**A store is a whiteboard for your app.** The list is written on it once. Any component that needs the list looks at the whiteboard. Nobody keeps a private copy, and the server is asked once.

Page↘STORE (the whiteboard)→API file→Server

Header↗both read the same board

**Four words you will see:**

- **State**: the data your app remembers, like the list.
- **Store**: the one place that keeps the shared state.
- **Action**: a function in the store that changes the board, like "fetch the list".
- **Selector**: a small window that shows a component only the part of the board it needs.

### What it looks like in code

Zustand is a small library for stores. This is a whole store. Read the notes on the right of the table, line by line.

src/store/activitiesStore.ts

```
import { create } from "zustand";
import { listActivities } from "../api/activities";

export const useActivitiesStore = create((set, get) => ({
  items: [],
  status: "idle",

  fetchAll: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading" });
    try {
      const items = await listActivities();
      set({ items, status: "success" });
    } catch {
      set({ status: "error" });
    }
  },
}));
```

| Piece | In plain words |
| --- | --- |
| `create(...)` | Makes the whiteboard. The result is a function called `useActivitiesStore` that components use to look at it. |
| `items: []` | The list. It starts empty. |
| `status: "idle"` | What is happening now. One of: `idle` (nothing asked yet), `loading`, `success`, `error`. One word instead of many true/false switches. |
| `fetchAll` | The action that gets the list. |
| `if (get().status !== "idle") return` | "Already asked? Do nothing." This is why the server is asked only once. |
| `set({ ... })` | Writes on the whiteboard. Every component that reads that part updates by itself. |
| `listActivities()` | The store does not call `fetch`. It asks your API file, the one place that talks to the server. |

Your real store may also have TypeScript types, an `error` message and a `getById` action. The idea is the same.

### How a component uses it

```
// In the list page
const items    = useActivitiesStore((s) => s.items);
const fetchAll = useActivitiesStore((s) => s.fetchAll);
useEffect(() => { fetchAll(); }, [fetchAll]);

// In the header (a different component, same data)
const count = useActivitiesStore((s) => s.items.length);
```

**The `(s) => s.items` part is the selector.** It says "from the whole board, show me only `items`". The header takes only the length. It does not copy the list and it does not store a `count`: it works the number out each time.

**Two rules to remember.** (1) Never change the list in place with `items.push(x)`. The screen will not notice. Make a new list: `set((s) => ({ items: [...s.items, x] }))`. (2) Components never call `fetch`. They ask the store, and the store asks the API file.

Part 2 · Practical · 15 min · in your own project

## Look it up in your code

Open your project in VS Code. For each search below, press **Ctrl+Shift+F** (Cmd+Shift+F on Mac), paste the text, and read the results. Then choose what you found. No AI for this part.

#### Search 1 · Is Zustand installed?

```
zustand
```

**Look in** `package.json` (the "dependencies" part). If you prefer the terminal: `grep zustand package.json`

I see it It is not there

#### Search 2 · Is there a store file?

```
from "zustand"
```

**Look for** a file, probably in `src/store/`, that has `create(` in it, like the code above. Terminal: `grep -rln 'from "zustand"' src`. Write down its path:

I found a store file No file

#### Search 3 · Does any component read the store?

```
Store(
```

**Look for** lines like `useActivitiesStore((s) => s.items)` inside your page or components (not inside the store file itself). Terminal: `grep -rn "Store(" src`

Yes, at least one No

#### Search 4 · Does a component call fetch by itself?

```
fetch(
```

**You want** to see it only inside `src/api/` (for example `client.ts`). If it shows up in a page or component, that is a problem. Terminal: `grep -rn "fetch(" src`

Only in src/api Also in a component or page

#### Search 5 · Does a page keep its own copy of the list?

```
useState([])
```

**You want** no result in the page that shows the list. A `useState([])` that holds the activities is a private copy. Terminal: `grep -rn "useState(\[\])" src`

No private copy Yes, a page has its own copy

Using Vue, Angular or Next.js?

The idea is the same, only the names change. Vue: a Pinia store (`defineStore`) and `storeToRefs`. Angular: a service that keeps the list in a signal. Next.js: Zustand in client components, as above. Search for those names instead of `zustand` and follow the same steps.

Self-check · 2 min · cover the answers first

1. Why does a store mean the server is asked once and not twice?

   Answer

   The list lives in one place. The first call fills it, and `fetchAll` does nothing if the status is no longer `idle`. Every component reads the same data.
2. Your header needs the number of activities. Do you add a `count` field to the store?

   Answer

   No. Work it out with `items.length` where you need it. A stored count is another copy that can fall out of date.
3. You wrote `items.push(newItem)` and the screen did not change. Why, and what do you write?

   Answer

   It changed the same list, so the app saw nothing new. Write `set((s) => ({ items: [...s.items, newItem] }))` to make a new list.

## Part 3 · Break it · 15 min

Use the real tutor store in `frontend/src/store/tutorsStore.js` and the student
dashboard in `frontend/src/Dashboard.jsx`. In this store, `loading` is the
status-like value; there is no `status` field. Make these changes temporarily,
observe the screen and console, then remove every temporary button and probe.
Wait for the dashboard's initial tutor load to finish before each experiment,
so a real API response does not change `items` or `loading` during the test.

### A. Mutate the list in place

1. In `Dashboard`, temporarily add this button near the tutor results:

   ```jsx
   <button
     type="button"
     onClick={() =>
       useTutorsStore.setState((state) => {
         state.items.push({
           id: "temporary",
           name: "Tutor temporal",
           subject: "Prueba",
           bio: "",
           experience: "",
           rating: 0,
           is_available: false,
         });
         return state;
       })
     }
   >
     Add tutor (mutate)
   </button>
   ```

2. Open the student dashboard and click once. The result count and cards do not
   update: the store got the same state object back, so Zustand did not notify
   subscribers. The list was still changed in memory. Reload the page to clear
   that temporary mutation.
3. Keep the button, but replace its handler with an immutable update:

   ```jsx
   onClick={() =>
     useTutorsStore.setState((state) => ({
       items: [
         ...state.items,
         {
           id: "temporary",
           name: "Tutor temporal",
           subject: "Prueba",
           bio: "",
           experience: "",
           rating: 0,
           is_available: false,
         },
       ],
     }))
   }
   ```

4. Click once again. The new array and state object notify the subscribers, so
   the result count and the temporary tutor card appear. Record what changed:

   - In-place mutation: ______________________________________________
   - New array: _______________________________________________________

### B. Subscribe to the whole store, then select narrowly

1. Temporarily create `frontend/src/StoreRenderProbe.jsx`:

   ```jsx
   import { memo } from "react";
   import { useTutorsStore } from "./store/tutorsStore.js";

   const StoreRenderProbe = memo(function StoreRenderProbe() {
     const store = useTutorsStore();
     console.count("StoreRenderProbe");
     return <p>Loading: {String(store.loading)}</p>;
   });

   export default StoreRenderProbe;
   ```

   Import and render `<StoreRenderProbe />` in `Dashboard`. `memo` keeps parent
   renders from being counted as probe renders.

2. Temporarily add a button in `Dashboard` to toggle the store's `loading`
   value:

   ```jsx
   <button
     type="button"
     onClick={() =>
       useTutorsStore.setState((state) => ({ loading: !state.loading }))
     }
   >
     Toggle loading
   </button>
   ```

3. Clear the browser console, click the button three times, and note the change
   in `StoreRenderProbe`'s count. The full-store subscription sees each store
   update, even though the items did not change.
4. Change only the probe's subscription and displayed value:

   ```jsx
   const items = useTutorsStore((state) => state.items);
   console.count("StoreRenderProbe");
   return <p>Tutors: {items.length}</p>;
   ```

   Clear the console again, click the same button three times, and record the
   count change. Since the selected `items` array did not change, this probe
   should not rerender for `loading` updates.

   - Whole-store count change after three clicks: _____________________
   - `items` selector count change after three clicks: _________________

   The exact count can vary in development, so compare the count change across
   the same three clicks rather than assuming a fixed initial render count.

5. Remove the temporary button, the probe import/render, and
   `StoreRenderProbe.jsx`. Reload the dashboard and confirm the temporary tutor
   is gone.

Universidad Estatal de Sonora

Frontend 061CE017\
M2 · Store with Zustand