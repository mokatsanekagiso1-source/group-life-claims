package dev.grouplife.claim;

import dev.grouplife.claim.CollaborationDtos.AddNoteRequest;
import dev.grouplife.claim.CollaborationDtos.DocumentView;
import dev.grouplife.claim.CollaborationDtos.NoteView;
import dev.grouplife.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/claims/{claimId}")
@Tag(name = "Claim notes and documents", description = "The conversation and evidence around a claim")
public class ClaimCollaborationController {

    private final ClaimCollaborationService service;

    public ClaimCollaborationController(ClaimCollaborationService service) {
        this.service = service;
    }

    @GetMapping("/notes")
    @Operation(summary = "Notes on a claim", description = "Members do not see internal notes.")
    public List<NoteView> notes(@PathVariable UUID claimId, @AuthenticationPrincipal Jwt jwt) {
        return service.notes(claimId, CurrentUser.from(jwt));
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a note", description = "Only assessors may mark a note internal.")
    public NoteView addNote(@PathVariable UUID claimId, @Valid @RequestBody AddNoteRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.addNote(claimId, request, CurrentUser.from(jwt));
    }

    @GetMapping("/documents")
    @Operation(summary = "Supporting documents on a claim")
    public List<DocumentView> documents(@PathVariable UUID claimId, @AuthenticationPrincipal Jwt jwt) {
        return service.documents(claimId, CurrentUser.from(jwt));
    }

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload a document", description = "PDF, PNG or JPEG up to 5 MB, while the claim is open.")
    public DocumentView upload(@PathVariable UUID claimId, @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "OTHER") DocumentCategory category, @AuthenticationPrincipal Jwt jwt)
            throws IOException {
        return service.upload(claimId, file.getOriginalFilename(), category, file.getBytes(), CurrentUser.from(jwt));
    }

    @GetMapping("/documents/{documentId}/content")
    @Operation(summary = "Download a document")
    public ResponseEntity<byte[]> download(@PathVariable UUID claimId, @PathVariable UUID documentId,
            @AuthenticationPrincipal Jwt jwt) {
        ClaimDocument document = service.download(claimId, documentId, CurrentUser.from(jwt));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(document.getFileName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(document.getContent());
    }
}
