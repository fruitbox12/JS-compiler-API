const express = require('express');
const app = express();
const compilerRouter = require('./api/compiler');
const notFound = require('./middleware/not-found');

// middleware
app.use(express.json());

// routes
app.use('/api/v1/compiler', compilerRouter);
app.use(notFound);

const port = process.env.PORT || 3000;
app.listen(port, () =>
    console.log(`Server is listening on port ${port}...`)
);
