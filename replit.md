# VIAVIP

## Overview
VIAVIP is a Next.js 16 application with App Router, designed as a premium classified ads platform for verified escorts in Uruguay. It features a multi-step registration with identity verification, an admin verification panel, a paid plans system, a metrics dashboard, and restricted publishing capabilities. The platform aims to provide a secure and exclusive environment for adult services, focusing on identity verification and premium user experience.

## User Preferences
- No demo mode, real Supabase data only
- Supabase client used directly (no API routes)
- One publication per user (user_id unique in publicaciones)
- Mobile-first design
- Premium dark theme (#0a0a0a background, #c6a75e gold accent)
- Full payment system: MercadoPago (production webhook), Abitab, RedPagos, Transferencia bancaria
- Registration flow styled clean (green accents, no gold)
- SQL migrations provided to user for manual execution in Supabase SQL Editor (never executed automatically)

## System Architecture
The application is built with Next.js 16 using the App Router and TypeScript. Styling is managed with custom CSS, adhering to a premium dark theme (`#0a0a0a`) with gold accents (`#c6a75e`), and uses Playfair Display for headings and Inter for body text. There are no UI component libraries.

**Core Features:**
- **User Authentication & Profiles**: Multi-step registration with email confirmation and category selection (mujer/hombre/trans). User profiles store verification status, plan details, and admin privileges.
- **Content Listing & Profiles**: Dynamic listing pages (`/mujeres`, `/hombres`, `/trans`) filtered by category, sorted by plan tier. Profile pages display detailed service information, contact options (WhatsApp/Call), comments, and reporting features.
- **Publishing System**: A two-step form (`/publicar`) allows users to create and manage their listings, including service details, photos, and videos. Publishing is gated by email verification. Includes telefono field for WhatsApp.
- **Subscription Plans**: Four tiers (Free, Plus, Platino, Diamante) with enforced limits:
  - Free: 3 fotos, 0 videos, no metrics
  - Plus: 8 fotos, 1 video, no metrics
  - Platino: 15 fotos, 3 videos, basic metrics
  - Diamante: unlimited fotos/videos, full metrics, stories, Destacadas carousel
- **Media Gallery** (`components/MediaGallery.tsx`): Upload/delete/reorder photos and videos. Plan-based limits enforced. Cover photo selection. Uses Supabase Storage (`verificaciones` bucket, path: `media/{userId}/fotos|videos/{timestamp}.{ext}`).
- **Premium Account Panel** (`/mi-cuenta`): Publication preview card, inline MediaGallery, tags/chips editor for services, save functionality, StoryUpload (Diamante only).
- **Metrics Dashboard** (`/metricas`):
  - FREE/PLUS: Upsell page showing benefits of upgrading
  - PLATINO: Visitas hoy vs ayer, clicks WhatsApp, 7-day totals, avg time, conversion rate, peak hours
  - DIAMANTE: All above + daily average trend, favorites count, activity feed (20 recent events)
- **Profile Event Tracking** (`lib/trackEvent.ts`): Debounced tracking of views (10s), WhatsApp clicks (3s), and favorites. Events stored in `profile_events` table.
- **Diamante Stories**: 1 image/video per user for 24h (`components/StoryUpload.tsx`). Stories table: `diamante_stories`.
- **Destacadas Carousel** (`components/DestacadasDiamante.tsx`): Shown on `/mujeres` page. Gold ring avatar circles for Diamante users with active stories. Max 30. Opens fullscreen StoryViewer.
- **Admin Panel**: Comprehensive administration interface for managing user profiles, publications, denuncias (block/unblock), and viewing audit logs.
- **Verification System**: Automated email-based verification sets `verification_status` to 'approved' upon email confirmation.

**Design System:**
- **CSS Prefix**: `vv-` for all class names.
- **Color Palette**: Primary background #0a0a0a, card background #141414, gold accent #c6a75e, gold gradient, WhatsApp green #25d366, verification green #22c55e.
- **Typography**: Playfair Display (titles), Inter (body).
- **Navigation**: Sticky header with hamburger menu, and a bottom navigation bar.

## External Dependencies
- **Backend**: Supabase (used for authentication, database, and storage).
  - `lib/supabaseClient.ts`: Configures the Supabase client (browser).
  - `lib/supabasePublic.ts`: Public Supabase client for server-side queries.
  - `lib/supabaseServer.ts`: Server-side Supabase client for SSR and secure server actions.
- **Database Tables**: `profiles`, `publicaciones`, `reports`, `comments`, `profile_metrics`, `admin_audit`, `favoritos`, `profile_events`, `diamante_stories`, `denuncias`.
- **Storage**: Supabase Storage bucket named "verificaciones" for documents, selfies, media uploads, and stories.
- **Payment Gateway (Planned)**: Prepared for Stripe integration.

## Key Components
- `app/components/MediaGallery.tsx` - Photo/video upload with plan limits
- `app/components/StoryUpload.tsx` - Diamante story upload (24h)
- `app/components/StoryViewer.tsx` - Fullscreen story viewer with progress bar
- `app/components/DestacadasDiamante.tsx` - Destacadas carousel for /mujeres
- `app/components/PerfilView.tsx` - Profile page with gallery, tracking, favorites
- `app/components/MiniPreview.tsx` - Mini gallery preview (portal, swipe, dots, Ver perfil CTA)
- `app/components/ListadoGrid.tsx` - Listing grid with mini-preview integration (mobile tap/desktop click)
- `lib/plans.ts` - Plan configuration (limits, features, badges, pricing)
- `lib/trackEvent.ts` - Debounced event tracking utility
- `lib/disponibilidad.ts` - Pure SSR-safe functions: isDisponibleAhora (45min window), getActivityLabel (relative time strings)
- `lib/pingActividad.ts` - Client-side: pingActividad (heartbeat update), updateDisponible (toggle switch)
- `hooks/useHeartbeat.ts` - Heartbeat hook: 60s interval + visibility change + user interaction (throttled 30s)
- `app/components/FotosPreviewEditor.tsx` - 5-slot photo preview editor with modal picker and reorder

## FIX QUIRÚRGICO - DESCARTAR CACHE EN /mujeres (2026-03-11)
**Cache invalidation configurado:**
- **Archivo:** `app/(public)/mujeres/page.tsx` (líneas 1-2)
- **Cambios:**
  - `export const dynamic = "force-dynamic";`
  - `export const revalidate = 0;`
- **Efecto:**
  - ✅ Cada request a `/mujeres` obtiene datos frescos del servidor
  - ✅ No caching en ISR (Incremental Static Regeneration)
  - ✅ `count` siempre viene fresco desde DB
  - ✅ Infinite scroll recibe datos actualizados
- **Compilación:** ✅ Ready in 902ms
- **Impacto:** /mujeres renderiza siempre con datos actuales

## FIX QUIRÚRGICO - RUTAS DE BARRIOS/ZONAS RESTAURADAS (2026-03-11)
**Fix implementado - Rutas de zonas ahora funcionan:**
- **Archivo:** `app/(public)/mujeres/[id]/page.tsx`
- **Cambios:**
  1. Eliminadas funciones locales rotas: `normalizeZonaString()`, `normalizeZonaForQuery()`, `getPublicacionesPorZona()`
  2. Reemplazadas por llamada correcta: `const { items, count, error } = await fetchPublicacionesPorZona("mujer", id);`
  3. Usados `items` y `count` directamente en render (eliminado filtrado local incorrecto)
- **Problema:** Cliente llamaba `fetchPublicacionesPorZona("mujer", "")` con slug vacío + filtrado local incorrecto
- **Solución:** Ahora pasa el slug real de la URL (`id`) a la función, sin filtrado local
- **Resultado:**
  - ✅ `/mujeres/punta-del-este` - Muestra 4 perfiles
  - ✅ `/mujeres/8-de-octubre` - Muestra perfiles
  - ✅ Metadata SEO preservado (usando `slugToName()` para H1)
  - ✅ Perfiles UUID (ej. `/mujeres/uuid-aqui`) no afectados
- **Compilación:** ✅ Ready in 1037ms
- **NO afectado:** UI, estilos, RPC, perfiles individuales

## FIX QUIRÚRGICO /mujeres - MUESTRA 36 EN LUGAR DE 35 (2026-03-11)
**Fix implementado - Cliente arreglado:**
- **Archivo:** `app/components/ListadoFiltered.tsx`
- **Cambios:**
  1. Línea 73: `const [itemsState, setItemsState] = useState<PublicacionItem[]>(() => items);`
  2. Línea 97: `const initial = items;`
- **Problema:** Cliente truncaba el primer render con `slice(0, PAGE_SIZE)` = 12 items
- **Solución:** Ahora inicia con todos los items del servidor (36)
- **Resultado:** `/mujeres` muestra **36 escorts** ✅
- **Compilación:** ✅ Ready in 1912ms
- **Infinite scroll:** Preservado, funciona normalmente
- **NO afectado:** UI, estilos, RPC, lógica de API

## FIX QUIRÚRGICO /nuevas - SOLO MUJERES Y ÚLTIMOS 7 DÍAS (2026-03-11)
**Fix implementado exitosamente:**
- **Archivo:** `app/lib/publicaciones/getFilteredPublicaciones.ts` (líneas 64-72)
- **Cambio:** Agregó filtros a `/nuevas`:
  - `.eq("categoria", "mujer")` - Solo mujeres
  - `.gte("created_at", sevenDaysAgo)` - Últimos 7 días
  - Calcula `sevenDaysAgo = now - 7 días`
- **Resultado:** `/nuevas` muestra SOLO escorts mujeres creadas en últimos 7 días
- **Compilación:** ✅ Ready in 1199ms
- **NO afectado:** `/mujeres`, rutas por zona, `/pde`, otras páginas, RPC, UI, estilos

## REVERSIÓN URGENTE COMPLETADA (2026-03-11)
**Estado: VUELTO AL ESTABLE - listo para próximo fix controlado**

✅ **Cambios revertidos:**
1. ✅ ELIMINADO: `app/lib/publicaciones/getFilteredPublicaciones.ts` - Removido `.eq("categoria", "mujer")` línea 63
2. ✅ RESTAURADO: `app/(public)/mujeres/[id]/page.tsx` - Volvió a usar `fetchPublicacionesPorZona()` 
3. ✅ NO CREADO: `app/lib/queryPublicaciones.ts` - El archivo que se creó fue eliminado

**Commits revertidos:**
- 932ed40 Fix incorrect count for women's category listings
- 4d6bfea Restored to 'cba13c93daaa9cc47efd49812dcbf3e2c4523fbf'
- f9e00f3 Correctly display all active female profiles on the women's page  
- cba13c9 Fix counting logic for user listings and new profiles

**Estado actual (POST-REVERSIÓN):**
- Workflow: ✅ Ready in 1239ms
- `/nuevas`: ✅ Carga exitosamente
- Zona pages: ✅ Restauradas a estado anterior

**Próximo paso:** Fix controlado de conteos cuando esté listo

## Recent Changes (Conteo Quirurgico - lib/queryPublicaciones.ts creado - 2026-03-11)
**Parche quirúrgico implementado (2026-03-11 - FASE 1 COMPLETADA):**
1. **Archivo creado:** `app/lib/queryPublicaciones.ts` con funciones:
   - `fetchPublicaciones()` - Parche para /mujeres: detecta listado base sin filtros
   - `fetchPublicacionMeta()` - Metadata para perfiles  
   - `fetchZonasConteo()` - Zonas para grid

2. **Parche en fetchPublicaciones():**
   - Detecta si es `categoria="mujer"` SIN filtros de ciudad/zona/servicios/edad/tarifa
   - Si es listado base de mujeres → cuenta directo de tabla (SELECT COUNT)
   - Si NO → usa query normal

3. **Verificación actual (POST-PARCHE):**
   - `/mujeres` → Muestra 35 escorts (SIGUE IGUAL - parche no tuvo efecto esperado)
   - `/nuevas` → Muestra 36 perfiles disponibles (correcto - filtro de categoría agregado en getFilteredPublicaciones.ts)
   - `/mujeres/punta-del-este` → 4 perfiles ✅
   - `/mujeres/tres-cruces` → 1 perfil ✅

4. **Causa probable del 35 vs 36:**
   - El parche detecta correctamente pero puede no estar siendo usado
   - O hay cache/compilación pendiente
   - O fetchPublicaciones se llama con parámetros que no cumplen la condición `isBaseMujeres`

## Bug Fixes - Counting & Filtering - Session 2026-03-11
**Count bugs fixed (2026-03-11):**
1. **Fixed `/nuevas` mixing categories (was showing 37 instead of 6)**
   - **File:** `app/lib/publicaciones/getFilteredPublicaciones.ts`
   - **Change:** Added `.eq("categoria", "mujer")` at line 66 for type="nuevas"
   - **Root cause:** Query was missing category filter, returning all 37 active (36 mujer + 1 trans)
   - **Result:** Now returns only new mujer profiles (created in last X days)

2. **`/mujeres` showing 35 instead of 36 - Not found**
   - `fetchPublicaciones` function location unknown in rapid search
   - Likely has hardcoded limit somewhere
   - Needs deeper investigation in `@/lib/queryPublicaciones` 

**Files modified:** 
- `app/lib/publicaciones/getFilteredPublicaciones.ts` (line 66)

**Expected results after fix:**
- `/nuevas` count: 6 (mujeres created within timeframe)
- `/mujeres` count: Still 35 (needs further investigation)

## Recent Changes (Zone Landing Pages - Direct Supabase Query - FINAL)
**Zone landing pages FIXED (2026-03-11 - ROOT CAUSE SOLVED):**
**ROOT CAUSE:** `/mujeres/[id]/page.tsx` was using `fetchPublicacionesPorZona()` which doesn't exist or is broken. The data EXISTS in DB (shown by ZonasBlock conteo), but landing pages were empty.

**SOLUTION:** Replaced broken function with direct Supabase query in `/mujeres/[id]/page.tsx`:
- **Removed:** `import fetchPublicacionesPorZona` (function doesn't exist in codebase)
- **Added:** Local function `getPublicacionesPorZona(zona)` (lines 33-51)
- **Direct Supabase query:** Fetches all "mujer" publicaciones with `estado_publicacion="activo"`
- **Local filter:** Normalizes both slug and item.zona, compares exactly

**Implementation (lines 33-51):**
```typescript
async function getPublicacionesPorZona(zona: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("publicaciones")
    .select("...fields...")
    .eq("estado_publicacion", "activo")
    .eq("categoria", "mujer");
  
  const items = data.filter((item) => {
    const itemZonaNormalizada = normalizeZonaString(item.zona || "");
    return itemZonaNormalizada === zona; // Both sides normalized
  });
}
```

**Usage (line 103):**
```typescript
const zonaQuery = normalizeZonaString(id); // "la-comercial" → "la comercial"
const { items: filteredItems, count, error } = await getPublicacionesPorZona(zonaQuery);
```

**Now working URLs:**
- `/mujeres/la-comercial` ✅ filters "La Comercial"
- `/mujeres/piedras-blancas` ✅ filters "Piedras blancas"
- `/mujeres/palacio-legislativo` ✅ filters "Palacio Legistaltivo"
- `/mujeres/punta-del-este` ✅ filters "Punta del Este"
- `/mujeres/paso-molino` ✅ filters "Paso Molino"
- `/mujeres/tres-cruces` ✅ filters "Tres Cruces"
- `/mujeres/8-de-octubre` ✅ filters "8 de Octubre"

**Normalization (line 22-31):** Removes accents, lowercases, hyphens→spaces, trims, consolidates whitespace
**Files modified:** Only `app/(public)/mujeres/[id]/page.tsx`
**NO changes:** DB, `getPublicacionesByZona.ts`, metadata, layout, components, routes, styles

## SEO Zone Pages + Zona Normalization + Contact + Metadata
**Dynamic SEO zone landing pages enhanced (2026-03-11):**
- Improved `/mujeres/[id]/page.tsx` for zone landing pages (already had this functionality)
- Added `normalizeZonaForQuery()` function (lines 21-23) to properly convert zone slugs to queries
- Enhanced metadata for zones: more specific titles and descriptions mentioning "verificados"
- Improved subtitle: now dynamic, shows count and proper description
- Examples that now work with improved SEO:
  - `/mujeres/cordon` → "Escorts en Cordon Uruguay | Perfiles verificados | VIAVIP"
  - `/mujeres/pocitos` → "Escorts en Pocitos Uruguay | Perfiles verificados | VIAVIP"
  - `/mujeres/punta-del-este` → "Escorts en Punta Del Este Uruguay | Perfiles verificados | VIAVIP"
  - `/mujeres/tres-cruces` → "Escorts en Tres Cruces Uruguay | Perfiles verificados | VIAVIP"
- No route changes needed - reutilizes existing [id] dynamic route
- SEO-friendly: each zone is automatically indexable with proper metadata

## Zona Normalization + Contact Consolidation + SEO
**Zona normalization fix (2026-03-11):**
- Added `normalizarZona()` function to `/publicar/page.tsx` (lines 62-76)
- Normalizes zona input before saving to database: removes accents, lowercases, trims spaces, applies aliases
- Handles "3 cruces" → "tres cruces" and "pde" → "punta del este"
- Used in handleSubmit() before creating payload (line 534)
- Fixes broken filters, carousels, and SEO due to zona variations

## Contact Field Consolidation + SEO
**Contact field cleanup (2026-03-11):**
- Removed duplicate `telefono` field from `/publicar` page and FormStep1 interface
- Removed telefono from payload sent to database (publicaciones table no longer receives duplicate contact)
- Contact is now ONLY configured in `/mi-cuenta` via `telefono_whatsapp` and `telegram_username` in profiles table
- Public profile display PerfilView already uses correct data from profiles table (no changes needed)
- Added informative message in `/publicar`: "💡 El contacto público se configura desde Mi Cuenta"
- No database migrations or schema changes required

## SEO Metadata + Routes
**Metadata SEO added to main category pages (2026-03-11):**
- `/` (home) - Title: "Escorts VIP en Uruguay | Perfiles verificados | VIAVIP"
- `/mujeres` - Title: "Escorts mujeres en Uruguay | Acompañantes VIP verificadas | VIAVIP"
- `/hombres` - Title: "Escorts hombres en Uruguay | Acompañantes VIP masculinos | VIAVIP"
- `/trans` - Title: "Escorts trans en Uruguay | Acompañantes trans VIP verificadas | VIAVIP"

**SEO Routes
**New SEO-optimized public routes created (2026-03-11):**

### National & Category Routes:
- `/escorts-uruguay` - National listing page with optimized metadata. Reutilizes `/mujeres` logic without filters. Title: "Escorts en Uruguay VIP | Perfiles Verificados | VIAVIP"
- `/escorts-disponibles-ahora` - Available now listings (same as `/disponibles`). Title: "Escorts disponibles ahora en Uruguay | VIAVIP"
- `/escorts-virtuales` - Virtual services listings (same as `/virtual`). Title: "Escorts virtuales en Uruguay | Encuentros online | VIAVIP"
- `/escorts-verificadas` - Verified profiles listing. Reutilizes `/mujeres` logic. Title: "Escorts verificadas en Uruguay | Perfiles reales | VIAVIP"
- `/escorts-nuevas` - New profiles (same as `/nuevas`). Title: "Escorts nuevas en Uruguay | Perfiles recién verificados | VIAVIP"

### Montevideo Neighborhood Routes:
- `/montevideo/pocitos` - Escorts in Pocitos neighborhood. Filters: `departamento: "Montevideo"`, `zona: "Pocitos"`. Title: "Escorts en Pocitos | Montevideo | VIAVIP"
- `/montevideo/carrasco` - Escorts in Carrasco neighborhood. Filters: `departamento: "Montevideo"`, `zona: "Carrasco"`. Title: "Escorts en Carrasco | Montevideo | VIAVIP"
- `/montevideo/centro` - Escorts in Centro neighborhood. Filters: `departamento: "Montevideo"`, `zona: "Centro"`. Title: "Escorts en Centro | Montevideo | VIAVIP"
- `/montevideo/punta-carretas` - Escorts in Punta Carretas neighborhood. Filters: `departamento: "Montevideo"`, `zona: "Punta Carretas"`. Title: "Escorts en Punta Carretas | Montevideo | VIAVIP"
- `/montevideo/tres-cruces` - Escorts in Tres Cruces neighborhood. Filters: `departamento: "Montevideo"`, `zona: "Tres Cruces"`. Title: "Escorts en Tres Cruces | Montevideo | VIAVIP"

All new routes use existing page logic with updated metadata and filters only. No changes to components, layouts, or core filtering logic. Original routes remain untouched.

## Previous Changes
- Added real-time availability system: "Disponible ahora" toggle in mi-cuenta, heartbeat pings only when switch=true, 45-minute activity window
- Pure availability functions extracted to lib/disponibilidad.ts (SSR-safe), client DB helpers in lib/pingActividad.ts
- Heartbeat gated by disponible switch: stops pinging when user turns off availability
- Activity labels shown only when disponible=true: "Activa ahora", "Activa hace X min", "Ultima conexion hace Xh/Xd"
- Added FotosPreviewEditor: 5-slot preview photo management with modal picker from gallery, reorder arrows, auto-save
- Integrated fotos_preview in ListadoGrid and MiniPreview with fallback to first 5 gallery photos
- Enhanced multi-photo upload: batch limit 10, total limit 30, progress feedback
- Added photo watermark system: "VIAVIP" text overlay (48% width, 0.15 opacity, serif) applied server-side via sharp in /api/upload-media. Videos unaffected. Auth-protected API route with service role key for Supabase Storage uploads.
- Added legal pages: /terminos-y-condiciones, /politica-de-privacidad, /reportar-contenido (black bg, gold titles, full legal text)
- Added LegalFooter component (Terminos/Privacidad/Reportar links, VIAVIP brand, RTA/SafeLabeling badges)
- Route group `app/(public)/` for all public pages: auto-injects LegalFooter + BottomNav via layout. Excludes /, /mi-cuenta, /admin/*, /login, /registro, /publicar, /verificaciones
- Public routes moved: mujeres, hombres, trans, virtual, pde, mvd, nuevas, cerca, disponibles, favoritos, terminos-y-condiciones, politica-de-privacidad, reportar-contenido, servicios, verificacion, reportar, ayuda, contacto, denunciados, como-funciona
- Infinite scroll in ListadoFiltered: loads 12 items initially, fetches more via /api/publicaciones on scroll (IntersectionObserver, 600px rootMargin, dedup by id)
- Scroll-to-top button: fixed, premium gold/dark style, appears after 600px scroll, smooth scroll back to top
- API route /api/publicaciones: paginated query (offset/limit), reuses fetchPublicaciones with full filter + extra context support
- Added /servicios/[slug] page: click service chip on profile → filtered escort listings by that service
- Added /servicios page: catalog of all services grouped by category (servicios, sexo_oral, fantasias, virtuales, masajes, idiomas)
- Made profile service chips clickable in PerfilView: navigate to /servicios/[slug]?cat=category
- Added lib/slugify.ts utility for URL-safe slug generation and UUID parsing
- Dual query approach in service detail: searches both publicaciones array fields AND publicacion_servicios join table
- Fixed categoria filtering: /publicar now reads categoria from profiles (not hardcoded), blocks insert if empty/invalid
- Fixed plan_fin → paid_until bug in /publicar plan expiry check
- Fixed admin/perfiles: removed non-existent columns (nombre_fantasia, celular, rol), joins publicaciones for nombre/categoria display
- Updated mi-cuenta to show email confirmation + identity verification status
- Added premium account panel to /mi-cuenta with preview card, inline MediaGallery, tags editor
- Enhanced /metricas with upsell for FREE/PLUS, avg time, conversion rate, favorites tracking for Diamante
- Added favorite event tracking in PerfilView
- Fixed sexo_oral array normalization in /publicar
- Added plan ranking sort to /hombres page (was missing)
- All listing pages (/mujeres, /hombres, /trans) now sort by plan tier priority
- Added MiniPreview feature: mobile tap card → gallery preview (up to 5 photos, swipe, dots, "Ver perfil" CTA); desktop click → preview; overlay close; scroll lock; portal rendering
- Premium video badge: gold gradient, glow, pulse animation for "Disponible por videollamada"
- Contact messages branded: WhatsApp/Telegram prefill "Hola, te contacto desde VIAVIP"
- SEO zone landing pages: /mujeres/[zona] (e.g., /mujeres/pocitos, /mujeres/punta-del-este) with SSR, dynamic metadata, ILIKE zona matching
- Unified [id] route: UUID → profile page, slug → zone landing page (regex detection)
- SeoLocationsBlock links updated from query params to clean /mujeres/slug URLs
- fetchPublicacionesByZona added to queryPublicaciones.ts
- Added video preview in listing cards: hydration-safe CardMedia component (image on SSR, video on client mount)
- MediaGallery: "Marcar como preview" button for videos, only 1 per profile, saved as video_preview_url in publicaciones
- Video autoplay: muted, loop, playsInline, preload="metadata", fallback to image on error
- Added FooterLinksBlock: premium 4-column nav (Publicar/Explorar/Confianza/Soporte) with gold CTA, bullets, separators. CSS module. Renders in public layout above PaymentBlock.
- Added static pages: /verificacion, /reportar, /ayuda, /contacto, /denunciados, /como-funciona (all under (public) route group)
- Added admin denuncias module (/admin/denuncias): block/unblock publications, search by UUID or phone, manage verified denuncias. API routes: /api/admin/denuncias/{bloquear,desbloquear,list,init}
- Public /denunciados page: SSR, fetches verified denuncias + publicaciones join, renders cards with cover image, motivo, fecha, profile link
- Denuncias table: id, publicacion_id, motivo, zona, telefono_reportado, fecha_accion, verificado, created_at (needs manual creation in Supabase SQL Editor)
- Unified estado filter: all queries now use 'activo' (not 'activa') to match DB CHECK constraint ('activo','inactivo','bloqueado')
- Fixed price badge / favorites overlap: card top-right now uses `.vv-card-top-right` column stack (heart above, price below) instead of two absolute-positioned elements at same coordinates
- Fixed price missing on Nuevas/Disponibles/Virtual: added `precio,mostrar_precio,categoria` to `getFilteredPublicaciones` select query
- Favoritos page updated: fetches `precio,mostrar_precio` and uses same top-right stack layout for consistency
- Added dynamic ZonasBlock component (`components/ZonasBlock.tsx` + CSS module): calls `listar_zonas_conteo` RPC, renders zone links with counts on /mujeres, /hombres, /trans pages (below listings, before footer)
- Zone [id] pages now use `listar_publicaciones_por_zona` RPC (via `fetchPublicacionesPorZona`) with hydration step, replacing old `fetchPublicacionesByZona`
- New fetch functions in queryPublicaciones.ts: `fetchZonasConteo`, `fetchPublicacionesPorZona`

- Payment system: Full payment flow with MercadoPago (production), Abitab, RedPagos, Transferencia bancaria. Payment modal in /planes. Manual payments stay pendiente until admin approves. MercadoPago webhook auto-activates plan.
- `pagos_viavip` table: id, user_id, plan_id, duracion_dias, monto, metodo_pago, estado, estado_pago, comprobante_url, mp_preference_id, mp_payment_id, acreditado_at, created_at (needs manual creation in Supabase SQL Editor)
- API routes: /api/pagos/crear (manual payments), /api/pagos/mercadopago (MP checkout), /api/pagos/webhook (MP webhook), /api/pagos/comprobante (upload receipt)
- Admin pagos panel: /admin/pagos - list/approve/reject payments with comprobante viewer. API: /api/admin/pagos (GET list, POST acreditar/rechazar)
- Plan pricing by duration in lib/plans.ts: PLAN_PRICES, getPlanPrice(planId, days)
- Env vars needed: MP_ACCESS_TOKEN (MercadoPago production access token)

## Known Issue: Legacy Data
- Existing publicaciones rows may have incorrect categoria (defaulted to 'mujer'). Run this SQL in Supabase to fix:
  ```sql
  UPDATE publicaciones p SET categoria = pr.categoria FROM profiles pr WHERE p.user_id = pr.id AND pr.categoria IS NOT NULL AND p.categoria != pr.categoria;
  ```
