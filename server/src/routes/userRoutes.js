const express = require("express");
const userController = require("../controllers/userController");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.patch("/me", asyncHandler(userController.updateProfile));

module.exports = router;
