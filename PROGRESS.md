# PROGRESS — App Gasolinas Ecuador

Última actualización: **12 de octubre de 2026**

---

## 1. Qué se hizo hoy

### Backend (`app-gasolinas-backend` → GitHub `panbl87/app-gasolinas`)
- **Rutas admin** en `src/routes/admin.ts`, montadas en `/api/admin` (`src/server.ts`).
  Todas piden el header `x-admin-token`:

  | Método | Ruta | Qué hace |
  |---|---|---|
  | GET | `/api/admin/reportes/pendientes` | Reportes sin validar (`es_verificado = false`) |
  | GET | `/api/admin/reportes?estado=VALIDADO` | Reportes validados + `stats: { hoy, semana }` |
  | POST | `/api/admin/reportes/:id/validar` | Marca el reporte como validado |
  | POST | `/api/admin/reportes/:id/rechazar` | Body `{ razon }`. **Elimina** el reporte y guarda la razón en `auditoria` |
  | POST | `/api/admin/reportes/crear-manual` | Body `{ gasolinera_id, tipo_combustible, precio }`. Crea un precio ya validado |

- `ADMIN_TOKEN` agregado al `.env` (local, no está en GitHub) y un placeholder en `.env.example`.

### Frontend (`app-gasolinas-frontend` → GitHub `panbl87/app-gasolinas-frontend`)
- **Repositorio nuevo**: se hizo `git init` y se subió a GitHub (antes no tenía git).
- **Panel Admin** en `http://localhost:5173/admin`:
  - `src/pages/AdminPage.jsx`: login con token, "Cerrar sesión", "Volver a la app".
  - `src/components/AdminPanel.jsx`: pestañas **Pendientes** (se actualiza cada 30 s, Validar / Rechazar con razón), **Validados** (contador hoy / semana) y **Crear Manual**.
  - `src/main.jsx`: si la URL es `/admin` muestra el panel; si no, la app normal.
- **Página principal**:
  - Filtro de combustible con botones (`src/components/FuelFilter.jsx`): Super · Extra · Ecopaís · Diesel · Todos. Super está seleccionado al abrir.
  - Tabla resumen: columnas **Super → Extra → Diesel**; la columna del combustible elegido se resalta en morado pastel.
  - Modal "Reportar Precio": los 4 combustibles con el mismo diseño, Super primero y seleccionado por defecto.

---

## 2. Qué está pendiente

- [ ] **Tabla `reportes_precios` en Supabase** (ver sección 6). Primero hay que decidir si se usa.
- [ ] **Columna Ecopaís en la tabla resumen**: el filtro tiene Ecopaís, pero la tabla no muestra su precio.
- [ ] **`VITE_API_URL`**: la app principal todavía tiene la IP fija `http://192.168.10.133:3000/api` en `App.jsx`, `CrearGasolineraForm.jsx`, `ReportarPrecio.jsx` y `ReportarPrecioModal.jsx`. El panel admin ya lee `VITE_API_URL`.
- [ ] **`vercel.json` en el frontend** con un rewrite a `index.html`; sin eso, abrir `/admin` directamente en Vercel da 404.
- [ ] **Colores de precio** (`getPriceColor` en `GasolineraList.jsx`): usa límites de $2.00 / $2.50, así que hoy todos los precios salen en rojo.
- [ ] **Actualizar `database.sql`**: la base real tiene columnas que el archivo no tiene (`precios.fuente`, `precios.cantidad_reportes`, `gasolineras.estado`).
- [ ] **Cambiar `ADMIN_TOKEN`** por uno difícil de adivinar antes de publicar, y configurarlo en Vercel.
- [ ] Probar en el navegador Validar / Rechazar / Crear Manual con un reporte real. Hoy solo se probó que las rutas responden y que validan los datos.

---

## 3. Cómo continuar mañana (paso a paso)

### Paso 1 — Abrir dos terminales de PowerShell

**Terminal 1 — Backend**
```powershell
cd "C:\Python Notebooks\app-gasolinas-backend"
git pull
npm install        # solo si cambió package.json
npm run dev
```
Debe decir "Servidor corriendo en puerto 3000". Comprobar en el navegador: http://localhost:3000/health → `{"status":"ok", ...}`

**Terminal 2 — Frontend**
```powershell
cd "C:\Python Notebooks\app-gasolinas-frontend"
git pull
npm install        # solo si cambió package.json
npm run dev
```
Se abre http://localhost:5173 solo.

### Paso 2 — URLs locales

| Qué | URL |
|---|---|
| App principal | http://localhost:5173 |
| Panel Admin | http://localhost:5173/admin |
| Backend (salud) | http://localhost:3000/health |
| API | http://localhost:3000/api |
| Desde el celular (misma red WiFi) | http://192.168.10.133:5173 |

> El frontend llama al backend por `192.168.10.133`. Si la IP de la PC cambia, la app dirá "Error al cargar los datos". Revisa la IP con `ipconfig` y actualízala (o crea `VITE_API_URL` en el `.env` del frontend).

### Paso 3 — Abrir Claude Code

En una **tercera** terminal:
```powershell
cd "C:\Python Notebooks\app-gasolinas-backend"
claude
```
Primer mensaje sugerido:
> Lee PROGRESS.md. Hoy quiero continuar con [tarea]. El frontend está en C:\Python Notebooks\app-gasolinas-frontend.

Claude Code se abre en la carpeta del backend, pero puede trabajar en las dos; solo hay que decirle dónde está el frontend.

### Paso 4 — Al terminar el día
```powershell
# En cada carpeta donde hubo cambios:
git status
git add <archivos>
git commit -m "Descripción del cambio"
git push
```

---

## 4. Notas importantes

### Token admin
- Está en `C:\Python Notebooks\app-gasolinas-backend\.env`, variable `ADMIN_TOKEN`. **No se escribe aquí** porque este archivo está en GitHub.
- El frontend **no** guarda el token en el código: el login lo envía al backend para comprobarlo. La sesión dura hasta cerrar la pestaña.
- Si se cambia `ADMIN_TOKEN`, hay que reiniciar el backend.

### Rangos de precio válidos (USD)

| Combustible | Mínimo | Máximo |
|---|---|---|
| Super | 4.00 | 5.50 |
| Extra | 2.50 | 4.00 |
| Ecopaís | 3.50 | 5.00 |
| Diesel | 2.50 | 4.00 |

Están repetidos en **4 lugares**; si se cambian, hay que cambiar todos:
- Backend: `src/routes/precios.ts` y `src/routes/admin.ts`
- Frontend: `src/components/ReportarPrecioModal.jsx` y `src/components/AdminPanel.jsx`

### Decisiones tomadas
- **Dos repositorios** (backend y frontend), no un monorepo: se despliegan por separado y el proyecto lo lleva una sola persona.
- **Rangos de precio**: el pedido del panel decía Super $2.40–$2.80 y Extra $1.80–$2.00, pero los datos reales son Super $4.69–$4.97 y Extra $3.24. Con esos rangos todo precio real se rechazaría, así que se usan los del backend (tabla de arriba).
- **Rechazar = eliminar** el reporte. La razón queda en la tabla `auditoria`. Por eso no hay historial de "Rechazados" en el panel.
- **"Validados hoy / esta semana"** usa `updated_at` como fecha de validación (hora de Ecuador, semana desde el lunes). Si se edita un precio validado, cambia su fecha.
- **Precios creados por el admin** se guardan con `reportado_por = 00000000-0000-0000-0000-000000000000` y aparecen como "Admin".
- **Sin react-router**: la ruta `/admin` se resuelve en `src/main.jsx` para no agregar una dependencia.
- **Super** va primero y es el filtro por defecto, pero **con el mismo diseño** que los demás combustibles (sin mensajes especiales de híbridos/turbo).

---

## 5. Errores encontrados hoy y cómo se resolvieron

| Error | Causa | Solución |
|---|---|---|
| En la tabla resumen, Extra y Diesel salían `$-` | Al poner Super como filtro por defecto, `App.jsx` borraba los precios de los otros combustibles | El filtro ahora decide qué gasolineras se muestran, pero conserva todos sus precios |
| Super demasiado destacado (mensajes de híbridos/turbo, botón grande) | Decisión de diseño que no gustó | Se quitó; Super queda primero pero igual a los demás |
| Resaltado verde de columna chocaba con la cabecera morada | Colores fuera de la paleta | Se cambió a morado pastel (`purple-200` cabecera, `purple-50` valores) |
| El frontend no tenía git | Nunca se había inicializado | `git init` + repo nuevo `panbl87/app-gasolinas-frontend` |
| Las rutas que pedía el panel no existían en el backend | Las rutas admin del primer commit tenían otros nombres (`PUT .../aprobar`, `precios/manual`) | Se renombraron para coincidir con el panel |
| Rangos de precio del pedido no coincidían con la realidad | Valores desactualizados en el pedido | Se mantuvieron los del backend (ver Decisiones) |

---

## 6. Próxima tarea: crear tabla `reportes_precios` en Supabase

**Estado hoy:** la tabla **no existe** (Supabase responde 404). Los reportes de usuarios y los precios validados viven juntos en la tabla `precios`, separados por la columna `es_verificado`.

**Antes de crearla, decidir:** ¿para qué se quiere? Tener una tabla aparte para los reportes permitiría:
- guardar los **rechazados** con su razón en vez de borrarlos,
- tener una fecha real de validación (`validado_en`) en lugar de `updated_at`,
- dejar en `precios` solo los precios confirmados.

Si se crea, **hay que cambiar el backend** (`precioService.ts` y `routes/admin.ts`) para que use la tabla nueva. Crear la tabla sola no cambia nada en la app.

### Comando SQL que falta ejecutar (borrador — revisar antes de ejecutar)

Dónde: Supabase → tu proyecto → **SQL Editor** → New query → pegar → **Run**.

```sql
-- Tabla de reportes de precios enviados por usuarios, con su estado de revisión
CREATE TABLE reportes_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasolinera_id UUID NOT NULL REFERENCES gasolineras(id) ON DELETE CASCADE,
  tipo_combustible VARCHAR(20) NOT NULL
    CHECK (tipo_combustible IN ('Extra', 'Super', 'Diesel', 'Ecopaís')),
  precio DECIMAL(10, 2) NOT NULL CHECK (precio > 0),
  reportado_por UUID,                       -- NULL = reporte anónimo
  foto_url VARCHAR(500),
  ubicacion_gps JSONB,                      -- { "latitud": ..., "longitud": ... }
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'VALIDADO', 'RECHAZADO')),
  razon_rechazo TEXT,
  validado_en TIMESTAMP WITH TIME ZONE,
  precio_id UUID REFERENCES precios(id) ON DELETE SET NULL,  -- precio creado al validar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reportes_estado ON reportes_precios(estado);
CREATE INDEX idx_reportes_gasolinera ON reportes_precios(gasolinera_id);
CREATE INDEX idx_reportes_created ON reportes_precios(created_at);

CREATE TRIGGER trigger_reportes_precios_updated
BEFORE UPDATE ON reportes_precios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();
```

Comprobar que se creó: en Supabase → **Table Editor** debe aparecer `reportes_precios`.

Después de ejecutarlo, copiar este SQL al final de `database.sql` para que el archivo siga igual que la base real.

---

## 7. URLs de referencia

**Proyecto**
- Backend en GitHub: https://github.com/panbl87/app-gasolinas
- Frontend en GitHub: https://github.com/panbl87/app-gasolinas-frontend
- Supabase (panel): https://supabase.com/dashboard → proyecto de la app
- Vercel (despliegues): https://vercel.com/dashboard

**Documentación**
- Supabase JS (consultas `select`, `insert`, `update`): https://supabase.com/docs/reference/javascript/select
- Supabase SQL Editor: https://supabase.com/docs/guides/database/overview
- Express: https://expressjs.com/es/
- Vite (variables `VITE_*`): https://vitejs.dev/guide/env-and-mode
- Tailwind CSS (colores): https://tailwindcss.com/docs/customizing-colors
- Vercel rewrites (para `/admin`): https://vercel.com/docs/projects/project-configuration#rewrites
- Claude Code: https://docs.claude.com/en/docs/claude-code/overview

**Precios oficiales de combustibles en Ecuador**
- Agencia de Regulación y Control de Energía (ARCERNNR): https://www.controlrecursosyenergia.gob.ec
