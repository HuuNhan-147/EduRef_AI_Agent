// backend/modules/ai-agent/tools/actions/equipmentTools.js
import EquipmentModel from "../../../../models/EquipmentModel.js";
import Equipment from "../../../../models/Equipment.js";
import Category from "../../../../models/Category.js";

const STOP_WORDS = [
  "thiết bị", "thiet bi", "máy móc", "may moc", "sản phẩm", "san pham",
  "đồ", "do", "kho", "con", "cái", "cai", "chiếc", "chiec", "những", "nhung", "các", "cac"
];

function cleanSearchKeyword(rawKeyword) {
  if (!rawKeyword || typeof rawKeyword !== "string") return "";
  let cleaned = rawKeyword.trim().toLowerCase();

  for (const sw of STOP_WORDS) {
    const reg = new RegExp(`(^|\\s)${sw}(\\s|$)`, "gi");
    cleaned = cleaned.replace(reg, " ").trim();
  }
  return cleaned;
}

function removeVietnameseTones(str) {
  if (!str) return "";
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  return str;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeAccentInsensitiveRegex(text) {
  if (!text) return "";
  const map = {
    a: "[aàáạảãâầấậẩẫăằắặẳẵ]",
    e: "[eèéẹẻẽêềếệểễ]",
    i: "[iìíịỉĩ]",
    o: "[oòóọỏõôồốộổỗơờớợởỡ]",
    u: "[uùúụủũưừứựửữ]",
    y: "[yỳýỵỷỹ]",
    d: "[dđ]",
  };
  const unaccented = removeVietnameseTones(text).toLowerCase();
  let pattern = "";
  for (let char of unaccented) {
    pattern += map[char] || escapeRegExp(char);
  }
  return pattern;
}

export async function searchEquipment({
  keyword = "",
  category = "",
  minPrice = 0,
  maxPrice = 0,
  isHighValue = null,
  limit = 10,
}) {
  try {
    let query = {};
    const cleanedKeyword = cleanSearchKeyword(keyword);
    const regexPattern = makeAccentInsensitiveRegex(cleanedKeyword);

    // 1. Lọc theo từ khóa (Không phân biệt hoa thường và không phân biệt dấu)
    if (regexPattern) {
      query.$or = [
        { name: { $regex: regexPattern, $options: "i" } },
        { brand: { $regex: regexPattern, $options: "i" } },
        { modelCode: { $regex: regexPattern, $options: "i" } },
        { description: { $regex: regexPattern, $options: "i" } },
      ];
    }

    // 2. Lọc theo danh mục (Category)
    if (category && category.trim()) {
      const cleanCat = category.trim();
      const catPattern = makeAccentInsensitiveRegex(cleanCat);
      const matchedCats = await Category.find({
        $or: [
          { name: { $regex: catPattern, $options: "i" } },
          { code: { $regex: catPattern, $options: "i" } },
          { description: { $regex: catPattern, $options: "i" } },
        ],
      }).lean();

      if (matchedCats.length > 0) {
        const catIds = matchedCats.map((c) => c._id);
        query.category = { $in: catIds };
      } else {
        // Nếu không khớp bảng Category, mở rộng tìm kiếm trong tên thiết bị
        if (!query.$or) query.$or = [];
        query.$or.push({ name: { $regex: catPattern, $options: "i" } });
      }
    }

    // 3. Lọc theo khoảng giá (minPrice, maxPrice, isHighValue)
    let priceConditions = {};

    if (isHighValue === true) {
      priceConditions.$gt = 20000000;
    } else if (isHighValue === false) {
      priceConditions.$lte = 20000000;
    }

    if (minPrice && Number(minPrice) > 0) {
      priceConditions.$gte = Number(minPrice);
    }
    if (maxPrice && Number(maxPrice) > 0) {
      priceConditions.$lte = Number(maxPrice);
    }

    if (Object.keys(priceConditions).length > 0) {
      query.estimatedValue = priceConditions;
    }

    // 4. Thực thi truy vấn với populate category
    const models = await EquipmentModel.find(query)
      .populate("category")
      .limit(Number(limit) || 10)
      .lean();

    // 5. Tính toán tồn kho thực tế cho từng mẫu thiết bị
    const results = await Promise.all(
      models.map(async (m) => {
        const total = await Equipment.countDocuments({ model: m._id, status: { $ne: "DISPOSED" } });
        const available = await Equipment.countDocuments({ model: m._id, status: "AVAILABLE" });
        return {
          id: m._id,
          modelCode: m.modelCode,
          name: m.name,
          brand: m.brand,
          category: m.category?.name || "Thiết bị",
          estimatedValue: m.estimatedValue,
          formattedValue: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
            m.estimatedValue || 0
          ),
          availableStock: available,
          totalStock: total,
          isHighValue: (m.estimatedValue || 0) > 20000000,
          description: m.description,
          imageUrl: m.imageUrl,
          specifications: m.specifications,
        };
      })
    );

    return {
      success: true,
      count: results.length,
      data: results,
      equipments: results,
      filterApplied: {
        keyword: cleanedKeyword || keyword,
        category: category || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        isHighValue,
      },
      message:
        results.length > 0
          ? `Tìm thấy ${results.length} thiết bị phù hợp trong kho.`
          : `Không tìm thấy thiết bị nào khớp với yêu cầu tìm kiếm.`,
    };
  } catch (error) {
    console.error("❌ [searchEquipment] Error:", error);
    return { success: false, error: error.message, equipments: [], data: [] };
  }
}


export async function getEquipmentDetail({ modelId }) {
  try {
    const model = await EquipmentModel.findById(modelId).populate("category").lean();
    if (!model) {
      return { success: false, message: "Không tìm thấy thiết bị yêu cầu." };
    }

    const available = await Equipment.countDocuments({ model: modelId, status: "AVAILABLE" });
    const total = await Equipment.countDocuments({ model: modelId, status: { $ne: "DISPOSED" } });

    return {
      success: true,
      equipment: {
        id: model._id,
        modelCode: model.modelCode,
        name: model.name,
        brand: model.brand,
        category: model.category?.name,
        estimatedValue: model.estimatedValue,
        formattedValue: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(model.estimatedValue),
        availableStock: available,
        totalStock: total,
        isHighValue: model.estimatedValue > 20000000,
        specifications: model.specifications,
        description: model.description,
        imageUrl: model.imageUrl,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
