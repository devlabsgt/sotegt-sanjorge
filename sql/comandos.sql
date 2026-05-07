-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.afiliados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombres text,
  apellidos text,
  telefono text,
  telefono2 character varying,
  telefono3 character varying,
  direccion text,
  lider_id uuid,
  lugar_id bigint,
  dpi text,
  nacimiento date,
  sexo text,
  empadronado boolean DEFAULT false,
  politica text,
  no_padron text,
  religion text,
  politica_id integer,
  sub_politica_id integer,
  condicion_especial text,
  created_at timestamp with time zone DEFAULT now(),
  familiar boolean DEFAULT false,
  img text,
  img_dpi text,
  CONSTRAINT afiliados_pkey PRIMARY KEY (id),
  CONSTRAINT afiliados_lider_id_fkey FOREIGN KEY (lider_id) REFERENCES auth.users(id),
  CONSTRAINT afiliados_lugar_id_fkey FOREIGN KEY (lugar_id) REFERENCES public.lugares(id),
  CONSTRAINT afiliados_politica_id_fkey FOREIGN KEY (politica_id) REFERENCES public.sis_politicas(id),
  CONSTRAINT afiliados_sub_politica_id_fkey FOREIGN KEY (sub_politica_id) REFERENCES public.sis_politicas_sub(id)
);
CREATE TABLE public.info_perfil (
  user_id uuid NOT NULL,
  nombres text,
  apellidos text,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  rol_id bigint,
  nivel_compromiso text,
  CONSTRAINT info_perfil_pkey PRIMARY KEY (user_id),
  CONSTRAINT info_perfil_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT info_perfil_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id)
);
CREATE TABLE public.lugares (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  sector_id integer,
  CONSTRAINT lugares_pkey PRIMARY KEY (id),
  CONSTRAINT lugares_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectores(id)
);
CREATE TABLE public.padron_tse (
  dpi character varying NOT NULL,
  nombre_completo text,
  genero character varying,
  CONSTRAINT padron_tse_pkey PRIMARY KEY (dpi)
);
CREATE TABLE public.roles (
  id bigint NOT NULL,
  nombre text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sectores (
  id integer NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT sectores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sis_configuracion (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre_candidato text,
  lugar text,
  updated_at timestamp with time zone DEFAULT now(),
  frase text,
  objetivo_total bigint,
  meta_por_lider bigint,
  CONSTRAINT sis_configuracion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sis_politicas (
  id integer NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT sis_politicas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sis_politicas_sub (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  politica_id integer,
  nombre text NOT NULL,
  CONSTRAINT sis_politicas_sub_pkey PRIMARY KEY (id),
  CONSTRAINT sis_politicas_sub_politica_id_fkey FOREIGN KEY (politica_id) REFERENCES public.sis_politicas(id)
);

-- Cambiar contraseña de un usuario
UPDATE auth.users
SET 
  encrypted_password = crypt('TU_NUEVA_CONTRASEÑA_AQUÍ', gen_salt('bf')),
  email_confirmed_at = NOW(), -- Esto asegura que la cuenta esté activa aunque el email sea fake
  updated_at = NOW()
WHERE email = 'el_correo_fake@app.com';