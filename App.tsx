import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { FontSizeProvider } from "@/components/font-size-provider";
import { LiveDraftProvider } from "@/components/LiveDraftProvider";
import NotFound from "@/pages/not-found";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PlayersPage } from "@/pages/PlayersPage";
import { DraftBoardPage } from "@/pages/DraftBoardPage";
import { TeamsPage } from "@/pages/TeamsPage";
import { PickLogPage } from "@/pages/PickLogPage";
import { LiveDraftPage } from "@/pages/LiveDraftPage";

function Router() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <GlobalHeader />
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={PlayersPage} />
          <Route path="/board" component={DraftBoardPage} />
          <Route path="/rosters" component={TeamsPage} />
          <Route path="/log" component={PickLogPage} />
          <Route path="/live/:roomId" component={LiveDraftPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <FontSizeProvider defaultSize="small" storageKey="vite-ui-font-size">
          <LiveDraftProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </LiveDraftProvider>
        </FontSizeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
