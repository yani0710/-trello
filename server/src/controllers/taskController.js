const taskService = require("../services/taskService");

async function createTask(req, res) {
  const taskId = await taskService.createTask(req.user, Number(req.params.boardId), req.body);
  res.status(201).json({ message: "Task created.", taskId });
}

async function getTask(req, res) {
  const data = await taskService.getTaskDetails(req.user, Number(req.params.id));
  res.json(data);
}

async function updateTask(req, res) {
  await taskService.updateTask(req.user, Number(req.params.id), req.body);
  res.json({ message: "Task updated." });
}

async function moveTask(req, res) {
  await taskService.moveTask(req.user, Number(req.params.id), Number(req.body.toColumnId));
  res.json({ message: "Task moved." });
}

async function deleteTask(req, res) {
  await taskService.deleteTask(req.user, Number(req.params.id));
  res.json({ message: "Task deleted." });
}

async function addComment(req, res) {
  await taskService.addComment(req.user, Number(req.params.id), req.body.content);
  res.status(201).json({ message: "Comment added." });
}

module.exports = { addComment, createTask, deleteTask, getTask, moveTask, updateTask };
