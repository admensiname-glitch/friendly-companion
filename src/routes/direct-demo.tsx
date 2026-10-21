import { createFileRoute } from "@tanstack/react-router";
import { DirectPage } from "@/components/DirectDemo";

export const Route = createFileRoute("/direct-demo")({
  component: DirectDemoRoute,
});

function DirectDemoRoute() {
  return <DirectPage />;
}
