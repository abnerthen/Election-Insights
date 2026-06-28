import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

import { Layout } from "@/components/layout";
import { HomePage } from "@/pages/home";
import { ConstituencyPage } from "@/pages/constituency";
import { AdminPage } from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  const [currentElectionId, setCurrentElectionId] = useState<number | null>(null);

  return (
    <Switch>
      {/* Admin route — no nav shell */}
      <Route path="/admin" component={AdminPage} />

      {/* Public routes — wrapped in Layout */}
      <Route>
        <Layout currentElectionId={currentElectionId} onElectionChange={setCurrentElectionId}>
          <Switch>
            <Route path="/">
              <HomePage currentElectionId={currentElectionId} />
            </Route>
            <Route path="/constituency/:id" component={ConstituencyPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  // Enforce dark mode by default for the newsroom vibe
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
