import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/router/ProtectedRoute'
import { RootLayout } from '@/router/RootLayout'
import {
  AdminRoute,
  BookRoute,
  ConfirmationRoute,
  DashboardRoute,
  HomeRoute,
  LoginRoute,
  PrivacyRoute,
  TermsRoute,
} from '@/router/routeWrappers'
import { ROUTES } from '@/utils/constants'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.home, element: <HomeRoute /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: ROUTES.book, element: <BookRoute /> }],
      },
      { path: '/confirmation/:id', element: <ConfirmationRoute /> },
      { path: ROUTES.confirmation, element: <ConfirmationRoute /> },
      { path: ROUTES.login, element: <LoginRoute /> },
      { path: ROUTES.privacy, element: <PrivacyRoute /> },
      { path: ROUTES.terms, element: <TermsRoute /> },
      {
        element: <ProtectedRoute requireClient />,
        children: [{ path: ROUTES.dashboard, element: <DashboardRoute /> }],
      },
      {
        element: <ProtectedRoute requireAdmin />,
        children: [{ path: ROUTES.admin, element: <AdminRoute /> }],
      },
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
])
