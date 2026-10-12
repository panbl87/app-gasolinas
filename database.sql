-- ============================================
-- SCHEMA DE BASE DE DATOS - APP GASOLINAS ECUADOR
-- ============================================
-- Ejecutar este script en Supabase SQL Editor para crear la estructura

-- ========== TABLA: GASOLINERAS ==========
CREATE TABLE gasolineras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  marca VARCHAR(50) NOT NULL CHECK (marca IN ('Shell', 'Primax', 'Terpel', 'Fybeca', 'Otra')),
  ubicacion_gps JSONB NOT NULL, -- { "latitud": -0.xxx, "longitud": -78.xxx }
  direccion VARCHAR(500) NOT NULL,
  ciudad VARCHAR(100) NOT NULL CHECK (ciudad IN ('Quito', 'Guayaquil', 'Cuenca', 'Otra')),
  telefono VARCHAR(20),
  horario_atencion VARCHAR(100),
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gasolineras_ciudad ON gasolineras(ciudad);
CREATE INDEX idx_gasolineras_activa ON gasolineras(activa);

-- ========== TABLA: PRECIOS ==========
CREATE TABLE precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasolinera_id UUID NOT NULL REFERENCES gasolineras(id) ON DELETE CASCADE,
  tipo_combustible VARCHAR(20) NOT NULL CHECK (tipo_combustible IN ('Extra', 'Super', 'Diesel', 'Ecopaís')),
  precio DECIMAL(10, 2) NOT NULL CHECK (precio > 0),
  moneda VARCHAR(3) DEFAULT 'USD',
  reportado_por UUID NOT NULL, -- Usuario ID
  tiene_foto BOOLEAN DEFAULT FALSE,
  foto_url VARCHAR(500),
  es_verificado BOOLEAN DEFAULT FALSE,
  verificaciones INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_precios_gasolinera ON precios(gasolinera_id);
CREATE INDEX idx_precios_tipo ON precios(tipo_combustible);
CREATE INDEX idx_precios_verificado ON precios(es_verificado);
CREATE INDEX idx_precios_created ON precios(created_at);

-- ========== TABLA: USUARIOS ==========
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  foto_perfil VARCHAR(500),
  reportes_totales INTEGER DEFAULT 0,
  verificaciones_totales INTEGER DEFAULT 0,
  rating DECIMAL(2, 1) DEFAULT 5.0 CHECK (rating >= 1 AND rating <= 5),
  puntos INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}'::TEXT[], -- Array de badges ganados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_reportes ON usuarios(reportes_totales);
CREATE INDEX idx_usuarios_rating ON usuarios(rating);

-- ========== TABLA: AUDITORÍA (para rastrear cambios) ==========
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_timestamp ON auditoria(timestamp);

-- ========== FUNCIÓN: Actualizar updated_at ==========
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== TRIGGERS: Actualizar updated_at ==========
CREATE TRIGGER trigger_gasolineras_updated
BEFORE UPDATE ON gasolineras
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_precios_updated
BEFORE UPDATE ON precios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_usuarios_updated
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

-- ========== FUNCIÓN: Calcular promedio de precios por ciudad ==========
CREATE OR REPLACE FUNCTION promedios_precios_ciudad(ciudad_param VARCHAR)
RETURNS TABLE(tipo_combustible VARCHAR, precio_promedio NUMERIC, cantidad INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.tipo_combustible::VARCHAR,
    ROUND(AVG(p.precio), 2),
    COUNT(*)::INT
  FROM precios p
  JOIN gasolineras g ON p.gasolinera_id = g.id
  WHERE g.ciudad = ciudad_param
    AND p.es_verificado = TRUE
    AND p.created_at > NOW() - INTERVAL '24 hours' -- Solo últimas 24 horas
  GROUP BY p.tipo_combustible
  ORDER BY p.tipo_combustible;
END;
$$ LANGUAGE plpgsql;

-- ========== INSERTS DE PRUEBA ==========
-- Esto es opcional, para testing

-- Gasolinera de prueba (Quito - Centro)
INSERT INTO gasolineras (nombre, marca, ubicacion_gps, direccion, ciudad, telefono, activa)
VALUES (
  'Shell Centro Quito',
  'Shell',
  '{"latitud": -0.2173, "longitud": -78.5089}'::JSONB,
  'Calle Pedro Fermín Cevallos y Amazonas, Quito',
  'Quito',
  '+593 2 1234567',
  TRUE
);

-- Gasolinera de prueba (Quito - Norte)
INSERT INTO gasolineras (nombre, marca, ubicacion_gps, direccion, ciudad, telefono, activa)
VALUES (
  'Primax La Mariscal',
  'Primax',
  '{"latitud": -0.1975, "longitud": -78.4900}'::JSONB,
  'Av. Patria y 10 de Agosto, Quito',
  'Quito',
  '+593 2 2345678',
  TRUE
);

-- ========== PERMISOS RLS (Row Level Security) - OPCIONAL ==========
-- Descomenta si quieres implementar seguridad a nivel de fila
/*
ALTER TABLE gasolineras ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de gasolineras
CREATE POLICY gasolineras_select_all ON gasolineras
FOR SELECT USING (TRUE);

-- Permitir lectura de precios verificados
CREATE POLICY precios_select_verified ON precios
FOR SELECT USING (es_verificado = TRUE);
*/

-- ========== COMENTARIOS DE DOCUMENTACIÓN ==========
COMMENT ON TABLE gasolineras IS 'Almacena información de gasolineras en Ecuador';
COMMENT ON TABLE precios IS 'Almacena precios reportados por usuarios, con validación comunitaria';
COMMENT ON TABLE usuarios IS 'Almacena perfiles de usuarios con gamificación (puntos, badges)';
COMMENT ON TABLE auditoria IS 'Log de todos los cambios en tablas principales (opcional)';
