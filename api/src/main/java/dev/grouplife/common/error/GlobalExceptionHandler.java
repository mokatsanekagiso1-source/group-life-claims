package dev.grouplife.common.error;

import dev.grouplife.claim.InvalidClaimTransitionException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Turns exceptions into RFC 9457 problem details. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, ProblemTypes.NOT_FOUND, "Not found", ex.getMessage());
    }

    @ExceptionHandler(BusinessRuleException.class)
    ProblemDetail handleBusinessRule(BusinessRuleException ex) {
        var problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, ProblemTypes.BUSINESS_RULE,
                "Business rule violated", ex.getMessage());
        problem.setProperty("code", ex.getCode());
        return problem;
    }

    @ExceptionHandler(InvalidClaimTransitionException.class)
    ProblemDetail handleInvalidTransition(InvalidClaimTransitionException ex) {
        var problem = problem(HttpStatus.CONFLICT, ProblemTypes.INVALID_TRANSITION,
                "Invalid claim transition", ex.getMessage());
        problem.setProperty("from", ex.getFrom());
        problem.setProperty("to", ex.getTo());
        problem.setProperty("allowed", ex.getFrom().allowedTargets());
        return problem;
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException ex) {
        return problem(HttpStatus.CONFLICT, ProblemTypes.CONFLICT, "Conflict", ex.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail handleOptimisticLock(OptimisticLockingFailureException ex) {
        return problem(HttpStatus.CONFLICT, ProblemTypes.CONFLICT, "Conflict",
                "The resource was changed by someone else. Reload it and try again.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        return problem(HttpStatus.CONFLICT, ProblemTypes.CONFLICT, "Conflict",
                "The request conflicts with existing data.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, ProblemTypes.FORBIDDEN, "Forbidden",
                "You do not have permission to perform this action.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> errors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));

        var problem = problem(HttpStatus.BAD_REQUEST, ProblemTypes.VALIDATION, "Validation failed",
                "One or more fields are invalid.");
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    private static ProblemDetail problem(HttpStatus status, URI type, String title, String detail) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(type);
        problem.setTitle(title);
        return problem;
    }
}
