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

@Service
@RequiredArgsConstructor
@Slf4j
public class AISequenceService {

    private final DealRepository dealRepository;
    private final EmailRepository emailRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${llm.api.url:https://api.openai.com/v1/chat/completions}")
    private String llmApiUrl;

    @Value("${llm.api.key:}")
    private String llmApiKey;

    @Value("${llm.model:gpt-4}")
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
        prompt.append("Jesteś ekspertem od sprzedaży i marketingu. Twoim zadaniem jest wygenerowanie sekwencji follow-up emaili.\n\n");

        // Informacje o kliencie - tylko jeśli mamy deal
        if (deal != null) {
            prompt.append("INFORMACJE O KLIENCIE:\n");
            prompt.append("- Nazwa: ").append(deal.getContact().getName()).append("\n");
            if (deal.getContact().getCompany() != null) {
                prompt.append("- Firma: ").append(deal.getContact().getCompany()).append("\n");
            }
            if (deal.getContact().getEmail() != null) {
                prompt.append("- Email: ").append(deal.getContact().getEmail()).append("\n");
            }

            // Informacje o szansie
            prompt.append("\nINFORMACJE O SZANSIE SPRZEDAŻOWEJ:\n");
            prompt.append("- Nazwa: ").append(deal.getTitle()).append("\n");
            prompt.append("- Wartość: ").append(deal.getValue()).append(" ").append(deal.getCurrency()).append("\n");
        }

        // Cel sekwencji
        String goalDescription = switch(request.getGoal()) {
            case "meeting" -> "Umówienie spotkania";
            case "discovery" -> "Zbadanie potrzeb (discovery call)";
            case "sale" -> "Zaproponowanie oferty i sprzedaż";
            case "re_engagement" -> "Wznowienie kontaktu";
            default -> "Kontynuacja rozmowy";
        };
        prompt.append("Cel sekwencji: ").append(goalDescription).append("\n");

        // Ostatnia komunikacja
        if (!lastEmail.isEmpty()) {
            prompt.append("\nOSTATNIA KOMUNIKACJA:\n").append(lastEmail).append("\n");
        }

        // Treść ze strony
        if (!website.isEmpty()) {
            prompt.append("\nTREŚĆ ZE STRONY WWW KLIENTA:\n").append(website).append("\n");
        }

        // Dodatkowy kontekst
        if (request.getAdditionalContext() != null && !request.getAdditionalContext().isEmpty()) {
            prompt.append("\nDODATKOWY KONTEKST OD HANDLOWCA:\n").append(request.getAdditionalContext()).append("\n");
        }

        prompt.append("\nINSTRUKCJE:\n");
        prompt.append("1. Wygeneruj sekwencję 4-5 emaili\n");
        prompt.append("2. Używaj zmiennych systemowych takich jak {{name}}, {{firstName}}, {{company}}, {{position}}, {{email}} w treści maili\n");
        prompt.append("3. Dostosuj styl do celu sekwencji (formalny dla spotkań, bardziej bezpośredni dla ofert)\n");
        prompt.append("4. Każdy email powinien mieć jasny cel i CTA (call to action)\n");
        prompt.append("5. Proponuj realistyczne opóźnienia między mailami (w dniach)\n");
        prompt.append("6. Zwróć odpowiedź w formacie JSON\n\n");

        prompt.append("FORMAT ODPOWIEDZI JSON:\n");
        prompt.append("{\n");
        prompt.append("  \"suggestedSequenceName\": \"Propozycja współpracy - [Nazwa firmy]\",\n");
        prompt.append("  \"analysis\": \"Krótka analiza sytuacji klienta i rekomendowanego podejścia\",\n");
        prompt.append("  \"emails\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"stepNumber\": 1,\n");
        prompt.append("      \"delay\": \"2 days\",\n");
        prompt.append("      \"delay_in_days\": 2,\n");
        prompt.append("      \"subject\": \"Temat emaila\",\n");
        prompt.append("      \"body\": \"Treść emaila ze zmiennymi {{name}}, {{company}} itp.\",\n");
        prompt.append("      \"reasoning\": \"Uzasadnienie proponowanej treści\"\n");
        prompt.append("    }\n");
        prompt.append("  ]\n");
        prompt.append("}\n");

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

            // Spróbuj znaleźć JSON w odpowiedzi (jeśli otoczony jest ```json)
            if (jsonContent.contains("```json")) {
                int start = jsonContent.indexOf("```json") + 7;
                int end = jsonContent.indexOf("```", start);
                if (end > start) {
                    jsonContent = jsonContent.substring(start, end);
                }
            }

            JsonNode rootNode = mapper.readTree(jsonContent);

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
}