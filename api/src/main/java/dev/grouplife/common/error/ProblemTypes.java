package dev.grouplife.common.error;

import java.net.URI;

/** Problem type identifiers used in RFC 9457 responses. */
public final class ProblemTypes {

    public static final URI NOT_FOUND = of("not-found");
    public static final URI VALIDATION = of("validation");
    public static final URI BUSINESS_RULE = of("business-rule");
    public static final URI CONFLICT = of("conflict");
    public static final URI INVALID_TRANSITION = of("invalid-claim-transition");
    public static final URI UNAUTHORIZED = of("unauthorized");
    public static final URI FORBIDDEN = of("forbidden");

    private ProblemTypes() {}

    private static URI of(String slug) {
        return URI.create("urn:grouplife:problem:" + slug);
    }
}
