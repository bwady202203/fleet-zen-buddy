import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SparePartsProvider } from "@/contexts/SparePartsContext";
import { VehicleMileageProvider } from "@/contexts/VehicleMileageContext";
import { VehiclesProvider } from "@/contexts/VehiclesContext";
import { AccountingProvider } from "@/contexts/AccountingContext";
import { InvoicesProvider } from "@/contexts/InvoicesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UsersManagement from "./pages/UsersManagement";
import Accounting from "./pages/Accounting";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import JournalEntries from "./pages/accounting/JournalEntries";
import Ledger from "./pages/accounting/Ledger";
import TrialBalance from "./pages/accounting/TrialBalance";
import SalesInvoice from "./pages/accounting/SalesInvoice";
import PurchaseInvoice from "./pages/accounting/PurchaseInvoice";
import SalesReturn from "./pages/accounting/SalesReturn";
import PurchaseReturn from "./pages/accounting/PurchaseReturn";
import BalanceSheet from "./pages/accounting/BalanceSheet";
import IncomeStatement from "./pages/accounting/IncomeStatement";
import CostCenters from "./pages/accounting/CostCenters";
import Projects from "./pages/accounting/Projects";
import HR from "./pages/HR";
import Loads from "./pages/Loads";
import Employees from "./pages/hr/Employees";
import Payroll from "./pages/hr/Payroll";
import Advances from "./pages/hr/Advances";
import Additions from "./pages/hr/Additions";
import Deductions from "./pages/hr/Deductions";
import Leaves from "./pages/hr/Leaves";
import BulkEmployees from "./pages/BulkEmployees";
import MaintenanceReports from "./pages/MaintenanceReports";
import SpareParts from "./pages/SpareParts";
import Purchases from "./pages/Purchases";
import StockMovement from "./pages/StockMovement";
import VehicleMileageReport from "./pages/VehicleMileageReport";
import PurchasePriceHistory from "./pages/PurchasePriceHistory";
import BulkVehicles from "./pages/BulkVehicles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountingProvider>
          <InvoicesProvider>
            <VehiclesProvider>
            <SparePartsProvider>
              <VehicleMileageProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><UsersManagement /></ProtectedRoute>} />
                  <Route path="/fleet" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
                  <Route path="/accounting/chart-of-accounts" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
                  <Route path="/accounting/journal-entries" element={<ProtectedRoute><JournalEntries /></ProtectedRoute>} />
                  <Route path="/accounting/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
                  <Route path="/accounting/trial-balance" element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
                  <Route path="/accounting/sales-invoice" element={<ProtectedRoute><SalesInvoice /></ProtectedRoute>} />
                  <Route path="/accounting/purchase-invoice" element={<ProtectedRoute><PurchaseInvoice /></ProtectedRoute>} />
                  <Route path="/accounting/sales-return" element={<ProtectedRoute><SalesReturn /></ProtectedRoute>} />
                  <Route path="/accounting/purchase-return" element={<ProtectedRoute><PurchaseReturn /></ProtectedRoute>} />
                  <Route path="/accounting/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
                  <Route path="/accounting/income-statement" element={<ProtectedRoute><IncomeStatement /></ProtectedRoute>} />
                  <Route path="/accounting/cost-centers" element={<ProtectedRoute><CostCenters /></ProtectedRoute>} />
                  <Route path="/accounting/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
                  <Route path="/hr/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                  <Route path="/hr/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
                  <Route path="/hr/advances" element={<ProtectedRoute><Advances /></ProtectedRoute>} />
                  <Route path="/hr/additions" element={<ProtectedRoute><Additions /></ProtectedRoute>} />
                  <Route path="/hr/deductions" element={<ProtectedRoute><Deductions /></ProtectedRoute>} />
                  <Route path="/hr/leaves" element={<ProtectedRoute><Leaves /></ProtectedRoute>} />
                  <Route path="/hr/bulk-employees" element={<ProtectedRoute><BulkEmployees /></ProtectedRoute>} />
                  <Route path="/loads" element={<ProtectedRoute><Loads /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><MaintenanceReports /></ProtectedRoute>} />
                  <Route path="/spare-parts" element={<ProtectedRoute><SpareParts /></ProtectedRoute>} />
                  <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
                  <Route path="/stock-movement" element={<ProtectedRoute><StockMovement /></ProtectedRoute>} />
                  <Route path="/vehicle-mileage" element={<ProtectedRoute><VehicleMileageReport /></ProtectedRoute>} />
                  <Route path="/price-history" element={<ProtectedRoute><PurchasePriceHistory /></ProtectedRoute>} />
                  <Route path="/bulk-vehicles" element={<ProtectedRoute><BulkVehicles /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </TooltipProvider>
            </VehicleMileageProvider>
          </SparePartsProvider>
        </VehiclesProvider>
        </InvoicesProvider>
      </AccountingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
