package com.crm.model;

import java.time.LocalDateTime;

/**
 * Interface for entities that support soft delete.
 * Entities implementing this interface can be "deleted" by setting deletedAt timestamp
 * instead of being permanently removed from the database.
 */
public interface SoftDeletable {
    
    LocalDateTime getDeletedAt();
    
    void setDeletedAt(LocalDateTime deletedAt);
    
    /**
     * Check if the entity is deleted (soft deleted)
     */
    default boolean isDeleted() {
        return getDeletedAt() != null;
    }
    
    /**
     * Soft delete the entity by setting deletedAt to current timestamp
     */
    default void softDelete() {
        setDeletedAt(LocalDateTime.now());
    }
    
    /**
     * Restore a soft-deleted entity
     */
    default void restore() {
        setDeletedAt(null);
    }
}

