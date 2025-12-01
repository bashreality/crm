package com.crm.model.enums;

public enum EmailStatus {
    POSITIVE("positive"),
    NEUTRAL("neutral"),
    NEGATIVE("negative"),
    UNDELIVERED("undelivered"),
    MAYBE_LATER("maybeLater");

    private final String value;

    EmailStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return value;
    }
}
