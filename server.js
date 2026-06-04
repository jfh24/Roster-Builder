const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(file);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Roster Builder running at http://localhost:${port}`);
});
