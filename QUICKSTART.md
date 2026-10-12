# ⚡ Quick Start - Backend App Gasolinas

Guía rápida de 5 minutos para tener el backend corriendo.

## Paso 1: Clonar o descargar

```bash
cd app-gasolinas-backend
```

## Paso 2: Crear cuenta Supabase (2 min)

1. Ir a https://supabase.com
2. Click "Start your project"
3. Crear proyecto (nombre: `app-gasolinas`, región: `América del Sur - São Paulo`)
4. Esperar ~1 min a que se cree
5. Ir a Settings → API Keys
6. Copiar:
   - `Project URL` → SUPABASE_URL
   - `anon key` → SUPABASE_ANON_KEY
   - `service_role key` → SUPABASE_SERVICE_KEY

## Paso 3: Configurar .env (1 min)

```bash
cp .env.example .env
```

Editar `.env`:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## Paso 4: Crear tablas en Supabase (1 min)

1. En Supabase Dashboard → SQL Editor
2. Pegar contenido de `database.sql`
3. Click "Run"
4. ✅ Tablas creadas

## Paso 5: Instalar y correr (1 min)

```bash
npm install
npm run dev
```

Deberías ver:

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

## ✅ ¡Listo!

Prueba la API:

```bash
# Obtener gasolineras de prueba
curl http://localhost:3000/api/gasolineras

# Health check
curl http://localhost:3000/health
```

---

## Próximos Pasos

1. **Frontend:** Crear app React que consume esta API
2. **Testing:** Probar endpoints con Postman/Insomnia
3. **Deploy:** Subir a Vercel (instructions en README.md)

---

## 🆘 Problemas?

Si algo no funciona:

1. Verifica que `.env` esté bien (copiar-pega exacto)
2. Chequea que Supabase project esté activo
3. Revisa que Node.js sea versión 16+
4. Borra `node_modules` y `npm install` de nuevo

---

**¡Diviértete desarrollando! 🚀**
