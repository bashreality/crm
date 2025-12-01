package com.crm.controller;

import com.crm.dto.ContactDto;
import com.crm.mapper.ContactMapper;
import com.crm.model.Contact;
import com.crm.service.ContactAutoCreationService;
import com.crm.service.ContactService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Import SecurityConfig to apply security rules (or mock them)
// In WebMvcTest, security is enabled by default.
@WebMvcTest(ContactController.class)
@AutoConfigureMockMvc
@Import(ContactMapper.class) // Import Mapper as it is used in Controller
class ContactControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ContactService contactService;

    @MockBean
    private ContactAutoCreationService contactAutoCreationService;

    // Jwt components might be needed if SecurityConfig is loaded
    // but with @WebMvcTest and @WithMockUser we often bypass filters or need to mock beans.
    // Let's see if it requires JwtTokenProvider. Usually WebMvcTest scans for Controllers.
    // SecurityConfig might rely on JwtAuthenticationFilter -> JwtTokenProvider.
    // We might need to mock them or exclude SecurityConfig. 
    // For simplicity in this step, let's try to run it. If it fails on missing beans, we mock them.

    @MockBean
    private com.crm.security.JwtTokenProvider jwtTokenProvider;
    
    @MockBean
    private com.crm.security.CustomUserDetailsService customUserDetailsService;
    
    @MockBean
    private com.crm.security.JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;


    @Autowired
    private ObjectMapper objectMapper;

    private Contact contact;
    private ContactDto contactDto;

    @BeforeEach
    void setUp() {
        contact = new Contact();
        contact.setId(1L);
        contact.setName("Jane Doe");
        contact.setCompany("Tech Corp");
        contact.setEmail("jane@tech.com");

        contactDto = new ContactDto();
        contactDto.setId(1L);
        contactDto.setName("Jane Doe");
        contactDto.setCompany("Tech Corp");
        contactDto.setEmail("jane@tech.com");
    }

    @Test
    @WithMockUser
    void shouldReturnAllContacts() throws Exception {
        given(contactService.getAllContacts()).willReturn(List.of(contact));

        // Note: The controller logic has complex "if search/company/showAll".
        // Default (no params) calls getContactsWithEmailStatus. 
        // We need to mock that or pass ?showAll=true.
        
        given(contactService.getAllContacts()).willReturn(List.of(contact));

        mockMvc.perform(get("/api/contacts?showAll=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Jane Doe"))
                .andExpect(jsonPath("$[0].email").value("jane@tech.com"));
    }

    @Test
    @WithMockUser
    void shouldCreateContact() throws Exception {
        given(contactService.createContact(any(Contact.class))).willReturn(contact);

        mockMvc.perform(post("/api/contacts")
                        .with(csrf()) // CSRF is disabled in config, but good practice to have valid request
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contactDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Jane Doe"));
    }

    @Test
    @WithMockUser
    void shouldValidateInput() throws Exception {
        ContactDto invalidDto = new ContactDto();
        // missing name, email, etc.

        mockMvc.perform(post("/api/contacts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest());
    }
}
