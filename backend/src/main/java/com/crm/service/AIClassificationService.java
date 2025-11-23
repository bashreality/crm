package com.crm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIClassificationService {

    private final WebClient webClient;

    private static final List<String> STRONG_NEGATIVE_PHRASES = List.of(
        "nie jestesmy zainteresowani",
        "nie interesuje nas",
        "brak zainteresowania",
        "nie potrzebujemy",
        "nie mamy zapotrzebowania",
        "brak zapotrzebowania",
        "nie chcemy",
        "rezygnujemy",
        "rezygnuje",
        "dziekujemy ale nie",
        "na ten moment nie",
        "aktualnie nie potrzebujemy",
        "w tej chwili nie",
        "w tej chwili nie potrzebujemy",
        "prosze nie kontaktowac",
        "nie planujemy",
        "nie szukamy",
        "wypiszcie",
        "usun z listy",
        "usuncie z listy",
        "unsubscribe",
        "stop wysylce",
        "zaprzestac kontaktu",
        "odmawiamy",
        "odmawiam",
        "na chwile obecna nie",
        "na chwile obecna nie potrzebujemy",
        "dzienkujemy ale nie jestesmy zainteresowani",
        "dziekuje nie jestesmy zainteresowani",
        "dziekuje ale nie",
        "nie jest to dla nas",
        "nie bedziemy kontynuowac",
        "wstrzymujemy temat",
        "nie skorzystamy",
        "prosze o usuniecie mojego adresu",
        "nie chcemy prezentacji",
        "nie chcemy oferty",
        "nie chcemy demo",
        "nie stosujemy oferowanych",
        "nie stosuje oferowanych",
        "nie mamy potrzeby",
        "zostawmy to",
        "temat zamkniety",
        "nie, dziekuje",
        "brak zainteresowania",
        "nie aktualne",
        "nieaktualne",
        "nie planujemy zakupu",
        "nie skorzystam",
        "prosze nie wysylac",
        "prosze nie dzwonic",
        "to pomylka",
        "nie zamawialismy",
        "mamy juz dostawce",
        "wspolpracujemy z inna firma",
        "jestesmy zadowoleni z obecnego",
        "mamy stala umowe",
        "nie nasza branza",
        "nie zajmujemy sie tym",
        "nie mam budzetu",
        "nie mamy budzetu",
        "za drogo",
        "oferta nieatrakcyjna",
        "nie spelnia wymagan",
        "prosze o zaprzestanie",
        "traktuje to jako spam",
        "zglaszam naduzycie",
        "wrong person",
        "not interested",
        "remove me from your list",
        "unsubscribe immediately",
        "do not contact me",
        "take me off your list",
        "no thanks",
        "we are all set",
        "we dont have a need",
        "not looking for vendors",
        "stop emailing me",
        "this is spam",
        "report as spam",
        "we use a competitor",
        "not a good fit",
        "budget freeze",
        "not applicable",
        "please delete my data",
        "cease and desist",
        "hard pass",
        "not accepting proposals",
        "closed for business",
        "too expensive",
        "we are not buying",
        "pass",
        "nie pracuje juz w firmie",
        "zakonczyl wspolprace",
        "adres nieaktywny",
        "mail nieobslugiwany",
        "firma zlikwidowana",
        "dzialalnosc zawieszona",
        "osoba odeszla z firmy",
        "skrzynka wylaczona",
        "adres wygasl",
        "no longer with the company",
        "left the organization",
        "email no longer active",
        "account disabled",
        "zmiana pracy",
        "undeliverable",
        "failure notice",
        "delivery status notification",
        "recipient not found",
        "user unknown",
        "address rejected",
        "mailbox full",
        "quota exceeded",
        "550 5.1.1",
        "550 requested action not taken",
        "access denied",
        "spam detected",
        "blocked by filter",
        "connection timed out",
        "host unknown",
        "domain not found",
        "nie mozna dostarczyc wiadomosci",
        "blad dostarczenia",
        "konto zablokowane",
        "skrzynka przepelniona",
        "adres nie istnieje",
        "nieudane doreczenie",
        "zwrot poczty",
        "wiadomosc odrzucona",
        "konto usuniete"
    );

    private static final List<String> STRONG_POSITIVE_PHRASES = List.of(
        "prosze o kontakt",
        "prosimy o kontakt",
        "umowmy spotkanie",
        "umowmy rozmowe",
        "poprosze o oferte",
        "chetnie porozmawiamy",
        "chetnie poznamy",
        "prosze o oferte",
        "kiedy mozemy porozmawiac",
        "zainteresowany oferta",
        "zainteresowana oferta",
        "zainteresowani wspolpraca",
        "call me",
        "schedule a call",
        "prosze o katalog",
        "prosze o przeslanie katalogu",
        "prosze o przeslanie materialow",
        "podeslijcie katalog",
        "podeslijcie materialy",
        "prosze o cennik",
        "poprosze o cennik",
        "podeslijcie cennik",
        "prosze o wycene",
        "poprosze wycene",
        "podeslijcie oferte",
        "wyslijcie oferte",
        "prosze o prezentacje",
        "umowmy demo",
        "chcemy demo",
        "chcemy oferte",
        "jestem zainteresowany",
        "jestesmy zainteresowani",
        "prosze o szczegoly",
        "chetnie zapoznam sie",
        "brzmi interesujaco",
        "prosze przeslac cennik",
        "prosze o wiecej informacji",
        "interesuje nas wspolpraca",
        "prosze o kontakt telefoniczny",
        "chcielibysmy zamowic",
        "prosze o draft umowy",
        "kiedy mozemy porozmawiac",
        "proponuje spotkanie",
        "pasuje mi termin",
        "mozemy sie zdzwonic",
        "wyslij prezentacje",
        "temat jest dla nas aktualny",
        "szukamy takiego rozwiazania",
        "bardzo ciekawa propozycja",
        "prosze dzwonic",
        "moj numer telefonu to",
        "oddzwonie do pana",
        "prosze o specyfikacje",
        "czy macie w ofercie",
        "jakie sa koszty",
        "jaki jest czas realizacji",
        "chcemy przetestowac",
        "prosze o fakture proforma",
        "prosze kontaktowac sie z",
        "osoba odpowiedzialna jest",
        "przekazuje do kolegi",
        "prosze pisac do pana",
        "kolega zajmie sie tematem",
        "decyzje podejmuje",
        "w sprawach zakupow prosze do",
        "przekierowuje maila do",
        "cc do",
        "w kopii znajduje sie",
        "prosze rozmawiac z dyrektorem",
        "podaje kontakt do kierownika",
        "przekazuje do dzialu zakupow",
        "prosze o kontakt z",
        "wlasciwa osoba jest",
        "i am interested",
        "please send more info",
        "sounds interesting",
        "lets schedule a call",
        "can you send a quote",
        "please provide pricing",
        "id like to learn more",
        "we are looking for this",
        "please call me at",
        "lets meet next week",
        "forwarding to the right person",
        "please contact my colleague",
        "send me the proposal",
        "looking forward to hearing from you",
        "available for a chat",
        "sounds like a good fit",
        "what are your rates",
        "can we request a demo",
        "please go ahead",
        "interested in partnership",
        "send over the details",
        "when are you available",
        "good timing",
        "we have a budget for this",
        "ready to move forward",
        "send the contract",
        "please invoice us",
        "im open to discussing",
        "lets jump on a call",
        "prosze o kontakt w przyszlym tygodniu",
        "wrocmy do tematu za miesiac",
        "odezwe sie po urlopie",
        "prosze przypomniec sie",
        "na razie nie ale prosze o kontakt",
        "zachowam kontakt",
        "zapisuje oferte",
        "bedziemy robic przetarg",
        "prosze o kontakt w nowym roku",
        "temat na kolejny kwartal",
        "prosze o telefon po",
        "skontaktuje sie w wolnej chwili",
        "dodaje do bazy dostawcow",
        "wrocimy do rozmowy",
        "prosze ponowic kontakt",
        "bede pamietac",
        "odezwe sie po analizie",
        "przeanalizuje i dam znac",
        "zapoznam sie i wroce",
        "dziekuje przejrze oferte",
        "prosze wyslac zobacze",
        "moze w przyszlosci",
        "nie wykluczam wspolpracy",
        "bedziemy w kontakcie",
        "dziekuje za przypomnienie prosze o"
    );

    private static final List<String> NEUTRAL_AUTO_RESPONSE_PHRASES = List.of(
        "poza biurem",
        "out of office",
        "out-of-office",
        "automatic reply",
        "automatic response",
        "auto reply",
        "autoreply",
        "autoresponder",
        "nieobecnosc",
        "nieobecny",
        "nieobecna",
        "na urlopie",
        "przebywam na urlopie",
        "jestem na urlopie",
        "jestem poza biurem",
        "wracam",
        "dniu bede nieobecny",
        "dniu bede nieobecna",
        "wakacje",
        "holiday",
        "urlop",
        "autoresponder",
        "automatic reply",
        "automatic response",
        "auto reply",
        "oo o",
        "currently away",
        "on leave",
        "maternity leave",
        "business trip",
        "jestem w delegacji",
        "biuro nieczynne",
        "przerwa swiateczna",
        "dni wolne od pracy",
        "urlop do dnia",
        "will return on",
        "limited email access",
        "holiday notification",
        "auto-reply",
        "potwierdzenie otrzymania",
        "potwierdzenie przeczytania",
        "read receipt",
        "wiadomosc zostala wyswietlona",
        "message displayed",
        "delivered to",
        "delayed mail",
        "message delayed",
        "delivery has failed to these recipients",
        "auto-forwarded",
        "przekazano do",
        "zmiana domeny",
        "nowy adres email",
        "prosze o chwile cierpliwosci",
        "odpowiem pozniej",
        "wroce do pana",
        "musze zapytac",
        "musze sprawdzic",
        "skonsultuje to",
        "przekaze dalej",
        "zobacze co da sie zrobic",
        "dam znac",
        "prosze czekac",
        "sprawdzam",
        "jestem na spotkaniu",
        "zadzwonie pozniej",
        "prosze napisac o co chodzi",
        "kto polecil kontakt",
        "skad ma pan moj adres",
        "czy to jest oferta handlowa",
        "o co chodzi",
        "prosze przypomniec temat",
        "nie kojarze firmy",
        "czy my sie znamy",
        "w jakiej sprawie",
        "prosze sprecyzowac",
        "co to za projekt",
        "jakie ma pan pytanie",
        "received",
        "will get back to you",
        "checking internally",
        "need to discuss",
        "please hold",
        "clarification needed",
        "what is this regarding",
        "who are you",
        "zmiana numeru telefonu",
        "nowa siedziba",
        "aktualizacja regulaminu",
        "faktura",
        "newsletter",
        "webinar",
        "konferencja",
        "zyczenia swiateczne",
        "podziekowanie",
        "thank you",
        "well received",
        "noted",
        "accepted",
        "przeczytano",
        "otwarto",
        "kliknieto",
        "wyslano",
        "w trakcie",
        "oczekuje na weryfikacje",
        "ticket created",
        "numer zgloszenia",
        "support case",
        "helpdesk",
        "biuro obslugi klienta",
        "prosilbym o doprecyzowanie",
        "prosze o doprecyzowanie"
    );

    @Value("${ai.api.key:}")
    private String apiKey;

    @Value("${ai.classification.enabled:true}")
    private boolean classificationEnabled;

    public AIClassificationService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .build();
    }

    /**
     * Klasyfikuje email używając darmowego API Groq (Llama 3)
     * 
     * Aby to działało, musisz:
     * 1. Zarejestrować się na https://console.groq.com
     * 2. Wygenerować darmowy API key
     * 3. Ustawić w application.properties: ai.api.key=TWOJ_KLUCZ
     */
    public String classifyEmail(String subject, String content) {
        if (!classificationEnabled) {
            log.info("AI classification is disabled");
            return "neutral";
        }

        String explicitIntent = explicitIntentCheck(subject, content);
        if (explicitIntent != null) {
            log.info("Rule-based classification detected explicit intent: {}", explicitIntent);
            return explicitIntent;
        }

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("TWOJ_KLUCZ_API")) {
            log.warn("AI API key not configured, using fallback classification");
            return fallbackClassification(subject, content);
        }

        try {
            String prompt = buildPrompt(subject, content);
            String response = callGroqAPI(prompt);
            String classification = extractClassification(response);

            String override = explicitIntentCheck(subject, content);
            if (override != null && !override.equals(classification)) {
                log.info("Overriding AI classification {} with explicit intent {}", classification, override);
                return override;
            }
            
            log.info("AI classified email as: {}", classification);
            return classification;
            
        } catch (Exception e) {
            log.error("Error in AI classification, using fallback: {}", e.getMessage());
            return fallbackClassification(subject, content);
        }
    }

    private String buildPrompt(String subject, String content) {
        String emailText = (subject + " " + content).substring(0, Math.min(1000, (subject + " " + content).length()));

        return "Jesteś ekspertem w analizie wiadomości email biznesowych. Przeanalizuj poniższą wiadomość i określ intencję nadawcy. Odpowiedz jednym ze słów: positive, negative, neutral.\n\n" +
               "ZASADY KLASYFIKACJI:\n\n" +
               "Ważne: gdy pojawia się jakakolwiek odmowa lub brak zainteresowania, zawsze zwróć NEGATIVE, nawet jeśli wiadomość zawiera grzecznościowe \"dziękujemy\".\n" +
               "Ważne: odpowiedź musi być dokładnie jednym słowem (positive/negative/neutral) bez dodatkowych znaków.\n\n" +
               "NEGATIVE - PRIORYTET! Klient NIE jest zainteresowany, jeśli:\n" +
               "- Pisze: \"nie jesteśmy zainteresowani\", \"nie interesuje nas\", \"brak zainteresowania\"\n" +
               "- Używa: \"nie\", \"niestety\", \"rezygnujemy\", \"dziękujemy, ale nie\"\n" +
               "- Pisze: \"na chwilę obecną nie\", \"w tym momencie nie\", \"aktualnie nie potrzebujemy\"\n" +
               "- Pisze: \"nie chcemy\", \"nie planujemy\", \"nie szukamy\"\n" +
               "- Prosi o wypisanie z listy mailingowej lub zaprzestanie kontaktu\n" +
               "- Oznacza jako spam lub niechcianą korespondencję\n" +
               "- Odmawia w jakikolwiek sposób\n\n" +
               "POSITIVE - Klient jest zainteresowany, TYLKO jeśli:\n" +
               "- Prosi o kontakt, rozmowę, spotkanie, więcej informacji\n" +
               "- Wyraża WYRAŹNE zainteresowanie ofertą lub produktem\n" +
               "- Pyta o szczegóły, cenę, dostępność\n" +
               "- Chce nawiązać współpracę\n" +
               "- Używa: \"chętnie\", \"zainteresowany\", \"proszę o kontakt\", \"możemy porozmawiać\"\n" +
               "- Zgadza się na dalsze działania\n\n" +
               "NEUTRAL - Wszystkie inne przypadki:\n" +
               "- Pytania techniczne bez wyrażenia zainteresowania\n" +
               "- Automatyczne odpowiedzi (Out of Office)\n" +
               "- Niejasny kontekst\n" +
               "- Prośby o informacje bez deklaracji zainteresowania\n\n" +
               "PRZYKŁADY:\n" +
               "\"Nie jesteśmy zainteresowani Państwa ofertą\" = NEGATIVE\n" +
               "\"Dziękujemy, ale nie\" = NEGATIVE\n" +
               "\"Aktualnie nie potrzebujemy\" = NEGATIVE\n" +
               "\"Proszę o kontakt\" = POSITIVE\n" +
               "\"Chętnie poznamy szczegóły\" = POSITIVE\n\n" +
               "Email:\n" +
               "Temat: " + subject + "\n" +
               "Treść: " + content + "\n\n" +
               "Odpowiedz TYLKO jednym słowem (bez dodatkowych znaków): positive, negative lub neutral";
    }

    private String callGroqAPI(String prompt) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "llama-3.1-8b-instant");
            
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            requestBody.put("messages", List.of(message));
            
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 10);

            Mono<Map> responseMono = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class);

            Map response = responseMono.block();
            
            if (response != null && response.containsKey("choices")) {
                List<Map> choices = (List<Map>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map choice = choices.get(0);
                    Map message1 = (Map) choice.get("message");
                    return (String) message1.get("content");
                }
            }
            
            throw new RuntimeException("Invalid API response");
            
        } catch (Exception e) {
            log.error("API call failed: {}", e.getMessage());
            throw e;
        }
    }

    private String extractClassification(String response) {
        if (response == null) {
            return "neutral";
        }

        String cleaned = response.toLowerCase().trim();
        String[] tokens = cleaned.split("\\s+");

        if (tokens.length > 0) {
            String first = tokens[0];
            if (first.startsWith("positive")) {
                return "positive";
            }
            if (first.startsWith("negative")) {
                return "negative";
            }
            if (first.startsWith("neutral")) {
                return "neutral";
            }
        }
        
        if (cleaned.contains("negative")) {
            return "negative";
        } else if (cleaned.contains("positive")) {
            return "positive";
        } else {
            return "neutral";
        }
    }

    /**
     * Fallback - prosta klasyfikacja słów kluczowych gdy AI nie działa
     */
    private String fallbackClassification(String subject, String content) {
        String text = normalizeText(subject + " " + content);
        String explicitIntent = explicitIntentCheck(subject, content);
        if (explicitIntent != null) {
            return explicitIntent;
        }
        
        // Słowa pozytywne - ROZSZERZONE (bez polskich znaków, bo tekst jest znormalizowany)
        String[] positiveWords = {
            "zainteresowany", "tak", "chce", "prosze", "oferta", "spotkanie",
            "kontakt", "rozmowa", "wiecej informacji", "chetnie", "mozemy",
            "interested", "yes", "want", "please", "meeting", "schedule",
            "contact", "call", "talk", "more info", "details", "price",
            "katalog", "materialy", "cennik", "wycene", "wycena", "demo",
            "prezentacje", "pokaz", "oferty", "oferta prosze", "prosze o oferte",
            "zainteresowani", "zainteresowany oferta", "zainteresowana oferta",
            "prosze o kontakt", "prosze o cennik", "prosze o wycene", "prosze o draft",
            "umowmy spotkanie", "umowmy rozmowe", "umowmy demo", "prosze o prezentacje",
            "prosze o materialy", "prosze o katalog", "prosze o specyfikacje",
            "prosze o szczegoly", "prosze o telefon", "oddzwonie", "oddzwonic"
        };
        
        // Słowa negatywne
        String[] negativeWords = {
            "nie", "rezygnuj", "usun", "wypisz", "spam", "stop",
            "no", "unsubscribe", "remove", "not interested", "delete",
            "zapotrzebowanie", "zapotrzebowania", "zapotrzebowani",
            "brak zainteresowania", "nie mamy budzetu", "za drogo", "pomylka",
            "not a good fit", "budget freeze", "wrong person", "hard pass",
            "nie chcemy", "nie potrzebujemy", "nie zainteresowani", "nie jestesmy zainteresowani"
        };
        
        int positiveCount = 0;
        int negativeCount = 0;
        
        for (String word : positiveWords) {
            if (text.contains(word)) positiveCount += 2; // Większa waga
        }
        
        for (String word : negativeWords) {
            if (text.contains(word)) negativeCount += 2; // Większa waga
        }
        
        // Specjalne przypadki - "prosze o kontakt" = positive
        if (text.contains("prosze") && text.contains("kontakt")) {
            return "positive";
        }
        
        if (negativeCount >= positiveCount && negativeCount > 0) {
            return "negative";
        } else if (positiveCount > 0) {
            return "positive";
        } else {
            return "neutral";
        }
    }

    private String explicitIntentCheck(String subject, String content) {
        String normalized = normalizeText(subject + " " + content);

        for (String phrase : STRONG_NEGATIVE_PHRASES) {
            if (normalized.contains(phrase)) {
                return "negative";
            }
        }

        for (String phrase : NEUTRAL_AUTO_RESPONSE_PHRASES) {
            if (normalized.contains(phrase)) {
                return "neutral";
            }
        }

        for (String phrase : STRONG_POSITIVE_PHRASES) {
            if (normalized.contains(phrase)) {
                return "positive";
            }
        }

        return null;
    }

    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        String lower = text.toLowerCase();
        String normalized = Normalizer.normalize(lower, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized;
    }
}
