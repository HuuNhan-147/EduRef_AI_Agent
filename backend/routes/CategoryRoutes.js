import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controller/CategoryController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Lấy tất cả danh mục
router.get("/", getCategories);

// ✅ Lấy danh mục theo ID
router.get("/:id", getCategoryById);

// ✅ Thêm danh mục (Chỉ Admin)
router.post("/", protect, admin, createCategory);

// ✅ Cập nhật danh mục (Chỉ Admin)
router.put("/:id", protect, admin, updateCategory);

// ✅ Xóa danh mục (Chỉ Admin)
router.delete("/:id", protect, admin, deleteCategory);

export default router;
