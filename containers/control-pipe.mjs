import { connect } from "node:net";

const socket = connect(3000, "127.0.0.1");
process.stdin.pipe(socket);
socket.pipe(process.stdout);
socket.on("error", () => {
  process.exitCode = 1;
});
socket.on("close", () => {
  process.stdin.destroy();
});
