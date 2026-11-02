package dev.grouplife.claim;

import java.util.Optional;

/**
 * Identifies uploads by their first bytes rather than trusting the file name or the browser's
 * content type, so a renamed executable cannot pass as a PDF.
 */
final class FileSignature {

    static final String PDF = "application/pdf";
    static final String PNG = "image/png";
    static final String JPEG = "image/jpeg";

    private static final byte[] PDF_MAGIC = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    private FileSignature() {}

    static Optional<String> detect(byte[] content) {
        if (startsWith(content, PDF_MAGIC)) {
            return Optional.of(PDF);
        }
        if (startsWith(content, PNG_MAGIC)) {
            return Optional.of(PNG);
        }
        if (startsWith(content, JPEG_MAGIC)) {
            return Optional.of(JPEG);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, byte[] prefix) {
        if (content.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (content[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
