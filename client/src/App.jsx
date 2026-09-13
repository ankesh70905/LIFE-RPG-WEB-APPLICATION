import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Loading from "./components/Loading.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Character from "./pages/Character.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Achievements from "./pages/Achievements.jsx";
import Inventory from "./pages/Inventory.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Shop from "./pages/Shop.jsx";
import Signup from "./pages/Signup.jsx";
import Tasks from "./pages/Tasks.jsx";
import Goals from "./pages/Goals.jsx";
import Habits from "./pages/Habits.jsx";
import Planner from "./pages/Planner.jsx";
import Challenges from "./pages/Challenges.jsx";
import Friends from "./pages/Friends.jsx";
import Preferences from "./pages/Preferences.jsx";
import WeeklySummary from "./pages/WeeklySummary.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { PageTransition } from "./components/Motion.jsx";

const AIPlanner = lazy(() => import("./pages/AIPlanner.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading label="Preparing your adventure..." />;
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading label="Loading your adventure..." />}>
        <PageTransition>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/character" element={<Character />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/ai-planner" element={<AIPlanner />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/weekly-summary" element={<WeeklySummary />} />
                <Route path="/preferences" element={<Preferences />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </PageTransition>
      </Suspense>
    </ErrorBoundary>
  );
}
