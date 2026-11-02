package dev.grouplife.security;

public enum Role {
    /** Employee who submits and follows their own claims. */
    MEMBER,
    /** Claims staff who assess, decide and pay claims. */
    ASSESSOR,
    /** Administrator who manages schemes, policies and members. */
    ADMIN
}
