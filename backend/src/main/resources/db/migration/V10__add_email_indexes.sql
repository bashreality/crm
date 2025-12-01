-- Dodaj indeksy dla lepszej wydajności zapytań na tabeli emails i contacts

-- === EMAILS TABLE INDEXES ===

-- Indeks na kolumnie status - przyspiesza filtrowanie po statusie emaila
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);

-- Indeks na kolumnie sender - przyspiesza wyszukiwanie emaili po nadawcy
CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender);

-- Indeks na kolumnie company - przyspiesza filtrowanie i wyszukiwanie po firmie
CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company);

-- Indeks na kolumnie subject - przyspiesza wyszukiwanie po temacie
CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails(subject);

-- Unikalny indeks na message_id - przyspiesza wyszukiwanie po ID wiadomości
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL;

-- Indeks na tracking_id - dla trackingu emaili
CREATE INDEX IF NOT EXISTS idx_emails_tracking_id ON emails(tracking_id) WHERE tracking_id IS NOT NULL;

-- Indeks na received_at - przyspiesza sortowanie chronologiczne
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);

-- === COMPOSITE INDEXES (for combined filters) ===

-- Indeks złożony na sender + status - optymalizuje zapytania łączące oba warunki
CREATE INDEX IF NOT EXISTS idx_emails_sender_status ON emails(sender, status);

-- Złożony indeks account_id + status - dla statystyk per konto
CREATE INDEX IF NOT EXISTS idx_emails_account_status ON emails(account_id, status);

-- Złożony indeks company + status - dla filtrowania po firmie i statusie
CREATE INDEX IF NOT EXISTS idx_emails_company_status ON emails(company, status);

-- === CONTACTS TABLE INDEXES ===

-- Indeks na kolumnie email w tabeli contacts - przyspiesza wyszukiwanie po emailu
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Indeks na updated_at w contacts - przyspiesza sortowanie po ostatniej aktualizacji
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at DESC);
