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
import OrganizationsManagement from "./pages/OrganizationsManagement";
import Accounting from "./pages/Accounting";
import CustodyHome from "./pages/custody/CustodyHome";
import CustodyRepresentatives from "./pages/custody/CustodyRepresentatives";
import CustodyTransfers from "./pages/custody/CustodyTransfers";
import CustodyExpenses from "./pages/custody/CustodyExpenses";
import CustodyRecords from "./pages/custody/CustodyRecords";
import CustodyFilter from "./pages/custody/CustodyFilter";
import CustodyJournalEntries from "./pages/custody/CustodyJournalEntries";
import CustodySmartJournal from "./pages/custody/CustodySmartJournal";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import JournalEntries from "./pages/accounting/JournalEntries";
import JournalEntriesReports from "./pages/accounting/JournalEntriesReports";
import Ledger from "./pages/accounting/Ledger";
import LedgerNew from "./pages/accounting/LedgerNew";
import TrialBalance from "./pages/accounting/TrialBalance";
import TrialBalanceNew from "./pages/accounting/TrialBalanceNew";
import SalesInvoice from "./pages/accounting/SalesInvoice";
import PurchaseInvoice from "./pages/accounting/PurchaseInvoice";
import SalesReturn from "./pages/accounting/SalesReturn";
import PurchaseReturn from "./pages/accounting/PurchaseReturn";
import BalanceSheet from "./pages/accounting/BalanceSheet";
import IncomeStatement from "./pages/accounting/IncomeStatement";
import CostCenters from "./pages/accounting/CostCenters";
import Branches from "./pages/accounting/Branches";
import Projects from "./pages/accounting/Projects";
import PaymentVouchers from "./pages/accounting/PaymentVouchers";
import CollectionReceipts from "./pages/accounting/CollectionReceipts";
import PurchaseOrder from "./pages/accounting/PurchaseOrder";
import Level4Balances from "./pages/accounting/Level4Balances";
import SmartJournalEntries from "./pages/accounting/SmartJournalEntries";
import HR from "./pages/HR";
import Loads from "./pages/Loads";
import LoadsRegister from "./pages/loads/LoadsRegister";
import LoadsList from "./pages/loads/LoadsList";
import AdvancedLoadsList from "./pages/loads/AdvancedLoadsList";
import SimpleLoadsList from "./pages/loads/SimpleLoadsList";
import EditLoad from "./pages/loads/EditLoad";
import DriversManagement from "./pages/loads/DriversManagement";
import CompaniesManagement from "./pages/loads/CompaniesManagement";
import LoadInvoices from "./pages/loads/LoadInvoices";
import PaymentReceipts from "./pages/loads/PaymentReceipts";
import LoadReports from "./pages/loads/LoadReports";
import DriversPaymentReport from "./pages/loads/DriversPaymentReport";
import DailyReports from "./pages/loads/DailyReports";
import LoadTypes from "./pages/loads/LoadTypes";
import SuppliersManagement from "./pages/loads/SuppliersManagement";
import DeliveryReceipts from "./pages/loads/DeliveryReceipts";
import Employees from "./pages/hr/Employees";
import Payroll from "./pages/hr/Payroll";
import Advances from "./pages/hr/Advances";
import Additions from "./pages/hr/Additions";
import Deductions from "./pages/hr/Deductions";
import Leaves from "./pages/hr/Leaves";
import Attendance from "./pages/hr/Attendance";
import BulkEmployees from "./pages/BulkEmployees";
import BulkSpareParts from "./pages/BulkSpareParts";
import MaintenanceReports from "./pages/MaintenanceReports";
import SpareParts from "./pages/SpareParts";
import Purchases from "./pages/Purchases";
import PurchasePOS from "./pages/PurchasePOS";
import StockMovement from "./pages/StockMovement";
import VehicleMileageReport from "./pages/VehicleMileageReport";
import PurchasePriceHistory from "./pages/PurchasePriceHistory";
import BulkVehicles from "./pages/BulkVehicles";
import EditVehicles from "./pages/EditVehicles";
import VehicleMaintenanceCosts from "./pages/VehicleMaintenanceCosts";
import VehicleCostReport from "./pages/VehicleCostReport";
import MaintenancePurchaseInvoices from "./pages/MaintenancePurchaseInvoices";
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
                            <Route path="/auth" element={<Auth />} />
                            
                            {/* Protected Routes with Icons Bar */}
                            <Route path="/*" element={
                              <ProtectedRoute>
                                <SystemIconsBar />
                                <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/users" element={<UsersManagement />} />
                                  <Route path="/organizations" element={<OrganizationsManagement />} />
                                  <Route path="/fleet" element={<Index />} />
                                  <Route path="/accounting" element={<Accounting />} />
                                  <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                                  <Route path="/accounting/journal-entries" element={<JournalEntries />} />
                                  <Route path="/accounting/journal-entries/new" element={<JournalEntries />} />
                                  <Route path="/accounting/payment-vouchers" element={<PaymentVouchers />} />
                                  <Route path="/accounting/collection-receipts" element={<CollectionReceipts />} />
                                  <Route path="/accounting/purchase-order" element={<PurchaseOrder />} />
                                  <Route path="/accounting/journal-entries-reports" element={<JournalEntriesReports />} />
                                  <Route path="/accounting/ledger" element={<Ledger />} />
                                  <Route path="/accounting/ledger-new" element={<LedgerNew />} />
                                  <Route path="/accounting/trial-balance" element={<TrialBalance />} />
                                  <Route path="/accounting/trial-balance-new" element={<TrialBalanceNew />} />
                                  <Route path="/accounting/sales-invoice" element={<SalesInvoice />} />
                                  <Route path="/accounting/purchase-invoice" element={<PurchaseInvoice />} />
                                  <Route path="/accounting/sales-return" element={<SalesReturn />} />
                                  <Route path="/accounting/purchase-return" element={<PurchaseReturn />} />
                                  <Route path="/accounting/balance-sheet" element={<BalanceSheet />} />
                                  <Route path="/accounting/income-statement" element={<IncomeStatement />} />
                                  <Route path="/accounting/cost-centers" element={<CostCenters />} />
                                  <Route path="/accounting/branches" element={<Branches />} />
                                  <Route path="/accounting/projects" element={<Projects />} />
                                  <Route path="/accounting/level4-balances" element={<Level4Balances />} />
                                  <Route path="/accounting/smart-journal" element={<SmartJournalEntries />} />
                                  <Route path="/hr" element={<HR />} />
                                  <Route path="/hr/employees" element={<Employees />} />
                                  <Route path="/hr/payroll" element={<Payroll />} />
                                  <Route path="/hr/advances" element={<Advances />} />
                                  <Route path="/hr/additions" element={<Additions />} />
                                  <Route path="/hr/deductions" element={<Deductions />} />
                  <Route path="/hr/leaves" element={<Leaves />} />
                  <Route path="/hr/attendance" element={<Attendance />} />
                  <Route path="/hr/bulk-employees" element={<BulkEmployees />} />
                                  <Route path="/loads" element={<Loads />} />
                                  <Route path="/loads/register" element={<LoadsRegister />} />
                                  <Route path="/loads/list" element={<LoadsList />} />
                                  <Route path="/loads/advanced-list" element={<AdvancedLoadsList />} />
                                  <Route path="/loads/simple-list" element={<SimpleLoadsList />} />
                                  <Route path="/loads/edit/:id" element={<EditLoad />} />
                                  <Route path="/loads/drivers" element={<DriversManagement />} />
                                  <Route path="/loads/companies" element={<CompaniesManagement />} />
                                  <Route path="/loads/companies-management" element={<CompaniesManagement />} />
                                  <Route path="/loads/invoices" element={<LoadInvoices />} />
                                  <Route path="/loads/receipts" element={<PaymentReceipts />} />
                                  <Route path="/loads/reports" element={<LoadReports />} />
                                  <Route path="/loads/drivers-payment-report" element={<DriversPaymentReport />} />
                                  <Route path="/loads/daily-reports" element={<DailyReports />} />
                                  <Route path="/loads/load-types" element={<LoadTypes />} />
                                  <Route path="/loads/suppliers" element={<SuppliersManagement />} />
                                  <Route path="/loads/delivery-receipts" element={<DeliveryReceipts />} />
                                  <Route path="/reports" element={<MaintenanceReports />} />
                                  <Route path="/maintenance-costs" element={<VehicleMaintenanceCosts />} />
                                  <Route path="/vehicle-cost-report" element={<VehicleCostReport />} />
                                  <Route path="/maintenance-purchase-invoices" element={<MaintenancePurchaseInvoices />} />
                                  <Route path="/spare-parts" element={<SpareParts />} />
                                  <Route path="/bulk-spare-parts" element={<BulkSpareParts />} />
                                  <Route path="/purchases" element={<Purchases />} />
                                  <Route path="/purchases/pos" element={<PurchasePOS />} />
                                  <Route path="/stock-movement" element={<StockMovement />} />
                                  <Route path="/vehicle-mileage" element={<VehicleMileageReport />} />
                                  <Route path="/price-history" element={<PurchasePriceHistory />} />
                                  <Route path="/bulk-vehicles" element={<BulkVehicles />} />
                                  <Route path="/edit-vehicles" element={<EditVehicles />} />
                                  <Route path="/custody" element={<CustodyHome />} />
                                  <Route path="/custody/representatives" element={<CustodyRepresentatives />} />
                                  <Route path="/custody/transfers" element={<CustodyTransfers />} />
                                  <Route path="/custody/expenses" element={<CustodyExpenses />} />
                                  <Route path="/custody/records" element={<CustodyRecords />} />
                                  <Route path="/custody/filter" element={<CustodyFilter />} />
                                  <Route path="/custody/journal" element={<CustodyJournalEntries />} />
                                  <Route path="/custody/smart-journal" element={<CustodySmartJournal />} />
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
            </PermissionsProvider>
          </EmployeeTransactionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
