-- Add email accounts for dajano-logistyka.pl domain
INSERT INTO email_accounts (email_address, password, imap_host, imap_port, imap_protocol, smtp_host, smtp_port, enabled, display_name, created_at)
VALUES
    ('wiktor.grzesiak@dajano-logistyka.pl', 'K7mN9pQ2xR8sL4v', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Logistyka - Wiktor Grzesiak', NOW()),
    ('grzesiak.wiktor@dajano-logistyka.pl', 'K7mN9pQ2xR8sL4v', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Logistyka - Grzesiak Wiktor', NOW()),
    ('wgrzesiak@dajano-logistyka.pl', 'K7mN9pQ2xR8sL4v', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Logistyka - WGrzesiak', NOW()),
    ('w.grzesiak@dajano-logistyka.pl', 'K7mN9pQ2xR8sL4v', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Logistyka - W.Grzesiak', NOW())
ON CONFLICT (email_address) DO NOTHING;

-- Add email accounts for dajano-pojemniki.pl domain
INSERT INTO email_accounts (email_address, password, imap_host, imap_port, imap_protocol, smtp_host, smtp_port, enabled, display_name, created_at)
VALUES
    ('wiktor.grzesiak@dajano-pojemniki.pl', 'B3nF6hT9wY5qM1k', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Pojemniki - Wiktor Grzesiak', NOW()),
    ('grzesiak.wiktor@dajano-pojemniki.pl', 'B3nF6hT9wY5qM1k', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Pojemniki - Grzesiak Wiktor', NOW()),
    ('wgrzesiak@dajano-pojemniki.pl', 'B3nF6hT9wY5qM1k', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Pojemniki - WGrzesiak', NOW()),
    ('w.grzesiak@dajano-pojemniki.pl', 'B3nF6hT9wY5qM1k', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Pojemniki - W.Grzesiak', NOW())
ON CONFLICT (email_address) DO NOTHING;

-- Add email accounts for dajano-gitterboxen.de domain
INSERT INTO email_accounts (email_address, password, imap_host, imap_port, imap_protocol, smtp_host, smtp_port, enabled, display_name, created_at)
VALUES
    ('wiktor.grzesiak@dajano-gitterboxen.de', 'X8jD4cZ7rP2aE9n', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Gitterboxen - Wiktor Grzesiak', NOW()),
    ('grzesiak.wiktor@dajano-gitterboxen.de', 'X8jD4cZ7rP2aE9n', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Gitterboxen - Grzesiak Wiktor', NOW()),
    ('wgrzesiak@dajano-gitterboxen.de', 'X8jD4cZ7rP2aE9n', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Gitterboxen - WGrzesiak', NOW()),
    ('w.grzesiak@dajano-gitterboxen.de', 'X8jD4cZ7rP2aE9n', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Gitterboxen - W.Grzesiak', NOW())
ON CONFLICT (email_address) DO NOTHING;

-- Add email accounts for dajano-behalter.de domain
INSERT INTO email_accounts (email_address, password, imap_host, imap_port, imap_protocol, smtp_host, smtp_port, enabled, display_name, created_at)
VALUES
    ('wiktor.grzesiak@dajano-behalter.de', 'V5uG1mH8sC3kN6t', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Behalter - Wiktor Grzesiak', NOW()),
    ('grzesiak.wiktor@dajano-behalter.de', 'V5uG1mH8sC3kN6t', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Behalter - Grzesiak Wiktor', NOW()),
    ('wgrzesiak@dajano-behalter.de', 'V5uG1mH8sC3kN6t', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Behalter - WGrzesiak', NOW()),
    ('w.grzesiak@dajano-behalter.de', 'V5uG1mH8sC3kN6t', 'mail.q-prospect.pl', 993, 'imaps', 'mail.q-prospect.pl', 587, TRUE, 'Dajano Behalter - W.Grzesiak', NOW())
ON CONFLICT (email_address) DO NOTHING;
