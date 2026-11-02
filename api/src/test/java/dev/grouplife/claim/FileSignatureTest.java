package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class FileSignatureTest {

    @Test
    void recognisesPdfPngAndJpegByContent() {
        assertThat(FileSignature.detect("%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII))).contains("application/pdf");
        assertThat(FileSignature.detect(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0}))
                .contains("image/png");
        assertThat(FileSignature.detect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}))
                .contains("image/jpeg");
    }

    @Test
    void rejectsAnythingElseWhateverItIsCalled() {
        assertThat(FileSignature.detect("MZ\u0090\u0000 renamed.pdf".getBytes(StandardCharsets.ISO_8859_1))).isEmpty();
        assertThat(FileSignature.detect("<html>".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(FileSignature.detect(new byte[] {'%', 'P'})).isEmpty();
        assertThat(FileSignature.detect(new byte[0])).isEmpty();
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', value = {
        "report.pdf|report.pdf",
        "C:\\Users\\me\\Desktop\\scan.png|scan.png",
        "../../etc/passwd|passwd",
        "\"quoted\".pdf|quoted.pdf",
        "   |document",
    })
    void cleansUploadedFileNames(String input, String expected) {
        assertThat(ClaimCollaborationService.safeFileName(input)).isEqualTo(expected);
    }
}
