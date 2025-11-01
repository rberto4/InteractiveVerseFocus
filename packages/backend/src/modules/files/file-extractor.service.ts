import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';

@Injectable()
export class FileExtractorService {
  /**
   * Extract text content from various file types
   */
  async extractContent(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ text: string; metadata?: any }> {
    console.log(`📄 Extracting content from file type: ${mimeType}`);

    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(buffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractFromWord(buffer);

        case 'text/plain':
          return this.extractFromText(buffer);

        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('❌ Error extracting file content:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract content: ${message}`);
    }
  }

  /**
   * Extract text from PDF using pdf.js-extract
   */
  private async extractFromPDF(
    buffer: Buffer,
  ): Promise<{ text: string; metadata?: any }> {
    try {
      const PDFExtract = require('pdf.js-extract').PDFExtract;
      const pdfExtract = new PDFExtract();
      
      const data = await pdfExtract.extractBuffer(buffer);

      // Extract text from all pages
      let text = '';
      for (const page of data.pages) {
        for (const item of page.content) {
          if (item.str) {
            text += item.str;
            // Add space if needed
            if (!item.str.endsWith(' ') && !item.str.endsWith('\n')) {
              text += ' ';
            }
          }
        }
        // Add newline between pages
        text += '\n\n';
      }

      console.log(`✅ PDF extracted: ${data.pages.length} pages, ${text.length} characters`);

      return {
        text: this.normalizeText(text),
        metadata: {
          pages: data.pages.length,
          pdfInfo: data.pdfInfo,
        },
      };
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw new Error('Failed to extract PDF content');
    }
  }

  /**
   * Extract text from Word document (.docx)
   */
  private async extractFromWord(
    buffer: Buffer,
  ): Promise<{ text: string; metadata?: any }> {
    try {
      const result = await mammoth.extractRawText({ buffer });

      console.log(`✅ Word document extracted: ${result.value.length} characters`);

      if (result.messages.length > 0) {
        console.warn('⚠️ Word extraction warnings:', result.messages);
      }

      return {
        text: this.normalizeText(result.value),
        metadata: {
          warnings: result.messages,
        },
      };
    } catch (error) {
      console.error('❌ Word extraction failed:', error);
      throw new Error('Failed to extract Word document content');
    }
  }

  /**
   * Extract text from plain text file
   */
  private extractFromText(buffer: Buffer): { text: string } {
    const text = buffer.toString('utf-8');
    console.log(`✅ Text file extracted: ${text.length} characters`);

    return {
      text: this.normalizeText(text),
    };
  }

  /**
   * Normalize extracted text:
   * - Remove excessive whitespace
   * - Remove special characters
   * - Limit length for AI context
   */
  private normalizeText(text: string): string {
    let normalized = text
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive spaces
      .replace(/ {2,}/g, ' ')
      // Remove tabs
      .replace(/\t+/g, ' ')
      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n')
      // Trim overall
      .trim();

    // Limit to 10,000 characters to avoid overwhelming AI
    if (normalized.length > 10000) {
      console.warn(
        `⚠️ Content truncated from ${normalized.length} to 10000 characters`,
      );
      normalized = normalized.substring(0, 10000) + '\n\n[... contenuto troncato ...]';
    }

    return normalized;
  }

  /**
   * Get a summary of the extracted content for display
   */
  getSummary(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  }
}
