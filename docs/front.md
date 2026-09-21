# Hoja de trabajo del estudiante: tu primer frontend (M1, sesión 2)

**Fecha:** 12 de septiembre de 2026 · **Duración:** 2 horas · **Trabajo en parejas** (quien conduce escribe, quien navega lee este documento en voz alta; **cambien cada 20 minutos**)
**Tu framework:** React, Vue o Angular; los **conceptos son idénticos**, solo cambia la sintaxis. Esta hoja muestra primero la idea y después las tres sintaxis.
**Reglas:** trabajen dentro del **dev container**, en una **rama** (`git switch -c feat/m1-frontend`) y hagan un commit después de cada bloque que funcione.

> **Aplicación en EDU-EduMatch:** el frontend activo del proyecto usa **React 19**, **React DOM**, **JSX**, **Vite** y **CSS**. Los ejemplos de Vue y Angular de esta hoja sirven únicamente para comparar conceptos; no forman parte de las dependencias actuales.

> **La frase que hay que recordar durante toda la clase:**
> _Un componente convierte los **datos** en **marcado**, y el framework lo **vuelve a ejecutar** automáticamente cada vez que cambian sus datos._

---

## Las 5 ideas que comparten todos los frameworks frontend

| # | Idea compartida | Qué significa | React | Vue (Composition) | Angular |
| --- | --- | --- | --- | --- | --- |
| 1 | **Componente** | Unidad con nombre y reutilizable que muestra marcado | Función que devuelve JSX | Archivo `.vue` (`<script setup>`) | Clase `@Component` |
| 2 | **Entradas** | Datos que el padre pasa _hacia abajo_; el hijo solo los lee | `props` | `defineProps()` | `@Input()` |
| 3 | **Estado reactivo** | Datos que pertenecen al componente; al cambiar, la interfaz se actualiza sola | `useState` | `ref()` | `signal()` |
| 4 | **Eventos** | Las acciones del usuario (clic, escritura) llaman a tu función | `onClick={...}` | `@click="..."` | `(click)="..."` |
| 5 | **Montaje** | Un componente raíz se conecta a un elemento de `index.html` | `createRoot().render(<App/>)` | `createApp(App).mount('#app')` | `<app-root>` |

Mantengan esta tabla abierta durante toda la clase: es su **piedra de Rosetta**.

---

## Bloque 1 (0:10–0:25): tu primer componente, `Greeting`

**Objetivo:** construir un componente con una **entrada**, **estado** y **evento**, y verlo funcionar en el navegador.

Requisitos (son iguales para todos los frameworks):

1. Recibe una entrada: `name` (string), enviada por el padre.
2. Muestra `Hello, <name>!`.
3. Tiene un estado propio: `count`, que comienza en 0.
4. Un `<button>` incrementa `count` y muestra `Clicked N times`.
5. Debe estar visible en el servidor de desarrollo: React/Vue → `http://localhost:5173`; Angular → `http://localhost:4200`.

### React: `src/Greeting.tsx`

```tsx
import { useState } from "react";

export function Greeting({ name }: { name: string }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h2>Hello, {name}!</h2>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </div>
  );
}
```

> Úsenlo en `App.tsx`: `<Greeting name="World" />`

### Vue: `src/Greeting.vue`

```vue
<script setup>
import { ref } from "vue";
defineProps({ name: String });
const count = ref(0);
</script>

<template>
  <div>
    <h2>Hello, {{ name }}!</h2>
    <button @click="count++">Clicked {{ count }} times</button>
  </div>
</template>
```

> Úsenlo en `App.vue`: `<Greeting name="World" />`

### Angular: `src/app/greeting/greeting.ts`

```ts
import { Component, Input, signal } from "@angular/core";

@Component({
  selector: "app-greeting",
  template: `
    <h2>Hello, {{ name }}!</h2>
    <button (click)="count.set(count() + 1)">
      Clicked {{ count() }} times
    </button>
  `,
})
export class Greeting {
  @Input() name = "";
  count = signal(0);
}
```

> Úsenlo en la plantilla raíz: `<app-greeting name="World" />`

### ✅ Comprobación

- [ ] Greeting aparece con el nombre recibido.
- [ ] Al hacer clic, el número se actualiza **sin recargar la página**.
- [ ] Cambien el texto `"World"` en el padre y guarden: el navegador se actualiza automáticamente (HMR).
- [ ] **Comenten con su pareja:** señalen la entrada, el estado y el manejador del evento. Ahora señalen dónde actualizaron el DOM manualmente: _no existe ese lugar_.

**Commit:** `feat: first Greeting component`

---

## Bloque 2 (0:25–0:35): agregar Tailwind CSS

**Concepto:** Tailwind reemplaza el CSS escrito manualmente por **clases utilitarias pequeñas y de un solo propósito** en el marcado: `p-4` = espaciado interno, `rounded-lg` = esquinas redondeadas, `text-sm` = texto pequeño. El diseño adaptable usa un **prefijo**: `md:grid-cols-2` significa «desde el punto de corte `md`, dos columnas». Sin prefijo = móvil. Esto se llama **mobile-first**.

### Pasos (Vite: React y Vue)

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

Registren el plugin en `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // Vue: import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()], // Vue: plugins: [vue(), tailwindcss()]
});
```

Reemplacen `src/index.css` (o `src/style.css`) por:

```css
@import "tailwindcss";
```

### Pasos (Angular)

```bash
npm install tailwindcss
npx tailwindcss init
```

Agreguen a `angular.json` → `build.options.styles`: `"src/styles.css"`, y en `src/styles.css`:

```css
@import "tailwindcss";
```

### ✅ Comprobación: aplicar estilos a `Greeting`

Envuélvanlo con utilidades y confirmen que los estilos se muestran:

```html
<main class="min-h-screen bg-gray-50 p-8">
  <h1 class="text-2xl font-bold text-gray-900">My First Frontend</h1>
  <!-- your Greeting component here -->
</main>
```

- [ ] El fondo es gris claro y el encabezado es grande y negrita.
- [ ] ¿Nada tiene estilo? El plugin no está registrado o falta importar el CSS.

**Commit:** `feat: add Tailwind CSS`

---
