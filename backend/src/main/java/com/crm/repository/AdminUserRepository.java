package com.crm.repository;

import com.crm.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByUsername(String username);
    Optional<AdminUser> findByEmail(String email);

    @Query("SELECT DISTINCT u FROM AdminUser u " +
           "JOIN EmailAccount ea ON ea.userId = u.id " +
           "WHERE ea.emailAddress LIKE %:domain%")
    List<AdminUser> findUsersWithEmailDomain(@Param("domain") String domain);
}
