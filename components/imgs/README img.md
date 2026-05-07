# Sistema de gestión de imágenes (DPI)

Resumen técnico exacto del sistema de subida, edición, almacenamiento y descarga de imágenes (aplicado a los DPIs de la tabla `afiliados`, pero genérico para cualquier bucket de Supabase Storage).

## Stack y archivos involucrados

| Archivo | Responsabilidad |
| --- | --- |
| `components/imgs/ImageUploader.tsx` | Componente genérico reutilizable: preview con signed URL, botones Galería / Cámara / Eliminar, abre el editor antes de subir. |
| `components/imgs/ImageEditorModal.tsx` | Modal de edición (crop + zoom + rotación + aspect ratio) usando `react-easy-crop`. Zoom libre 0.1x–10x, `restrictPosition: false`. |
| `components/imgs/cropImage.ts` | Utilidad pura: aplica rotación + recorte con `<canvas>` y devuelve un `File`. |
| `components/afiliados/GestionDpiModal.tsx` | Modal "Subir/Editar DPI": monta dos `ImageUploader` (frontal/reverso) + mutación TanStack + botones Descargar PDF (rojo) y Descargar IMG (azul). |
| `components/afiliados/actions/dpi.ts` | Server action `actualizarCampoDpiAction(afiliadoId, campo, path)` que hace `UPDATE` en `afiliados`. |
| `components/afiliados/utils/generarDpiPdf.ts` | `generarDpiPdf` genera PDF tamaño carta. `generarDpiImg` genera PNG 4x. Ambos muestran solo las dos caras del DPI a tamaño CR80 real (85.6 × 54 mm), centradas, sin bordes ni fondo. |
| `components/afiliados/Tabla.tsx` | Botón "Ver DPI" tri-estado (verde/ámbar/gris), botón "Subir/Editar DPI", botón "Carnet" (descarga rápida PDF). |
| `components/afiliados/esquemas.ts` | Tipo `Afiliado` extendido con `dpi_frontal_url` y `dpi_reverso_url`. |

**Dependencias añadidas:** `browser-image-compression`, `react-easy-crop`. `jspdf` ya estaba.

---

## Flujo completo: SUBIR / CAMBIAR una imagen

```
Usuario clic "Subir/Editar DPI" en la card
   ↓
Tabla.tsx → setGestionDpiAfiliado(afiliado)
   ↓
GestionDpiModal abre con 2 instancias de ImageUploader
   ├── frontalPath ← afiliado.dpi_frontal_url
   └── reversoPath ← afiliado.dpi_reverso_url
   ↓
Usuario clic "Galería" o "Cámara"
   ├── Galería → input[type=file] sin capture  (explorador de archivos)
   └── Cámara  → input[type=file][capture=environment]  (cámara trasera en móvil)
   ↓
handleFileSelected() valida MIME (jpg/png/webp) → setEditingFile(file)
   ↓
ImageEditorModal se abre (z-80, encima del modal de DPI)
   ├── react-easy-crop renderiza con URL.createObjectURL(file)
   ├── Aspecto default: "DPI 85x54" (proporción real CR80 = 85.6/54)
   ├── Slider zoom: 0.1x – 10x (step 0.05), restrictPosition=false
   ├── Botones rotar ±90°, indicador de grados, reset
   └── onCropComplete actualiza croppedAreaPixels {x,y,w,h}
   ↓
Usuario clic "Aplicar y subir"
   ↓
cropImage.ts › getCroppedFile(file, pixelCrop, rotation):
   1. Carga la imagen en HTMLImageElement
   2. Calcula bounding box rotado (sin/cos)
   3. Canvas #1: rotate → translate + rotate + drawImage
   4. Canvas #2: crop  → drawImage(rotatedCanvas, cropBox...)
   5. canvas.toBlob(type, 0.95) → new File([blob], name, {type})
   ↓
ImageUploader.uploadEditedFile(edited):
   1. imageCompression(edited, { maxSizeMB: 0.2, maxWidthOrHeight: 2048, useWebWorker: true })
   2. buildUniqueName() → "{timestamp}-{rand8}.{ext}"
   3. supabase.storage.from('dpis').upload(newPath, compressed, { upsert: false })
   4. Si existía currentImagePath → supabase.storage.from('dpis').remove([oldPath])
   5. await onUploadSuccess(newPath)  ← callback al padre
   ↓
GestionDpiModal: mutation.mutateAsync({ campo, path })
   ├── mutationFn → actualizarCampoDpiAction(afiliado.id, campo, path)
   │       └── server action: supabase.from('afiliados').update({ [campo]: path }).eq('id', ...)
   ├── onSuccess:
   │     ├── setFrontalPath / setReversoPath(path)  ← UX inmediata sin esperar refetch
   │     ├── queryClient.invalidateQueries(['afiliados-lider', 'afiliados-gl'])
   │     ├── onSaved?.() → Tabla.tsx llama onDataChange() (no cierra el modal)
   │     └── toast.success("DPI {lado} actualizado correctamente.")
   └── onError → toast.error(err.message)
   ↓
ImageUploader detecta cambio en currentImagePath
   → useEffect crea signed URL (1 h) → preview visible
```

---

## Flujo: ELIMINAR

```
Usuario clic "Eliminar"
   ↓
ImageUploader.handleDelete():
   1. supabase.storage.from('dpis').remove([currentImagePath])
   2. await onDeleteSuccess()
   ↓
GestionDpiModal: mutation.mutateAsync({ campo, path: null })
   ↓
Server action UPDATE: afiliados.{campo} = null
   ↓
setFrontalPath / setReversoPath(null) → vuelve a mostrar los botones Galería / Cámara
```

---

## Flujo: VISUALIZAR (preview)

Bucket `dpis` es **privado**. Cada `ImageUploader` tiene este `useEffect`:

```ts
useEffect(() => {
  if (!currentImagePath) { setPreviewUrl(null); return; }
  supabase.storage
    .from(bucketName)
    .createSignedUrl(currentImagePath, 3600)
    .then(({ data, error }) => setPreviewUrl(error ? null : data.signedUrl));
}, [currentImagePath, bucketName, supabase, signedUrlExpiresIn]);
```

- Mientras se firma → `<Loader2>` en el placeholder.
- Si la firma falla → mensaje "No se pudo cargar la vista previa.".
- Si tiene éxito → `<img src={signedUrl}>` con `object-contain`, max 460 px alto.

---

## Flujo: DESCARGAR PDF / IMG

### Desde `GestionDpiModal` (footer)

| Botón | Color | Función |
| --- | --- | --- |
| `↓ PDF` | Rojo | `generarDpiPdf` → archivo `.pdf` |
| `↓ IMG` | Azul | `generarDpiImg` → archivo `.png` (4× resolución) |

Ambos se deshabilitan si no hay ninguna imagen subida (`!tieneAlgunDpi`).

### Desde `Tabla.tsx`

El botón **Carnet** (verde, `↓`) descarga directamente el PDF del afiliado seleccionado.

### Proceso interno (`generarDpiPdf` / `generarDpiImg`)

```
1. Promise.all([
     buildSignedUrl(frontalPath, 600s),
     buildSignedUrl(reversoPath, 600s),
   ])
2. Para cada URL disponible:
     fetch → blob → FileReader → dataURL
     <img> oculta para leer width/height naturales
3. jsPDF letter (612 × 792 pt)
   - Fondo blanco, sin marcos ni texto
   - Imagen frontal centrada horizontalmente, tamaño CR80 real (85.6 × 54 mm)
   - Imagen reverso centrada, 72 pt debajo de la frontal
4. pdf.save("dpi_{nombres}_{apellidos}.pdf")
   ó canvas.toDataURL('image/png') → link.download (para IMG)
```

---

## UI del `ImageUploader`

### Sin imagen subida

```
┌─────────────────────────────────────────────┐
│          Selecciona una opción              │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │     ↑           │  │     📷          │  │
│  │   GALERÍA       │  │    CÁMARA       │  │
│  │  (azul, file)   │  │ (verde, capture)│  │
│  └─────────────────┘  └─────────────────┘  │
│             JPG · PNG · WEBP                │
└─────────────────────────────────────────────┘
```

### Con imagen subida

Preview de la imagen + tres botones:

| Botón | Color | Acción |
| --- | --- | --- |
| Galería | Azul | Abre el explorador de archivos |
| Cámara | Verde | Abre la cámara trasera (móvil) |
| Eliminar | Rojo | Borra del storage + limpia el campo |

En **PC** el botón Cámara puede abrir la webcam o el explorador, según el navegador.

---

## Mutación TanStack — payload tipado

```ts
type CampoDpi = "dpi_frontal_url" | "dpi_reverso_url";
interface MutacionPayload { campo: CampoDpi; path: string | null }

useMutation({
  mutationFn: ({ campo, path }) => actualizarCampoDpiAction(afiliado.id, campo, path),
  onSuccess: ({ campo, path }) => { setLocal(...); invalidateQueries(...); toast(...); },
  onError:   (err) => toast.error(err.message),
});
```

El server action valida el campo contra un `Set<CampoDpi>` (whitelist anti-inyección) antes del `UPDATE`.

---

## Estado tri-estado en `Tabla.tsx`

```ts
obtenerEstadoDpi(afiliado):
  ambos llenos     → "completo" → bg-green-600   (botón "Ver DPI" verde)
  solo uno lleno   → "parcial"  → bg-amber-500   (botón "Ver DPI" ámbar)
  ambos vacíos     → "vacio"    → bg-gray-400    (botón "Ver DPI" gris)
```

---

## Garantías de UX y consistencia

1. **Compresión obligatoria**: 200 KB / 2048 px máx antes de subir al storage.
2. **No deja basura**: al cambiar imagen, elimina el archivo anterior del bucket.
3. **Optimistic UI local**: el modal actualiza `frontalPath`/`reversoPath` en `onSuccess` sin esperar al refetch.
4. **Refetch global**: invalida `["afiliados-lider"]` y `["afiliados-gl"]` para sincronizar todas las vistas.
5. **Loaders por capa**: spinner en el preview (firma URL), spinner por botón (subir/borrar), overlay full en el modal (mutación), spinner en "Aplicar y subir" del editor.
6. **Bucket privado + signed URLs** (1 h preview, 10 min PDF/IMG): nadie sin sesión accede a los DPIs.
7. **Whitelist de columnas** en el server action: imposible actualizar cualquier columna que no sea `dpi_frontal_url` o `dpi_reverso_url`.
8. **Modal no se cierra al guardar**: `onSaved` solo llama `onDataChange()` en `Tabla.tsx`, el usuario cierra manualmente.
9. **Compatibilidad**: `ImageUploader` es genérico (`bucketName` parametrizable), sirve para cualquier otra entidad futura.

---

## Z-index del stack de modales

```
Celula (Headless Dialog)         z-50
  └─ GestionDpiModal             z-60
        └─ ImageEditorModal      z-80
              └─ react-toastify  ~9999
```

---

## Configuración requerida en Supabase

### 1. Tabla `afiliados`

```sql
alter table public.afiliados
  add column if not exists dpi_frontal_url text,
  add column if not exists dpi_reverso_url text;
```

### 2. Bucket privado `dpis`

```sql
insert into storage.buckets (id, name, public)
values ('dpis', 'dpis', false)
on conflict (id) do nothing;
```

### 3. Políticas RLS (usuarios autenticados)

```sql
create policy "dpis_auth_read" on storage.objects
  for select to authenticated using (bucket_id = 'dpis');

create policy "dpis_auth_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'dpis');

create policy "dpis_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'dpis');

create policy "dpis_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'dpis');
```

---

## API del componente `ImageUploader`

```ts
interface Props {
  bucketName: string;
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number; // default: 3600s
}
```

Ejemplo de uso para cualquier otra entidad:

```tsx
<ImageUploader
  bucketName="comprobantes"
  currentImagePath={pago.comprobante_url ?? null}
  onUploadSuccess={(path) => mutationActualizarPago.mutateAsync({ comprobante_url: path })}
  onDeleteSuccess={() => mutationActualizarPago.mutateAsync({ comprobante_url: null })}
  disabled={mutationActualizarPago.isPending}
/>
```
