# CRM System - Dokumentacja Projektu

## Spis treści
1. [Przegląd](#przegląd)
2. [Stack technologiczny](#stack-technologiczny)
3. [Struktura projektu](#struktura-projektu)
4. [Backend (Java/Spring Boot)](#backend)
5. [Frontend (React/Vite)](#frontend)
6. [Baza danych (PostgreSQL)](#baza-danych)
7. [API Endpoints](#api-endpoints)
8. [Konfiguracja i uruchomienie](#konfiguracja-i-uruchomienie)
9. [Konwencje i wzorce](#konwencje-i-wzorce)

---

## Przegląd

System CRM do zarządzania kontaktami, mailami, sekwencjami email marketingowymi, szansami sprzedaży (deals/pipelines), zadaniami i automatyzacjami.

**Główne funkcjonalności:**
- Zarządzanie kontaktami z tagowaniem i lead scoringiem
- Skrzynka odbiorcza z klasyfikacją AI (pozytywne/neutralne/negatywne)
- Sekwencje email z automatycznym wysyłaniem
- Pipeline sprzedaży (Kanban) z wieloma lejkami
- Zadania i kalendarz
- Automatyzacje workflow (triggery + akcje)
- Powiadomienia w czasie rzeczywistym
- Integracja z Woodpecker.co
- Email marketing (kampanie/newslettery)
- Szablony emaili z motywami wizualnymi

---

## Stack technologiczny

### Backend
- **Java 17** + **Spring Boot 3.2.0**
- **Spring Security** z JWT
- **Spring Data JPA** + Hibernate
- **PostgreSQL 15** (baza danych)
- **Flyway** (migracje bazy)
- **Caffeine Cache** (cache w pamięci)
- **JavaMail** (IMAP/SMTP)
- **Lombok** (redukcja boilerplate)

### Frontend
- **React 18** z hooks
- **Vite** (bundler)
- **React Router DOM 6** (routing)
- **Axios** (HTTP client)
- **Lucide React** (ikony)
- **React Hot Toast** (powiadomienia)
- **React Beautiful DND** (drag & drop w pipeline)

### Infrastruktura
- **Docker** + **Docker Compose**
- **Nginx** (reverse proxy dla frontendu)

---

## Struktura projektu

```
/crm
├── docker-compose.yml          # Orchestracja kontenerów
├── .env                        # Zmienne środowiskowe (nie w repo!)
├── PROJECT_DOCUMENTATION.md    # Ten plik
│
├── /backend                    # Spring Boot API
│   ├── Dockerfile
│   ├── pom.xml                 # Maven dependencies
│   └── /src/main/java/com/crm
│       ├── CrmApplication.java # Entry point
│       ├── /config             # Konfiguracje (Security, Cache, Async)
│       ├── /controller         # REST kontrolery
│       ├── /service            # Logika biznesowa
│       ├── /repository         # JPA repositories
│       ├── /model              # Encje JPA
│       ├── /dto                # Data Transfer Objects
│       ├── /mapper             # Entity <-> DTO mappers
│       ├── /security           # JWT, UserDetails
│       └── /exception          # Handlery wyjątków
│
└── /frontend                   # React SPA
    ├── Dockerfile
    ├── nginx.conf              # Konfiguracja Nginx
    ├── package.json
    ├── vite.config.js
    └── /src
        ├── main.jsx            # Entry point
        ├── App.jsx             # Router + layout
        ├── App.css             # Globalne style + zmienne CSS
        ├── /pages              # Strony (Dashboard, Contacts, Deals...)
        ├── /components         # Komponenty React
        ├── /services           # API client (api.js)
        ├── /hooks              # Custom hooks (useDebounce)
        ├── /context            # React Context (Theme)
        └── /styles             # CSS per strona
```

---

## Backend

### Główne encje (Model)

| Encja | Tabela | Opis |
|-------|--------|------|
| `Contact` | `contacts` | Kontakty/leady z tagami i scoringiem |
| `Email` | `emails` | Przychodzące/wychodzące maile |
| `EmailAccount` | `email_accounts` | Konta email IMAP/SMTP |
| `Deal` | `deals` | Szanse sprzedaży |
| `Pipeline` | `pipelines` | Lejki sprzedaży |
| `PipelineStage` | `pipeline_stages` | Etapy w lejku |
| `EmailSequence` | `email_sequences` | Sekwencje automatyczne |
| `SequenceStep` | `sequence_steps` | Kroki sekwencji (emaile) |
| `SequenceExecution` | `sequence_executions` | Uruchomienia sekwencji |
| `Task` | `tasks` | Zadania do wykonania |
| `Tag` | `tags` | Tagi do kontaktów |
| `WorkflowRule` | `workflow_rules` | Reguły automatyzacji |
| `Notification` | `notifications` | Powiadomienia użytkownika |
| `AdminUser` | `admin_users` | Użytkownicy systemu |
| `Attachment` | `attachments` | Załączniki do maili |

### Soft Delete
Encje implementują `SoftDeletable` - usuwanie ustawia `deletedAt` zamiast fizycznego usunięcia.

### Kluczowe serwisy

| Serwis | Odpowiedzialność |
|--------|------------------|
| `ContactService` | CRUD kontaktów, import CSV, merge duplikatów |
| `EmailService` | Zarządzanie mailami, filtrowanie |
| `EmailFetchService` | Pobieranie maili przez IMAP |
| `EmailSendingService` | Wysyłanie przez SMTP |
| `SequenceService` | Zarządzanie sekwencjami i wykonaniami |
| `ScheduledEmailService` | Planowanie i wysyłka zaplanowanych maili |
| `DealService` | Zarządzanie pipeline'ami i dealami |
| `AIClassificationService` | Klasyfikacja sentymentu maili (AI) |
| `AIReplyService` | Generowanie odpowiedzi AI |
| `WorkflowAutomationService` | Wykonywanie reguł automatyzacji |
| `LeadScoringService` | Obliczanie score kontaktów |

### Security
- JWT tokens (30 dni ważności)
- BCrypt password hashing
- Role: `ADMIN`, `USER`
- Endpoint `/api/auth/login` zwraca token

### Cache
Caffeine cache z konfiguracją: `maximumSize=1000, expireAfterWrite=600s`
- Cache `pipelines` - czyści się przy modyfikacji pipeline'ów

---

## Frontend

### Strony (Pages)

| Plik | Route | Opis |
|------|-------|------|
| `Login.jsx` | `/login` | Logowanie |
| `Dashboard.jsx` | `/` | Skrzynka email + statystyki |
| `Contacts.jsx` | `/contacts` | Lista kontaktów |
| `Deals.jsx` | `/deals` | Pipeline Kanban |
| `Tasks.jsx` | `/tasks` | Zadania |
| `Sequences.jsx` | `/sequences` | Sekwencje email |
| `Automations.jsx` | `/automations` | Workflow rules |
| `Calendar.jsx` | `/calendar` | Kalendarz |
| `Analytics.jsx` | `/analytics` | Statystyki |
| `EmailAccounts.jsx` | `/email-accounts` | Konta email |
| `EmailMarketing.jsx` | `/email-marketing` | Kampanie |
| `Settings.jsx` | `/settings` | Ustawienia |
| `Users.jsx` | `/users` | Zarządzanie użytkownikami |

### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `Header.jsx` | Nawigacja górna + powiadomienia |
| `EmailModal.jsx` | Modal odpowiedzi na email (split view) |
| `EmailListItem.jsx` | Wiersz listy maili |
| `RichTextEditor.jsx` | Edytor WYSIWYG do maili |
| `PipelineColumn.jsx` | Kolumna Kanban |
| `PipelineCard.jsx` | Karta deala w Kanban |
| `TagModal.jsx` | Modal tagowania |
| `LoadingSpinner.jsx` | Spinner ładowania |
| `EmptyState.jsx` | Stan pusty (brak danych) |
| `Toast.jsx` | Powiadomienia toast |
| `CommandPalette.jsx` | Paleta komend (Ctrl+K) |

### API Service (`/services/api.js`)

Eksportowane obiekty API:
- `emailsApi` - Maile
- `contactsApi` - Kontakty
- `sequencesApi` - Sekwencje
- `tasksApi` - Zadania
- `tagsApi` - Tagi
- `dealsApi` - Deale
- `workflowsApi` - Automatyzacje
- `notificationsApi` - Powiadomienia
- `analyticsApi` - Analityka
- `attachmentsApi` - Załączniki
- `emailAccountsApi` - Konta email
- `woodpeckerApi` - Integracja Woodpecker
- `aiApi` - Funkcje AI

### Zmienne CSS (Theming)

Definicje w `App.css`:

```css
:root {
  --color-primary: #10b981;       /* Emerald */
  --color-bg-main: #f8fafc;       /* Tło główne */
  --color-bg-surface: #ffffff;    /* Karty/panele */
  --color-bg-elevated: #f1f5f9;   /* Elementy podniesione */
  --color-text-main: #1e293b;     /* Tekst główny */
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;
}

html.dark {
  --color-bg-main: #0f172a;
  --color-bg-surface: #1e293b;
  --color-bg-elevated: #334155;
  --color-text-main: #f1f5f9;
  /* ... */
}
```

### Hooks

- `useDebounce(value, delay)` - Debounce wartości
- `useDebouncedCallback(fn, delay)` - Debounce funkcji
- `useThrottledCallback(fn, delay)` - Throttle funkcji

---

## Baza danych

### Migracje Flyway

Lokalizacja: `/backend/src/main/resources/db/migration/`

| Migracja | Opis |
|----------|------|
| V1 | Baseline - podstawowe tabele |
| V2 | Kolumny reply i sequence |
| V3 | Tabele sekwencji |
| V4 | Deals i pipeline |
| V5-V9 | Poprawki, konta email |
| V10-V11 | Indeksy, tagi |
| V12-V17 | Rozszerzenia sekwencji |
| V18-V21 | Scoring, indeksy wydajnościowe |
| V22-V25 | Szablony email, soft delete |
| V26-V29 | Workflows, newsletters, attachments |

### Indeksy (wydajność)

Zdefiniowane przez `@Index` w modelach:
- `contacts`: user_id, email, company, score, deleted_at
- `emails`: user_id, sender, company, status, received_at, account_id
- `deals`: user_id, pipeline_id, stage_id, contact_id, status

---

## API Endpoints

### Autentykacja
```
POST /api/auth/login         # Logowanie, zwraca JWT
POST /api/auth/register      # Rejestracja
GET  /api/auth/me            # Aktualny użytkownik
```

### Kontakty
```
GET    /api/contacts              # Lista (+ ?search, ?company, ?page, ?size)
GET    /api/contacts/simple       # Lista uproszczona (id, name, email)
GET    /api/contacts/{id}         # Szczegóły
POST   /api/contacts              # Tworzenie
PUT    /api/contacts/{id}         # Aktualizacja
DELETE /api/contacts/{id}         # Soft delete
POST   /api/contacts/{id}/restore # Przywracanie
POST   /api/contacts/import       # Import CSV
GET    /api/contacts/export       # Eksport CSV
GET    /api/contacts/duplicates   # Znajdź duplikaty
POST   /api/contacts/merge        # Merge duplikatów
```

### Emaile
```
GET  /api/emails                  # Lista (+ filtry)
GET  /api/emails/{id}             # Szczegóły
POST /api/emails/{id}/reply       # Odpowiedz
POST /api/emails/{id}/suggest-reply # Sugestia AI
POST /api/email-fetch/fetch       # Pobierz nowe maile
```

### Deals / Pipeline
```
GET    /api/deals/pipelines           # Wszystkie lejki
GET    /api/deals/all                 # Wszystkie deale
GET    /api/deals/pipeline/{id}       # Deale w lejku
POST   /api/deals                     # Nowy deal
PUT    /api/deals/{id}/stage          # Zmień etap
DELETE /api/deals/{id}                # Usuń

POST   /api/deals/pipelines           # Nowy lejek
PUT    /api/deals/pipelines/{id}      # Edycja lejka
DELETE /api/deals/pipelines/{id}      # Usuń lejek

GET    /api/deals/pipelines/{id}/stages  # Etapy lejka
POST   /api/deals/pipelines/{id}/stages  # Nowy etap
PUT    /api/deals/stages/{id}            # Edycja etapu
DELETE /api/deals/stages/{id}            # Usuń etap
```

### Sekwencje
```
GET    /api/sequences                 # Lista
GET    /api/sequences/active          # Aktywne
GET    /api/sequences/{id}            # Szczegóły
POST   /api/sequences                 # Tworzenie
PUT    /api/sequences/{id}            # Aktualizacja
DELETE /api/sequences/{id}            # Usuwanie

POST   /api/sequences/{id}/start      # Uruchom dla kontaktu
POST   /api/sequences/{id}/test       # Testowe wysłanie
GET    /api/sequences/{id}/executions # Wykonania
```

### Tagi
```
GET    /api/tags                      # Lista
POST   /api/tags                      # Tworzenie
POST   /api/tags/contact/{id}/add/{tagId}     # Dodaj tag
DELETE /api/tags/contact/{id}/remove/{tagId}  # Usuń tag
POST   /api/tags/contacts/add         # Bulk dodaj
```

### Workflows
```
GET    /api/workflows/rules           # Reguły
POST   /api/workflows/rules           # Nowa reguła
POST   /api/workflows/rules/{id}/toggle # Włącz/wyłącz
GET    /api/workflows/executions      # Historia wykonań
```

### Inne
```
GET  /api/tasks                  # Zadania
GET  /api/notifications          # Powiadomienia
GET  /api/analytics/dashboard    # Statystyki
GET  /api/health                 # Health check
```

---

## Konfiguracja i uruchomienie

### Wymagane zmienne środowiskowe (.env)

```env
# Baza danych
POSTGRES_DB=crm_db
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=<haslo>

# JWT
JWT_SECRET=<min-256-bitowy-secret>

# Email (IMAP/SMTP)
EMAIL_USERNAME=<email>
EMAIL_PASSWORD=<haslo>
EMAIL_IMAP_HOST=mail.example.com
EMAIL_SMTP_HOST=mail.example.com

# AI (Groq/OpenAI compatible)
AI_API_KEY=<klucz>
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_MODEL=llama-3.3-70b-versatile

# Opcjonalne
WOODPECKER_API_KEY=<klucz>
APP_BASE_URL=http://localhost:8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Uruchomienie

```bash
# Budowanie
docker-compose build

# Start
docker-compose up -d

# Logi
docker logs crm-backend -f
docker logs crm-frontend -f

# Restart po zmianach
docker-compose build backend && docker restart crm-backend
docker-compose build frontend && docker restart crm-frontend
```

### Porty
- **3000** - Frontend (Nginx)
- **8080** - Backend API
- **5432** - PostgreSQL

---

## Konwencje i wzorce

### Backend
1. **Nazewnictwo**: CamelCase dla klas, snake_case dla kolumn DB
2. **DTO**: Używaj DTO dla request/response, nie encji bezpośrednio
3. **Walidacja**: `@Valid` + adnotacje Jakarta Validation w DTO
4. **Transakcje**: `@Transactional` na metodach serwisowych
5. **Cache**: `@Cacheable`, `@CacheEvict` dla często używanych danych
6. **Soft Delete**: `deletedAt` timestamp zamiast fizycznego usuwania
7. **EntityGraph**: Używaj dla unikania N+1 queries

### Frontend
1. **Komponenty**: Functional components z hooks
2. **State**: useState dla lokalnego, Context dla globalnego
3. **API**: Wszystkie wywołania przez `/services/api.js`
4. **Style**: CSS modules lub globalne w App.css
5. **Dark Mode**: Używaj zmiennych CSS `var(--color-*)`
6. **Debouncing**: useDebounce dla inputów search
7. **Toast**: react-hot-toast dla powiadomień

### Git
- Branch główny: `main`
- Commit message z emoji: `feat:`, `fix:`, `refactor:`

---

## Znane ograniczenia / TODO

1. **Brak testów** - minimalne pokrycie testami
2. **Brak rate limiting** - podatność na DDoS
3. **JWT w localStorage** - rozważ httpOnly cookies
4. **Brak HTTPS** - wymaga konfiguracji w produkcji
5. **Virtual scrolling** - brak (wymaga react-window)
6. **WebSockets** - brak real-time updates (polling)

---

## Kontakt

Projekt CRM - wersja wewnętrzna.
