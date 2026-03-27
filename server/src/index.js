const { app } = require("./app");
const { port } = require("./config/env");
const { initializeDatabase } = require("./database/init");

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`мини Trello is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
  });
