package dev.grouplife.seed;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Builds a tiny, valid one-page PDF so seeded claims have real documents to open. */
final class SamplePdf {

    private SamplePdf() {}

    static byte[] withLines(String... lines) {
        StringBuilder text = new StringBuilder("BT /F1 20 Tf 72 770 Td (SYNTHETIC SAMPLE DOCUMENT) Tj ET\n");
        int y = 730;
        for (String line : lines) {
            text.append("BT /F1 12 Tf 72 ").append(y).append(" Td (").append(escape(line)).append(") Tj ET\n");
            y -= 20;
        }
        String stream = text.toString();

        List<String> objects = List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
                        + "/Resources << /Font << /F1 5 0 R >> >> >>",
                "<< /Length " + stream.length() + " >>\nstream\n" + stream + "endstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(pdf.length());
            pdf.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
        }
        int xref = pdf.length();
        pdf.append("xref\n0 ").append(objects.size() + 1).append("\n0000000000 65535 f \n");
        offsets.forEach(offset -> pdf.append("%010d 00000 n \n".formatted(offset)));
        pdf.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\nstartxref\n")
                .append(xref).append("\n%%EOF\n");
        return pdf.toString().getBytes(StandardCharsets.US_ASCII);
    }

    private static String escape(String line) {
        return line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
