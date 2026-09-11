import Equipment from "../models/EquipmentModel.js";
import Category from "../models/CategoryModel.js";

/**
 * Lấy toàn bộ danh sách thiết bị có phân loại & sắp xếp
 */
export const getAllEquipments = async (filter = {}) => {
  const query = { status: { $ne: "DECOMMISSIONED" }, ...filter };
  return await Equipment.find(query)
    .populate("category", "name")
    .sort({ value: -1, createdAt: -1 });
};

/**
 * Lấy chi tiết thiết bị theo ID hoặc AssetCode
 */
export const getEquipmentById = async (id) => {
  let equipment;
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    equipment = await Equipment.findById(id).populate("category", "name");
  } else {
    equipment = await Equipment.findOne({ assetCode: id.toUpperCase() }).populate("category", "name");
  }

  if (!equipment) {
    throw new Error("Thiết bị không tồn tại trong hệ thống kho!");
  }
  return equipment;
};

/**
 * Tìm kiếm thiết bị theo từ khóa (tên, mã tài sản, mô tả)
 */
export const searchEquipment = async (keyword, categoryName = null, minValue = null, maxValue = null) => {
  const query = { status: "AVAILABLE" };

  if (keyword && keyword.trim()) {
    const cleanKw = keyword.trim();
    query.$or = [
      { name: { $regex: cleanKw, $options: "i" } },
      { assetCode: { $regex: cleanKw, $options: "i" } },
      { description: { $regex: cleanKw, $options: "i" } },
      { categoryName: { $regex: cleanKw, $options: "i" } },
    ];
  }

  if (categoryName) {
    query.categoryName = { $regex: categoryName, $options: "i" };
  }

  if (minValue !== null || maxValue !== null) {
    query.value = {};
    if (minValue !== null) query.value.$gte = Number(minValue);
    if (maxValue !== null) query.value.$lte = Number(maxValue);
  }

  return await Equipment.find(query).limit(10).sort({ countInStock: -1, value: 1 });
};

/**
 * Kiểm tra tính khả dụng thực tế của thiết bị trong kho
 */
export const checkAvailability = async (equipmentId, requestedQuantity = 1) => {
  const equipment = await getEquipmentById(equipmentId);

  const available = equipment.status === "AVAILABLE" && equipment.countInStock >= requestedQuantity;

  return {
    equipmentId: equipment._id,
    assetCode: equipment.assetCode,
    name: equipment.name,
    value: equipment.value,
    countInStock: equipment.countInStock,
    location: equipment.location,
    isHighValue: equipment.value > 20000000,
    requestedQuantity,
    available,
    status: equipment.status,
    message: available
      ? `Thiết bị sẵn sàng trong kho (Còn ${equipment.countInStock} tại ${equipment.location})`
      : `Thiết bị không đủ số lượng hoặc đang bảo trì (Hiện còn ${equipment.countInStock})`,
  };
};

/**
 * Tạo hoặc cập nhật thiết bị (Seed / Admin)
 */
export const upsertEquipment = async (data) => {
  const { assetCode, name, value, countInStock, location, categoryName, description, specifications, image } = data;

  const isHighValue = Number(value) > 20000000;

  return await Equipment.findOneAndUpdate(
    { assetCode: assetCode.toUpperCase() },
    {
      $set: {
        name,
        value: Number(value),
        countInStock: Number(countInStock),
        location: location || "Kho Thiết bị Trung tâm",
        categoryName: categoryName || "Thiết bị chung",
        description: description || "",
        specifications: specifications || [],
        image: image || "",
        isHighValue,
        status: "AVAILABLE",
      },
    },
    { upsert: true, new: true }
  );
};
