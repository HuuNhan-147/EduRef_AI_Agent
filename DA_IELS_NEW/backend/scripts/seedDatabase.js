import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Department from '../models/Department.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Location from '../models/Location.js';
import EquipmentModel from '../models/EquipmentModel.js';
import Equipment from '../models/Equipment.js';
import SystemPolicy from '../models/SystemPolicy.js';

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected successfully!');

    // 1. Clear existing collections
    console.log('[Seed] Cleaning old master data...');
    await Department.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Location.deleteMany({});
    await EquipmentModel.deleteMany({});
    await Equipment.deleteMany({});
    await SystemPolicy.deleteMany({});

    // 2. Seed System Policies (Hackathon Core: Ngưỡng 20M & 7 Ngày)
    console.log('[Seed] Seeding System Policies...');
    await SystemPolicy.create([
      {
        ruleId: 'POL-VAL-001',
        name: 'Hạn mức giá trị tự động phê duyệt',
        category: 'VALUE_LIMIT',
        parameters: { maxValue: 20000000, maxDays: 7 },
        description: 'Thiết bị có giá trị thẩm định > 20.000.000 VNĐ bắt buộc chuyển cấp Quản lý trực tiếp phê duyệt.',
        actionOnBreach: 'ESCALATE_MANAGER'
      },
      {
        ruleId: 'POL-DUR-001',
        name: 'Hạn mức thời gian mượn tối đa',
        category: 'DURATION_LIMIT',
        parameters: { maxValue: 20000000, maxDays: 7 },
        description: 'Thời gian mượn thiết bị vượt quá 7 ngày bắt buộc chuyển cấp Quản lý trực tiếp phê duyệt.',
        actionOnBreach: 'ESCALATE_MANAGER'
      }
    ]);

    // 3. Seed Departments
    console.log('[Seed] Seeding Departments...');
    const depts = await Department.create([
      { code: 'DEPT-IT', name: 'Phòng Công nghệ Thông tin (IT)', description: 'Phụ trách hệ thống CNTT và phần mềm' },
      { code: 'DEPT-MEDIA', name: 'Ban Truyền thông & Media', description: 'Phụ trách thiết kế, quay phim, sự kiện' },
      { code: 'DEPT-RD', name: 'Viện Nghiên cứu & Phát triển (R&D)', description: 'Nghiên cứu AI và thiết bị IoT' },
      { code: 'DEPT-OPS', name: 'Phòng Vận hành & Quản lý Kho', description: 'Quản lý tài sản và cấp phát thiết bị' }
    ]);
    const itDept = depts[0];
    const mediaDept = depts[1];
    const opsDept = depts[3];

    // 4. Seed Users (4 Vai trò: Admin, Manager, Storekeeper, Employee)
    console.log('[Seed] Seeding Users with 4 Roles...');
    const users = await User.create([
      {
        staffCode: 'NV-ADM-001',
        fullName: 'Nguyễn Văn Admin (Tổng Quản Trị)',
        email: 'admin@iels.vn',
        password: 'password123',
        role: 'ADMIN',
        department: itDept._id,
        phone: '0901000001'
      },
      {
        staffCode: 'NV-MGR-001',
        fullName: 'Trần Thị Quản Lý (Trưởng phòng IT)',
        email: 'manager.it@iels.vn',
        password: 'password123',
        role: 'MANAGER',
        department: itDept._id,
        phone: '0901000002'
      },
      {
        staffCode: 'NV-MGR-002',
        fullName: 'Lê Hoàng Quản Lý (Trưởng ban Media)',
        email: 'manager.media@iels.vn',
        password: 'password123',
        role: 'MANAGER',
        department: mediaDept._id,
        phone: '0901000003'
      },
      {
        staffCode: 'NV-STR-001',
        fullName: 'Phạm Văn Thủ Kho (Kho Trung Tâm)',
        email: 'storekeeper@iels.vn',
        password: 'password123',
        role: 'STOREKEEPER',
        department: opsDept._id,
        phone: '0901000004'
      },
      {
        staffCode: 'NV-EMP-001',
        fullName: 'Hoàng Anh Nhân Viên (Kỹ sư phần mềm)',
        email: 'employee@iels.vn',
        password: 'password123',
        role: 'EMPLOYEE',
        department: itDept._id,
        phone: '0901000005'
      }
    ]);
    const storekeeperUser = users[3];

    // Update manager for departments
    await Department.findByIdAndUpdate(itDept._id, { manager: users[1]._id });
    await Department.findByIdAndUpdate(mediaDept._id, { manager: users[2]._id });

    // 5. Seed Locations
    console.log('[Seed] Seeding Locations...');
    const locations = await Location.create([
      {
        code: 'LOC-LOCKER-01',
        name: 'Tủ Thông Minh Smart Locker - Tầng 1',
        type: 'SMART_LOCKER',
        building: 'Tòa nhà Innovation',
        floor: 'Tầng 1',
        shelfSlot: 'Ngăn A01 - A10',
        keeper: storekeeperUser._id
      },
      {
        code: 'LOC-MAIN-WH',
        name: 'Kho Thiết Bị Trung Tâm',
        type: 'WAREHOUSE',
        building: 'Tòa nhà Innovation',
        floor: 'Tầng Hầm B1',
        shelfSlot: 'Kệ K1 - K5',
        keeper: storekeeperUser._id
      },
      {
        code: 'LOC-MEDIA-LAB',
        name: 'Phòng Studio & Thiết Bị Media',
        type: 'LAB',
        building: 'Tòa nhà Sáng Tạo',
        floor: 'Tầng 3',
        shelfSlot: 'Tủ Camera Pro',
        keeper: storekeeperUser._id
      }
    ]);
    const lockerLoc = locations[0];
    const mainWhLoc = locations[1];
    const mediaLabLoc = locations[2];

    // 6. Seed Categories
    console.log('[Seed] Seeding Categories...');
    const categories = await Category.create([
      { code: 'CAT-LAPTOP', name: 'Máy Tính Xách Tay (Laptop)', icon: 'Laptop', description: 'Máy tính phục vụ làm việc và công tác' },
      { code: 'CAT-MONITOR', name: 'Màn Hình Chuyên Dụng', icon: 'Monitor', description: 'Màn hình đồ họa, lập trình và hiển thị' },
      { code: 'CAT-CAMERA', name: 'Máy Ảnh & Quay Phim', icon: 'Camera', description: 'Thiết bị ghi hình, quay video sự kiện' },
      { code: 'CAT-PROJECTOR', name: 'Máy Chiếu & Hội Thảo', icon: 'Projector', description: 'Máy chiếu thuyết trình và phòng họp' },
      { code: 'CAT-ACCESSORY', name: 'Phụ Kiện CNTT', icon: 'Keyboard', description: 'Bàn phím, chuột, hub chuyển đổi, bộ đàm' }
    ]);
    const [catLap, catMon, catCam, catProj, catAcc] = categories;

    // 7. Seed Equipment Models (Phân loại rõ ràng <= 20M và > 20M để test Authority Referee)
    console.log('[Seed] Seeding Equipment Models...');
    const models = await EquipmentModel.create([
      // Dưới 20 triệu (Tự động duyệt nếu <= 7 ngày)
      {
        modelCode: 'MOD-KEY-DAREU',
        name: 'Bàn phím cơ DareU EK87 Tenkeyless',
        brand: 'DareU',
        category: catAcc._id,
        specifications: { switch: 'Red Switch', connection: 'USB-C Cable', layout: '87 Keys' },
        estimatedValue: 850000, // 850k VND (<= 20M)
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80',
        description: 'Bàn phím gõ êm, phù hợp lập trình viên gõ code'
      },
      {
        modelCode: 'MOD-MON-DELL27',
        name: 'Màn hình Dell UltraSharp U2723QE 4K',
        brand: 'Dell',
        category: catMon._id,
        specifications: { size: '27 inch', resolution: '4K UHD IPS', color: '100% sRGB, 98% DCI-P3' },
        estimatedValue: 12500000, // 12.5M VND (<= 20M)
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80',
        description: 'Màn hình hiển thị chuẩn màu cho đồ họa và code'
      },
      {
        modelCode: 'MOD-PROJ-PANA',
        name: 'Máy chiếu Panasonic PT-VMZ51',
        brand: 'Panasonic',
        category: catProj._id,
        specifications: { brightness: '5200 Lumens', resolution: 'WUXGA Laser' },
        estimatedValue: 18000000, // 18M VND (<= 20M)
        imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&q=80',
        description: 'Máy chiếu hội thảo và demo dự án khách hàng'
      },
      {
        modelCode: 'MOD-RADIO-MOTO',
        name: 'Bộ đàm Motorola CP1300',
        brand: 'Motorola',
        category: catAcc._id,
        specifications: { range: '3-5 km', channels: '16 Channels', battery: 'Li-ion 1750mAh' },
        estimatedValue: 2500000, // 2.5M VND (<= 20M)
        imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&q=80',
        description: 'Bộ đàm điều phối sự kiện và công tác dã ngoại'
      },
      {
        modelCode: 'MOD-MIC-RODE',
        name: 'Micro thu âm không dây Rode Wireless GO II',
        brand: 'Rode',
        category: catAcc._id,
        specifications: { range: '200m line-of-sight', battery: '7 hours Li-ion', channels: 'Dual Channel' },
        estimatedValue: 7500000, // 7.5M VND (<= 20M)
        imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&q=80',
        description: 'Micro thu âm cài áo chuyên nghiệp phục vụ hội thảo và phỏng vấn'
      },

      // Trên 20 triệu (Bắt buộc chuyển cấp Quản lý dù chỉ mượn 1 ngày)
      {
        modelCode: 'MOD-LAP-MACM3',
        name: 'MacBook Pro 16 inch M3 Max (36GB/1TB)',
        brand: 'Apple',
        category: catLap._id,
        specifications: { chip: 'Apple M3 Max 14-core', ram: '36GB Unified', storage: '1TB SSD' },
        estimatedValue: 45000000, // 45M VND (> 20M -> ESCALATE)
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
        description: 'Laptop đồ họa và huấn luyện mô hình AI nặng'
      },
      {
        modelCode: 'MOD-CAM-SONYFX3',
        name: 'Máy quay chuyên nghiệp Sony Cinema Line FX3',
        brand: 'Sony',
        category: catCam._id,
        specifications: { sensor: 'Full-frame 12.1MP', video: '4K 120fps 10-bit 4:2:2', iso: '80-409600' },
        estimatedValue: 85000000, // 85M VND (> 20M -> ESCALATE)
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80',
        description: 'Thiết bị quay phim quảng cáo và tư liệu cao cấp'
      }
    ]);

    // 8. Seed Physical Equipments (Items cá thể với Serial/QR)
    console.log('[Seed] Seeding Physical Equipment Items...');
    const [mDareu, mDell, mPana, mMoto, mRode, mMac, mSony] = models;

    await Equipment.create([
      // 3 Bàn phím DareU
      { model: mDareu._id, assetCode: 'TB-KEY-001', serialNumber: 'SN-DU-88101', condition: 'GOOD', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 850000 },
      { model: mDareu._id, assetCode: 'TB-KEY-002', serialNumber: 'SN-DU-88102', condition: 'NEW', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 850000 },
      { model: mDareu._id, assetCode: 'TB-KEY-003', serialNumber: 'SN-DU-88103', condition: 'GOOD', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 850000 },

      // 2 Màn hình Dell UltraSharp
      { model: mDell._id, assetCode: 'TB-MON-001', serialNumber: 'SN-DELL-44201', condition: 'EXCELLENT', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 12500000 },
      { model: mDell._id, assetCode: 'TB-MON-002', serialNumber: 'SN-DELL-44202', condition: 'GOOD', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 12500000 },

      // 2 Máy chiếu Panasonic
      { model: mPana._id, assetCode: 'TB-PRJ-001', serialNumber: 'SN-PANA-99301', condition: 'GOOD', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 18000000 },
      { model: mPana._id, assetCode: 'TB-PRJ-002', serialNumber: 'SN-PANA-99302', condition: 'GOOD', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 18000000 },

      // 3 Bộ đàm Motorola
      { model: mMoto._id, assetCode: 'TB-RAD-001', serialNumber: 'SN-MOTO-11201', condition: 'GOOD', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 2500000 },
      { model: mMoto._id, assetCode: 'TB-RAD-002', serialNumber: 'SN-MOTO-11202', condition: 'GOOD', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 2500000 },
      { model: mMoto._id, assetCode: 'TB-RAD-003', serialNumber: 'SN-MOTO-11203', condition: 'GOOD', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 2500000 },

      // 2 Micro Rode Wireless GO II (<= 20M)
      { model: mRode._id, assetCode: 'TB-MIC-001', serialNumber: 'SN-RODE-77101', condition: 'EXCELLENT', status: 'AVAILABLE', location: lockerLoc._id, actualValue: 7500000 },
      { model: mRode._id, assetCode: 'TB-MIC-002', serialNumber: 'SN-RODE-77102', condition: 'GOOD', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 7500000 },

      // 2 MacBook Pro M3 Max (>20M)
      { model: mMac._id, assetCode: 'TB-LAP-001', serialNumber: 'SN-APL-M3M-001', condition: 'NEW', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 45000000 },
      { model: mMac._id, assetCode: 'TB-LAP-002', serialNumber: 'SN-APL-M3M-002', condition: 'EXCELLENT', status: 'AVAILABLE', location: mainWhLoc._id, actualValue: 45000000 },

      // 1 Máy quay Sony FX3 (>20M)
      { model: mSony._id, assetCode: 'TB-CAM-001', serialNumber: 'SN-SNY-FX3-001', condition: 'EXCELLENT', status: 'AVAILABLE', location: mediaLabLoc._id, actualValue: 85000000 }
    ]);

    console.log('---------------------------------------------------------');
    console.log('✅ [Seed] DỮ LIỆU MẪU ENTERPRISE IELS ĐÃ ĐƯỢC NẠP THÀNH CÔNG!');
    console.log('👥 Tài khoản kiểm thử:');
    console.log('   - Admin:       admin@iels.vn / password123');
    console.log('   - Manager IT:  manager.it@iels.vn / password123');
    console.log('   - Storekeeper: storekeeper@iels.vn / password123');
    console.log('   - Employee:    employee@iels.vn / password123');
    console.log('📦 Thiết bị kiểm thử thẩm quyền:');
    console.log('   - TB-KEY-001: Bàn phím cơ DareU (850k)   <= 20M  -> Tự động duyệt');
    console.log('   - TB-MON-001: Dell UltraSharp 27" (12.5M) <= 20M  -> Tự động duyệt');
    console.log('   - TB-LAP-001: MacBook Pro M3 Max (45M)    > 20M   -> CHUYỂN CẤP QUẢN LÝ');
    console.log('   - TB-CAM-001: Sony FX3 Cinema (85M)       > 20M   -> CHUYỂN CẤP QUẢN LÝ');
    console.log('---------------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed] Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
