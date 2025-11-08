package com.crm.service;

import com.crm.config.WoodpeckerConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WoodpeckerApiService {
    
    private final WoodpeckerConfig woodpeckerConfig;
    private WebClient webClient;
    
    private WebClient getWebClient() {
        if (webClient == null) {
            log.info("Creating WebClient with baseUrl: {}", woodpeckerConfig.getBaseUrl());
            log.info("API Key length: {}", woodpeckerConfig.getKey() != null ? woodpeckerConfig.getKey().length() : 0);
            webClient = WebClient.builder()
                    .baseUrl(woodpeckerConfig.getBaseUrl())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("x-api-key", woodpeckerConfig.getKey())
                    .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .build();
        }
        return webClient;
    }
    
    /**
     * Pobierz informacje o użytkowniku/koncie
     */
    public Map<String, Object> getMe() {
        try {
            return getWebClient()
                    .get()
                    .uri("/v1/me")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error fetching Woodpecker user info: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch user info: " + e.getMessage());
        }
    }
    
    /**
     * Pobierz listę kampanii
     */
    public Map<String, Object> getCampaigns() {
        try {
            // Według dokumentacji Woodpecker API, endpoint to /v1/campaign_list
            // Możemy dodać query param status=RUNNING,PAUSED aby pobrać tylko aktywne kampanie
            String endpoint = "/v1/campaign_list";
            String fullUrl = woodpeckerConfig.getBaseUrl() + endpoint + "?status=RUNNING,PAUSED";
            log.info("Fetching campaigns from Woodpecker API: {}", fullUrl);
            
            // API może zwracać tablicę bezpośrednio lub obiekt - najpierw spróbuj jako Object
            Object rawResponse = getWebClient()
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path(endpoint)
                            .queryParam("status", "RUNNING,PAUSED")
                            .build())
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
            
            log.info("Successfully fetched campaigns from Woodpecker API");
            
            Map<String, Object> result = new HashMap<>();
            
            // Obsłuż różne formaty odpowiedzi
            if (rawResponse == null) {
                log.warn("Received null response from Woodpecker API");
                result.put("campaigns", new ArrayList<>());
            } else if (rawResponse instanceof List) {
                // API zwróciło tablicę bezpośrednio
                log.info("Response is a list with {} items", ((List<?>) rawResponse).size());
                result.put("campaigns", rawResponse);
            } else if (rawResponse instanceof Map) {
                // API zwróciło obiekt
                @SuppressWarnings("unchecked")
                Map<String, Object> responseMap = (Map<String, Object>) rawResponse;
                log.info("Response is a map with keys: {}", responseMap.keySet());
                
                // Sprawdź różne możliwe klucze
                if (responseMap.containsKey("campaigns")) {
                    result.put("campaigns", responseMap.get("campaigns"));
                } else if (responseMap.containsKey("campaign_list")) {
                    result.put("campaigns", responseMap.get("campaign_list"));
                } else if (responseMap.size() > 0) {
                    // Może kampanie są bezpośrednio w odpowiedzi jako lista pod pierwszym kluczem
                    Object firstValue = responseMap.values().iterator().next();
                    if (firstValue instanceof List) {
                        result.put("campaigns", firstValue);
                    } else {
                        result.put("campaigns", new ArrayList<>());
                    }
                } else {
                    result.put("campaigns", new ArrayList<>());
                }
            } else {
                log.warn("Unexpected response type: {}", rawResponse.getClass());
                result.put("campaigns", new ArrayList<>());
            }
            
            return result;
            
        } catch (WebClientResponseException e) {
            String errorBody = e.getResponseBodyAsString();
            log.error("Error fetching Woodpecker campaigns: Status={}, URL={}, Body={}", 
                    e.getStatusCode(), 
                    woodpeckerConfig.getBaseUrl() + "/v1/campaign_list",
                    errorBody != null ? errorBody : "empty");
            
            // Jeśli błąd 401/403, to problem z autoryzacją
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new RuntimeException("Błąd autoryzacji Woodpecker API. Sprawdź API key.");
            }
            
            // Dla innych błędów, zwróć pustą listę zamiast rzucać wyjątek
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("campaigns", new ArrayList<>());
            return emptyResponse;
            
        } catch (Exception e) {
            log.error("Unexpected error fetching Woodpecker campaigns: {}", e.getMessage(), e);
            // Zwróć pustą listę zamiast rzucać wyjątek
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("campaigns", new ArrayList<>());
            return emptyResponse;
        }
    }
    
    /**
     * Pobierz szczegóły kampanii
     */
    public Map<String, Object> getCampaign(Long campaignId) {
        try {
            // Spróbuj najpierw v2 z path parametrem, potem v1 z query parametrem
            String[] endpoints = {
                "/v2/campaigns/{id}",
                "/v1/campaign_list?id={id}"
            };
            
            for (String endpointTemplate : endpoints) {
                try {
                    String fullUrl = woodpeckerConfig.getBaseUrl() + endpointTemplate.replace("{id}", String.valueOf(campaignId));
                    log.info("Trying to fetch campaign {} from: {}", campaignId, fullUrl);
                    
                    Object rawResponse;
                    if (endpointTemplate.contains("?")) {
                        // Query param - użyj UriBuilder
                        rawResponse = getWebClient()
                                .get()
                                .uri(uriBuilder -> uriBuilder
                                        .path("/v1/campaign_list")
                                        .queryParam("id", campaignId)
                                        .build())
                                .retrieve()
                                .bodyToMono(Object.class)
                                .block();
                    } else {
                        // Path param
                        rawResponse = getWebClient()
                                .get()
                                .uri(endpointTemplate.replace("{id}", String.valueOf(campaignId)))
                                .retrieve()
                                .bodyToMono(Object.class)
                                .block();
                    }
                    
                    log.info("Successfully fetched campaign {} from endpoint: {}", campaignId, endpointTemplate);
                    
                    // Przetwórz odpowiedź
                    if (rawResponse == null) {
                        continue; // Spróbuj następny endpoint
                    }
                    
                    Map<String, Object> result = new HashMap<>();
                    
                    if (rawResponse instanceof List) {
                        // Jeśli to lista, weź pierwszy element
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> list = (List<Map<String, Object>>) rawResponse;
                        if (!list.isEmpty()) {
                            return list.get(0);
                        }
                    } else if (rawResponse instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> responseMap = (Map<String, Object>) rawResponse;
                        // Sprawdź różne możliwe klucze
                        if (responseMap.containsKey("campaign")) {
                            return (Map<String, Object>) responseMap.get("campaign");
                        } else if (responseMap.containsKey("data")) {
                            Object data = responseMap.get("data");
                            if (data instanceof Map) {
                                return (Map<String, Object>) data;
                            }
                        } else {
                            return responseMap;
                        }
                    }
                    
                    return result;
                } catch (WebClientResponseException e) {
                    if (e.getStatusCode().value() == 404 || e.getStatusCode().value() == 400) {
                        log.warn("Endpoint {} returned {} for campaign {}: {}", 
                                endpointTemplate, e.getStatusCode(), campaignId, e.getResponseBodyAsString());
                        continue; // Spróbuj następny endpoint
                    } else if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                        throw new RuntimeException("Błąd autoryzacji Woodpecker API. Sprawdź API key.");
                    } else {
                        // Inny błąd - loguj i spróbuj następny
                        log.warn("Endpoint {} returned {} for campaign {}: {}", 
                                endpointTemplate, e.getStatusCode(), campaignId, e.getResponseBodyAsString());
                        continue;
                    }
                }
            }
            
            // Jeśli wszystkie endpointy nie zadziałały
            log.error("All endpoints failed for campaign {}", campaignId);
            throw new RuntimeException("Nie można pobrać szczegółów kampanii. Sprawdź czy kampania istnieje.");
            
        } catch (WebClientResponseException e) {
            log.error("Error fetching Woodpecker campaign {}: {}", campaignId, e.getMessage());
            throw new RuntimeException("Failed to fetch campaign: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error fetching Woodpecker campaign {}: {}", campaignId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch campaign: " + e.getMessage());
        }
    }
    
    /**
     * Pobierz listę prospectów z kampanii
     */
    public Map<String, Object> getCampaignProspects(Long campaignId) {
        try {
            return getWebClient()
                    .get()
                    .uri("/v1/campaigns/{id}/prospects", campaignId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error fetching prospects for campaign {}: {}", campaignId, e.getMessage());
            throw new RuntimeException("Failed to fetch prospects: " + e.getMessage());
        }
    }
    
    /**
     * Dodaj prospectów do kampanii
     */
    public Map<String, Object> addProspectsToCampaign(Long campaignId, List<Map<String, Object>> prospects) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("prospects", prospects);
            
            return getWebClient()
                    .post()
                    .uri("/v1/campaigns/{id}/prospects", campaignId)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error adding prospects to campaign {}: {}", campaignId, e.getMessage());
            throw new RuntimeException("Failed to add prospects: " + e.getMessage());
        }
    }
    
    /**
     * Utwórz nową kampanię
     */
    public Map<String, Object> createCampaign(Map<String, Object> campaignData) {
        try {
            return getWebClient()
                    .post()
                    .uri("/v1/campaigns")
                    .bodyValue(campaignData)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error creating Woodpecker campaign: {}", e.getMessage());
            throw new RuntimeException("Failed to create campaign: " + e.getMessage());
        }
    }
    
    /**
     * Pobierz listę wszystkich prospectów
     */
    public Map<String, Object> getAllProspects() {
        try {
            return getWebClient()
                    .get()
                    .uri("/v1/prospects")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error fetching all prospects: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch prospects: " + e.getMessage());
        }
    }
    
    /**
     * Pobierz listę skrzynek pocztowych
     */
    public Map<String, Object> getMailboxes() {
        try {
            return getWebClient()
                    .get()
                    .uri("/v1/mailboxes")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Error fetching mailboxes: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch mailboxes: " + e.getMessage());
        }
    }
}

