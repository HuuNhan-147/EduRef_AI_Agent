// backend/modules/ai-agent/tools/actions/equipmentTools.js
import EquipmentModel from "../../../../models/EquipmentModel.js";
import Equipment from "../../../../models/Equipment.js";
import Category from "../../../../models/Category.js";

const STOP_WORDS = [
  "thiết bị", "thiet bi", "máy móc", "may moc", "sản phẩm", "san pham",
  "đồ", "do", "kho", "con", "cái", "cai", "chiếc", "chiec", "những", "nhung", "các", "cac",
  "có", "không", "ko", "k", "bạn", "cho", "mượn", "cần", "còn", "nào", "hộ", "giúp", "với", "ơi", "đi", "nhé", "nhe", "ạ", "a"
];

function cleanSearchKeyword(rawKeyword) {
  if (!rawKeyword || typeof rawKeyword !== "string") return "";
  let cleaned = rawKeyword.trim().toLowerCase();

  // Sắp xếp stop words từ dài nhất đến ngắn nhất để tránh xóa đè
  const sortedStopWords = [...STOP_WORDS].sort((a, b) => b.length - a.length);
  for (const sw of sortedStopWords) {
    const reg = new RegExp(`(^|\\s|[.,?!])${escapeRegExp(sw)}(\\s|[.,?!]|$)`, "gi");
    cleaned = cleaned.replace(reg, " ").trim();
  }
  return cleaned.replace(/\s+/g, " ").trim();
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
    const cleanedKeyword = cleanSearchKeyword(keyword) || keyword.trim();
    const regexPattern = makeAccentInsensitiveRegex(cleanedKeyword);

    // 1. Lọc theo khoảng giá (minPrice, maxPrice, isHighValue)
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

    // Hàm phụ trợ tạo query an toàn
    const buildMongoQuery = (regex, catIds = null) => {
      const q = {};
      if (regex) {
        q.$or = [
          { name: { $regex: regex, $options: "i" } },
          { brand: { $regex: regex, $options: "i" } },
          { modelCode: { $regex: regex, $options: "i" } },
          { description: { $regex: regex, $options: "i" } },
        ];
      }
      if (catIds && catIds.length > 0) {
        q.category = { $in: catIds };
      }
      if (Object.keys(priceConditions).length > 0) {
        q.estimatedValue = priceConditions;
      }
      return q;
    };

    // 2. Tìm Category tương ứng nếu có
    let matchedCatIds = null;
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
        matchedCatIds = matchedCats.map((c) => c._id);
      }
    }

    // 3. Thực thi truy vấn chính
    let query = buildMongoQuery(regexPattern, matchedCatIds);
    let models = await EquipmentModel.find(query)
      .populate("category")
      .limit(Number(limit) || 10)
      .lean();

    // 4. Smart Fallback (Kế thừa mô hình DA_IELS_OLD):
    // Nếu có lọc Category nhưng không có kết quả, tự động nới lỏng bỏ category để tìm lại theo keyword
    if (models.length === 0 && matchedCatIds && regexPattern) {
      console.log(`⚠️ [searchEquipment] Không tìm thấy kết quả với category, tự động fallback tìm theo keyword: "${cleanedKeyword}"`);
      const fallbackQuery = buildMongoQuery(regexPattern, null);
      models = await EquipmentModel.find(fallbackQuery)
        .populate("category")
        .limit(Number(limit) || 10)
        .lean();
    }

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
