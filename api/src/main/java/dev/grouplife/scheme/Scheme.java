package dev.grouplife.scheme;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An employer that holds one or more group life policies. */
@Entity
@Table(name = "scheme")
public class Scheme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;
    private String registrationNumber;
    private String contactEmail;
    private Instant createdAt;

    protected Scheme() {}

    public Scheme(String name, String registrationNumber, String contactEmail, Instant createdAt) {
        this.name = name;
        this.registrationNumber = registrationNumber;
        this.contactEmail = contactEmail;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
