import EquipmentModel from '../models/EquipmentModel.js';
import Equipment from '../models/Equipment.js';
import Category from '../models/Category.js';
import Location from '../models/Location.js';

// 1. Thống kê tổng quan kho thiết bị
export const getEquipmentStats = async (req, res) => {
  try {
    const totalModels = await EquipmentModel.countDocuments();
    const totalItems = await Equipment.countDocuments();
    const availableItems = await Equipment.countDocuments({ status: 'AVAILABLE' });
    const borrowedItems = await Equipment.countDocuments({ status: 'BORROWED' });
    const maintenanceItems = await Equipment.countDocuments({ status: 'UNDER_MAINTENANCE' });

    res.json({
      success: true,
      stats: {
        totalModels,
        totalItems,
        availableItems,
        borrowedItems,
        maintenanceItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Lấy danh mục thiết bị (Catalog Models kèm số lượng tồn khả dụng)
export const getEquipmentCatalog = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category && category !== 'ALL') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { modelCode: { $regex: search, $options: 'i' } }
      ];
    }

    const models = await EquipmentModel.find(query).populate('category').lean();

    // Tính toán số lượng máy khả dụng theo từng model
    const catalogWithStock = await Promise.all(
      models.map(async (item) => {
        const totalItems = await Equipment.countDocuments({ model: item._id });
        const availableItems = await Equipment.countDocuments({ model: item._id, status: 'AVAILABLE' });
        const firstPhysicalItem = await Equipment.findOne({ model: item._id });
        return {
          ...item,
          totalStock: totalItems,
          availableStock: availableItems,
          sampleCondition: firstPhysicalItem ? firstPhysicalItem.condition : 'GOOD'
        };
      })
    );

    res.json({ success: true, count: catalogWithStock.length, data: catalogWithStock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Lấy chi tiết các máy cá thể của 1 model
export const getPhysicalItemsByModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    const items = await Equipment.find({ model: modelId })
      .populate('location')
      .populate('model');
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Lấy danh sách danh mục & địa điểm
export const getMasterData = async (req, res) => {
  try {
    const categories = await Category.find();
    const locations = await Location.find();
    res.json({ success: true, categories, locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. [CRUD] Thêm mẫu thiết bị mới kèm tự động tạo các máy cá thể
export const createEquipmentModel = async (req, res) => {
  try {
    const { modelCode, name, brand, categoryId, estimatedValue, imageUrl, description, initialQuantity, locationId } = req.body;

    if (!modelCode || !name || !brand || !categoryId || !estimatedValue) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
    }

    const existing = await EquipmentModel.findOne({ modelCode: modelCode.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã thiết bị ${modelCode} đã tồn tại trong hệ thống` });
    }

    const newModel = await EquipmentModel.create({
      modelCode: modelCode.trim().toUpperCase(),
      name: name.trim(),
      brand: brand.trim(),
      category: categoryId,
      estimatedValue: Number(estimatedValue),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80',
      description: description || ''
    });

    // Tạo các máy cá thể ban đầu nếu có số lượng
    const qty = Math.max(1, Number(initialQuantity) || 1);
    const locId = locationId || (await Location.findOne())?._id;

    for (let i = 1; i <= qty; i++) {
      const assetCode = `EQ-${modelCode.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toUpperCase()}-${String(i).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
      const serialNumber = `SN-${Date.now().toString().slice(-6)}-${i}`;
      await Equipment.create({
        model: newModel._id,
        assetCode,
        serialNumber,
        condition: 'NEW',
        status: 'AVAILABLE',
        location: locId,
        actualValue: Number(estimatedValue)
      });
    }

    res.status(201).json({ success: true, message: `Đã tạo thiết bị ${name} thành công với ${qty} máy nhập kho!`, data: newModel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. [CRUD] Cập nhật mẫu thiết bị
export const updateEquipmentModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, categoryId, estimatedValue, imageUrl, description } = req.body;

    const updated = await EquipmentModel.findByIdAndUpdate(
      id,
      {
        name,
        brand,
        category: categoryId,
        estimatedValue: Number(estimatedValue),
        imageUrl,
        description
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị' });
    }

    res.json({ success: true, message: 'Đã cập nhật thông tin thiết bị thành công', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. [CRUD] Xóa thiết bị khỏi hệ thống
export const deleteEquipmentModel = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem có máy nào đang cho mượn không
    const isBorrowed = await Equipment.exists({ model: id, status: 'BORROWED' });
    if (isBorrowed) {
      return res.status(400).json({ success: false, message: 'Không thể xóa thiết bị đang có cá thể được mượn!' });
    }

    // Xóa máy cá thể và xóa model
    await Equipment.deleteMany({ model: id });
    await EquipmentModel.findByIdAndDelete(id);

    res.json({ success: true, message: 'Đã xóa thiết bị và toàn bộ máy cá thể liên quan khỏi kho' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
