import { DashboardLayout } from "@/components/sidebar/dashboard-layout";
import { Provider } from "@/components/provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider>
      <DashboardLayout>{children}</DashboardLayout>
    </Provider>
  );
}
