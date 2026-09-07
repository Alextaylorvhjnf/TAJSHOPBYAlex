/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * TAJ Electronics — Phusion Passenger / cPanel "Setup Node.js App" entry point.
 *
 * Use this file ONLY on shared hosts that run Node.js apps through Passenger
 * (cPanel "Setup Node.js App", LiteSpeed, Plesk). Those hosts ask for an
 * "Application startup file" — point it at this server.js.
 *
 * Requires a production build in this folder:
 *   npm install && npx prisma generate && npm run build
 *
 * For VPS / Docker / PaaS use the standalone server instead:
 *   node .next/standalone/server.js   (see DEPLOY.md)
 */

process.env.NODE_ENV = "production";

const http = require("http");
const next = require("next");

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    // Passenger passes its Unix-socket path through the PORT env variable
    // (a filesystem path, NOT a number). Plain hosts pass a numeric port.
    const portArg = process.env.PORT;
    if (portArg && isNaN(Number(portArg))) {
      server.listen(portArg); // Passenger socket
      console.log("TAJ Electronics ready on Passenger socket");
    } else {
      const port = Number(portArg) || 3000;
      server.listen(port, () => {
        console.log(`TAJ Electronics ready on port ${port}`);
      });
    }
  })
  .catch((err) => {
    console.error("Failed to start TAJ Electronics:", err);
    process.exit(1);
  });
