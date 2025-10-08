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
import PermissionProtectedRoute from "@/components/PermissionProtectedRoute";
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
import LoadsRegister from "./pages/loads/LoadsRegister";
import LoadsList from "./pages/loads/LoadsList";
import DriversManagement from "./pages/loads/DriversManagement";
import CompaniesManagement from "./pages/loads/CompaniesManagement";
import LoadInvoices from "./pages/loads/LoadInvoices";
import PaymentReceipts from "./pages/loads/PaymentReceipts";
import LoadReports from "./pages/loads/LoadReports";
import LoadTypes from "./pages/loads/LoadTypes";
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
                  <Route path="/fleet" element={<PermissionProtectedRoute module="vehicles"><Index /></PermissionProtectedRoute>} />
                  <Route path="/accounting" element={<PermissionProtectedRoute module="accounting"><Accounting /></PermissionProtectedRoute>} />
                  <Route path="/accounting/chart-of-accounts" element={<PermissionProtectedRoute module="accounting"><ChartOfAccounts /></PermissionProtectedRoute>} />
                  <Route path="/accounting/journal-entries" element={<PermissionProtectedRoute module="accounting"><JournalEntries /></PermissionProtectedRoute>} />
                  <Route path="/accounting/ledger" element={<PermissionProtectedRoute module="accounting"><Ledger /></PermissionProtectedRoute>} />
                  <Route path="/accounting/trial-balance" element={<PermissionProtectedRoute module="accounting"><TrialBalance /></PermissionProtectedRoute>} />
                  <Route path="/accounting/sales-invoice" element={<PermissionProtectedRoute module="accounting"><SalesInvoice /></PermissionProtectedRoute>} />
                  <Route path="/accounting/purchase-invoice" element={<PermissionProtectedRoute module="accounting"><PurchaseInvoice /></PermissionProtectedRoute>} />
                  <Route path="/accounting/sales-return" element={<PermissionProtectedRoute module="accounting"><SalesReturn /></PermissionProtectedRoute>} />
                  <Route path="/accounting/purchase-return" element={<PermissionProtectedRoute module="accounting"><PurchaseReturn /></PermissionProtectedRoute>} />
                  <Route path="/accounting/balance-sheet" element={<PermissionProtectedRoute module="accounting"><BalanceSheet /></PermissionProtectedRoute>} />
                  <Route path="/accounting/income-statement" element={<PermissionProtectedRoute module="accounting"><IncomeStatement /></PermissionProtectedRoute>} />
                  <Route path="/accounting/cost-centers" element={<PermissionProtectedRoute module="accounting"><CostCenters /></PermissionProtectedRoute>} />
                  <Route path="/accounting/projects" element={<PermissionProtectedRoute module="accounting"><Projects /></PermissionProtectedRoute>} />
                  <Route path="/hr" element={<PermissionProtectedRoute module="hr"><HR /></PermissionProtectedRoute>} />
                  <Route path="/hr/employees" element={<PermissionProtectedRoute module="hr"><Employees /></PermissionProtectedRoute>} />
                  <Route path="/hr/payroll" element={<PermissionProtectedRoute module="hr"><Payroll /></PermissionProtectedRoute>} />
                  <Route path="/hr/advances" element={<PermissionProtectedRoute module="hr"><Advances /></PermissionProtectedRoute>} />
                  <Route path="/hr/additions" element={<PermissionProtectedRoute module="hr"><Additions /></PermissionProtectedRoute>} />
                  <Route path="/hr/deductions" element={<PermissionProtectedRoute module="hr"><Deductions /></PermissionProtectedRoute>} />
                  <Route path="/hr/leaves" element={<PermissionProtectedRoute module="hr"><Leaves /></PermissionProtectedRoute>} />
                  <Route path="/hr/bulk-employees" element={<PermissionProtectedRoute module="hr"><BulkEmployees /></PermissionProtectedRoute>} />
                  <Route path="/loads" element={<PermissionProtectedRoute module="loads"><Loads /></PermissionProtectedRoute>} />
                  <Route path="/loads/register" element={<PermissionProtectedRoute module="loads"><LoadsRegister /></PermissionProtectedRoute>} />
                  <Route path="/loads/list" element={<PermissionProtectedRoute module="loads"><LoadsList /></PermissionProtectedRoute>} />
                  <Route path="/loads/drivers" element={<PermissionProtectedRoute module="loads"><DriversManagement /></PermissionProtectedRoute>} />
                  <Route path="/loads/companies" element={<PermissionProtectedRoute module="loads"><CompaniesManagement /></PermissionProtectedRoute>} />
                  <Route path="/loads/invoices" element={<PermissionProtectedRoute module="loads"><LoadInvoices /></PermissionProtectedRoute>} />
                  <Route path="/loads/receipts" element={<PermissionProtectedRoute module="loads"><PaymentReceipts /></PermissionProtectedRoute>} />
                  <Route path="/loads/reports" element={<PermissionProtectedRoute module="loads"><LoadReports /></PermissionProtectedRoute>} />
                  <Route path="/loads/load-types" element={<PermissionProtectedRoute module="loads"><LoadTypes /></PermissionProtectedRoute>} />
                  <Route path="/reports" element={<PermissionProtectedRoute module="vehicles"><MaintenanceReports /></PermissionProtectedRoute>} />
                  <Route path="/spare-parts" element={<PermissionProtectedRoute module="vehicles"><SpareParts /></PermissionProtectedRoute>} />
                  <Route path="/purchases" element={<PermissionProtectedRoute module="vehicles"><Purchases /></PermissionProtectedRoute>} />
                  <Route path="/stock-movement" element={<PermissionProtectedRoute module="vehicles"><StockMovement /></PermissionProtectedRoute>} />
                  <Route path="/vehicle-mileage" element={<PermissionProtectedRoute module="vehicles"><VehicleMileageReport /></PermissionProtectedRoute>} />
                  <Route path="/price-history" element={<PermissionProtectedRoute module="vehicles"><PurchasePriceHistory /></PermissionProtectedRoute>} />
                  <Route path="/bulk-vehicles" element={<PermissionProtectedRoute module="vehicles"><BulkVehicles /></PermissionProtectedRoute>} />
                  <Route path="/custody" element={<PermissionProtectedRoute module="custody"><CustodyHome /></PermissionProtectedRoute>} />
                  <Route path="/custody/representatives" element={<PermissionProtectedRoute module="custody"><CustodyRepresentatives /></PermissionProtectedRoute>} />
                  <Route path="/custody/transfers" element={<PermissionProtectedRoute module="custody"><CustodyTransfers /></PermissionProtectedRoute>} />
                  <Route path="/custody/expenses" element={<PermissionProtectedRoute module="custody"><CustodyExpenses /></PermissionProtectedRoute>} />
                  <Route path="/custody/records" element={<PermissionProtectedRoute module="custody"><CustodyRecords /></PermissionProtectedRoute>} />
                  <Route path="/custody/filter" element={<PermissionProtectedRoute module="custody"><CustodyFilter /></PermissionProtectedRoute>} />
                  <Route path="/custody/journal" element={<PermissionProtectedRoute module="custody"><CustodyJournalEntries /></PermissionProtectedRoute>} />
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
