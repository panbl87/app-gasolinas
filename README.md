# App Gasolinas Ecuador - Backend

Backend API REST para la aplicación de comparación de precios de gasolina en Ecuador.

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 16+
- npm o yarn
- Cuenta en [Supabase](https://supabase.com)
- Git

### 1. Clonar / Descargar Proyecto

```bash
cd app-gasolinas-backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copiar `.env.example` a `.env` y rellenar con tus credenciales Supabase:

```bash
cp .env.example .env
```

**Editar `.env`:**

```env
# SERVER
PORT=3000
NODE_ENV=development

# SUPABASE - OBTENER DE: https://supabase.com/dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# CORS (URL del frontend)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:8080

# OTROS
LOG_LEVEL=debug
```

### 4. Crear Base de Datos en Supabase

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crear nuevo proyecto
3. Copiar las credenciales a `.env`
4. Abrir SQL Editor en Supabase
5. Ejecutar el contenido de `database.sql`

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

Debería ver:

```
╔════════════════════════════════════════╗
║   APP GASOLINAS ECUADOR - BACKEND      ║
╠════════════════════════════════════════╣
║ 🚀 Servidor corriendo en puerto 3000   ║
║ 🌍 Ambiente: DEVELOPMENT               ║
║ 📍 URL: http://localhost:3000          ║
║ 💚 Health: http://localhost:3000/health
╚════════════════════════════════════════╝
```

## 📚 Documentación de API

### Base URL

```
http://localhost:3000/api
```

### Response Estándar

Todas las respuestas tienen formato:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

Si hay error:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Descripción del error"
}
```

---

## 🔥 GASOLINERAS

### Obtener todas las gasolineras

```
GET /gasolineras
```

**Query Parameters:**
- `ciudad` (opcional): Filtrar por ciudad

**Ejemplo:**

```bash
curl http://localhost:3000/api/gasolineras?ciudad=Quito
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Shell Centro",
      "marca": "Shell",
      "ubicacion_gps": { "latitud": -0.2173, "longitud": -78.5089 },
      "direccion": "Calle...",
      "ciudad": "Quito",
      "activa": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50
}
```

---

### Obtener gasolinera por ID

```
GET /gasolineras/:id
```

```bash
curl http://localhost:3000/api/gasolineras/550e8400-e29b-41d4-a716-446655440000
```

---

### Obtener gasolineras cercanas

```
GET /gasolineras/cercanas?lat=-0.2173&lon=-78.5089&radio=5
```

**Query Parameters:**
- `lat` (requerido): Latitud del usuario
- `lon` (requerido): Longitud del usuario
- `radio` (opcional, default=5): Radio en km

```bash
curl "http://localhost:3000/api/gasolineras/cercanas?lat=-0.2173&lon=-78.5089&radio=10"
```

---

### Crear gasolinera (Admin)

```
POST /gasolineras
Content-Type: application/json
```

**Body:**

```json
{
  "nombre": "Terpel Norte",
  "marca": "Terpel",
  "ubicacion_gps": { "latitud": -0.1975, "longitud": -78.4900 },
  "direccion": "Av. Patria y 10 de Agosto",
  "ciudad": "Quito",
  "telefono": "+593 2 2345678",
  "horario_atencion": "24/7"
}
```

---

### Actualizar gasolinera (Admin)

```
PUT /gasolineras/:id
Content-Type: application/json
```

```json
{
  "telefono": "+593 2 NEW1234567",
  "horario_atencion": "06:00-22:00"
}
```

---

### Desactivar gasolinera (Admin)

```
DELETE /gasolineras/:id
```

---

## 💰 PRECIOS

### Obtener precios de una gasolinera

```
GET /precios/gasolinera/:id
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "gasolinera_id": "uuid",
      "tipo_combustible": "Super",
      "precio": 5.49,
      "reportado_por": "user-uuid",
      "es_verificado": true,
      "verificaciones": 3,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 4
}
```

---

### Reportar precio

```
POST /precios/reportar
Content-Type: application/json
```

**Body:**

```json
{
  "gasolinera_id": "550e8400-e29b-41d4-a716-446655440000",
  "usuario_id": "user-uuid",
  "tipo_combustible": "Super",
  "precio": 5.49,
  "foto_url": "https://...",
  "ubicacion_gps": { "latitud": -0.2173, "longitud": -78.5089 }
}
```

**Notas:**
- `tipo_combustible`: "Extra" | "Super" | "Diesel" | "Ecopaís"
- `precio`: Debe estar entre $0.5 y $10
- `foto_url`: Opcional, pero recomendado para validación

---

### Verificar precio

```
PUT /precios/:id/verificar
```

Incrementa el contador de verificaciones. Con 2+ verificaciones, el precio se marca como válido.

---

### Marcar precio incorrecto

```
PUT /precios/:id/incorrecto
```

Resetea las verificaciones y marca como no validado.

---

### Obtener promedio de precios por ciudad

```
GET /precios/promedio/:ciudad
```

```bash
curl http://localhost:3000/api/precios/promedio/Quito
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "tipo_combustible": "Extra",
      "precio_promedio": 4.50,
      "cantidad": 45
    },
    {
      "tipo_combustible": "Super",
      "precio_promedio": 5.49,
      "cantidad": 50
    }
  ],
  "ciudad": "Quito"
}
```

---

## 👤 USUARIOS

### Obtener perfil de usuario

```
GET /usuarios/:id
```

---

### Obtener ranking (top usuarios)

```
GET /usuarios?limit=10
```

Retorna los usuarios con más reportes verificados.

---

### Crear usuario

```
POST /usuarios
Content-Type: application/json
```

**Body:**

```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez"
}
```

Se llama automáticamente después de la autenticación.

---

### Agregar puntos (Gamificación)

```
PUT /usuarios/:id/puntos
Content-Type: application/json
```

**Body:**

```json
{
  "puntos": 10
}
```

---

### Otorgar badge

```
PUT /usuarios/:id/badge
Content-Type: application/json
```

**Body:**

```json
{
  "badge": "PRIMER_REPORTE"
}
```

**Badges disponibles:**

- `PRIMER_REPORTE` - Primer reporte registrado
- `REPORTERO_DILIGENTE` - 10+ reportes
- `VERIFICADOR_CONFIABLE` - 20+ verificaciones
- `EXPERTO_PRECIOS` - Rating 4.5+ estrellas
- `ESTRELLA_COMUNITARIA` - 50+ reportes
- `10_REPORTES`, `50_REPORTES`, `100_REPORTES`

---

### Obtener badges del usuario

```
GET /usuarios/:id/badges
```

---

### Actualizar rating

```
PUT /usuarios/:id/rating
Content-Type: application/json
```

**Body:**

```json
{
  "rating": 4.5
}
```

Rating debe estar entre 1 y 5 estrellas.

---

## 🔧 Estructura del Proyecto

```
app-gasolinas-backend/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Configuración Supabase
│   ├── models/
│   │   └── types.ts             # Tipos TypeScript
│   ├── middleware/
│   │   └── errorHandler.ts      # Manejo de errores
│   ├── services/
│   │   ├── gasolineraService.ts # Lógica gasolineras
│   │   ├── precioService.ts     # Lógica precios
│   │   └── usuarioService.ts    # Lógica usuarios
│   ├── routes/
│   │   ├── gasolineras.ts       # Endpoints gasolineras
│   │   ├── precios.ts           # Endpoints precios
│   │   └── usuarios.ts          # Endpoints usuarios
│   ├── utils/
│   │   └── helpers.ts           # Funciones auxiliares
│   └── server.ts                # Punto de entrada
├── database.sql                 # Schema Supabase
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🚀 Deploy

### Vercel (Recomendado)

1. Conectar repo a [Vercel](https://vercel.com)
2. Agregar variables de entorno en Vercel
3. Deploy automático en cada push

### Railway

1. Conectar repo a [Railway](https://railway.app)
2. Seleccionar Node.js
3. Agregar variables de entorno
4. Deploy

### Heroku (Gratis)

```bash
npm install -g heroku
heroku login
heroku create app-gasolinas-backend
git push heroku main
heroku config:set SUPABASE_URL=...
```

---

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Ejemplo Completo

```bash
# 1. Crear usuario
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nombre":"Test User"}'

# 2. Obtener gasolineras
curl http://localhost:3000/api/gasolineras?ciudad=Quito

# 3. Reportar precio
curl -X POST http://localhost:3000/api/precios/reportar \
  -H "Content-Type: application/json" \
  -d '{
    "gasolinera_id":"xxx",
    "usuario_id":"xxx",
    "tipo_combustible":"Super",
    "precio":5.49
  }'

# 4. Verificar precio
curl -X PUT http://localhost:3000/api/precios/xxx/verificar
```

---

## 🐛 Troubleshooting

### Error: SUPABASE_URL no definida

```
Error: SUPABASE_URL y SUPABASE_ANON_KEY son requeridas en .env
```

**Solución:** Verificar que `.env` está correctamente configurado con credenciales Supabase.

### Error: Base de datos vacía

**Solución:** Ejecutar `database.sql` en el SQL Editor de Supabase.

### CORS Error

Si el frontend da error CORS, asegúrate que `CORS_ORIGIN` en `.env` incluya la URL del frontend.

---

## 📞 Soporte

Para reportar bugs o sugerencias, crea un issue en GitHub.

---

## 📄 Licencia

MIT

---

**Hecho con ❤️ para Ecuador** 🇪🇨
