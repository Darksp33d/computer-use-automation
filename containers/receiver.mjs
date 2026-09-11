import { createServer } from "node:http";

let received = 0;
createServer((request, response) => {
  if (request.url === "/count") response.end(String(received));
  else {
    received++;
    response.end("probe");
  }
}).listen(8080, "0.0.0.0");
