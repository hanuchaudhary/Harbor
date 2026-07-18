import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { ThemeProvider } from "./theme-provider";
import { getQueryClient } from "@/lib/query/query.client";

export function Provider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider defaultTheme="light" storageKey="harbor-ui-theme">
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              borderRadius: "0px",
              fontFamily: "var(--font-montreal-mono)",
              fontSize: "12px",
              fontWeight: "bold",
              color: "var(--destructive)",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
