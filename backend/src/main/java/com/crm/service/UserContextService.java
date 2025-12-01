package com.crm.service;

import com.crm.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class UserContextService {

    /**
     * Get the currently authenticated user's ID
     * @return the user ID, or null if not authenticated
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserPrincipal) {
            return ((UserPrincipal) principal).getId();
        }

        return null;
    }

    /**
     * Get the currently authenticated user principal
     * @return the UserPrincipal, or null if not authenticated
     */
    public UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserPrincipal) {
            return (UserPrincipal) principal;
        }

        return null;
    }

    /**
     * Check if the current user is an admin
     * @return true if the user is an admin, false otherwise
     */
    public boolean isCurrentUserAdmin() {
        UserPrincipal user = getCurrentUser();
        return user != null && "ADMIN".equals(user.getRole());
    }
}
