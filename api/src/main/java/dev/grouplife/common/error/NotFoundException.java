package dev.grouplife.common.error;

import java.util.UUID;

public class NotFoundException extends RuntimeException {

    public NotFoundException(String resource, UUID id) {
        super("%s %s was not found".formatted(resource, id));
    }
}
