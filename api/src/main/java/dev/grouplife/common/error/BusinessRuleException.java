package dev.grouplife.common.error;

/**
 * A request that is well-formed but breaks a business rule. Maps to 422 with a stable {@code code}
 * clients can switch on.
 */
public class BusinessRuleException extends RuntimeException {

    private final String code;

    public BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
