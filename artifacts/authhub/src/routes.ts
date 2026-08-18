import { lazy } from "react"
import { Route, Switch, useLocation } from "wouter"

export const routes = [
  { path: "/login", component: lazy(() => import("@/pages/login")) },
  { path: "/", component: lazy(() => import("@/pages/dashboard")) },
  { path: "/users", component: lazy(() => import("@/pages/users")) },
  { path: "/users/:id", component: lazy(() => import("@/pages/user-detail")) },
  { path: "/apps", component: lazy(() => import("@/pages/apps")) },
  { path: "/apps/:id", component: lazy(() => import("@/pages/app-detail")) },
  { path: "/activity", component: lazy(() => import("@/pages/activity")) },
]
