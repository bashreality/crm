package com.crm.repository;

import com.crm.model.UserContact;
import com.crm.model.UserContactId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserContactRepository extends JpaRepository<UserContact, UserContactId> {

    @Query("SELECT uc FROM UserContact uc WHERE uc.user.id = :userId")
    List<UserContact> findByUserId(@Param("userId") Long userId);

    @Query("SELECT uc FROM UserContact uc WHERE uc.contact.id = :contactId")
    List<UserContact> findByContactId(@Param("contactId") Long contactId);

    @Query("SELECT uc FROM UserContact uc WHERE uc.user.id = :userId AND uc.contact.id = :contactId")
    Optional<UserContact> findByUserIdAndContactId(@Param("userId") Long userId, @Param("contactId") Long contactId);

    @Query("SELECT uc FROM UserContact uc WHERE uc.user.id = :userId AND uc.source = :source")
    List<UserContact> findByUserIdAndSource(@Param("userId") Long userId, @Param("source") String source);

    void deleteByUserIdAndContactId(Long userId, Long contactId);
}