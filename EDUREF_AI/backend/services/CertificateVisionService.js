// backend/services/CertificateVisionService.js
// Giám định viên Học vụ Đa phương thức (Multimodal Academic Certificate Referee)
// Phân tích và bóc tách chứng chỉ Chuẩn đầu ra tốt nghiệp bằng Gemini Vision + Key Rotator

import fs from 'fs';
import path from 'path';
import { GeminiStreamClient } from '../modules/ai-agent/llm/GeminiStreamClient.js';

function normalizeVietnamese(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export class CertificateVisionService {
  constructor() {
    this.geminiClient = new GeminiStreamClient();
  }

  /**
   * Giám định và bóc tách dữ liệu từ ảnh chứng chỉ
   * @param {Object} params
   * @param {String} params.imageBase64 - Chuỗi Base64 của ảnh chứng chỉ
   * @param {String} params.expectedType - 'B1' hoặc 'TEAMWORK'
   * @param {String} params.studentName - Tên sinh viên đăng ký (ví dụ: Cao Hữu Nhân)
   */
  async verifyCertificate({ imageBase64, expectedType = 'B1', studentName = 'Cao Hữu Nhân' }) {
    // 1. Nếu imageBase64 là đường dẫn tương đối (ví dụ /demo_certs/...), đọc từ file trên đĩa
    let cleanBase64 = imageBase64;
    let mimeType = 'image/png';

    if (typeof imageBase64 === 'string' && (imageBase64.startsWith('/') || imageBase64.startsWith('http'))) {
      try {
        const relativePath = imageBase64.replace('/public/', '/').replace('/demo_certs/', '');
        const possiblePaths = [
          path.resolve(process.cwd(), 'public/demo_certs', path.basename(relativePath)),
          path.resolve(process.cwd(), '../frontend/public/demo_certs', path.basename(relativePath)),
          path.resolve(process.cwd(), 'demo_certs', path.basename(relativePath)),
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            const buffer = fs.readFileSync(p);
            cleanBase64 = buffer.toString('base64');
            mimeType = 'image/png';
            break;
          }
        }
      } catch (err) {
        console.warn('⚠️ [CertificateVisionService] Không thể đọc file cục bộ:', err.message);
      }
    }

    if (!cleanBase64 || cleanBase64.length < 50) {
      return {
        isValid: false,
        imageQuality: 'BLURRY',
        feedback: 'Vui lòng cung cấp file ảnh chứng chỉ rõ nét để hệ thống đối soát.',
      };
    }

    // Làm sạch chuỗi Base64 và xác định mimeType
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      cleanBase64 = parts[1];
      const matchMime = parts[0].match(/data:(.*?)$/);
      if (matchMime) mimeType = matchMime[1];
    }

    const expectedNameClean = normalizeVietnamese(studentName);
    const certTypeName = expectedType === 'B1' ? 'Tiếng Anh B1 (CEF Level B1)' : 'Kỹ năng Giao tiếp và Làm việc nhóm';

    const systemInstruction = `Bạn là Giám định viên Học vụ trường Đại học Công nghệ TP.HCM (HUTECH), chuyên thẩm định chứng chỉ chuẩn đầu ra tốt nghiệp của sinh viên.
Nhiệm vụ: Phân tích ảnh chứng chỉ được tải lên, đối soát với thông tin sinh viên yêu cầu và loại chứng chỉ kỳ vọng:
- Sinh viên kỳ vọng: "${studentName}" (Chuẩn hóa: "${expectedNameClean}")
- Loại chứng chỉ kỳ vọng: "${certTypeName}" (${expectedType})

Quy chế thẩm định & Guardrails:
1. imageQuality: Đánh giá độ rõ nét ("CLEAR", "BLURRY", "CROPPED"). Nếu ảnh quá mờ, chói sáng, hoặc mất góc không đọc được số hiệu/họ tên -> imageQuality = "BLURRY", isValid = false.
2. detectedType: Xác định loại chứng chỉ ("B1_ENGLISH", "TEAMWORK_SKILLS", "OTHER").
3. studentName: Đọc chính xác họ tên người nhận in trên chứng chỉ.
4. studentNameMatch: So sánh họ tên trên chứng chỉ với "${studentName}". So sánh không phân biệt hoa thường và không phân biệt có dấu/không dấu (Ví dụ: "CAO HUU NHAN" trùng khớp 100% với "Cao Hữu Nhân"). Nếu họ tên người khác -> studentNameMatch = false, isValid = false.
5. extractedData: Bóc tách chính xác các trường:
   - certType: Tên loại chuẩn đầu ra
   - certNumber: Số hiệu / Serial number (thường in mực đỏ, ví dụ: 0042066 hoặc CC/ 0056999)
   - bookNumber: Số vào sổ cấp chứng chỉ / Certificate number (ví dụ: DKC24B102677 hoặc DKC25KR07358)
   - issueDate: Ngày cấp chứng chỉ (Định dạng DD/MM/YYYY)
   - issuePlace: Đơn vị cấp (Trường ĐH Công nghệ TP.HCM - HUTECH)
6. feedback: Lời giải thích ngắn gọn, chuyên nghiệp bằng tiếng Việt cho sinh viên và Cán bộ PĐT.

BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ THEO SCHEMA SAU:
{
  "isValid": true,
  "imageQuality": "CLEAR",
  "detectedType": "B1_ENGLISH",
  "studentNameMatch": true,
  "extractedName": "CAO HUU NHAN",
  "extractedData": {
    "certType": "Tiếng Anh (TOEIC / IELTS / B1)",
    "certNumber": "0042066",
    "bookNumber": "DKC24B102677",
    "issueDate": "24/06/2024",
    "issuePlace": "Trường ĐH Công nghệ TP.HCM (HUTECH)"
  },
  "confidence": 0.98,
  "feedback": "Chứng chỉ Tiếng Anh B1 hợp lệ, đúng họ tên sinh viên và đầy đủ số hiệu pháp lý."
}`;

    try {
      const contents = [
        {
          parts: [
            { text: `Hãy giám định chứng chỉ này cho sinh viên ${studentName}. Kiểm tra họ tên, số hiệu và số vào sổ.` },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ];

      const rawJson = await this.geminiClient.generateJson(contents, systemInstruction);
      if (rawJson) {
        const clean = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(clean);

        // Đối soát thêm lớp logic ở backend để đảm bảo an toàn tuyệt đối
        if (parsed.extractedName) {
          const extractedNorm = normalizeVietnamese(parsed.extractedName);
          if (extractedNorm === expectedNameClean) {
            parsed.studentNameMatch = true;
          }
        }

        // Tự động điều chỉnh certType hiển thị đẹp cho Form
        if (parsed.extractedData) {
          if (expectedType === 'B1') {
            parsed.extractedData.certType = 'Chuẩn Ngoại ngữ: Tiếng Anh B1 (CEFR / HUTECH)';
          } else if (expectedType === 'TEAMWORK') {
            parsed.extractedData.certType = 'Chuẩn Kỹ năng: Giao tiếp & Làm việc nhóm (HUTECH)';
          }
        }

        return parsed;
      }
    } catch (err) {
      console.warn('⚠️ [CertificateVisionService] Lỗi gọi Gemini Vision:', err.message);
      return {
        isValid: false,
        imageQuality: 'ERROR',
        detectedType: expectedType === 'B1' ? 'B1_ENGLISH' : 'TEAMWORK_SKILLS',
        studentNameMatch: null,
        extractedName: null,
        extractedData: null,
        requiresManualReview: true,
        feedback: 'Hệ thống AI Vision tạm thời gián đoạn hoặc không thể giám định ảnh. Hồ sơ này cần được chuyển tiếp lên Cán bộ Phòng Đào tạo thẩm định trực tiếp theo quy định.',
      };
    }
  }
}

export default new CertificateVisionService();
