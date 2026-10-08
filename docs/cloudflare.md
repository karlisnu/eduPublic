
### 1. Instalar `cloudflared`
En Linux x64, descarga e instala la herramienta:

```bash
curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/cloudflared
```

Verifica que se instaló correctamente:
```bash
cloudflared --version
```

### 2. Iniciar EduMatch
La aplicación usa Vite en el puerto `5173` y la API Node.js en el puerto `8000`.
El proxy Vite reenvía las solicitudes `/api` del frontend al backend local.
Con MySQL iniciado, aplica las migraciones y ejecuta frontend y backend en
terminales separadas:

```bash
npm --prefix backend run db:migrate
npm --prefix backend run dev
npm --prefix frontend run dev -- --host 0.0.0.0
```

Confirma que `http://localhost:8000/api/health` responde antes de continuar.

### 3. Exponer el frontend a internet
En otra terminal, crea el túnel hacia Vite (no directamente hacia la API) y
anota el host generado. Detén el servidor Vite y reinícialo permitiendo solo
ese host:

```bash
cloudflared tunnel --url http://localhost:5173
VITE_ALLOWED_HOST=xxxx.trycloudflare.com npm --prefix frontend run dev -- --host 0.0.0.0
```

Reemplaza `xxxx.trycloudflare.com` con el host exacto que imprimió
`cloudflared`. Si cambias/reinicias el túnel y se genera otro host, reinicia
Vite con ese nuevo valor.

Abre esa URL para usar el frontend; sus solicitudes `/api` pasarán por el proxy
de Vite al backend. El túnel temporal solo permanece disponible mientras ese
proceso de `cloudflared` siga ejecutándose.
