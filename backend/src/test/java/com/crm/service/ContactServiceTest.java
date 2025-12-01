package com.crm.service;

import com.crm.model.Contact;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private EmailRepository emailRepository;

    @InjectMocks
    private ContactService contactService;

    private Contact contact;

    @BeforeEach
    void setUp() {
        contact = new Contact();
        contact.setId(1L);
        contact.setName("John Doe");
        contact.setEmail("john@example.com");
        contact.setCompany("Example Corp");
        contact.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void shouldReturnAllContacts() {
        // given
        when(contactRepository.findAll()).thenReturn(List.of(contact));

        // when
        List<Contact> result = contactService.getAllContacts();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("John Doe");
    }

    @Test
    void shouldGetContactById() {
        // given
        when(contactRepository.findById(1L)).thenReturn(Optional.of(contact));

        // when
        Optional<Contact> result = contactService.getContactById(1L);

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("john@example.com");
    }

    @Test
    void shouldCreateContact() {
        // given
        when(contactRepository.save(any(Contact.class))).thenReturn(contact);

        // when
        Contact created = contactService.createContact(contact);

        // then
        assertThat(created.getName()).isEqualTo("John Doe");
        verify(contactRepository, times(1)).save(any(Contact.class));
    }

    @Test
    void shouldDeleteContact() {
        // when
        contactService.deleteContact(1L);

        // then
        verify(contactRepository, times(1)).deleteById(1L);
    }
}
