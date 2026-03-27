const express = require("express");
const taskController = require("../controllers/taskController");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/boards/:boardId/tasks", asyncHandler(taskController.createTask));
router.get("/:id", asyncHandler(taskController.getTask));
router.patch("/:id", asyncHandler(taskController.updateTask));
router.post("/:id/move", asyncHandler(taskController.moveTask));
router.delete("/:id", asyncHandler(taskController.deleteTask));
router.post("/:id/comments", asyncHandler(taskController.addComment));

module.exports = router;
