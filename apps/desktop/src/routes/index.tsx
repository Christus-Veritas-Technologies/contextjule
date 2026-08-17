import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <main>
      <h1>contextjule</h1>
      <p>
        Desktop application running on Tauri v2 with React, TypeScript and
        TanStack Router.
      </p>
    </main>
  ),
});