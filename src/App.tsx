import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SparePartsProvider } from "@/contexts/SparePartsContext";
import { VehicleMileageProvider } from "@/contexts/VehicleMileageContext";
import { VehiclesProvider } from "@/contexts/VehiclesContext";
import Index from "./pages/Index";
import MaintenanceReports from "./pages/MaintenanceReports";
import SpareParts from "./pages/SpareParts";
import Purchases from "./pages/Purchases";
import StockMovement from "./pages/StockMovement";
import VehicleMileageReport from "./pages/VehicleMileageReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <VehiclesProvider>
      <SparePartsProvider>
        <VehicleMileageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/reports" element={<MaintenanceReports />} />
                <Route path="/spare-parts" element={<SpareParts />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/stock-movement" element={<StockMovement />} />
                <Route path="/vehicle-mileage" element={<VehicleMileageReport />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </VehicleMileageProvider>
      </SparePartsProvider>
    </VehiclesProvider>
  </QueryClientProvider>
);

export default App;
