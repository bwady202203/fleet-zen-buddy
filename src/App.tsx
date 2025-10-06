import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SparePartsProvider } from "@/contexts/SparePartsContext";
import Index from "./pages/Index";
import MaintenanceReports from "./pages/MaintenanceReports";
import SpareParts from "./pages/SpareParts";
import Purchases from "./pages/Purchases";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SparePartsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/reports" element={<MaintenanceReports />} />
            <Route path="/spare-parts" element={<SpareParts />} />
            <Route path="/purchases" element={<Purchases />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SparePartsProvider>
  </QueryClientProvider>
);

export default App;
