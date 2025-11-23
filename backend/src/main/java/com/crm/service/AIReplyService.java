package com.crm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIReplyService {

    @Value("${ai.classification.enabled:true}")
    private boolean aiEnabled;

    @Value("${ai.api.url}")
    private String aiApiUrl;

    @Value("${ai.api.key}")
    private String aiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Generuje sugestię odpowiedzi na email używając AI (Groq)
     *
     * @param originalSubject Temat oryginalnego emaila
     * @param originalBody Treść oryginalnego emaila
     * @param senderEmail Email nadawcy
     * @return Sugerowana treść odpowiedzi
     */
    public String generateReplySuggestion(String originalSubject, String originalBody, String senderEmail) {
        if (!aiEnabled) {
            log.info("AI is disabled, returning default reply");
            return generateDefaultReply(senderEmail);
        }

        try {
            log.info("Generating AI reply suggestion for email from: {}", senderEmail);

            String prompt = buildReplyPrompt(originalSubject, originalBody, senderEmail);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "llama-3.1-70b-versatile");
            requestBody.put("messages", List.of(
                    Map.of(
                            "role", "system",
                            "content", "Jesteś doświadczonym asystentem biznesowym specjalizującym się w odpowiedziach na emaile. " +
                                    "Twoje zadanie to generowanie KONTEKSTOWYCH odpowiedzi - MUSISZ przeczytać i zrozumieć treść każdego emaila. " +
                                    "KAŻDA odpowiedź musi być UNIKALNA i odnosić się do KONKRETNEJ treści emaila. " +
                                    "NIGDY nie używaj szablonowych odpowiedzi - zawsze dostosuj się do kontekstu. " +
                                    "Odpowiadaj w tym samym języku co email oryginalny. " +
                                    "Ton: profesjonalny ale ciepły i przyjazny. " +
                                    "Format: TYLKO treść odpowiedzi bez tematu, nagłówków i stopek."
                    ),
                    Map.of(
                            "role", "user",
                            "content", prompt
                    )
            ));
            requestBody.put("temperature", 0.8);
            requestBody.put("max_tokens", 800);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    aiApiUrl,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");

                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
                    String generatedReply = (String) message.get("content");

                    log.info("AI reply generated successfully");
                    return generatedReply.trim();
                }
            }

            log.warn("AI reply generation failed, using default reply");
            return generateDefaultReply(senderEmail);

        } catch (Exception e) {
            log.error("Error generating AI reply suggestion", e);
            return generateDefaultReply(senderEmail);
        }
    }

    /**
     * Buduje prompt dla AI
     */
    private String buildReplyPrompt(String subject, String body, String senderEmail) {
        // Czyść i skróć treść emaila jeśli za długa
        String cleanBody = body != null ? body.replaceAll("<[^>]*>", "").trim() : "";
        if (cleanBody.length() > 2000) {
            cleanBody = cleanBody.substring(0, 2000) + "...";
        }

        return String.format(
                "Przeanalizuj poniższy email i wygeneruj odpowiednią, kontekstową odpowiedź:\n\n" +
                        "=== EMAIL PRZYCHODZĄCY ===\n" +
                        "Od: %s\n" +
                        "Temat: %s\n\n" +
                        "Treść emaila:\n%s\n\n" +
                        "=== INSTRUKCJE ===\n" +
                        "1. Przeczytaj dokładnie treść emaila i zrozum kontekst\n" +
                        "2. Odpowiedz w tym samym języku co email oryginalny\n" +
                        "3. DOSTOSUJ odpowiedź do KONKRETNEJ treści tego emaila:\n" +
                        "   - Jeśli to pytanie - odpowiedz na to pytanie\n" +
                        "   - Jeśli to prośba - odnieś się do tej prośby\n" +
                        "   - Jeśli to oferta - skomentuj tę ofertę\n" +
                        "   - Jeśli to odmowa - zaakceptuj i podziękuj\n" +
                        "   - Jeśli to zainteresowanie - wyraź entuzjazm i zaproponuj kolejne kroki\n" +
                        "4. Użyj profesjonalnego ale przyjaznego tonu\n" +
                        "5. Wygeneruj TYLKO treść odpowiedzi (bez tematu, bez 'Od:', bez 'Do:', bez pozdrowień końcowych)\n" +
                        "6. Odpowiedź powinna być zwięzła (2-4 zdania) i konkretna\n" +
                        "7. WAŻNE: Odnieś się do KONKRETNYCH elementów z treści emaila!\n\n" +
                        "Wygeneruj odpowiedź:",
                senderEmail,
                subject != null ? subject : "(brak tematu)",
                cleanBody.isEmpty() ? "(email bez treści - możliwe że był to tylko attachment)" : cleanBody
        );
    }

    /**
     * Generuje domyślną odpowiedź (fallback gdy AI nie działa)
     */
    private String generateDefaultReply(String senderEmail) {
        return String.format(
                "Dzień dobry,\n\n" +
                        "Dziękuję za Twoją wiadomość. Otrzymałem/am Twój email i wkrótce się z Tobą skontaktuję.\n\n" +
                        "Pozdrawiam,\n" +
                        "Zespół CRM"
        );
    }
}
