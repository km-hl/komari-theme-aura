import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Spinner } from "@/components/ui/Spinner";

const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Instance = lazy(() =>
  import("@/pages/Instance").then((m) => ({ default: m.Instance })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);
const DevLogin = lazy(() =>
  import("@/pages/DevLogin").then((m) => ({ default: m.DevLogin })),
);

function Loading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: "instance/:uuid",
        element: (
          <Suspense fallback={<Loading />}>
            <Instance />
          </Suspense>
        ),
      },
      {
        path: "dev-login",
        element: (
          <Suspense fallback={<Loading />}>
            <DevLogin />
          </Suspense>
        ),
      },
      {
        path: "404",
        element: (
          <Suspense fallback={<Loading />}>
            <NotFound />
          </Suspense>
        ),
      },
      { path: "*", element: <Navigate to="/404" replace /> },
    ],
  },
]);
