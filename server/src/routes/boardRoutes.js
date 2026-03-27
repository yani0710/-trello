const express = require("express");
const boardController = require("../controllers/boardController");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(boardController.listBoards));
router.post("/", asyncHandler(boardController.createBoard));
router.get("/:id", asyncHandler(boardController.getBoard));
router.delete("/:id", asyncHandler(boardController.deleteBoard));
router.post("/:id/members", asyncHandler(boardController.inviteMember));
router.post("/:id/columns", asyncHandler(boardController.createColumn));
router.patch("/:id/columns/reorder", asyncHandler(boardController.reorderColumns));
router.patch("/columns/:columnId", asyncHandler(boardController.renameColumn));
router.delete("/columns/:columnId", asyncHandler(boardController.deleteColumn));

module.exports = router;
