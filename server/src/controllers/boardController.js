const boardService = require("../services/boardService");

async function listBoards(req, res) {
  const boards = await boardService.listBoards(req.user);
  res.json({ boards });
}

async function createBoard(req, res) {
  const boardId = await boardService.createBoard(req.user.id, req.body);
  res.status(201).json({ message: "Board created.", boardId });
}

async function getBoard(req, res) {
  const data = await boardService.getBoardDetails(
    req.user,
    Number(req.params.id),
    req.query.sortBy,
    req.query.assignee
  );
  res.json(data);
}

async function inviteMember(req, res) {
  await boardService.inviteMember(req.user, Number(req.params.id), req.body.email);
  res.json({ message: "Member invited successfully." });
}

async function deleteBoard(req, res) {
  await boardService.deleteBoard(req.user, Number(req.params.id));
  res.json({ message: "Board deleted." });
}

async function createColumn(req, res) {
  const columnId = await boardService.createColumn(req.user, Number(req.params.id), req.body);
  res.status(201).json({ message: "Column created.", columnId });
}

async function renameColumn(req, res) {
  await boardService.renameColumn(req.user, Number(req.params.columnId), req.body);
  res.json({ message: "Column updated." });
}

async function deleteColumn(req, res) {
  await boardService.deleteColumn(req.user, Number(req.params.columnId));
  res.json({ message: "Column deleted." });
}

async function reorderColumns(req, res) {
  await boardService.reorderColumns(req.user, Number(req.params.id), req.body.columnIds || []);
  res.json({ message: "Columns reordered." });
}

module.exports = {
  createBoard,
  createColumn,
  deleteBoard,
  deleteColumn,
  getBoard,
  inviteMember,
  listBoards,
  renameColumn,
  reorderColumns
};
