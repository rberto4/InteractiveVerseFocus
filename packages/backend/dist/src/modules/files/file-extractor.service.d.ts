export declare class FileExtractorService {
    extractContent(buffer: Buffer, mimeType: string): Promise<{
        text: string;
        metadata?: any;
    }>;
    private extractFromPDF;
    private extractFromWord;
    private extractFromText;
    private normalizeText;
    getSummary(text: string, maxLength?: number): string;
}
//# sourceMappingURL=file-extractor.service.d.ts.map