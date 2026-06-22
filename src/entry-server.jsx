import React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App.jsx";

export function render(url) {
  return new Promise((resolve, reject) => {
    let didError = false;
    const { pipe } = renderToPipeableStream(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>,
      {
        onAllReady() {
          const output = new PassThrough();
          let html = "";
          output.setEncoding("utf8");
          output.on("data", (chunk) => { html += chunk; });
          output.on("end", () => {
            if (didError) reject(new Error(`No se pudo prerenderizar ${url}`));
            else resolve(html);
          });
          output.on("error", reject);
          pipe(output);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          didError = true;
          console.error(`[prerender] ${url}:`, error);
        },
      },
    );
  });
}
