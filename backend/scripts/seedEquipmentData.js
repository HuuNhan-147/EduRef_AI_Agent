import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Equipment from "../models/EquipmentModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config(); // fallback root

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/equipment_agent";

export const SAMPLE_EQUIPMENT = [
  // ========================================================
  // NHÓM 1: THIẾT BỊ PHỔ THÔNG & VĂN PHÒNG PHẨM (THƯỜNG QUY <= 20M)
  // ========================================================
  {
    assetCode: "TB-MOU-001",
    name: "Chuột quang không dây Logitech B175",
    value: 300000,
    countInStock: 25,
    location: "Kệ A1 - Tủ Phụ Kiện IT",
    categoryName: "Văn phòng phẩm & Phụ kiện",
    description: "Chuột quang không dây 2.4GHz, độ phân giải 1000 DPI, pin AA dùng 12 tháng.",
    specifications: [
      { name: "Kết nối", value: "Wireless 2.4GHz USB Receiver" },
      { name: "Độ phân giải", value: "1000 DPI" },
    ],
    image: "/images/equipment/mouse-logitech.png",
  },
  {
    assetCode: "TB-CAB-001",
    name: "Cáp chuyển tín hiệu HDMI 5m Ugreen",
    value: 150000,
    countInStock: 30,
    location: "Kệ A2 - Tủ Cáp Nối Lab",
    categoryName: "Văn phòng phẩm & Phụ kiện",
    description: "Cáp HDMI 2.0 bọc dù chống đứt, hỗ trợ 4K 60Hz, dài 5 mét phục vụ giảng dạy.",
    specifications: [
      { name: "Độ dài", value: "5 mét" },
      { name: "Băng thông", value: "18 Gbps (4K 60Hz)" },
    ],
    image: "/images/equipment/hdmi-cable.png",
  },
  {
    assetCode: "TB-MIC-001",
    name: "Bộ Micro không dây trợ giảng Shure SM58",
    value: 1200000,
    countInStock: 8,
    location: "Tủ B1 - Thiết Bị Âm Thanh",
    categoryName: "Thiết bị âm thanh",
    description: "Bộ 2 tay mic không dây bắt sóng UHF xa 50m, chống hú tốt cho giảng đường.",
    specifications: [
      { name: "Dải tần", value: "UHF 600MHz - 800MHz" },
      { name: "Thời lượng pin", value: "8 giờ liên tục" },
    ],
    image: "/images/equipment/mic-shure.png",
  },
  {
    assetCode: "TB-PEN-001",
    name: "Bút trình chiếu Laser Logitech R400",
    value: 450000,
    countInStock: 15,
    location: "Kệ A1 - Tủ Phụ Kiện IT",
    categoryName: "Văn phòng phẩm & Phụ kiện",
    description: "Bút trình chiếu slide PowerPoint tia laser đỏ, khoảng cách điều khiển 15m.",
    specifications: [
      { name: "Khoảng cách", value: "15 mét" },
      { name: "Tia laser", value: "Laser đỏ Class 2" },
    ],
    image: "/images/equipment/pointer-r400.png",
  },
  {
    assetCode: "TB-KEY-001",
    name: "Bàn phím cơ DareU EK87",
    value: 650000,
    countInStock: 14,
    location: "Kệ A3 - Bàn Phím Dự Phòng",
    categoryName: "Văn phòng phẩm & Phụ kiện",
    description: "Bàn phím cơ Tenkeyless 87 phím, D-Switch độ bền 50 triệu lần bấm.",
    specifications: [
      { name: "Layout", value: "87 phím (TKL)" },
      { name: "Switch", value: "Brown Switch" },
    ],
    image: "/images/equipment/keyboard-dareu.png",
  },
  {
    assetCode: "TB-CAB-002",
    name: "Cáp chuyển đa năng USB Type-C sang HDMI/VGA",
    value: 350000,
    countInStock: 20,
    location: "Kệ A2 - Tủ Cáp Nối Lab",
    categoryName: "Văn phòng phẩm & Phụ kiện",
    description: "Hub chuyển đổi nhôm nguyên khối, xuất hình ảnh 4K cho Macbook và laptop Type-C.",
    specifications: [
      { name: "Cổng vào", value: "Type-C" },
      { name: "Cổng ra", value: "HDMI 4K, VGA, USB 3.0" },
    ],
    image: "/images/equipment/typec-hub.png",
  },
  {
    assetCode: "TB-KIT-001",
    name: "Bộ Kit thực hành vi điều khiển Arduino Mega 2560",
    value: 1800000,
    countInStock: 10,
    location: "Tủ Lab IoT 402",
    categoryName: "Bộ kit thực hành thí nghiệm",
    description: "Bộ kit bao gồm bo mạch Mega 2560, màn hình LCD, cảm biến nhiệt độ, servo và module IoT.",
    specifications: [
      { name: "Vi điều khiển", value: "ATmega2560" },
      { name: "Số module đi kèm", value: "37 cảm biến" },
    ],
    image: "/images/equipment/arduino-kit.png",
  },
  {
    assetCode: "TB-PRI-001",
    name: "Máy in Laser đa năng HP LaserJet Pro M404dn",
    value: 6500000,
    countInStock: 4,
    location: "Phòng IT Helpdesk Tầng 1",
    categoryName: "Thiết bị văn phòng",
    description: "Máy in hai mặt tự động qua mạng LAN, tốc độ in 38 trang/phút.",
    specifications: [
      { name: "Tốc độ in", value: "38 ppm" },
      { name: "Độ phân giải", value: "1200 x 1200 dpi" },
    ],
    image: "/images/equipment/hp-printer.png",
  },
  {
    assetCode: "TB-MON-001",
    name: "Màn hình đồ họa 27 inch Dell UltraSharp U2724D",
    value: 11500000,
    countInStock: 6,
    location: "Lab Đồ Họa Đa Phương Tiện",
    categoryName: "Màn hình & Hiển thị",
    description: "Màn hình 2K IPS Black 120Hz chuẩn màu 100% sRGB và 98% DCI-P3.",
    specifications: [
      { name: "Kích thước", value: "27 inch 2K QHD" },
      { name: "Tấm nền", value: "IPS Black 120Hz" },
    ],
    image: "/images/equipment/dell-ultrasharp.png",
  },
  {
    assetCode: "TB-PROJ-001",
    name: "Máy chiếu hội trường Epson EB-2250U",
    value: 18000000,
    countInStock: 3,
    location: "Tủ C1 - Máy Chiếu Hội Trường",
    categoryName: "Màn hình & Hiển thị",
    description: "Máy chiếu độ sáng cao 5.000 Ansi Lumens, độ phân giải Full HD WUXGA.",
    specifications: [
      { name: "Độ sáng", value: "5000 Ansi Lumens" },
      { name: "Độ phân giải", value: "WUXGA 1920x1200" },
    ],
    image: "/images/equipment/epson-projector.png",
  },

  // ========================================================
  // CA KIỂM THỬ BIÊN 1: ĐÚNG 20.000.000 VNĐ (VẪN ĐƯỢC TỰ ĐỘNG DUYỆT NẾU <= 7 NGÀY)
  // ========================================================
  {
    assetCode: "TB-PROJ-020M",
    name: "Máy chiếu Sony VPL-EX575 (Mốc 20M Chuẩn)",
    value: 20000000, // Đúng 20M: test boundary (không được vượt quyền vì threshold là > 20M)
    countInStock: 2,
    location: "Tủ C2 - Phòng Họp Hiệu Bộ",
    categoryName: "Màn hình & Hiển thị",
    description: "Máy chiếu phòng họp công suất lớn 4.200 Ansi Lumens trị giá đúng 20 triệu đồng.",
    specifications: [
      { name: "Độ sáng", value: "4200 Ansi Lumens" },
      { name: "Ngưỡng thẩm quyền", value: "Đúng 20.000.000 VNĐ" },
    ],
    image: "/images/equipment/sony-projector.png",
  },

  // ========================================================
  // CA KIỂM THỬ BIÊN 2: 20.000.001 VNĐ (VƯỢT THẨM QUYỀN HIGH_AUTHORITY_REQUIRED)
  // ========================================================
  {
    assetCode: "TB-LAP-020M1",
    name: "Laptop kỹ thuật Dell XPS 15 (Mốc 20M+1đ)",
    value: 20000001, // 20.000.001 VNĐ: test boundary kích hoạt HIGH_AUTHORITY_REQUIRED
    countInStock: 3,
    location: "Tủ D1 - Thiết Bị Điện Tử Đặc Biệt",
    categoryName: "Máy tính & Thiết bị xách tay",
    description: "Laptop đồ họa cấu hình Core i7, RAM 16GB, định giá thẩm định 20.000.001 VNĐ.",
    specifications: [
      { name: "CPU", value: "Intel Core i7-13700H" },
      { name: "Ngưỡng thẩm quyền", value: "20.000.001 VNĐ (> 20M)" },
    ],
    image: "/images/equipment/dell-xps.png",
  },

  // ========================================================
  // NHÓM TÀI SẢN GIÁ TRỊ CAO (> 20M - HIGH_AUTHORITY_REQUIRED)
  // ========================================================
  {
    assetCode: "TB-FLY-001",
    name: "Flycam ghi hình DJI Mini 4 Pro Fly More",
    value: 25000000,
    countInStock: 2,
    location: "Tủ D2 - Thiết Bị Bay Khảo Sát",
    categoryName: "Thiết bị ghi hình & Flycam",
    description: "Flycam cảm biến đa hướng, quay 4K HDR dọc, thời gian bay 34 phút.",
    specifications: [
      { name: "Trọng lượng", value: "< 249 gram" },
      { name: "Độ phân giải", value: "4K 60fps HDR" },
    ],
    image: "/images/equipment/dji-mini4.png",
  },
  {
    assetCode: "TB-CAM-001",
    name: "Máy quay điện ảnh 4K Sony A7IV",
    value: 50000000,
    countInStock: 2,
    location: "Tủ Studio Truyền Thông Tầng 5",
    categoryName: "Thiết bị ghi hình & Flycam",
    description: "Máy ảnh/quay phim Full-frame 33MP, quay 4K 60p 10-bit 4:2:2, chống rung 5.5 stop.",
    specifications: [
      { name: "Cảm biến", value: "33MP Full-Frame Exmor R" },
      { name: "Quay phim", value: "4K 60p 10-bit All-Intra" },
    ],
    image: "/images/equipment/sony-a7iv.png",
  },
  {
    assetCode: "TB-XR-001",
    name: "Kính thực tế hỗn hợp Apple Vision Pro",
    value: 85000000,
    countInStock: 1,
    location: "Lab Nghiên Cứu AI & XR",
    categoryName: "Thiết bị công nghệ cao",
    description: "Kính Spatial Computing màn hình Micro-OLED 23 triệu điểm ảnh, chip kép M2 và R1.",
    specifications: [
      { name: "Màn hình", value: "Dual Micro-OLED 4K/mắt" },
      { name: "Hệ điều hành", value: "visionOS" },
    ],
    image: "/images/equipment/vision-pro.png",
  },

  // ========================================================
  // CA KIỂM THỬ HẾT HÀNG (STOCK = 0)
  // ========================================================
  {
    assetCode: "TB-FLY-OUT",
    name: "Flycam DJI Mavic 3 Pro Cine (Tạm Hết)",
    value: 90000000,
    countInStock: 0, // Hết hàng trong kho
    location: "Tủ Studio Truyền Thông",
    categoryName: "Thiết bị ghi hình & Flycam",
    description: "Flycam 3 camera Hasselblad, hiện toàn bộ đã được cấp phát cho dự án truyền thông.",
    specifications: [
      { name: "Tình trạng", value: "Tồn kho: 0 (Đã cấp hết)" },
    ],
    image: "/images/equipment/mavic-3.png",
  },
];

export async function seedEquipments() {
  console.log("=================================================");
  console.log("🌱 BẮT ĐẦU NẠP DỮ LIỆU HẠT GIỐNG THIẾT BỊ (EQUIPMENT)");
  console.log("=================================================");
  console.log(`Connecting to MongoDB: ${MONGO_URI.replace(/\/\/.*@/, "//<auth>@")}`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Đã kết nối MongoDB thành công.");

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of SAMPLE_EQUIPMENT) {
      const isHighValue = item.value > 20000000;
      const res = await Equipment.findOneAndUpdate(
        { assetCode: item.assetCode },
        {
          $set: {
            ...item,
            isHighValue,
            status: "AVAILABLE",
          },
        },
        { upsert: true, new: true, rawResult: true }
      );

      if (res.lastErrorObject && res.lastErrorObject.updatedExisting) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    }

    const totalInDb = await Equipment.countDocuments();
    console.log(`\n🎉 Nạp dữ liệu hoàn tất!`);
    console.log(`- Thiết bị tạo mới: ${insertedCount}`);
    console.log(`- Thiết bị cập nhật: ${updatedCount}`);
    console.log(`- Tổng số thiết bị trong kho: ${totalInDb}`);

    const sampleHigh = await Equipment.find({ isHighValue: true }).select("name value assetCode");
    console.log(`\n🔒 Danh sách tài sản giá trị cao (> 20 triệu VND):`);
    sampleHigh.forEach((e) => {
      console.log(`  • [${e.assetCode}] ${e.name} — ${e.value.toLocaleString("vi-VN")} VNĐ`);
    });

    const boundary20m = await Equipment.findOne({ assetCode: "TB-PROJ-020M" });
    const boundary20m1 = await Equipment.findOne({ assetCode: "TB-LAP-020M1" });
    console.log(`\n⚖️ Kiểm tra ca biên thẩm quyền:`);
    console.log(`  • [${boundary20m?.assetCode}] ${boundary20m?.value.toLocaleString("vi-VN")} VNĐ -> isHighValue: ${boundary20m?.isHighValue} (Mong đợi: false)`);
    console.log(`  • [${boundary20m1?.assetCode}] ${boundary20m1?.value.toLocaleString("vi-VN")} VNĐ -> isHighValue: ${boundary20m1?.isHighValue} (Mong đợi: true)`);

    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối MongoDB an toàn.");
    return { success: true, total: totalInDb };
  } catch (error) {
    console.error("❌ Lỗi khi nạp dữ liệu hạt giống:", error);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    throw error;
  }
}

// Chạy trực tiếp nếu script được gọi bằng node
if (process.argv[1] && process.argv[1].endsWith("seedEquipmentData.js")) {
  seedEquipments()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
