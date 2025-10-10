import { lazy } from "react";
import Template from "./Template";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/context/ProtectedRoute";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

//import pages
const Home = lazy(() => import("./pages/Home"));
const Settings = lazy(() => import("./pages/Settings"));
const MySubscriptions = lazy(() => import("./pages/MySubscriptions"));
export default function Router() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Template />,
      children: [
        { path: "/", element: <Home /> },
        {
          path: "/settings",
          element: (
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          ),
        },
        {
          path: "/mysubscriptions",
          element: (
            <ProtectedRoute>
              <MySubscriptions />
            </ProtectedRoute>
          ),
        },
      ],
    },
    { path: "/auth/callback", element: <AuthCallback /> },
  ]);
  return <RouterProvider router={router} />;
}
