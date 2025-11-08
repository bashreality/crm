package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactAutoCreationService {

    private final ContactRepository contactRepository;
    private final EmailRepository emailRepository;

    /**
     * Wymusza utworzenie kontaktów ze wszystkich istniejących emaili
     */
    @Transactional
    public int syncContactsFromAllEmails() {
        log.info("Starting manual contact sync from all emails...");
        List<Email> allEmails = emailRepository.findAll();
        int created = 0;
        int updated = 0;
        int errors = 0;
        
        for (Email email : allEmails) {
            try {
                String emailAddress = extractEmailAddress(email.getSender());
                if (emailAddress == null || emailAddress.isEmpty()) {
                    log.warn("Skipping email ID {} - cannot extract email address from sender: {}", 
                        email.getId(), email.getSender());
                    continue;
                }
                
                boolean existed = contactRepository.findByEmail(emailAddress).isPresent();
                
                try {
                    createOrUpdateContactFromEmail(email);
                    
                    // Sprawdź czy kontakt został utworzony/zaktualizowany
                    boolean existsAfter = contactRepository.findByEmail(emailAddress).isPresent();
                
                if (existed) {
                    updated++;
                    } else if (existsAfter) {
                        created++;
                        log.debug("Successfully created contact for email: {}", emailAddress);
                } else {
                        log.warn("Contact was not created for email: {} (existed before: {})", emailAddress, existed);
                        errors++;
                    }
                } catch (Exception e) {
                    log.error("Error creating/updating contact from email {}: {}", email.getId(), e.getMessage(), e);
                    errors++;
                }
            } catch (Exception e) {
                log.error("Error processing email {}: {}", email.getId(), e.getMessage(), e);
                errors++;
            }
        }
        
        log.info("Contact sync completed. Created: {}, Updated: {}, Errors: {}", created, updated, errors);
        return created;
    }

    /**
     * Automatycznie tworzy lub aktualizuje kontakt na podstawie emaila
     */
    @Transactional
    public void createOrUpdateContactFromEmail(Email email) {
        log.debug("Processing contact creation from email ID: {}, sender: {}", email.getId(), email.getSender());
        try {
            String emailAddress = extractEmailAddress(email.getSender());
            log.debug("Extracted email address: {}", emailAddress);
            
            if (emailAddress == null || emailAddress.isEmpty()) {
                log.warn("Cannot extract email from sender: {}", email.getSender());
                return;
            }

            // Sprawdź czy kontakt już istnieje
            Optional<Contact> existingContact = contactRepository.findByEmail(emailAddress);
            log.debug("Existing contact found: {}", existingContact.isPresent());
            
            // Użyj pełnej treści jeśli dostępna, w przeciwnym razie preview
            String emailText = email.getContent() != null && !email.getContent().isEmpty() 
                ? email.getContent() 
                : (email.getPreview() != null ? email.getPreview() : "");
            log.debug("Email text length: {} (content: {}, preview: {})", 
                emailText.length(), 
                email.getContent() != null ? email.getContent().length() : 0,
                email.getPreview() != null ? email.getPreview().length() : 0);
            
            if (existingContact.isPresent()) {
                // Aktualizuj istniejący kontakt
                Contact contact = existingContact.get();
                contact.setEmailCount(contact.getEmailCount() + 1);
                
                // Spróbuj wyciągnąć dodatkowe info z treści (jeśli jeszcze nie ma)
                if ((contact.getPhone() == null || contact.getPhone().isEmpty()) && !emailText.isEmpty()) {
                    String phone = extractPhoneFromSignature(emailText);
                    if (phone != null) {
                        contact.setPhone(phone);
                    }
                }
                
                if ((contact.getPosition() == null || contact.getPosition().isEmpty()) && !emailText.isEmpty()) {
                    String position = extractPositionFromSignature(emailText);
                    if (position != null) {
                        contact.setPosition(position);
                    }
                }
                
                // Zaktualizuj nazwę jeśli można wyciągnąć lepszą z treści
                if ((contact.getName() == null || contact.getName().isEmpty() || contact.getName().equals("Unknown")) 
                    && !emailText.isEmpty()) {
                    String nameFromContent = extractNameFromContent(emailText);
                    if (nameFromContent != null && !nameFromContent.isEmpty()) {
                        contact.setName(nameFromContent);
                    }
                }
                
                // Zaktualizuj firmę jeśli można wyciągnąć lepszą z treści
                String betterCompany = extractBetterCompany(contact.getCompany(), emailText);
                if (betterCompany != null && !betterCompany.isEmpty() && !betterCompany.equals("Unknown")) {
                    contact.setCompany(betterCompany);
                } else if ((contact.getCompany() == null || contact.getCompany().isEmpty() || contact.getCompany().equals("Unknown"))) {
                    // Jeśli firma nie jest znana, spróbuj wyciągnąć z domeny emaila
                    String companyFromEmail = extractCompanyFromEmail(emailAddress);
                    if (companyFromEmail != null && !companyFromEmail.isEmpty()) {
                        contact.setCompany(companyFromEmail);
                    }
                }
                
                contactRepository.save(contact);
                log.info("Updated contact: {} (emails: {})", contact.getEmail(), contact.getEmailCount());
            } else {
                // Wyciągnij dodatkowe informacje z treści
                String phone = !emailText.isEmpty() ? extractPhoneFromSignature(emailText) : null;
                String position = !emailText.isEmpty() ? extractPositionFromSignature(emailText) : null;
                String company = extractBetterCompany(email.getCompany(), emailText);
                
                log.debug("Extracted data - phone: {}, position: {}, company: {}", phone, position, company);
                
                // Wyciągnij nazwę - najpierw z treści, potem z pola From
                String name = !emailText.isEmpty() ? extractNameFromContent(emailText) : null;
                if (name == null || name.isEmpty()) {
                    name = extractName(email.getSender());
                }
                log.debug("Extracted name: {} (from content: {}, from sender: {})", 
                    name, !emailText.isEmpty() ? extractNameFromContent(emailText) : "N/A", extractName(email.getSender()));
                
                // Upewnij się, że wymagane pola nie są null
                if (company == null || company.isEmpty() || company.equals("Unknown")) {
                    // Spróbuj wyciągnąć firmę z domeny emaila
                    String companyFromEmail = extractCompanyFromEmail(emailAddress);
                    if (companyFromEmail != null && !companyFromEmail.isEmpty()) {
                        company = companyFromEmail;
                    } else if (email.getCompany() != null && !email.getCompany().isEmpty()) {
                        company = email.getCompany();
                    } else {
                        company = "Unknown";
                    }
                } else {
                    // Jeśli firma została wyciągnięta z pola "Firma:" ale nie ma rozszerzenia,
                    // sprawdź czy można dodać z domeny emaila
                    if (!company.contains(".") && emailAddress != null && emailAddress.contains("@")) {
                        String domain = emailAddress.substring(emailAddress.indexOf("@") + 1);
                        // Jeśli firma pasuje do części domeny, użyj pełnej domeny
                        if (domain.startsWith(company + ".") || domain.equals(company)) {
                            company = domain; // Użyj pełnej domeny jako firmy
                        } else if (domain.contains(".") && !domain.startsWith("gmail") && !domain.startsWith("outlook")) {
                            // Jeśli domena wygląda na firmową, użyj jej
                            company = domain;
                        }
                    }
                }
                
                // Utwórz nowy kontakt
                Contact newContact = new Contact();
                newContact.setName(name != null ? name : "Unknown");
                newContact.setEmail(emailAddress);
                newContact.setCompany(company);
                newContact.setPhone(phone != null ? phone : "");
                newContact.setPosition(position);
                newContact.setEmailCount(1);
                newContact.setMeetingCount(0);
                newContact.setDealCount(0);
                
                log.debug("Attempting to save new contact: email={}, name={}, company={}", 
                    newContact.getEmail(), newContact.getName(), newContact.getCompany());
                
                try {
                contactRepository.save(newContact);
                log.info("Created new contact: {} ({}) from {}", 
                    newContact.getName(), newContact.getPosition(), newContact.getEmail());
                } catch (DataIntegrityViolationException e) {
                    // Może być duplicate key lub inny constraint violation
                    log.error("Database constraint violation when saving contact (email: {}): {}", 
                        newContact.getEmail(), e.getMessage());
                    // Sprawdź czy kontakt może już istnieć (race condition)
                    Optional<Contact> existing = contactRepository.findByEmail(emailAddress);
                    if (existing.isPresent()) {
                        log.info("Contact already exists (race condition), updating instead: {}", emailAddress);
                        Contact contact = existing.get();
                        contact.setEmailCount(contact.getEmailCount() + 1);
                        contactRepository.save(contact);
                    } else {
                        throw e; // Jeśli to nie jest duplicate, rzuć dalej
                    }
                } catch (Exception saveException) {
                    log.error("Failed to save contact to database: {}", saveException.getMessage(), saveException);
                    throw saveException; // Rzuć dalej, żeby nie było po cichu
                }
            }
        } catch (Exception e) {
            log.error("Error creating/updating contact from email ID {} (sender: {}): {}", 
                email.getId(), email.getSender(), e.getMessage(), e);
            // Nie rzucamy wyjątku - logujemy i pozwalamy kontynuować
            // Wyjątek będzie przechwycony w EmailFetchService
        }
    }

    /**
     * Wyciąga adres email z pola "From"
     * Przykłady:
     * "Jan Kowalski <jan@firma.pl>" -> "jan@firma.pl"
     * "jan@firma.pl <jan@firma.pl>" -> "jan@firma.pl"
     * "jan@firma.pl" -> "jan@firma.pl"
     */
    private String extractEmailAddress(String sender) {
        if (sender == null) return null;
        
        // Najpierw spróbuj znaleźć email w nawiasach <>
        Pattern pattern = Pattern.compile("<([^>]+)>");
        Matcher matcher = pattern.matcher(sender);
        
        if (matcher.find()) {
            String email = matcher.group(1).trim();
            if (email.contains("@")) {
                return email.toLowerCase();
            }
        }
        
        // Jeśli nie ma <>, szukaj emaila bezpośrednio w tekście
        Pattern emailPattern = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
        matcher = emailPattern.matcher(sender);
        if (matcher.find()) {
            return matcher.group().trim().toLowerCase();
        }
        
        return null;
    }

    /**
     * Wyciąga imię i nazwisko z pola "From"
     * Przykłady:
     * "Jan Kowalski <jan@firma.pl>" -> "Jan Kowalski"
     * "jan@firma.pl" -> "jan"
     */
    private String extractName(String sender) {
        if (sender == null) return "Unknown";
        
        // Jeśli jest format "Imię Nazwisko <email>"
        if (sender.contains("<")) {
            String name = sender.substring(0, sender.indexOf("<")).trim();
            if (!name.isEmpty()) {
                return name;
            }
        }
        
        // Jeśli jest tylko email, weź część przed @
        if (sender.contains("@")) {
            String emailPart = sender.contains("<") 
                ? extractEmailAddress(sender) 
                : sender;
            
            if (emailPart != null) {
                String localPart = emailPart.substring(0, emailPart.indexOf("@"));
                // Zamień . i _ na spacje i capitalize
                return capitalizeWords(localPart.replace(".", " ").replace("_", " "));
            }
        }
        
        return sender.trim();
    }

    /**
     * Capitalize każdego słowa
     */
    private String capitalizeWords(String str) {
        if (str == null || str.isEmpty()) return str;
        
        String[] words = str.split("\\s+");
        StringBuilder result = new StringBuilder();
        
        for (String word : words) {
            if (word.length() > 0) {
                result.append(Character.toUpperCase(word.charAt(0)))
                      .append(word.substring(1).toLowerCase())
                      .append(" ");
            }
        }
        
        return result.toString().trim();
    }
    
    /**
     * Wyciąga numer telefonu ze stopki
     * Szuka formatów: +48 123 456 789, (123) 456-7890, 123-456-789, 601 089 273, itp.
     */
    private String extractPhoneFromSignature(String text) {
        if (text == null) return null;
        
        // Różne wzorce telefonów - polskie numery 9 cyfr (np. 601 089 273)
        String[] patterns = {
            "\\+?48[\\s.-]?\\d{1}[\\s.-]?\\d{3}[\\s.-]?\\d{3}[\\s.-]?\\d{3}",  // +48 601 089 273 lub +48-601-089-273
            "\\d{3}[\\s.-]?\\d{3}[\\s.-]?\\d{3}",  // 601 089 273 lub 601-089-273 (polskie 9 cyfr)
            "\\+?\\d{1,3}[\\s.-]?\\(?\\d{2,3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{3,4}",  // +48 123 456 789 (ogólny)
            "\\(\\d{3}\\)[\\s.-]?\\d{3}[\\s.-]?\\d{4}",  // (123) 456-7890
            "\\d{3}[\\s.-]\\d{3}[\\s.-]\\d{3,4}",  // 123-456-789
            "tel\\.?:?\\s*\\+?[\\d\\s\\(\\)\\-\\.]{9,}"  // Tel: +48 123 456 789
        };
        
        Pattern combinedPattern = Pattern.compile(
            String.join("|", patterns), 
            Pattern.CASE_INSENSITIVE
        );
        
        Matcher matcher = combinedPattern.matcher(text);
        while (matcher.find()) {
            String phone = matcher.group().trim();
            // Filtruj - numer telefonu powinien mieć co najmniej 9 cyfr
            String digitsOnly = phone.replaceAll("[^0-9]", "");
            if (digitsOnly.length() >= 9 && digitsOnly.length() <= 15) {
                return phone;
            }
        }
        
        return null;
    }
    
    /**
     * Wyciąga stanowisko ze stopki
     * Szuka typowych słów: Manager, Director, CEO, Developer, itp.
     */
    private String extractPositionFromSignature(String text) {
        if (text == null) return null;
        
        text = text.toLowerCase();
        
        // Typowe stanowiska
        String[] positions = {
            "ceo", "cto", "cfo", "director", "manager", "specialist", 
            "coordinator", "developer", "engineer", "analyst", "consultant",
            "dyrektor", "kierownik", "specjalista", "koordynator", 
            "programista", "inżynier", "analityk", "konsultant",
            "prezes", "wiceprezes", "founder", "co-founder"
        };
        
        for (String position : positions) {
            if (text.contains(position)) {
                // Znajdź kontekst wokół stanowiska (np. "Senior Developer")
                int index = text.indexOf(position);
                int start = Math.max(0, index - 20);
                int end = Math.min(text.length(), index + position.length() + 20);
                
                String context = text.substring(start, end);
                
                // Wyczyść i zwróć
                String[] words = context.split("[\\n\\r,|]");
                for (String word : words) {
                    if (word.contains(position)) {
                        return capitalizeWords(word.trim());
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Wyciąga nazwę z treści emaila (np. "Wiktor Grzesiak" w treści)
     * Szuka w stopce emailowej, często przed stanowiskiem lub telefonem
     */
    private String extractNameFromContent(String text) {
        if (text == null || text.isEmpty()) return null;
        
        // Lista typowych słów które nie są imionami
        String[] excludeWords = {
            "firma", "data", "od", "do", "temat", "subject", "date", "pozdrawiam", "regards",
            "dajano", "logistyka", "dyrektor", "sprzedaży", "telefon", "phone", "tel", "email",
            "adres", "address", "www", "http", "https", "com", "pl", "eu", "org",
            "crm", "jestem", "jest", "mam", "będę", "chcę", "chciałbym", "proszę", "dzień",
            "dobry", "witam", "witaj", "hej", "cześć", "dziękuję", "dziękuje", "dzięki",
            "mail", "message", "wiadomość", "wiadomości", "treść", "content"
        };
        
        // Lista słów które mogą być na początku nazwy i powinny być usunięte
        String[] prefixWords = {
            "chętnie", "tak", "nie", "oczywiście", "z", "od", "do", "w", "na", "po", "przed",
            "wielkie", "dziekuję", "dziękuję", "pozdrawiam", "regards", "best", "sincerely",
            "serdecznie", "bardzo", "zawsze", "nigdy", "teraz", "wtedy", "dziś", "jutro",
            "zawsze", "często", "rzadko", "wielkie", "małe", "duże"
        };
        
        // Szukaj wzorców typu "Imię Nazwisko" - 2-3 słowa zaczynające się od wielkiej litery
        // Często występuje przed stanowiskiem (np. "Dyrektor") lub telefonem
        Pattern namePattern = Pattern.compile(
            "\\b([A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó]+(?:\\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó]+){1,2})\\b",
            Pattern.MULTILINE
        );
        
        // Szukaj w ostatnich 500 znakach (stopka emailowa)
        String end = text.length() > 500 ? text.substring(text.length() - 500) : text;
        
        Matcher matcher = namePattern.matcher(end);
        while (matcher.find()) {
            String name = matcher.group(1).trim();
            
            // Sprawdź czy to nie jest wykluczone słowo - dokładne dopasowanie lub jako słowo
            boolean isExcluded = false;
            String nameLower = name.toLowerCase().trim();
            for (String exclude : excludeWords) {
                // Sprawdź dokładne dopasowanie lub czy jest to słowo graniczne
                if (nameLower.equals(exclude) || 
                    nameLower.matches(".*\\b" + Pattern.quote(exclude) + "\\b.*")) {
                    isExcluded = true;
                    break;
                }
            }
            
            if (!isExcluded) {
                // Usuń niechciane prefiksy z nazwy
                String cleanName = name;
                nameLower = cleanName.toLowerCase();
                
                // Usuń prefiksy (może być kilka) - sprawdź ze spacją i bez spacji
                boolean changed = true;
                while (changed) {
                    changed = false;
                    for (String prefix : prefixWords) {
                        String prefixLower = prefix.toLowerCase();
                        // Sprawdź prefiks ze spacją
                        if (nameLower.startsWith(prefixLower + " ")) {
                            cleanName = cleanName.substring(prefix.length()).trim();
                            nameLower = cleanName.toLowerCase();
                            changed = true;
                        }
                        // Sprawdź prefiks bez spacji (np. "chętnieWiktor")
                        else if (nameLower.startsWith(prefixLower) && cleanName.length() > prefix.length()) {
                            char nextChar = cleanName.charAt(prefix.length());
                            if (Character.isUpperCase(nextChar)) {
                                cleanName = cleanName.substring(prefix.length()).trim();
                                nameLower = cleanName.toLowerCase();
                                changed = true;
                            }
                        }
                    }
                }
                
                // Jeśli po usunięciu prefiksu nazwa jest pusta lub za krótka, pomiń
                if (cleanName.length() < 3) {
                    continue;
                }
                
                // Sprawdź czy nazwa nie jest sama w sobie słowem wykluczonym
                boolean isNameExcluded = false;
                for (String exclude : excludeWords) {
                    if (cleanName.equalsIgnoreCase(exclude)) {
                        isNameExcluded = true;
                        break;
                    }
                }
                if (isNameExcluded) {
                    continue;
                }
                
                // Sprawdź czy nazwa składa się z co najmniej dwóch słów (imię i nazwisko)
                String[] nameParts = cleanName.split("\\s+");
                if (nameParts.length < 2) {
                    // Jeśli jedno słowo, sprawdź czy to typowe imię
                    String[] commonNames = {
                        "jan", "anna", "piotr", "maria", "tomasz", "katarzyna", "krzysztof", "magdalena",
                        "andrzej", "agnieszka", "paweł", "barbara", "marcin", "ewa", "michał", "joanna",
                        "wiktor", "albert", "michał", "adam", "jakub", "kamil", "łukasz", "mateusz"
                    };
                    boolean isCommonName = false;
                    for (String commonName : commonNames) {
                        if (cleanName.equalsIgnoreCase(commonName)) {
                            isCommonName = true;
                            break;
                        }
                    }
                    if (!isCommonName) {
                        continue; // Pomiń jeśli nie jest to typowe imię
                    }
                }
                
                // Sprawdź czy nazwa nie zawiera stanowiska - usuń je jeśli jest
                String[] positionWords = {
                    "Dyrektor", "Kierownik", "Manager", "Director", "CEO", "CTO", "CFO", "COO",
                    "Sprzedaży", "Bezpieczeństwa", "Działu", "Zakresu", "Zarządzania"
                };
                // Ponownie użyj nameParts (może być zmienione przez cleanName)
                nameParts = cleanName.split("\\s+");
                if (nameParts.length > 2) {
                    // Jeśli nazwa ma więcej niż 2 słowa, sprawdź czy ostatnie to stanowisko
                    String lastWord = nameParts[nameParts.length - 1];
                    for (String posWord : positionWords) {
                        if (lastWord.equalsIgnoreCase(posWord) || lastWord.toLowerCase().contains(posWord.toLowerCase())) {
                            // Usuń ostatnie słowo (stanowisko)
                            cleanName = String.join(" ", java.util.Arrays.copyOf(nameParts, nameParts.length - 1));
                            break;
                        }
                    }
                }
                
                // Sprawdź kontekst - czy po nazwie jest stanowisko lub telefon (typowa stopka)
                int nameIndex = end.indexOf(name);
                if (nameIndex >= 0) {
                    String afterName = end.substring(nameIndex + name.length()).trim();
                    
                    // Sprawdź czy po nazwie jest stanowisko (np. "Dyrektor") lub telefon (np. "601")
                    if (afterName.matches("(?s).*?(?:[\\n\\r]+|^|\\s+)(?:Dyrektor|Kierownik|Manager|Director|CEO|CTO|\\+?48\\s*\\d{3}[\\s.-]?\\d{3}|\\d{3}[\\s.-]?\\d{3}[\\s.-]?\\d{3}).*")) {
                        return cleanName;
                    }
                    // Jeśli nazwa jest na końcu tekstu lub przed "Pozdrawiam", to też jest prawdopodobna stopka
                    if (afterName.isEmpty() || afterName.toLowerCase().matches("(?s).*?(?:pozdrawiam|regards|best|sincerely).*")) {
                        return cleanName;
                    }
                }
            }
        }
        
        // Alternatywnie, szukaj w całym tekście ale tylko w kontekście stopki
        // Szukaj wzorca: nazwa + nowa linia + stanowisko/telefon
        Pattern nameWithContextPattern = Pattern.compile(
            "([A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó]+(?:\\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó]+){1,2})\\s*[\\n\\r]+\\s*(?:Dyrektor|Kierownik|Manager|Director|CEO|CTO|\\d{3}[\\s.-]?\\d{3})",
            Pattern.MULTILINE | Pattern.CASE_INSENSITIVE
        );
        
        matcher = nameWithContextPattern.matcher(text);
        while (matcher.find()) {
            String name = matcher.group(1).trim();
            // Sprawdź czy to nie jest wykluczone słowo - dokładne dopasowanie lub jako słowo
            boolean isExcluded = false;
            String nameLower = name.toLowerCase().trim();
            for (String exclude : excludeWords) {
                // Sprawdź dokładne dopasowanie lub czy jest to słowo graniczne
                if (nameLower.equals(exclude) || 
                    nameLower.matches(".*\\b" + Pattern.quote(exclude) + "\\b.*")) {
                    isExcluded = true;
                    break;
                }
            }
            if (!isExcluded) {
                // Usuń niechciane prefiksy z nazwy
                String cleanName = name;
                nameLower = cleanName.toLowerCase();
                
                // Usuń prefiksy (może być kilka) - sprawdź ze spacją i bez spacji
                boolean changed = true;
                while (changed) {
                    changed = false;
                    for (String prefix : prefixWords) {
                        String prefixLower = prefix.toLowerCase();
                        // Sprawdź prefiks ze spacją
                        if (nameLower.startsWith(prefixLower + " ")) {
                            cleanName = cleanName.substring(prefix.length()).trim();
                            nameLower = cleanName.toLowerCase();
                            changed = true;
                        }
                        // Sprawdź prefiks bez spacji (np. "chętnieWiktor")
                        else if (nameLower.startsWith(prefixLower) && cleanName.length() > prefix.length()) {
                            char nextChar = cleanName.charAt(prefix.length());
                            if (Character.isUpperCase(nextChar)) {
                                cleanName = cleanName.substring(prefix.length()).trim();
                                nameLower = cleanName.toLowerCase();
                                changed = true;
                            }
                        }
                    }
                }
                
                // Jeśli po usunięciu prefiksu nazwa jest pusta lub za krótka, pomiń
                if (cleanName.length() < 3) {
                    continue;
                }
                
                // Sprawdź czy nazwa nie jest sama w sobie słowem wykluczonym
                boolean isNameExcluded = false;
                for (String exclude : excludeWords) {
                    if (cleanName.equalsIgnoreCase(exclude)) {
                        isNameExcluded = true;
                        break;
                    }
                }
                if (isNameExcluded) {
                    continue;
                }
                
                // Sprawdź czy nazwa nie zawiera stanowiska - usuń je jeśli jest
                String[] positionWords = {
                    "Dyrektor", "Kierownik", "Manager", "Director", "CEO", "CTO", "CFO", "COO",
                    "Sprzedaży", "Bezpieczeństwa", "Działu", "Zakresu", "Zarządzania"
                };
                // Zdefiniuj nameParts dla tej pętli
                String[] nameParts = cleanName.split("\\s+");
                if (nameParts.length > 2) {
                    // Jeśli nazwa ma więcej niż 2 słowa, sprawdź czy ostatnie to stanowisko
                    String lastWord = nameParts[nameParts.length - 1];
                    for (String posWord : positionWords) {
                        if (lastWord.equalsIgnoreCase(posWord) || lastWord.toLowerCase().contains(posWord.toLowerCase())) {
                            // Usuń ostatnie słowo (stanowisko)
                            cleanName = String.join(" ", java.util.Arrays.copyOf(nameParts, nameParts.length - 1));
                            break;
                        }
                    }
                }
                
                // Sprawdź czy nazwa składa się z co najmniej dwóch słów (imię i nazwisko)
                nameParts = cleanName.split("\\s+");
                if (nameParts.length < 2) {
                    // Jeśli jedno słowo, sprawdź czy to typowe imię
                    String[] commonNames = {
                        "jan", "anna", "piotr", "maria", "tomasz", "katarzyna", "krzysztof", "magdalena",
                        "andrzej", "agnieszka", "paweł", "barbara", "marcin", "ewa", "michał", "joanna",
                        "wiktor", "albert", "adam", "jakub", "kamil", "łukasz", "mateusz"
                    };
                    boolean isCommonName = false;
                    for (String commonName : commonNames) {
                        if (cleanName.equalsIgnoreCase(commonName)) {
                            isCommonName = true;
                            break;
                        }
                    }
                    if (!isCommonName) {
                        continue; // Pomiń jeśli nie jest to typowe imię
                    }
                }
                
                return cleanName;
            }
        }
        
        return null;
    }
    
    /**
     * Spróbuj wyciągnąć lepszą nazwę firmy z treści emaila
     * Szuka wzorców: "Firma: dajano-logistyka", "Company: ...", oraz pełnych nazw firm
     */
    private String extractBetterCompany(String currentCompany, String text) {
        if (text == null || text.isEmpty()) return currentCompany;
        
        // Lista słów które nie są nazwami firm
        String[] excludeCompanyWords = {
            "jestem", "jest", "mam", "będę", "chcę", "chciałbym", "proszę", "dzień",
            "dobry", "witam", "witaj", "hej", "cześć", "dziękuję", "dziękuje", "dzięki",
            "mail", "message", "wiadomość", "wiadomości", "treść", "content", "pozdrawiam",
            "regards", "best", "sincerely", "z", "od", "do", "w", "na", "po", "przed",
            "serdecznie", "bardzo", "zawsze", "tak", "nie", "oczywiście", "wiktor", "grzesiak",
            "albert", "milewski", "dyrektor", "kierownik", "sprzedaży", "bezpieczeństwa"
        };
        
        // Szukaj wzorca "Firma: nazwa" lub "Company: nazwa" - może zawierać kropki i myślniki
        Pattern companyLabelPattern = Pattern.compile(
            "(?:Firma|Company|Firma\\s*:|Company\\s*:)\\s*([A-Za-z0-9\\-_.]+(?:\\.[A-Za-z0-9\\-_.]+)*)",
            Pattern.CASE_INSENSITIVE | Pattern.MULTILINE
        );
        
        Matcher matcher = companyLabelPattern.matcher(text);
        if (matcher.find()) {
            String company = matcher.group(1).trim();
            if (!company.isEmpty() && !company.equalsIgnoreCase("unknown")) {
                // Sprawdź czy to nie jest słowo wykluczone
                boolean isExcluded = false;
                for (String exclude : excludeCompanyWords) {
                    if (company.equalsIgnoreCase(exclude)) {
                        isExcluded = true;
                        break;
                    }
                }
                if (!isExcluded) {
                    // Jeśli firma wygląda jak domena bez końcówki (np. "dajano-logistyka"), 
                    // ale nie ma rozszerzenia, spróbuj dodać z kontekstu emaila
                    if (!company.contains(".") && company.matches(".*-.*")) {
                        // Może to być domena - zostaw jak jest, można później dodać .pl
                        // Ale na razie zwróć jak jest
                    }
                    return company;
                }
            }
        }
        
        // Szukaj pełnych nazw firm z typowymi końcówkami - TYLKO jeśli mają końcówki firmowe
        // Wzorzec szuka tylko firm z końcówkami typu "Sp. z o.o.", "Ltd.", itp.
        Pattern companyPattern = Pattern.compile(
            "([A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó0-9]+(?:\\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćńąśęłó0-9]+)*(?:\\s*-\\s*[a-zżźćńąśęłó0-9]+)?\\s+(?:Sp\\.\\s*z\\s*o\\.o\\.|Ltd\\.|Inc\\.|GmbH|S\\.A\\.|sp\\.\\s*z\\s*o\\.\\s*o\\.))",
            Pattern.MULTILINE
        );
        
        matcher = companyPattern.matcher(text);
        if (matcher.find()) {
            String company = matcher.group(1).trim();
            if (company.length() > 3 && !company.toLowerCase().contains("unknown")) {
                // Sprawdź czy to nie jest słowo wykluczone
                boolean isExcluded = false;
                String companyLower = company.toLowerCase();
                for (String exclude : excludeCompanyWords) {
                    if (companyLower.equals(exclude) || companyLower.contains(" " + exclude + " ")) {
                        isExcluded = true;
                        break;
                    }
                }
                if (!isExcluded) {
                    return company;
                }
            }
        }
        
        // NIE szukaj firm bez końcówek - to może być imię i nazwisko
        // Lepiej użyć tylko wzorca "Firma: ..." i domeny email
        
        return currentCompany;
    }
    
    /**
     * Wyciąga nazwę firmy z domeny adresu email
     * Przykład: "wiktor.grzesiak@dajano-logistyka.pl" -> "dajano-logistyka.pl"
     */
    private String extractCompanyFromEmail(String emailAddress) {
        if (emailAddress == null || !emailAddress.contains("@")) {
            return null;
        }
        
        try {
            String domain = emailAddress.substring(emailAddress.indexOf("@") + 1);
            
            // Usuń typowe domeny email (gmail.com, outlook.com, etc.) - nie są to firmy
            String[] commonDomains = {
                "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com",
                "mail.com", "protonmail.com", "aol.com", "zoho.com", "yandex.com"
            };
            
            for (String commonDomain : commonDomains) {
                if (domain.equalsIgnoreCase(commonDomain)) {
                    return null; // Nie wyciągaj firmy z popularnych domen email
                }
            }
            
            // Zwróć domenę jako nazwę firmy
            return domain;
        } catch (Exception e) {
            log.debug("Failed to extract company from email: {}", emailAddress);
            return null;
        }
    }
}
