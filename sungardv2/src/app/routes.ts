import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import OnboardingPage from "./components/OnboardingPage";
import DashboardPage from "./components/DashboardPage";
import EducationPage from "./components/EducationPage";
import ProfilePage from "./components/ProfilePage";
import RemindersPage from "./components/RemindersPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/onboarding",
    Component: OnboardingPage,
  },
  {
    path: "/dashboard",
    Component: Layout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "education", Component: EducationPage },
      { path: "profile", Component: ProfilePage },
      { path: "reminders", Component: RemindersPage },
    ],
  },
]);
