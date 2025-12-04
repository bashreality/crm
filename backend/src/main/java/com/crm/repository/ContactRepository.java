package com.crm.repository;

import com.crm.model.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    Optional<Contact> findByEmail(String email);
    Optional<Contact> findByEmailIgnoreCase(String email);
    List<Contact> findByEmailIn(java.util.Collection<String> emails);
    List<Contact> findByCompanyContainingIgnoreCase(String company);
    List<Contact> findByNameContainingIgnoreCase(String name);

    @Query("SELECT DISTINCT c.company FROM Contact c WHERE c.company IS NOT NULL AND c.company != '' ORDER BY c.company")
    List<String> findDistinctCompanies();

    @Query("SELECT DISTINCT c.company FROM Contact c WHERE c.userId = :userId AND c.company IS NOT NULL AND c.company != '' ORDER BY c.company")
    List<String> findDistinctCompaniesByUserId(@Param("userId") Long userId);

    // Znajdź kontakty które mają przynajmniej jeden email z danym statusem
    // Używamy LIKE ponieważ sender może zawierać format "Imię Nazwisko <email@example.com>"
    @Query("SELECT DISTINCT c FROM Contact c, Email e WHERE LOWER(e.sender) LIKE CONCAT('%', LOWER(c.email), '%') AND e.status = :status ORDER BY c.updatedAt DESC")
    List<Contact> findContactsWithEmailStatus(String status);

    @Query("SELECT DISTINCT c FROM Contact c, Email e WHERE c.userId = :userId AND LOWER(e.sender) LIKE CONCAT('%', LOWER(c.email), '%') AND e.status = :status ORDER BY c.updatedAt DESC")
    List<Contact> findContactsWithEmailStatusByUserId(@Param("userId") Long userId, @Param("status") String status);

    // Znajdź kontakty z danym tagiem
    @Query("SELECT c FROM Contact c JOIN c.tags t WHERE t.id = :tagId")
    List<Contact> findByTagId(Long tagId);

    // User-specific queries
    List<Contact> findByUserId(Long userId);
    Optional<Contact> findByUserIdAndEmail(Long userId, String email);
    List<Contact> findByUserIdAndCompanyContainingIgnoreCase(Long userId, String company);
    List<Contact> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);
    List<Contact> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Long countByUserId(Long userId);

    @Query("SELECT c FROM Contact c JOIN c.tags t WHERE t.id = :tagId AND c.userId = :userId")
    List<Contact> findByUserIdAndTagId(Long userId, Long tagId);

    // Nowe metody używające tabeli user_contacts (współdzielone kontakty)
    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId")
    List<Contact> findAccessibleByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Contact> findAccessibleByUserIdAndNameContainingIgnoreCase(@Param("userId") Long userId, @Param("query") String query);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId AND LOWER(c.company) LIKE LOWER(CONCAT('%', :company, '%'))")
    List<Contact> findAccessibleByUserIdAndCompanyContainingIgnoreCase(@Param("userId") Long userId, @Param("company") String company);

    @Query("SELECT DISTINCT c FROM Contact c JOIN c.sharedWithUsers u, Email e WHERE u.id = :userId AND LOWER(e.sender) LIKE CONCAT('%', LOWER(c.email), '%') AND e.status = :status ORDER BY c.updatedAt DESC")
    List<Contact> findAccessibleWithEmailStatusByUserId(@Param("userId") Long userId, @Param("status") String status);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId ORDER BY c.updatedAt DESC")
    List<Contact> findAccessibleByUserIdOrderByUpdatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u JOIN c.tags t WHERE u.id = :userId AND t.id = :tagId")
    List<Contact> findAccessibleByUserIdAndTagId(@Param("userId") Long userId, @Param("tagId") Long tagId);

    @Query("SELECT COUNT(c) FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId")
    Long countAccessibleByUserId(@Param("userId") Long userId);

    // Paginated methods
    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId ORDER BY c.updatedAt DESC")
    Page<Contact> findAccessibleByUserIdOrderByUpdatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY c.updatedAt DESC")
    Page<Contact> findAccessibleByUserIdAndNameContainingIgnoreCase(@Param("userId") Long userId, @Param("query") String query, Pageable pageable);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u WHERE u.id = :userId AND LOWER(c.company) LIKE LOWER(CONCAT('%', :company, '%')) ORDER BY c.updatedAt DESC")
    Page<Contact> findAccessibleByUserIdAndCompanyContainingIgnoreCase(@Param("userId") Long userId, @Param("company") String company, Pageable pageable);

    @Query("SELECT c FROM Contact c JOIN c.sharedWithUsers u, Email e WHERE u.id = :userId AND LOWER(e.sender) LIKE CONCAT('%', LOWER(c.email), '%') AND e.status = :status ORDER BY c.updatedAt DESC")
    Page<Contact> findAccessibleWithEmailStatusByUserId(@Param("userId") Long userId, @Param("status") String status, Pageable pageable);
}
