let attempts = 0;
globalThis.fetch = async () => {
  attempts++;
  throw new Error("PROVIDER_EGRESS_DENIED");
};
process.on("exit", () => {
  if (attempts) process.exitCode = 3;
});
