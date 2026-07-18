import { Navigate, Outlet, Route, Routes, useParams } from "react-router";

import { AuthGate, RoleGate } from "@/components/auth/auth-gate";
import { DashboardLayout } from "@/components/sidebar/dashboard-layout";
import { TaskFormPage } from "@/components/tracker/task-form-page";
import { LandingHero } from "@/screens/landing/hero";
import { SigninPage } from "@/screens/auth/signin";
import { RegisterPage } from "@/screens/auth/register";
import ForgotPassword from "@/screens/auth/forgot";
import ResetPassword from "@/screens/auth/reset";
import AcceptInvite from "@/screens/invite/AcceptInvite";
import { OnboardingPage } from "@/screens/onboarding/Onboarding";
import { ProjectsOverview } from "@/screens/projects/Projects";
import { CreateProjectPage } from "@/screens/projects/CreateProject";
import { ProjectDetailView } from "@/screens/projects/ProjectDetail";
import { EditProjectPage } from "@/screens/projects/EditProject";
import TaskPage from "@/screens/tasks/task-page";
import ChannelChat from "@/screens/channel/channel-chat";
import { Office } from "@/screens/office/office";
import { AdminDashboard } from "@/screens/admin/admin-dashboard";
import { AnalyticsScreen } from "@/screens/admin/analytics-screen";
import { UserDetailScreen } from "@/screens/admin/user-detail-screen";
import { InvitesPage } from "@/screens/admin/invites-page";
import { UsersPage } from "@/screens/admin/users-page";
import { SettingsPage } from "@/screens/admin/settings-page";
import { ProfilePage } from "@/screens/profile/Profile";
import { NotificationsPage } from "@/screens/notifications/NotificationsPage";
import { ClientPage } from "@/screens/client/ClientPage";
import { ClientProjectDetail } from "@/screens/client/ClientProjectDetail";
import { ClientProjectReport } from "@/screens/client/ClientProjectReport";
import { TaskDetail } from "@/components/tracker/task-detail/task-detail";
import { DeveloperDashboard } from "@/screens/dashboard/DeveloperDashboard";

function DashboardHome() {
  return <DeveloperDashboard />;
}

function AppLayout() {
  return (
    <AuthGate>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AuthGate>
  );
}

function ProjectDetailRoute() {
  const { slug } = useParams();
  return <ProjectDetailView projectSlug={slug!} />;
}

function EditProjectRoute() {
  const { slug } = useParams();
  return <EditProjectPage projectSlug={slug!} />;
}

function ChannelRoute() {
  const { channelId } = useParams();
  return <ChannelChat channelId={channelId!} />;
}

function UserDetailRoute() {
  const { id } = useParams();
  return <UserDetailScreen userId={id!} />;
}

function ClientRoute() {
  const { id } = useParams();
  return <ClientPage id={id!} />;
}

function ClientProjectRoute() {
  const { id, slug } = useParams();
  return <ClientProjectDetail userId={id!} slug={slug!} />;
}

function ClientReportRoute() {
  const { id, slug } = useParams();
  return <ClientProjectReport userId={id!} slug={slug!} />;
}

function TaskDetailRoute() {
  const { taskId } = useParams();
  return <TaskDetail taskId={taskId!} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthGate>
            <LandingHero />
          </AuthGate>
        }
      />
      <Route
        path="/signin"
        element={
          <AuthGate>
            <SigninPage />
          </AuthGate>
        }
      />
      <Route
        path="/register"
        element={
          <AuthGate>
            <RegisterPage />
          </AuthGate>
        }
      />
      <Route
        path="/forgot"
        element={
          <AuthGate>
            <ForgotPassword />
          </AuthGate>
        }
      />
      <Route
        path="/reset"
        element={
          <AuthGate>
            <ResetPassword />
          </AuthGate>
        }
      />
      <Route
        path="/accept-invite"
        element={
          <AuthGate>
            <AcceptInvite />
          </AuthGate>
        }
      />
      <Route
        path="/onboarding"
        element={
          <AuthGate>
            <OnboardingPage />
          </AuthGate>
        }
      />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/projects" element={<ProjectsOverview />} />
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailRoute />} />
        <Route path="/projects/:slug/edit" element={<EditProjectRoute />} />
        <Route path="/tracker" element={<TaskPage />} />
        <Route path="/tracker/new" element={<TaskFormPage />} />
        <Route path="/tracker/:taskId" element={<TaskDetailRoute />} />
        <Route path="/channels/:channelId" element={<ChannelRoute />} />
        <Route path="/office" element={<Office />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/admin"
          element={
            <RoleGate allow={["ADMIN", "PROJECT_MANAGER"]}>
              <AdminDashboard />
            </RoleGate>
          }
        />
        <Route
          path="/analytics"
          element={
            <RoleGate allow={["ADMIN", "PROJECT_MANAGER"]}>
              <AnalyticsScreen />
            </RoleGate>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleGate allow={["ADMIN"]}>
              <UsersPage />
            </RoleGate>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <RoleGate allow={["ADMIN"]}>
              <UserDetailRoute />
            </RoleGate>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <RoleGate allow={["ADMIN"]}>
              <InvitesPage />
            </RoleGate>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleGate allow={["ADMIN"]}>
              <SettingsPage />
            </RoleGate>
          }
        />
        <Route path="/:id" element={<ClientRoute />} />
        <Route path="/:id/projects/:slug" element={<ClientProjectRoute />} />
        <Route
          path="/:id/projects/:slug/report"
          element={<ClientReportRoute />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
