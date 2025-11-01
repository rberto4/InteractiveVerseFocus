"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileExtractorService = void 0;
const common_1 = require("@nestjs/common");
const mammoth = __importStar(require("mammoth"));
let FileExtractorService = class FileExtractorService {
    async extractContent(buffer, mimeType) {
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
        }
        catch (error) {
            console.error('❌ Error extracting file content:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract content: ${message}`);
        }
    }
    async extractFromPDF(buffer) {
        try {
            const PDFExtract = require('pdf.js-extract').PDFExtract;
            const pdfExtract = new PDFExtract();
            const data = await pdfExtract.extractBuffer(buffer);
            let text = '';
            for (const page of data.pages) {
                for (const item of page.content) {
                    if (item.str) {
                        text += item.str;
                        if (!item.str.endsWith(' ') && !item.str.endsWith('\n')) {
                            text += ' ';
                        }
                    }
                }
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
        }
        catch (error) {
            console.error('❌ PDF extraction failed:', error);
            throw new Error('Failed to extract PDF content');
        }
    }
    async extractFromWord(buffer) {
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
        }
        catch (error) {
            console.error('❌ Word extraction failed:', error);
            throw new Error('Failed to extract Word document content');
        }
    }
    extractFromText(buffer) {
        const text = buffer.toString('utf-8');
        console.log(`✅ Text file extracted: ${text.length} characters`);
        return {
            text: this.normalizeText(text),
        };
    }
    normalizeText(text) {
        let normalized = text
            .replace(/\n{3,}/g, '\n\n')
            .replace(/ {2,}/g, ' ')
            .replace(/\t+/g, ' ')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n')
            .trim();
        if (normalized.length > 10000) {
            console.warn(`⚠️ Content truncated from ${normalized.length} to 10000 characters`);
            normalized = normalized.substring(0, 10000) + '\n\n[... contenuto troncato ...]';
        }
        return normalized;
    }
    getSummary(text, maxLength = 200) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
};
exports.FileExtractorService = FileExtractorService;
exports.FileExtractorService = FileExtractorService = __decorate([
    (0, common_1.Injectable)()
], FileExtractorService);
//# sourceMappingURL=file-extractor.service.js.map