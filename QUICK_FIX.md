# Quick Fix dla Bazy Danych

## Problem
Backend nie startuje z powodu braku kolumn w tabeli `emails`.

## Rozwiązanie 1: SQL Script (Najszybsze)

Uruchom ten skrypt SQL bezpośrednio na bazie danych:

```bash
# Połącz się z bazą danych PostgreSQL
psql -U crm_user -d crm_db -h localhost

# Lub użyj parametrów z docker-compose.yml/application.properties
```

Następnie uruchom:

```sql
-- Dodaj brakujące kolumny
ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT;

-- Dodaj indeksy
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- Sprawdź czy kolumny zostały dodane
\d emails
```

## Rozwiązanie 2: Użyj przygotowanego skryptu

```bash
psql -U crm_user -d crm_db -h localhost -f /home/user/crm/fix_database_schema.sql
```

## Rozwiązanie 3: Włącz Flyway (Po naprawie ręcznej)

Jeśli chcesz używać Flyway w przyszłości:

```bash
# Ustaw zmienną środowiskową
export FLYWAY_ENABLED=true

# Lub w docker-compose.yml dodaj:
environment:
  - FLYWAY_ENABLED=true
```

## Weryfikacja

Po zastosowaniu któregokolwiek rozwiązania:

1. Zrestartuj backend
2. Sprawdź czy aplikacja działa: http://localhost:8080/api/emails
3. Sprawdź frontend: http://localhost:3000

## Aktualne Ustawienia

- Flyway jest WYŁĄCZONE domyślnie (spring.flyway.enabled=false)
- Hibernate nadal działa w trybie "update" i będzie próbował dodać brakujące kolumny przy starcie
- Możesz bezpiecznie uruchomić backend

## Co dalej?

Po naprawie bazy danych wszystko powinno działać:
- ✅ Przeglądanie emaili
- ✅ Konwersacje w kontaktach
- ✅ System odpowiedzi
- ✅ Sekwencje follow-up
