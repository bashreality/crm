package com.crm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIClassificationService {

    private final WebClient webClient;

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

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("TWOJ_KLUCZ_API")) {
            log.warn("AI API key not configured, using fallback classification");
            return fallbackClassification(subject, content);
        }

        try {
            String prompt = buildPrompt(subject, content);
            String response = callGroqAPI(prompt);
            String classification = extractClassification(response);
            
            log.info("AI classified email as: {}", classification);
            return classification;
            
        } catch (Exception e) {
            log.error("Error in AI classification, using fallback: {}", e.getMessage());
            return fallbackClassification(subject, content);
        }
    }

    private String buildPrompt(String subject, String content) {
        String emailText = (subject + " " + content).substring(0, Math.min(1000, (subject + " " + content).length()));
        
        return "Jesteś ekspertem w analizie wiadomości email biznesowych. Przeanalizuj poniższą wiadomość i określ intencję nadawcy.\n\n" +
               "ZASADY KLASYFIKACJI:\n\n" +
               "POSITIVE - Klient jest zainteresowany, jeśli:\n" +
               "- Prosi o kontakt, rozmowę, spotkanie, więcej informacji\n" +
               "- Wyraża zainteresowanie ofertą lub produktem\n" +
               "- Pyta o szczegóły, cenę, dostępność\n" +
               "- Chce nawiązać współpracę\n" +
               "- Zgadza się na dalsze działania\n" +
               "- Używa słów: chętnie, zainteresowany, proszę o kontakt, możemy porozmawiać\n\n" +
               "NEGATIVE - Klient NIE jest zainteresowany, jeśli:\n" +
               "- Wyraźnie odmawia\n" +
               "- Prosi o wypisanie z listy mailingowej\n" +
               "- Oznacza jako spam\n" +
               "- Wyraża brak zainteresowania\n" +
               "- Prosi o zaprzestanie kontaktu\n\n" +
               "NEUTRAL - Wszystkie inne przypadki:\n" +
               "- Pytania techniczne bez wyrażenia zainteresowania\n" +
               "- Automatyczne odpowiedzi\n" +
               "- Niejasny kontekst\n\n" +
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
        String cleaned = response.toLowerCase().trim();
        
        if (cleaned.contains("positive")) {
            return "positive";
        } else if (cleaned.contains("negative")) {
            return "negative";
        } else {
            return "neutral";
        }
    }

    /**
     * Fallback - prosta klasyfikacja słów kluczowych gdy AI nie działa
     */
    private String fallbackClassification(String subject, String content) {
        String text = (subject + " " + content).toLowerCase();
        
        // Słowa pozytywne - ROZSZERZONE
        String[] positiveWords = {
            "zainteresowany", "tak", "chcę", "proszę", "oferta", "spotkanie",
            "kontakt", "rozmowa", "więcej informacji", "chętnie", "możemy",
            "interested", "yes", "want", "please", "meeting", "schedule",
            "contact", "call", "talk", "more info", "details", "price"
        };
        
        // Słowa negatywne
        String[] negativeWords = {
            "nie", "rezygnuj", "usuń", "wypisz", "spam", "stop",
            "no", "unsubscribe", "remove", "spam", "not interested", "delete"
        };
        
        int positiveCount = 0;
        int negativeCount = 0;
        
        for (String word : positiveWords) {
            if (text.contains(word)) positiveCount += 2; // Większa waga
        }
        
        for (String word : negativeWords) {
            if (text.contains(word)) negativeCount += 2; // Większa waga
        }
        
        // Specjalne przypadki - "proszę o kontakt" = positive
        if (text.contains("proszę") && text.contains("kontakt")) {
            return "positive";
        }
        
        if (positiveCount > negativeCount && positiveCount > 0) {
            return "positive";
        } else if (negativeCount > positiveCount && negativeCount > 0) {
            return "negative";
        } else {
            return "neutral";
        }
    }
}
