import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed demo bị chặn trong môi trường production.');
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('Seed này xóa dữ liệu hiện có. Chỉ trên DB demo rỗng/disposable, đặt ALLOW_DESTRUCTIVE_SEED=true rồi chạy lại.');
  }
  console.log('🌱 [EduRef Seed] Bắt đầu nạp dữ liệu chuẩn cho EduRef AI (Chỉ 2 thủ tục thực tế)...');

  // 1. Xóa dữ liệu cũ theo thứ tự phụ thuộc
  await prisma.auditLog.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.studentRequest.deleteMany();
  await prisma.authorityRule.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.requestType.deleteMany();
  await prisma.student.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Tạo Khoa / Viện (Khớp với thông tin thực tế của trường)
  const cntt = await prisma.department.create({
    data: {
      code: 'CNTT',
      name: 'Khoa Công Nghệ Thông Tin',
    },
  });

  const ddt = await prisma.department.create({
    data: {
      code: 'DDT',
      name: 'Khoa Điện - Điện tử',
    },
  });

  console.log('✅ Đã tạo 2 Khoa đào tạo (Khoa CNTT & Khoa Điện - Điện tử).');

  // 3. Tạo Sinh viên mẫu chuẩn 10 số HUTECH
  await prisma.student.create({
    data: {
      studentCode: '2280602154',
      fullName: 'Cao Hữu Nhân',
      email: 'nhan.cao@edu.vn',
      phone: '0901234567',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 3.52,
      departmentId: cntt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2380600001',
      fullName: 'Nguyễn Văn An',
      email: 'an.nguyen@edu.vn',
      phone: '0901234568',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 3.45,
      departmentId: cntt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2150200002',
      fullName: 'Trần Thị Bình',
      email: 'binh.tran@edu.vn',
      phone: '0902345678',
      status: 'DROPPED',
      tuitionDebt: 0,
      gpa: 2.10,
      departmentId: ddt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2150200003',
      fullName: 'Lê Hoàng Cường',
      email: 'cuong.le@edu.vn',
      phone: '0903456789',
      status: 'ACTIVE',
      tuitionDebt: 15000000,
      gpa: 2.85,
      departmentId: cntt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2280600004',
      fullName: 'Phạm Văn Dũng',
      email: 'dung.pham@edu.vn',
      phone: '0904567890',
      status: 'SUSPENDED',
      tuitionDebt: 0,
      gpa: 3.10,
      departmentId: cntt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2050200005',
      fullName: 'Hoàng Thị Mai',
      email: 'mai.hoang@edu.vn',
      phone: '0905678901',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 2.75,
      departmentId: ddt.id,
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '2080600099',
      fullName: 'Võ Minh Quân',
      email: 'quan.vo@edu.vn',
      phone: '0901234599',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 3.60,
      departmentId: cntt.id,
    },
  });

  // Giữ thêm alias mã 7 số cũ để tương thích 100% với các bài test
  await prisma.student.createMany({
    data: [
      { studentCode: '2110001', fullName: 'Nguyễn Văn An', email: 'an.nguyen.old@edu.vn', phone: '0901234568', status: 'ACTIVE', tuitionDebt: 0, gpa: 3.45, departmentId: cntt.id },
      { studentCode: '2110002', fullName: 'Trần Thị Bình', email: 'binh.tran.old@edu.vn', phone: '0902345678', status: 'DROPPED', tuitionDebt: 0, gpa: 2.10, departmentId: ddt.id },
      { studentCode: '2110003', fullName: 'Lê Hoàng Cường', email: 'cuong.le.old@edu.vn', phone: '0903456789', status: 'ACTIVE', tuitionDebt: 15000000, gpa: 2.85, departmentId: cntt.id },
      { studentCode: '2110004', fullName: 'Phạm Văn Dũng', email: 'dung.pham.old@edu.vn', phone: '0904567890', status: 'SUSPENDED', tuitionDebt: 0, gpa: 3.10, departmentId: cntt.id },
      { studentCode: '2110005', fullName: 'Hoàng Thị Mai', email: 'mai.hoang.old@edu.vn', phone: '0905678901', status: 'ACTIVE', tuitionDebt: 0, gpa: 2.75, departmentId: ddt.id },
    ],
  });

  console.log('✅ Đã tạo sinh viên mẫu chuẩn 10 số (2280602154: Cao Hữu Nhân [Khóa 22], 2380600001: Active [Khóa 23], 2050200005: Khóa cũ quá 4 năm nợ môn, 2150200002: Thôi học, 2150200003: Nợ phí, 2280600004: Bảo lưu).');

  // 4. Tạo Tài khoản Cán bộ & Lãnh đạo
  const defaultPassword = await bcrypt.hash('123456', 10);

  await prisma.user.create({
    data: {
      username: 'staff_daotao',
      fullName: 'Thầy Trần Hữu Nghĩa (Chuyên viên PĐT)',
      email: 'nghia.tran@pdt.edu.vn',
      passwordHash: defaultPassword,
      role: 'STAFF',
    },
  });

  await prisma.user.create({
    data: {
      username: 'dean_daotao',
      fullName: 'PGS.TS Nguyễn Văn Dũng (Trưởng Phòng Đào Tạo)',
      email: 'dung.nguyen@pdt.edu.vn',
      passwordHash: defaultPassword,
      role: 'DEAN',
    },
  });

  console.log('✅ Đã tạo tài khoản Cán bộ PĐT & Trưởng phòng Đào tạo.');

  // 5. Chỉ tạo workflow duy nhất của bản chung kết
  // Giấy xác nhận sinh viên -> Cổng AUTO/HITL
  await prisma.requestType.create({
    data: {
      code: 'STUDENT_CONFIRMATION',
      name: 'Giấy Xác Nhận Sinh Viên',
      description: 'Xác nhận sinh viên để bổ sung hồ sơ, xin visa, học bổng, vay vốn, tạm hoãn nghĩa vụ quân sự...',
      requirements: {
        create: [
          {
            code: 'REQ_ID_CARD',
            name: 'Số CMND/CCCD',
            isRequired: false,
            description: 'Dữ liệu bổ sung khi biểu mẫu nghiệp vụ yêu cầu; danh tính chính lấy từ phiên đăng nhập.',
          },
          {
            code: 'REQ_ID_DATE',
            name: 'Ngày cấp CMND/CCCD',
            isRequired: false,
            description: 'Ngày cấp ghi trên thẻ CCCD.',
          },
          {
            code: 'REQ_ID_PLACE',
            name: 'Nơi cấp CMND/CCCD',
            isRequired: false,
            description: 'Cơ quan cấp (ví dụ: Cục Cảnh sát QLHC về TTXH).',
          },
          {
            code: 'REQ_PHONE',
            name: 'Điện thoại liên hệ',
            isRequired: true,
            description: 'Số điện thoại di động đang hoạt động.',
          },
          {
            code: 'REQ_PURPOSE',
            name: 'Lý do xác nhận',
            isRequired: true,
            description: 'Bổ sung hồ sơ, xin visa, học bổng, vay vốn, làm vé xe buýt...',
          },
          {
            code: 'REQ_CAMPUS',
            name: 'Chọn cơ sở nhận giấy',
            isRequired: true,
            description: 'Trụ sở chính (A-01.01) hoặc Cơ sở E (E1-01.05).',
          },
        ],
      },
      policies: {
        create: [
          {
            code: 'POL_STUDENT_ACTIVE',
            name: 'Điều kiện trạng thái học vụ',
            ruleDefinition: {
              field: 'student.status',
              operator: 'EQUALS',
              value: 'ACTIVE',
              errorMessage: 'Chỉ cấp giấy xác nhận cho sinh viên có trạng thái học tập hợp lệ (ACTIVE).',
            },
            priority: 1,
          },
        ],
      },
      authorityRules: {
        create: [
          {
            role: 'AI_AGENT',
            action: 'AUTO_APPROVE',
            condition: {
              isRoutine: true,
              maxProcessingTimeSeconds: 2,
            },
          },
        ],
      },
    },
  });

  console.log('✅ Đã nạp thành công thủ tục chuẩn:');
  console.log('   1. [STUDENT_CONFIRMATION] - Giấy Xác Nhận Sinh Viên (AUTO_APPROVE)');
  console.log('🎉 [EduRef Seed] Hoàn tất nạp dữ liệu chuẩn thành công 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
