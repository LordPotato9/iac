const express = require('express');
const config = require('./config');
const loader = require('./loaders');

async function startServer() {
  const app = express();

  await loader(app);

  app.listen(config.port, (err) => {
    if (err) {
      process.exit(1);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`Server listening on port: ${config.port}`);
  });
}

startServer();
