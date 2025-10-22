import { createRequestHandler } from "@react-router/node";
import * as build from "./build/server/index.js";

const port = process.env.PORT || 3000;

const requestHandler = createRequestHandler(build);

const server = Bun.serve({
  port,
  fetch: requestHandler,
});

console.log(`Server running on port ${port}`);
