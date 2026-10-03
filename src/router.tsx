import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // View Transitions are deliberately enabled only on mobile.
    // Desktop navigation keeps the existing behavior unchanged.
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        if (
          typeof window === "undefined" ||
          !window.matchMedia("(max-width: 639px)").matches
        ) {
          return false;
        }

        const fromPath = fromLocation?.pathname ?? "";
        const toPath = toLocation.pathname;
        const fromDepth = fromPath.split("/").filter(Boolean).length;
        const toDepth = toPath.split("/").filter(Boolean).length;
        const direction = toDepth >= fromDepth ? "forward" : "back";

        return [`mobile-${direction}`];
      },
    },
  });

  return router;
};
