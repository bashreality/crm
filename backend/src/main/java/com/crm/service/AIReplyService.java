package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.model.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AIReplyService {

    @Value("${ai.classification.enabled:true}")
    private boolean aiEnabled;

    @Value("${ai.api.key}")
    private String aiApiKey;

    private final WebClient webClient;

    public AIReplyService(@Value("${ai.api.url:https://api.groq.com/openai/v1}") String aiApiUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiApiUrl)
                .build();
    }

    /**
     * Generuje sugestię odpowiedzi z pełnym kontekstem (Smart Compose)
     */
    public String generateReplySuggestion(String originalSubject, String originalBody, String senderEmail, Contact contact, List<Email> history) {
        if (!aiEnabled) {
            log.info("AI is disabled, returning default reply");
            return generateDefaultReply(senderEmail);
        }

        try {
            log.info("Generating AI Smart Compose for email from: {}", senderEmail);

            String prompt = buildSmartComposePrompt(originalSubject, originalBody, senderEmail, contact, history);
            return callGroqAPI(prompt);

        } catch (Exception e) {
            log.error("Error generating AI reply suggestion", e);
            return generateDefaultReply(senderEmail);
        }
    }

    /**
     * Wersja uproszczona (dla wstecznej kompatybilności)
     */
    public String generateReplySuggestion(String originalSubject, String originalBody, String senderEmail) {
        return generateReplySuggestion(originalSubject, originalBody, senderEmail, null, null);
    }

    private String callGroqAPI(String prompt) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama-3.1-70b-versatile"); // Używamy większego modelu dla lepszej jakości tekstu
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", "Jesteś doświadczonym asystentem sprzedaży B2B. Twoim celem jest pisanie skutecznych, uprzejmych i konkretnych maili."),
                Map.of("role", "user", "content", prompt)
        ));
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 600);

        return webClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + aiApiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    if (response != null && response.containsKey("choices")) {
                        List<Map> choices = (List<Map>) response.get("choices");
                        if (!choices.isEmpty()) {
                            Map message = (Map) choices.get(0).get("message");
                            return (String) message.get("content");
                        }
                    }
                    return generateDefaultReply("Klient");
                })
                .block();
    }

    private String buildSmartComposePrompt(String subject, String body, String senderEmail, Contact contact, List<Email> history) {
        StringBuilder sb = new StringBuilder();
        
        sb.append("Jako asystent sprzedaży, przygotuj treść odpowiedzi na ostatni email.\n\n");
        
        // 1. Kontekst Klienta
        if (contact != null) {
            sb.append("=== DANE KLIENTA ===\n");
            sb.append("Imię i nazwisko: ").append(contact.getName()).append("\n");
            sb.append("Firma: ").append(contact.getCompany()).append("\n");
            if (contact.getPosition() != null) sb.append("Stanowisko: ").append(contact.getPosition()).append("\n");
            
            if (contact.getTags() != null && !contact.getTags().isEmpty()) {
                String tags = contact.getTags().stream().map(Tag::getName).collect(Collectors.joining(", "));
                sb.append("Tagi/Status: ").append(tags).append("\n");
            }
            sb.append("\n");
        }

        // 2. Historia Korespondencji
        if (history != null && !history.isEmpty()) {
            sb.append("=== OSTATNIE 3 WIADOMOŚCI (Kontekst) ===\n");
            // Bierzemy max 3 ostatnie, od najstarszego do najnowszego logicznie (ale history jest zazwyczaj desc)
            // Zakładamy że lista history jest posortowana od najnowszych. Bierzemy 3 i odwracamy.
            int limit = Math.min(history.size(), 3);
            for (int i = limit - 1; i >= 0; i--) {
                Email e = history.get(i);
                sb.append("--- Email od: ").append(e.getSender()).append(" ---\n");
                sb.append(e.getContent() != null ? e.getContent().substring(0, Math.min(e.getContent().length(), 300)) : "").append("\n\n");
            }
        }

        // 3. Obecny Email
        String cleanBody = body != null ? body.replaceAll("<[^>]*>", "").trim() : "";
        sb.append("=== NOWA WIADOMOŚĆ (na którą odpisujemy) ===\n");
        sb.append("Od: ").append(senderEmail).append("\n");
        sb.append("Temat: ").append(subject).append("\n");
        sb.append("Treść:\n").append(cleanBody).append("\n\n");

        // 4. Instrukcje
        sb.append("=== INSTRUKCJE ===\n");
        sb.append("1. Napisz gotową do wysłania odpowiedź (samą treść).\n");
        sb.append("2. Styl: Profesjonalny, pomocny, ale nie 'sztywny'.\n");
        sb.append("3. Jeśli klient pyta o coś, co było w historii - nawiąż do tego.\n");
        sb.append("4. Jeśli mamy tagi (np. 'VIP', 'Nowy Lead'), dostosuj ton.\n");
        sb.append("5. Jeśli treść maila to 'Rezygnuję', 'Nie jestem zainteresowany' -> napisz uprzejme podziękowanie i zamknięcie tematu.\n");
        sb.append("6. Jeśli treść to 'Jestem zainteresowany' -> zaproponuj spotkanie lub przesłanie oferty.\n");
        sb.append("7. NIE dodawaj nagłówków typu 'Temat:', tylko treść wiadomości.\n");
        
        return sb.toString();
    }

    private String generateDefaultReply(String senderEmail) {
        return "Dzień dobry,\n\nDziękuję za wiadomość. Wrócę do Ciebie z odpowiedzią najszybciej jak to możliwe.\n\nPozdrawiam,";
    }
}
