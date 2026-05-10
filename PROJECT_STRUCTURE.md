# LogPose — Guía de Estructura para Agentes IA

> Última actualización: 2026-05-06  
> Stack: Angular 17+ (standalone), TailwindCSS, Spring Boot backend (Java)

---

## 1. Visión General

Aplicación web para gestionar mazos del juego de cartas **One Piece TCG (OPTCG)**.  
Permite a los usuarios explorar cartas, construir mazos, visualizarlos, exportarlos (PNG/PDF/texto) y explorar mazos públicos de otros usuarios.

### Tecnologías Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 17+ | Framework principal (componentes standalone) |
| TailwindCSS | 3.x | Estilos utilitarios |
| jsPDF | latest | Generación de PDF para export |
| RxJS | 7+ | Gestión de estado reactivo |

---

## 2. Estructura de Carpetas

```
src/app/
├── app.component.ts          # Shell principal con navbar
├── app.routes.ts             # Definición de rutas
├── app.config.ts             # Configuración: providers, interceptors, router
│
├── core/                     # Servicios singleton y lógica de infraestructura
│   ├── models/
│   │   ├── card.models.ts    # Interface Card (snake_case) — LEGACY, no usar
│   │   └── deck.models.ts    # DeckSummary, DeckDetail, DeckRequest, PageResponse<T>
│   ├── api-client.service.ts # Wrapper de HttpClient con URL base del environment
│   ├── auth.service.ts       # Login, register, me(), logout
│   ├── auth-session.service.ts # BehaviorSubject: token + user. Hidrata desde localStorage
│   ├── auth.models.ts        # AuthUser, AuthResponse, LoginRequest, RegisterRequest
│   ├── auth.guard.ts         # Redirige a /auth/login si no autenticado
│   ├── guest.guard.ts        # Redirige a / si ya autenticado
│   ├── auth.interceptor.ts   # Añade Bearer token a todas las peticiones
│   ├── error.interceptor.ts  # Captura 401 → clear session + redirect login
│   ├── color-utils.service.ts # [NEW] Utilidades de color OPTCG (getBorderClass, getHeaderGradient...)
│   ├── card.service.ts       # ⚠️ DEPRECATED — Usar CardsService de features/cards/
│   └── deck.service.ts       # CRUD de decks: getPublicDecks, getMyDecks, getDeckById, create, update, delete, toggleLike, getLikeStatus
│
├── shared/                   # [NEW] Elementos reutilizables entre features
│   ├── components/
│   │   └── pagination/
│   │       └── pagination.component.ts  # Paginación standalone (1-indexed, con selector de tamaño)
│   └── pipes/
│       └── date-format.pipe.ts          # Formatea fechas en español ('es-ES', long format)
│
└── features/
    ├── auth/
    │   ├── login.component.ts    # Formulario login
    │   └── register.component.ts # Formulario registro
    │
    ├── cards/
    │   ├── cards.models.ts       # ExternalCardDto, CardFilters (MODELO PRINCIPAL DE CARTA)
    │   ├── cards.service.ts      # Servicio principal de cartas (ver sección 3)
    │   ├── cards.component.ts    # Grid de cartas con filtros avanzados + modal detalle
    │   ├── cards.component.html
    │   ├── leaders.component.ts  # Grid de líderes agrupados + modal detalle + navegación a decks
    │   ├── leaders.component.html
    │   └── card-detail.component.ts # Página de detalle individual (ruta /cards/:id)
    │
    ├── decks/
    │   ├── decks.component.ts    # Lista "mis mazos" del usuario autenticado
    │   ├── decks.component.html
    │   ├── decks-explore.component.ts   # Explorador de mazos públicos con filtros
    │   ├── decks-explore.component.html
    │   ├── deck-view.component.ts        # Vista detallada de un mazo (export, like, copy)
    │   ├── deck-view.component.html
    │   └── builder/
    │       ├── deck-builder.component.ts # Constructor/editor de mazos
    │       └── deck-builder.component.html
    │
    └── home/
        ├── home.component.ts   # Landing page
        └── home.component.html
```

---

## 3. Servicios Principales

### `CardsService` (`features/cards/cards.service.ts`) ⭐ SERVICIO PRINCIPAL DE CARTAS

**El servicio más importante del frontend.** Centraliza el acceso a todas las cartas del juego con caché en memoria.

| Método | Descripción |
|---|---|
| `preloadAllCards(forceRefresh?)` | Carga todas las cartas del backend y las cachea. Evita peticiones duplicadas con `shareReplay(1)`. |
| `getCards(filters?)` | Filtra y ordena las cartas cacheadas. Nunca hace petición HTTP si el caché existe. |
| `getCardById(id)` | Busca en caché, si no existe llama al backend directamente. |
| `getLeaders(grouped?)` | Filtra líderes. Si `grouped=true`, agrupa variantes y devuelve la versión base. |
| `getBaseId(card)` | Normaliza el ID de una carta (ej. `OP01-001_P1` → `op01-001`). |
| `groupAndPickBase(cards)` | Agrupa variantes de una misma carta y elige la versión base para mostrar. |
| `getCardVersionsBySetId(cardSetId)` | Devuelve todas las variantes de una carta (diferentes artes/ediciones). |
| `sortCards(cards)` | Ordena por `cardSetId` descendente (sets más nuevos primero). |
| `normalizeCard(raw)` | Normaliza el JSON crudo del backend (camelCase y snake_case) al modelo `ExternalCardDto`. |
| `getAllSets()` | Llama directamente a la API externa `optcgapi.com` para listar sets disponibles. |

**Modelo de datos:** `ExternalCardDto` (camelCase)
```typescript
{ id, name, type, attribute, power, counter, color, text, cost, life,
  imageUrl, setName, setId, cardSetId, subTypes, rarity, counterAmount,
  dateScraped, cardImageId, inventoryPrice, marketPrice }
```

**Filtros disponibles** (`CardFilters`):
`nameOrId`, `text`, `set`, `subTypes`, `types[]`, `rarity[]`, `attributes[]`, `keywords[]`, `counterFilters[]`, `colors[]`, `hasTrigger`, `costs[]`, `powerRange{min,max}`

---

### `DeckService` (`core/deck.service.ts`)

| Método | HTTP | Descripción |
|---|---|---|
| `getPublicDecks(page, size, leaderCardId?, color?, sort?)` | GET `/decks` | Mazos públicos paginados |
| `getMyDecks()` | GET `/decks/my` | Mazos del usuario autenticado |
| `getDeckById(id)` | GET `/decks/:id` | Mazo con lista de cartas |
| `createDeck(request)` | POST `/decks` | Crear nuevo mazo |
| `updateDeck(id, request)` | PUT `/decks/:id` | Actualizar mazo existente |
| `deleteDeck(id)` | DELETE `/decks/:id` | Eliminar mazo |
| `toggleLike(id)` | POST `/decks/:id/like` | Dar/quitar like |
| `getLikeStatus(id)` | GET `/decks/:id/like` | Estado del like del usuario |

**Modelos:** `DeckSummary` (lista), `DeckDetail` (completo con `cards: {[cardId]: quantity}`), `DeckRequest` (crear/editar), `PageResponse<T>` (paginación)

---

### `AuthSessionService` (`core/auth-session.service.ts`)

Gestiona la sesión del usuario en `localStorage`. Usa `BehaviorSubject` para reactividad.

| Propiedad/Método | Descripción |
|---|---|
| `token$` | Observable del JWT token |
| `user$` | Observable del usuario (`AuthUser: {id, username, email}`) |
| `token` | Getter síncrono del token actual |
| `user` | Getter síncrono del usuario actual |
| `isAuthenticated()` | `true` si hay token |
| `setSession(token, user)` | Guarda en localStorage y notifica |
| `clear()` | Cierra sesión |

---

### `ApiClientService` (`core/api-client.service.ts`)

Wrapper de `HttpClient`. Usa `environment.apiBaseUrl` como base URL.

```typescript
get<T>(path, params?)    // GET con HttpParams opcionales
post<T>(path, body)      // POST
put<T>(path, body)       // PUT
delete<T>(path)          // DELETE
```

---

## 4. Rutas de la Aplicación

| Ruta | Componente | Guard |
|---|---|---|
| `/` | `HomeComponent` | — |
| `/cards` | `CardsComponent` | — |
| `/cards/leaders` | `LeadersComponent` | — |
| `/cards/:id` | `CardDetailComponent` | — |
| `/auth/login` | `LoginComponent` | `guestGuard` |
| `/auth/register` | `RegisterComponent` | `guestGuard` |
| `/decks` | `DecksComponent` | `authGuard` |
| `/decks/build` | `DeckBuilderComponent` | ⚠️ Sin guard (el componente redirige si no auth) |
| `/decks/edit/:id` | `DeckBuilderComponent` | `authGuard` |
| `/decks/view/:id` | `DeckViewComponent` | — |
| `/decks/explore` | `DecksExploreComponent` | — |
| `/**` | Redirect → `/` | — |

> ⚠️ **Nota:** La ruta `/decks/build` no tiene `canActivate: [authGuard]` aunque requiere autenticación para guardar. El componente maneja internamente el redirect a login.

---

## 5. Flujos de Datos Clave

### Construcción de un Mazo
```
DeckBuilderComponent
  ├── CardsService.preloadAllCards() → caché de todas las cartas
  ├── CardsService.getCards(filters) → cartas filtradas (del caché)
  ├── DeckService.getDeckById() → si es edición
  └── DeckService.createDeck() / updateDeck() → guarda el mazo
```

### Vista de un Mazo
```
DeckViewComponent
  ├── DeckService.getDeckById(id) → DeckDetail (cartas como {cardId: quantity})
  ├── CardService.getCardById(leaderId) → carta del líder (⚠️ usa API legacy)
  └── Por cada cardId en DeckDetail.cards:
        CardService.getCardById(cardId) → carta individual
```

### Exploración de Mazos
```
DecksExploreComponent
  ├── DeckService.getPublicDecks(page, size, leaderId?, color?) → lista paginada
  ├── CardsService.getLeaders() → para el dropdown de filtro de líder
  └── CardsService.getCardById(leaderId) → imágenes de líder para cada deck card
```

---

## 6. Patrones Comunes en los Componentes

### Modal de Detalle de Carta
Los componentes `CardsComponent`, `DeckBuilderComponent` y `LeadersComponent` implementan un modal propio con:
- `detailOpen: boolean` — controla visibilidad
- `detailCard: ExternalCardDto | null` — carta principal mostrada
- `detailSlides: ExternalCardDto[]` — versiones/variantes de la carta
- `detailImageIndex: number` — índice de la variante activa
- `detailRequestSeq: number` — evita race conditions al abrir/cerrar rápido

### Paginación Local
`CardsComponent` y `DeckBuilderComponent` implementan paginación en el cliente sobre arrays en memoria:
- `currentPage: number` (1-indexed)
- `pageSize: number` (default 24)
- `totalPages: number` (computed)
- `visiblePageNumbers: number[]` (ventana deslizante de 5 páginas)
- `goToPage()`, `prevPage()`, `nextPage()`, `changePageSize()`

`DecksExploreComponent` implementa paginación en el servidor (0-indexed) ya que llama al backend por página.

### Imágenes de Líder en Listas de Decks
Tanto `DecksComponent` como `DecksExploreComponent` mantienen un `Map<string, ExternalCardDto>` llamado `leaderImages` para cachear localmente las imágenes de líderes ya cargadas:
```typescript
leaderImages: Map<string, ExternalCardDto> = new Map();
loadLeaderImages(): void { ... }
getLeaderImage(leaderCardId: string): string | undefined { ... }
getLeaderColor(leaderCardId: string): string { ... }
getBorderColorClass(leaderCardId: string): string { ... }
```

### Colores del OPTCG
Los colores del juego son: `Red`, `Green`, `Blue`, `Purple`, `Black`, `Yellow`.
Los métodos de color normalizan mediante `includes()` sobre el string en lowercase, ya que algunas cartas son multicolor (ej. `"Red/Blue"`).

---

## 7. Funcionalidades de Export (DeckViewComponent)

| Método | Descripción |
|---|---|
| `exportToText()` | Genera lista `1xOP01-001\n4xOP02-123\n...` y la copia al portapapeles |
| `exportToImage()` | Usa Canvas API para renderizar una imagen PNG del mazo y la descarga |
| `exportToPdf()` | Usa `jsPDF` para generar un PDF A4 con cartas a tamaño real (63×88 mm) listas para imprimir |
| `fetchViaProxy(url)` | Descarga imágenes de cartas a través del backend (`/proxy/image?url=...`) para evitar problemas CORS en Canvas/PDF |

---

## 8. Problemas Conocidos y Deuda Técnica

| Problema | Severidad | Estado |
|---|---|---|
| ~~Doble `constructor`/`ngOnInit` en `DeckBuilderComponent`~~ | ~~🔴 Alta~~ | ✅ Revisado — estructura válida en TypeScript |
| ~~`CardService` (core) vs `CardsService` (feature)~~ | ~~🔴 Alta~~ | ✅ **Resuelto** — `DeckViewComponent` migrado a `CardsService` |
| ~~`exportTextCopied` se setea dos veces en `exportToText()`~~ | ~~🟡 Media~~ | ✅ **Resuelto** — Timer unificado en callback |
| ~~`CardsComponent` no declara `OnDestroy` en `implements`~~ | ~~🟡 Media~~ | ✅ **Resuelto** — Añadido `implements OnDestroy` |
| ~~Métodos de color duplicados en 4 componentes~~ | ~~🟢 Baja~~ | ✅ **Resuelto** — Extraído a `ColorUtilsService` |
| ~~Lógica de paginación duplicada en 3 componentes~~ | ~~🟢 Baja~~ | ✅ **Resuelto** — `PaginationComponent` compartido |
| ~~`formatDate()` duplicado en 3 componentes~~ | ~~🟢 Baja~~ | ✅ **Resuelto** — `DateFormatPipe` standalone |
| `/decks/build` sin `authGuard` | 🟢 Baja | ✅ **Resuelto** — Añadido `canActivate: [authGuard]` |
| Modal de detalle duplicado en 3 componentes | 🟢 Baja | 🔄 Pendiente — `CardDetailModalComponent` (pendiente por divergencias de implementación) |

---

## 9. Variables de Entorno

**`src/environments/environment.ts`** (desarrollo):
```typescript
{ apiBaseUrl: 'http://localhost:8080/api' }
```

**`src/environments/environment.prod.ts`** (producción):
Misma estructura con URL de producción.

El `ApiClientService` usa `environment.apiBaseUrl` como prefijo para todas las peticiones al backend.
El `CardsService.getAllSets()` llama directamente a `https://www.optcgapi.com/api/allSets/` (API externa, sin pasar por backend).

---

## 10. Backend

Stack: **Spring Boot + Java**, accesible en `http://localhost:8080/api` durante desarrollo.

Rutas relevantes del backend:
```
GET    /api/cards                    → Lista de cartas (soporta filtros como query params)
GET    /api/cards/leaders            → Solo líderes
GET    /api/cards/:id                → Carta por ID
GET    /api/proxy/image?url=...      → Proxy de imágenes externas (evita CORS)
POST   /api/auth/login               → { username, password } → { token, id, username, email }
POST   /api/auth/register            → { username, email, password } → { token, ... }
GET    /api/auth/me                  → Usuario actual
GET    /api/decks?page&size&leaderCardId&color&sort → Mazos públicos paginados
GET    /api/decks/my                 → Mazos del usuario autenticado
GET    /api/decks/:id                → Mazo por ID
POST   /api/decks                    → Crear mazo
PUT    /api/decks/:id                → Actualizar mazo
DELETE /api/decks/:id                → Eliminar mazo
POST   /api/decks/:id/like           → Toggle like
GET    /api/decks/:id/like           → Estado del like
```
