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
import MainNavbar from "@/components/MainNavbar";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UsersManagement from "./pages/UsersManagement";
import Accounting from "./pages/Accounting";
import CustodyHome from "./pages/custody/CustodyHome";
import CustodyRepresentatives from "./pages/custody/CustodyRepresentatives";
import CustodyTransfers from "./pages/custody/CustodyTransfers";
import CustodyExpenses from "./pages/custody/CustodyExpenses";
import CustodyRecords from "./pages/custody/CustodyRecords";
import CustodyFilter from "./pages/custody/CustodyFilter";
import CustodyJournalEntries from "./pages/custody/CustodyJournalEntries";
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
                    
                    {/* Protected Routes with Navbar */}
                    <Route path="/*" element={
                      <ProtectedRoute>
                        <MainNavbar />
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/users" element={<UsersManagement />} />
                  <Route path="/fleet" element={<Index />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                  <Route path="/accounting/journal-entries" element={<JournalEntries />} />
                  <Route path="/accounting/ledger" element={<Ledger />} />
                  <Route path="/accounting/trial-balance" element={<TrialBalance />} />
                  <Route path="/accounting/sales-invoice" element={<SalesInvoice />} />
                  <Route path="/accounting/purchase-invoice" element={<PurchaseInvoice />} />
                  <Route path="/accounting/sales-return" element={<SalesReturn />} />
                  <Route path="/accounting/purchase-return" element={<PurchaseReturn />} />
                  <Route path="/accounting/balance-sheet" element={<BalanceSheet />} />
                  <Route path="/accounting/income-statement" element={<IncomeStatement />} />
                  <Route path="/accounting/cost-centers" element={<CostCenters />} />
                  <Route path="/accounting/projects" element={<Projects />} />
                  <Route path="/hr" element={<HR />} />
                  <Route path="/hr/employees" element={<Employees />} />
                  <Route path="/hr/payroll" element={<Payroll />} />
                  <Route path="/hr/advances" element={<Advances />} />
                  <Route path="/hr/additions" element={<Additions />} />
                  <Route path="/hr/deductions" element={<Deductions />} />
                  <Route path="/hr/leaves" element={<Leaves />} />
                  <Route path="/hr/bulk-employees" element={<BulkEmployees />} />
                  <Route path="/loads" element={<Loads />} />
                  <Route path="/reports" element={<MaintenanceReports />} />
                  <Route path="/spare-parts" element={<SpareParts />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/stock-movement" element={<StockMovement />} />
                  <Route path="/vehicle-mileage" element={<VehicleMileageReport />} />
                  <Route path="/price-history" element={<PurchasePriceHistory />} />
                  <Route path="/bulk-vehicles" element={<BulkVehicles />} />
                  <Route path="/custody" element={<CustodyHome />} />
                  <Route path="/custody/representatives" element={<CustodyRepresentatives />} />
                  <Route path="/custody/transfers" element={<CustodyTransfers />} />
                  <Route path="/custody/expenses" element={<CustodyExpenses />} />
                  <Route path="/custody/records" element={<CustodyRecords />} />
                  <Route path="/custody/filter" element={<CustodyFilter />} />
                  <Route path="/custody/journal" element={<CustodyJournalEntries />} />
                  <Route path="*" element={<NotFound />} />
                        </Routes>
                      </ProtectedRoute>
                    } />
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
