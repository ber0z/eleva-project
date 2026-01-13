export function isAllowedDoc(m?: string, filename?: string) {
    if (!m) return false;

    // Lista branca de MIME types
    const allowed = new Set([
        // PDF
        "application/pdf",

        // Imagens
        // (usamos startsWith abaixo)

        // Planilhas
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx

        // Word
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx

        // (opcional) formatos de texto/editáveis:
        // "application/rtf", // .rtf
        // "application/vnd.oasis.opendocument.text", // .odt
    ]);

    if (m.startsWith("image/")) return true;
    if (allowed.has(m)) return true;

    // Fallback por extensão quando vem como octet-stream
    if (m === "application/octet-stream" && filename) {
        const ext = filename.toLowerCase().split(".").pop() || "";
        const allowedExt = new Set([
            "pdf", "png", "jpg", "jpeg", "webp", "gif",
            "xls", "xlsx",
            "doc", "docx",
            // "rtf", "odt",
        ]);
        return allowedExt.has(ext);
    }

    return false;
}
