package com.crm.service;

import com.crm.dto.deals.AISequenceRequest;
import com.crm.dto.deals.AISequenceResponse;
import com.crm.model.Deal;
import com.crm.model.Email;
import com.crm.repository.DealRepository;
import com.crm.repository.EmailRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Service
@Slf4j
public class AISequenceService {

    private final DealRepository dealRepository;
    private final EmailRepository emailRepository;
    private final RestTemplate restTemplate;
    
    public AISequenceService(DealRepository dealRepository, EmailRepository emailRepository) {
        this.dealRepository = dealRepository;
        this.emailRepository = emailRepository;
        // Timeout 120 sekund dla długich zapytań AI
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); // 30 sekund
        factory.setReadTimeout(120000);   // 120 sekund
        this.restTemplate = new RestTemplate(factory);
    }

    @Value("${ai.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String llmApiUrl;

    @Value("${ai.api.key:}")
    private String llmApiKey;

    @Value("${ai.model:llama-3.3-70b-versatile}")
    private String llmModel;

    public AISequenceResponse generateSequence(AISequenceRequest request) {
        log.info("Generating AI sequence for website: {}, goal: {}", request.getWebsiteUrl(), request.getGoal());

        Deal deal = null;
        String lastEmailContent = "";

        // 1. Jeśli podano dealId, pobierz dane o dealu
        if (request.getDealId() != null) {
            deal = dealRepository.findById(request.getDealId())
                .orElseThrow(() -> new RuntimeException("Deal not found: " + request.getDealId()));

            // 2. Pobierz ostatnie emaile od tego kontaktu
            List<Email> recentEmails = new ArrayList<>();
            if (deal.getContact().getEmail() != null) {
                recentEmails = emailRepository.findTop10BySenderContainingIgnoreCaseOrRecipientContainingIgnoreCaseOrderByReceivedAtDesc(
                    deal.getContact().getEmail(), deal.getContact().getEmail()
                );
            }

            if (!recentEmails.isEmpty()) {
                Email lastEmail = recentEmails.get(0);
                lastEmailContent = "Ostatni email od klienta:\n" +
                                  "Temat: " + lastEmail.getSubject() + "\n" +
                                  "Treść: " + (lastEmail.getContent().length() > 1000 ?
                                      lastEmail.getContent().substring(0, 1000) + "..." :
                                      lastEmail.getContent());
            }
        }

        // 3. Pobierz treść ze strony WWW
        String websiteContent = "";
        if (request.getWebsiteUrl() != null && !request.getWebsiteUrl().isEmpty()) {
            websiteContent = scrapeWebsite(request.getWebsiteUrl());
        }

        // 4. Zbuduj prompt dla AI
        String prompt = buildPrompt(deal, lastEmailContent, websiteContent, request);

        // 5. Wyślij zapytanie do LLM
        AISequenceResponse response = callLLM(prompt);

        String logIdentifier = deal != null ? "deal: " + deal.getId() : "website: " + request.getWebsiteUrl();
        log.info("Generated {} email steps for {}", response.getEmails().size(), logIdentifier);
        return response;
    }

    private String buildPrompt(Deal deal, String lastEmail, String website, AISequenceRequest request) {
        StringBuilder prompt = new StringBuilder();
        
        // System context - doświadczony handlowiec B2B
        prompt.append("Jesteś doświadczonym handlowcem B2B z 15-letnim stażem w sprzedaży usług dla firm. ");
        prompt.append("Specjalizujesz się w cold outreach i follow-up emailach, które faktycznie działają. ");
        prompt.append("Twoje emaile są naturalne, konkretne i nie wyglądają jak masowa wysyłka.\n\n");

        // Analiza firmy klienta ze strony WWW
        if (!website.isEmpty()) {
            prompt.append("=== ANALIZA FIRMY POTENCJALNEGO KLIENTA ===\n");
            prompt.append("Na podstawie treści ze strony WWW, przeanalizuj:\n");
            prompt.append("1. Czym dokładnie zajmuje się ta firma?\n");
            prompt.append("2. Jaka jest ich grupa docelowa?\n");
            prompt.append("3. Jakie problemy mogą mieć w swojej branży?\n");
            prompt.append("4. Jak nasza oferta może im pomóc?\n\n");
            prompt.append("TREŚĆ ZE STRONY KLIENTA:\n").append(website).append("\n\n");
        }

        // Informacje o kliencie z CRM
        if (deal != null) {
            prompt.append("=== DANE KONTAKTU Z CRM ===\n");
            prompt.append("- Osoba: ").append(deal.getContact().getName()).append("\n");
            if (deal.getContact().getCompany() != null) {
                prompt.append("- Firma: ").append(deal.getContact().getCompany()).append("\n");
            }
            if (deal.getContact().getPosition() != null) {
                prompt.append("- Stanowisko: ").append(deal.getContact().getPosition()).append("\n");
            }
            prompt.append("- Szansa: ").append(deal.getTitle()).append("\n");
            prompt.append("- Wartość: ").append(deal.getValue()).append(" ").append(deal.getCurrency()).append("\n\n");
        }

        // Cel kampanii - szczegółowy opis
        prompt.append("=== CEL SEKWENCJI ===\n");
        String goalDescription = switch(request.getGoal()) {
            case "meeting" -> "UMÓWIENIE SPOTKANIA - Główny cel to doprowadzić do 15-minutowej rozmowy telefonicznej lub video call. " +
                "Skup się na wzbudzeniu ciekawości i pokazaniu wartości rozmowy. Nie próbuj sprzedawać w emailu.";
            case "discovery" -> "DISCOVERY CALL - Chcesz zbadać potrzeby klienta. Zadawaj pytania, które prowokują do myślenia. " +
                "Pokaż, że rozumiesz ich branżę i wyzwania.";
            case "sale" -> "PRZEDSTAWIENIE OFERTY - Klient już zna podstawy, teraz czas na konkretną propozycję. " +
                "Skup się na korzyściach i ROI, nie na funkcjach.";
            case "re_engagement" -> "WZNOWIENIE KONTAKTU - Klient przestał odpowiadać. Użyj zupełnie innego podejścia niż wcześniej. " +
                "Może humor, może case study, może nowa wartość.";
            default -> "KONTYNUACJA ROZMOWY - Naturalny follow-up do poprzedniej komunikacji.";
        };
        prompt.append(goalDescription).append("\n\n");

        // Historia komunikacji
        if (!lastEmail.isEmpty()) {
            prompt.append("=== OSTATNIA KOMUNIKACJA Z KLIENTEM ===\n");
            prompt.append(lastEmail).append("\n\n");
        }

        // Dodatkowy kontekst od handlowca
        if (request.getAdditionalContext() != null && !request.getAdditionalContext().isEmpty()) {
            prompt.append("=== DODATKOWY KONTEKST OD HANDLOWCA ===\n");
            prompt.append("Handlowiec przekazał te informacje - WYKORZYSTAJ JE W EMAILACH:\n");
            prompt.append(request.getAdditionalContext()).append("\n\n");
        }

        // Szczegółowe instrukcje
        prompt.append("=== ZASADY PISANIA EMAILI ===\n");
        prompt.append("1. PERSONALIZACJA: Używaj {{firstName}} zamiast ogólników. Odwołuj się do konkretnej firmy {{company}}.\n");
        prompt.append("2. KRÓTKOŚĆ: Max 100-120 słów na email. Nikt nie czyta długich maili.\n");
        prompt.append("3. JEDEN TEMAT: Każdy email ma jeden główny przekaz i jedno CTA.\n");
        prompt.append("4. NATURALNOŚĆ: Pisz jak człowiek do człowieka, nie jak robot. Używaj \"Cześć\" nie \"Szanowny Panie\".\n");
        prompt.append("5. WARTOŚĆ: Każdy email musi dawać wartość - insight, statystykę, pomysł.\n");
        prompt.append("6. CTA: Konkretne i łatwe do wykonania (\"Czy masz 15 min w czwartek?\", nie \"Proszę o kontakt\").\n");
        prompt.append("7. TEMATY: Krótkie (max 50 znaków), wzbudzające ciekawość, bez clickbaitu.\n");
        prompt.append("8. BEZ SPAMU: Unikaj słów: \"oferta\", \"promocja\", \"bezpłatnie\", \"najlepsza cena\".\n");
        prompt.append("9. FOLLOW-UPY: Każdy kolejny email dodaje nową wartość, nie powtarza poprzedniego.\n");
        prompt.append("10. PODPIS: Zakończ pozdrowieniami, bez wielkich stopek.\n\n");

        // Format odpowiedzi
        prompt.append("=== FORMAT ODPOWIEDZI (TYLKO JSON) ===\n");
        prompt.append("{\n");
        prompt.append("  \"suggestedSequenceName\": \"[Krótka nazwa opisująca kampanię]\",\n");
        prompt.append("  \"analysis\": \"[2-3 zdania: co zrozumiałeś o firmie i jakie podejście rekomendujesz]\",\n");
        prompt.append("  \"emails\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"stepNumber\": 1,\n");
        prompt.append("      \"delay_in_days\": 0,\n");
        prompt.append("      \"subject\": \"[Krótki, intrygujący temat]\",\n");
        prompt.append("      \"body\": \"[Treść emaila - max 100 słów, używaj {{firstName}}, {{company}}]\",\n");
        prompt.append("      \"reasoning\": \"[Dlaczego ten email działa]\"\n");
        prompt.append("    },\n");
        prompt.append("    { \"stepNumber\": 2, \"delay_in_days\": 2, ... },\n");
        prompt.append("    { \"stepNumber\": 3, \"delay_in_days\": 3, ... },\n");
        prompt.append("    { \"stepNumber\": 4, \"delay_in_days\": 4, ... }\n");
        prompt.append("  ]\n");
        prompt.append("}\n\n");
        prompt.append("Wygeneruj 4 emaile. Odpowiedz TYLKO JSON, bez żadnych komentarzy.\n");

        return prompt.toString();
    }

    private String scrapeWebsite(String url) {
        try {
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }

            log.info("Scraping website: {}", url);
            Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(10000)
                .get();

            // Usuń niechciane elementy
            doc.select("script, style, nav, footer, header, aside").remove();

            // Pobierz tekst z głównych tagów
            String text = doc.select("title, h1, h2, h3, p, li, td").text();

            // Ogranicz długość
            if (text.length() > 2000) {
                text = text.substring(0, 2000);
            }

            log.info("Successfully scraped {} characters from website", text.length());
            return text;

        } catch (IOException e) {
            log.warn("Failed to scrape website: {}", url, e);
            return "Nie udało się pobrać treści ze strony: " + url;
        }
    }

    private AISequenceResponse callLLM(String prompt) {
        try {
            // Nagłówki z kluczem API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (!llmApiKey.isEmpty()) {
                headers.setBearerAuth(llmApiKey);
            }

            // Body request
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", llmModel);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of(
                "role", "system",
                "content", "Jesteś ekspertem od sprzedaży i marketingu. Zawsze odpowiadaj w formacie JSON."
            ));
            messages.add(Map.of(
                "role", "user",
                "content", prompt
            ));
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 2000);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("Calling LLM API: {}", llmApiUrl);
            ResponseEntity<Map> response = restTemplate.postForEntity(llmApiUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");

                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");

                    // Parsuj JSON odpowiedzi
                    return parseLLMResponse(content);
                }
            }

            // Jeśli nie udało się połączyć z API, zwróć domyślną odpowiedź
            return getDefaultSequence();

        } catch (Exception e) {
            log.error("Error calling LLM API", e);
            return getDefaultSequence();
        }
    }

    private AISequenceResponse parseLLMResponse(String jsonContent) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            
            log.info("Parsing LLM response, length: {}", jsonContent.length());

            // Spróbuj znaleźć JSON w odpowiedzi - obsługa różnych formatów
            String cleanedJson = jsonContent.trim();
            
            // Obsługa ```json ... ```
            if (cleanedJson.contains("```json")) {
                int start = cleanedJson.indexOf("```json") + 7;
                int end = cleanedJson.indexOf("```", start);
                if (end > start) {
                    cleanedJson = cleanedJson.substring(start, end).trim();
                }
            }
            // Obsługa ``` ... ``` (bez "json")
            else if (cleanedJson.startsWith("```")) {
                int start = cleanedJson.indexOf("\n") + 1;
                int end = cleanedJson.lastIndexOf("```");
                if (end > start) {
                    cleanedJson = cleanedJson.substring(start, end).trim();
                }
            }
            // Jeśli zaczyna się od { to jest już JSON
            else if (!cleanedJson.startsWith("{")) {
                // Spróbuj znaleźć pierwszy { i ostatni }
                int start = cleanedJson.indexOf("{");
                int end = cleanedJson.lastIndexOf("}");
                if (start >= 0 && end > start) {
                    cleanedJson = cleanedJson.substring(start, end + 1);
                }
            }
            
            log.info("Cleaned JSON preview: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

            JsonNode rootNode = mapper.readTree(cleanedJson);

            AISequenceResponse response = new AISequenceResponse();

            // Parsuj podstawowe pola
            if (rootNode.has("suggestedSequenceName")) {
                response.setSuggestedSequenceName(rootNode.get("suggestedSequenceName").asText());
            } else {
                response.setSuggestedSequenceName("Sekwencja AI");
            }

            if (rootNode.has("analysis")) {
                response.setAnalysis(rootNode.get("analysis").asText());
            } else {
                response.setAnalysis("Wygenerowana sekwencja");
            }

            // Parsuj emaile
            List<AISequenceResponse.AIEmailStep> steps = new ArrayList<>();
            if (rootNode.has("emails")) {
                JsonNode emailsNode = rootNode.get("emails");
                for (JsonNode emailNode : emailsNode) {
                    AISequenceResponse.AIEmailStep step = new AISequenceResponse.AIEmailStep();

                    step.setStepNumber(emailNode.has("stepNumber") ? emailNode.get("stepNumber").asInt() : steps.size() + 1);
                    step.setDelay(emailNode.has("delay") ? emailNode.get("delay").asText() : "24 hours");
                    step.setDelayHours(emailNode.has("delayHours") ? emailNode.get("delayHours").asInt() :
                        emailNode.has("delay_in_days") ? emailNode.get("delay_in_days").asInt() * 24 : 24);
                    step.setDelay_in_days(emailNode.has("delay_in_days") ? emailNode.get("delay_in_days").asInt() :
                        emailNode.has("delayHours") ? (int) Math.ceil(emailNode.get("delayHours").asDouble() / 24) : 1);
                    step.setSubject(emailNode.has("subject") ? emailNode.get("subject").asText() : "Brak tematu");
                    step.setBody(emailNode.has("body") ? emailNode.get("body").asText() : "Brak treści");
                    step.setReasoning(emailNode.has("reasoning") ? emailNode.get("reasoning").asText() : "");

                    steps.add(step);
                }
            }

            response.setEmails(steps);

            if (steps.isEmpty()) {
                log.warn("No email steps found in LLM response, returning default sequence");
                return getDefaultSequence();
            }

            return response;

        } catch (Exception e) {
            log.error("Error parsing LLM response: {}", jsonContent, e);
            return getDefaultSequence();
        }
    }

    private AISequenceResponse getDefaultSequence() {
        AISequenceResponse response = new AISequenceResponse();
        response.setSuggestedSequenceName("Sekwencja follow-up");
        response.setAnalysis("Domyślna sekwencja - nie udało się wygenerować spersonalizowanej wersji");

        List<AISequenceResponse.AIEmailStep> steps = new ArrayList<>();

        // Email 1
        AISequenceResponse.AIEmailStep step1 = new AISequenceResponse.AIEmailStep();
        step1.setStepNumber(1);
        step1.setDelay("0 days");
        step1.setDelayHours(0);
        step1.setDelay_in_days(0);
        step1.setSubject("Nawiązanie współpracy");
        step1.setBody("Cześć {{firstName}},\n\nW nawiązaniu do naszej rozmowy, chciałbym kontynuować dyskusję o współpracy.\n\nCzy znalazłbyś chwilę na krótką rozmowę w przyszłym tygodniu?\n\nPozdrawiam,\n[Twoje imię]");
        step1.setReasoning("Pierwszy email po kontakcie");
        steps.add(step1);

        // Email 2
        AISequenceResponse.AIEmailStep step2 = new AISequenceResponse.AIEmailStep();
        step2.setStepNumber(2);
        step2.setDelay("2 days");
        step2.setDelayHours(48);
        step2.setDelay_in_days(2);
        step2.setSubject("Follow-up - rozmowa o współpracy");
        step2.setBody("Cześć {{firstName}},\n\nCzy znalazłeś chwilę aby przejrzeć moje poprzednie wiadomości?\n\nJestem przekonany, że {{company}} mogłoby skorzystać na naszej współpracy.\n\nPozdrawiam,\n[Twoje imię]");
        step2.setReasoning("Follow-up po 2 dniach");
        steps.add(step2);

        // Email 3
        AISequenceResponse.AIEmailStep step3 = new AISequenceResponse.AIEmailStep();
        step3.setStepNumber(3);
        step3.setDelay("3 days");
        step3.setDelayHours(72);
        step3.setDelay_in_days(3);
        step3.setSubject("Ostatnia propozycja");
        step3.setBody("Cześć {{firstName}},\n\nTo ostatnia wiadomość ode mnie w tej sprawie.\n\nJeśli jesteś zainteresowany współpracą, daj mi znać. W przeciwnym razie życzę powodzenia.\n\nPozdrawiam,\n[Twoje imię]");
        step3.setReasoning("Ostatnia próba kontaktu");
        steps.add(step3);

        response.setEmails(steps);
        return response;
    }
    
    /**
     * Ulepsza treść emaila - dodaje personalizację, poprawia styl
     */
    public String improveEmailContent(String content, String goal, String tone) {
        String prompt = "Jesteś copywriterem specjalizującym się w cold emailach B2B. " +
            "Przepisz poniższy email tak, żeby był skuteczniejszy.\n\n" +
            
            "=== ORYGINALNA TREŚĆ ===\n" + content + "\n\n" +
            
            "=== CEL EMAILA ===\n" + 
            (goal.equals("sales") ? "Umówienie spotkania/rozmowy z potencjalnym klientem" : goal) + "\n\n" +
            
            "=== TWOJE ZADANIE ===\n" +
            "1. SKRÓĆ: Max 80-100 słów. Wyrzuć wszystko co zbędne.\n" +
            "2. MOCNY HOOK: Pierwsze zdanie musi przyciągać uwagę.\n" +
            "3. WARTOŚĆ: Dodaj konkretny insight lub korzyść dla odbiorcy.\n" +
            "4. CTA: Jedno, konkretne wezwanie do działania na końcu.\n" +
            "5. PERSONALIZACJA: Wstaw {{firstName}} na początku i {{company}} gdzie pasuje.\n" +
            "6. TON: " + (tone.equals("professional") ? "Profesjonalny ale ludzki, nie korporacyjny" : tone) + ".\n" +
            "7. NATURALNOŚĆ: Pisz jakbyś pisał do znajomego z branży.\n\n" +
            
            "=== CZEGO UNIKAĆ ===\n" +
            "- Słów: \"oferta\", \"propozycja\", \"chciałbym przedstawić\", \"pozwolę sobie\"\n" +
            "- Długich zdań i akapitów\n" +
            "- Pisania o sobie (\"my\", \"nasza firma\", \"jesteśmy liderem\")\n" +
            "- Ogólników bez konkretów\n\n" +
            
            "Zwróć TYLKO ulepszoną treść emaila po polsku. Bez komentarzy, cudzysłowów ani wyjaśnień.";
        
        return callLLMSimple(prompt);
    }
    
    /**
     * Generuje temat emaila na podstawie treści
     */
    public String generateEmailSubject(String content, String style) {
        String prompt = "Jesteś ekspertem od email marketingu. Napisz temat emaila, który sprawi że odbiorca go otworzy.\n\n" +
            
            "=== TREŚĆ EMAILA ===\n" + content + "\n\n" +
            
            "=== ZASADY DOBREGO TEMATU ===\n" +
            "1. MAX 40 ZNAKÓW: Krótkie tematy mają lepszy open rate.\n" +
            "2. CIEKAWOŚĆ: Zasugeruj wartość, ale nie zdradzaj wszystkiego.\n" +
            "3. PERSONALIZACJA: Możesz użyć {{firstName}} lub {{company}}.\n" +
            "4. MAŁE LITERY: Pisz normalnie, nie CAPS LOCK.\n" +
            "5. BEZ SPAMU: Unikaj słów: oferta, promocja, bezpłatnie, pilne, Re:, Fwd:\n" +
            "6. KONKRET: Lepiej \"Pytanie o logistykę\" niż \"Propozycja współpracy\"\n\n" +
            
            "=== PRZYKŁADY DOBRYCH TEMATÓW ===\n" +
            "- \"Szybkie pytanie, {{firstName}}\"\n" +
            "- \"Pomysł dla {{company}}\"\n" +
            "- \"Zauważyłem coś na waszej stronie\"\n" +
            "- \"10 min które zaoszczędzi 10 godzin\"\n" +
            "- \"Błąd który kosztuje {{company}} klientów\"\n\n" +
            
            "=== PRZYKŁADY ZŁYCH TEMATÓW ===\n" +
            "- \"Oferta współpracy\" (spam)\n" +
            "- \"Szanowny Panie\" (nudne)\n" +
            "- \"PILNE!!! Nie przegap!!!\" (clickbait)\n" +
            "- \"Propozycja od firmy XYZ\" (nikt tego nie otworzy)\n\n" +
            
            "Zwróć TYLKO temat emaila po polsku. Bez cudzysłowów, kropki na końcu ani wyjaśnień.";
        
        String result = callLLMSimple(prompt);
        // Usuń ewentualne cudzysłowy i znaki interpunkcyjne na końcu
        result = result.replace("\"", "").replace("\u201E", "").replace("\u201D", "").trim();
        if (result.endsWith(".") || result.endsWith("!")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
    
    /**
     * Personalizuje treść na podstawie danych kontaktu
     */
    public String personalizeContent(String content, String contactName, String company, String position) {
        String prompt = "Jesteś handlowcem B2B, który wysyła spersonalizowane emaile. " +
            "Dodaj personalizację do tego emaila, ale NIE przesadzaj.\n\n" +
            
            "=== TREŚĆ DO PERSONALIZACJI ===\n" + content + "\n\n" +
            
            "=== DANE DO WYKORZYSTANIA ===\n" +
            "- {{firstName}} - imię odbiorcy\n" +
            "- {{company}} - nazwa firmy\n" +
            "- {{position}} - stanowisko (jeśli znane)\n\n" +
            
            "=== TWOJE ZADANIE ===\n" +
            "1. Wstaw {{firstName}} na początku powitania.\n" +
            "2. Wstaw {{company}} w miejscu gdzie mowa o firmie odbiorcy.\n" +
            "3. Dodaj 1-2 zdania które pokazują że znasz branżę odbiorcy.\n" +
            "4. ZACHOWAJ krótką formę - max 100 słów.\n" +
            "5. NIE wymieniaj wszystkich zmiennych na siłę - to wygląda sztucznie.\n\n" +
            
            "=== PRZYKŁAD DOBREJ PERSONALIZACJI ===\n" +
            "Zamiast: \"Dzień dobry, chciałbym przedstawić ofertę.\"\n" +
            "Napisz: \"Cześć {{firstName}}, przejrzałem stronę {{company}} - widzę że rozwijacie się w e-commerce. " +
            "Mam pomysł jak przyspieszyć waszą logistykę.\"\n\n" +
            
            "=== CZEGO UNIKAĆ ===\n" +
            "- \"Drogi {{firstName}} z firmy {{company}} na stanowisku {{position}}\" (za dużo na raz)\n" +
            "- Zbyt formalnego tonu\n" +
            "- Wielokrotnego powtarzania zmiennych\n\n" +
            
            "Zwróć TYLKO spersonalizowaną treść emaila po polsku. Bez komentarzy ani wyjaśnień.";
        
        return callLLMSimple(prompt);
    }
    
    /**
     * Generuje warianty A/B dla treści emaila
     */
    public List<String> generateVariants(String content, int count) {
        String prompt = "Wygeneruj " + count + " różnych wariantów poniższego emaila sprzedażowego.\n\n" +
            "ORYGINALNA TREŚĆ:\n" + content + "\n\n" +
            "INSTRUKCJE:\n" +
            "1. Każdy wariant powinien mieć inny styl/podejście\n" +
            "2. Zachowaj główny przekaz\n" +
            "3. Warianty powinny być podobnej długości do oryginału\n" +
            "4. Pisz po polsku\n\n" +
            "Zwróć warianty w formacie JSON:\n" +
            "[\"wariant 1\", \"wariant 2\", ...]\n\n" +
            "Zwróć TYLKO JSON, bez żadnych dodatkowych komentarzy.";
        
        String result = callLLMSimple(prompt);
        
        try {
            // Wyczyść odpowiedź z markdown
            if (result.contains("```json")) {
                int start = result.indexOf("```json") + 7;
                int end = result.indexOf("```", start);
                if (end > start) {
                    result = result.substring(start, end);
                }
            } else if (result.contains("```")) {
                int start = result.indexOf("```") + 3;
                int end = result.indexOf("```", start);
                if (end > start) {
                    result = result.substring(start, end);
                }
            }
            
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(result.trim(), List.class);
        } catch (Exception e) {
            log.error("Error parsing variants: {}", result, e);
            return List.of(content); // Zwróć oryginał jako fallback
        }
    }
    
    /**
     * Prosty call do LLM bez parsowania JSON
     */
    private String callLLMSimple(String prompt) {
        try {
            // Walidacja konfiguracji
            if (llmApiKey == null || llmApiKey.isEmpty()) {
                log.error("LLM API key is not configured!");
                return "Błąd konfiguracji: Brak klucza API. Sprawdź ustawienia AI_API_KEY.";
            }
            
            if (llmApiUrl == null || llmApiUrl.isEmpty()) {
                log.error("LLM API URL is not configured!");
                return "Błąd konfiguracji: Brak URL API.";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(llmApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", llmModel);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of(
                "role", "system",
                "content", "Jesteś doświadczonym copywriterem i handlowcem B2B. Piszesz skuteczne cold emaile, " +
                    "które brzmią naturalnie i przynoszą rezultaty. Zawsze odpowiadasz po polsku. " +
                    "Twoje odpowiedzi są konkretne i bez zbędnych komentarzy."
            ));
            messages.add(Map.of(
                "role", "user",
                "content", prompt
            ));
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.75);
            requestBody.put("max_tokens", 1500);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("Calling LLM API: {} with model: {}", llmApiUrl, llmModel);
            log.debug("Request body: {}", requestBody);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(llmApiUrl, entity, Map.class);

            log.info("LLM API response status: {}", response.getStatusCode());
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                log.debug("LLM API response body: {}", responseBody);
                
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");

                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    log.info("LLM generated {} characters of content", content != null ? content.length() : 0);
                    return content != null ? content.trim() : "Pusta odpowiedź od AI";
                } else {
                    log.warn("No choices in LLM response: {}", responseBody);
                    return "AI nie wygenerowało odpowiedzi. Spróbuj ponownie.";
                }
            } else {
                log.error("LLM API returned non-OK status: {} body: {}", response.getStatusCode(), response.getBody());
                return "Błąd API (status " + response.getStatusCode() + "). Spróbuj ponownie.";
            }

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("LLM API HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 401) {
                return "Błąd autoryzacji API. Sprawdź klucz API.";
            } else if (e.getStatusCode().value() == 429) {
                return "Limit zapytań API przekroczony. Spróbuj za chwilę.";
            }
            return "Błąd HTTP: " + e.getStatusCode();
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.error("LLM API connection error", e);
            return "Nie można połączyć się z API. Sprawdź połączenie.";
        } catch (Exception e) {
            log.error("Unexpected error calling LLM API", e);
            return "Nieoczekiwany błąd: " + e.getMessage();
        }
    }
}