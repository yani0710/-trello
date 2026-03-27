const express = require("express");
const adminController = require("../controllers/adminController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAdmin);
router.get("/overview", asyncHandler(adminController.overview));
router.get("/users", asyncHandler(adminController.users));
router.patch("/users/:userId/status", asyncHandler(adminController.toggleUser));
router.get("/memberships", asyncHandler(adminController.memberships));
router.post("/memberships", asyncHandler(adminController.setMembership));

module.exports = router;
