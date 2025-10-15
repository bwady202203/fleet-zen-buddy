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
import { EmployeeTransactionsProvider } from "@/contexts/EmployeeTransactionsContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SystemIconsBar } from "@/components/SystemIconsBar";
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
import JournalEntriesReports from "./pages/accounting/JournalEntriesReports";
import Ledger from "./pages/accounting/Ledger";
import TrialBalance from "./pages/accounting/TrialBalance";
import SalesInvoice from "./pages/accounting/SalesInvoice";
import PurchaseInvoice from "./pages/accounting/PurchaseInvoice";
import SalesReturn from "./pages/accounting/SalesReturn";
import PurchaseReturn from "./pages/accounting/PurchaseReturn";
import BalanceSheet from "./pages/accounting/BalanceSheet";
import IncomeStatement from "./pages/accounting/IncomeStatement";
import CostCenters from "./pages/accounting/CostCenters";
import Branches from "./pages/accounting/Branches";
import Projects from "./pages/accounting/Projects";
import HR from "./pages/HR";
import Loads from "./pages/Loads";
import LoadsRegister from "./pages/loads/LoadsRegister";
import LoadsList from "./pages/loads/LoadsList";
import EditLoad from "./pages/loads/EditLoad";
import DriversManagement from "./pages/loads/DriversManagement";
import CompaniesManagement from "./pages/loads/CompaniesManagement";
import LoadInvoices from "./pages/loads/LoadInvoices";
import PaymentReceipts from "./pages/loads/PaymentReceipts";
import LoadReports from "./pages/loads/LoadReports";
import LoadTypes from "./pages/loads/LoadTypes";
import SuppliersManagement from "./pages/loads/SuppliersManagement";
import DeliveryReceipts from "./pages/loads/DeliveryReceipts";
import DeliverySystemLogin from "./pages/DeliverySystemLogin";
import DeliverySystemHome from "./pages/DeliverySystemHome";
import Employees from "./pages/hr/Employees";
import Payroll from "./pages/hr/Payroll";
import Advances from "./pages/hr/Advances";
import Additions from "./pages/hr/Additions";
import Deductions from "./pages/hr/Deductions";
import Leaves from "./pages/hr/Leaves";
import Attendance from "./pages/hr/Attendance";
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
        <EmployeeTransactionsProvider>
          <PermissionsProvider>
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
                            {/* Public Routes - No Authentication Required */}
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/ds" element={<DeliverySystemLogin />} />
                            <Route path="/ds/home" element={<DeliverySystemHome />} />
                            
                            {/* Protected Routes with Icons Bar */}
                            <Route path="/" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Dashboard />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/users" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <UsersManagement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/fleet" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Index />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Accounting />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/chart-of-accounts" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <ChartOfAccounts />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/journal-entries" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <JournalEntries />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/journal-entries/new" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <JournalEntries />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/journal-entries-reports" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <JournalEntriesReports />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/ledger" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Ledger />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/trial-balance" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <TrialBalance />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/sales-invoice" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <SalesInvoice />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/purchase-invoice" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <PurchaseInvoice />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/sales-return" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <SalesReturn />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/purchase-return" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <PurchaseReturn />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/balance-sheet" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <BalanceSheet />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/income-statement" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <IncomeStatement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/cost-centers" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CostCenters />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/branches" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Branches />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/accounting/projects" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Projects />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <HR />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/employees" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Employees />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/payroll" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Payroll />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/advances" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Advances />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/additions" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Additions />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/deductions" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Deductions />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/leaves" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Leaves />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/attendance" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Attendance />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/hr/bulk-employees" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <BulkEmployees />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Loads />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/register" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <LoadsRegister />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/list" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <LoadsList />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/edit/:id" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <EditLoad />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/drivers" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <DriversManagement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/companies" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CompaniesManagement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/companies-management" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CompaniesManagement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/invoices" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <LoadInvoices />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/receipts" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <PaymentReceipts />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/reports" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <LoadReports />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/load-types" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <LoadTypes />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/suppliers" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <SuppliersManagement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/loads/delivery-receipts" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <DeliveryReceipts />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/reports" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <MaintenanceReports />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/spare-parts" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <SpareParts />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/purchases" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <Purchases />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/stock-movement" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <StockMovement />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/vehicle-mileage" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <VehicleMileageReport />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/price-history" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <PurchasePriceHistory />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/bulk-vehicles" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <BulkVehicles />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyHome />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/representatives" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyRepresentatives />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/transfers" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyTransfers />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/expenses" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyExpenses />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/records" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyRecords />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/filter" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyFilter />
                                </>
                              </ProtectedRoute>
                            } />
                            <Route path="/custody/journal" element={
                              <ProtectedRoute>
                                <>
                                  <SystemIconsBar />
                                  <CustodyJournalEntries />
                                </>
                              </ProtectedRoute>
                            } />
                            
                            {/* 404 - Must be last */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </BrowserRouter>
                      </TooltipProvider>
                      </VehicleMileageProvider>
                    </SparePartsProvider>
                  </VehiclesProvider>
                </InvoicesProvider>
              </AccountingProvider>
            </PermissionsProvider>
          </EmployeeTransactionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
