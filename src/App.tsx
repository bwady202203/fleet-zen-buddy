import { lazy, Suspense } from "react";
import LoadingCup from "@/components/LoadingCup";
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
import SammanOnlyGuard from "@/components/SammanOnlyGuard";
import { AppLayout } from "@/components/AppLayout";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AccountReport = lazy(() => import("./pages/AccountReport"));
const Index = lazy(() => import("./pages/Index"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Auth = lazy(() => import("./pages/Auth"));
const UsersManagement = lazy(() => import("./pages/UsersManagement"));
const OrganizationsManagement = lazy(() => import("./pages/OrganizationsManagement"));
const Accounting = lazy(() => import("./pages/Accounting"));
const CustodyHome = lazy(() => import("./pages/custody/CustodyHome"));
const CustodyRepresentatives = lazy(() => import("./pages/custody/CustodyRepresentatives"));
const CustodyTransfers = lazy(() => import("./pages/custody/CustodyTransfers"));
const CustodyExpenses = lazy(() => import("./pages/custody/CustodyExpenses"));
const CustodyRecords = lazy(() => import("./pages/custody/CustodyRecords"));
const CustodyFilter = lazy(() => import("./pages/custody/CustodyFilter"));
const CustodyJournalEntries = lazy(() => import("./pages/custody/CustodyJournalEntries"));
const CustodySmartJournal = lazy(() => import("./pages/custody/CustodySmartJournal"));
const CustodyCombinedStatement = lazy(() => import("./pages/custody/CustodyCombinedStatement"));
const TransferRequests = lazy(() => import("./pages/accounting/TransferRequests"));
const TransferRequestsArchive = lazy(() => import("./pages/accounting/TransferRequestsArchive"));
const ChartOfAccounts = lazy(() => import("./pages/accounting/ChartOfAccounts"));
const JournalEntries = lazy(() => import("./pages/accounting/JournalEntries"));
const JournalEntriesReports = lazy(() => import("./pages/accounting/JournalEntriesReports"));
const LedgerNew = lazy(() => import("./pages/accounting/LedgerNew"));
const TrialBalance = lazy(() => import("./pages/accounting/TrialBalance"));
const TrialBalanceNew = lazy(() => import("./pages/accounting/TrialBalanceNew"));
const SalesInvoice = lazy(() => import("./pages/accounting/SalesInvoice"));
const PurchaseInvoice = lazy(() => import("./pages/accounting/PurchaseInvoice"));
const SalesReturn = lazy(() => import("./pages/accounting/SalesReturn"));
const PurchaseReturn = lazy(() => import("./pages/accounting/PurchaseReturn"));
const BalanceSheet = lazy(() => import("./pages/accounting/BalanceSheet"));
const IncomeStatement = lazy(() => import("./pages/accounting/IncomeStatement"));
const CostCenters = lazy(() => import("./pages/accounting/CostCenters"));
const Branches = lazy(() => import("./pages/accounting/Branches"));
const Projects = lazy(() => import("./pages/accounting/Projects"));
const CrusherApp = lazy(() => import("./pages/accounting/CrusherApp"));
const CrusherPro = lazy(() => import("./pages/accounting/CrusherPro"));
const CrusherShipments = lazy(() => import("./pages/accounting/CrusherShipments"));
const CrusherData = lazy(() => import("./pages/accounting/CrusherData"));
const GroupApp = lazy(() => import("./pages/accounting/GroupApp"));
const SpecialInvoicesApp = lazy(() => import("./pages/accounting/SpecialInvoicesApp"));
const DataCards = lazy(() => import("./pages/DataCards"));
const HrPortalApp = lazy(() => import("./pages/hr/HrPortalApp"));
const ReportsHub = lazy(() => import("./pages/ReportsHub"));

const PaymentVouchers = lazy(() => import("./pages/accounting/PaymentVouchers"));
const CollectionReceipts = lazy(() => import("./pages/accounting/CollectionReceipts"));
const PurchaseOrder = lazy(() => import("./pages/accounting/PurchaseOrder"));
const Level4Balances = lazy(() => import("./pages/accounting/Level4Balances"));
const SmartJournalEntries = lazy(() => import("./pages/accounting/SmartJournalEntries"));
const BankStatementImport = lazy(() => import("./pages/accounting/BankStatementImport"));
const JournalWithDocument = lazy(() => import("./pages/accounting/JournalWithDocument"));
const DocumentsArchive = lazy(() => import("./pages/DocumentsArchive"));
const RiyadhBankSmartEntries = lazy(() => import("./pages/accounting/RiyadhBankSmartEntries"));
const BankReconciliation = lazy(() => import("./pages/accounting/BankReconciliation"));
const RiyadhBankPaymentEntries = lazy(() => import("./pages/accounting/RiyadhBankPaymentEntries"));
const BankDepositsEntries = lazy(() => import("./pages/accounting/BankDepositsEntries"));
const BankPaymentVoucher = lazy(() => import("./pages/accounting/BankPaymentVoucher"));
const BankCollectionReceipt = lazy(() => import("./pages/accounting/BankCollectionReceipt"));
const ImportantBalances = lazy(() => import("./pages/accounting/ImportantBalances"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SettingsHub = lazy(() => import("./pages/SettingsHub"));
const Vouchers = lazy(() => import("./pages/Vouchers"));
const HR = lazy(() => import("./pages/HR"));
const Loads = lazy(() => import("./pages/Loads"));
const LoadsRegister = lazy(() => import("./pages/loads/LoadsRegister"));
const PremiumLoadsRegister = lazy(() => import("./pages/loads/PremiumLoadsRegister"));
const PremiumLoadsReport = lazy(() => import("./pages/loads/PremiumLoadsReport"));
const CompanyMaterialPrices = lazy(() => import("./pages/loads/CompanyMaterialPrices"));
const CostSettings = lazy(() => import("./pages/loads/CostSettings"));
const GeneralCostReport = lazy(() => import("./pages/loads/GeneralCostReport"));
const DieselConsumption = lazy(() => import("./pages/loads/DieselConsumption"));
const LoadsList = lazy(() => import("./pages/loads/LoadsList"));
const AdvancedLoadsList = lazy(() => import("./pages/loads/AdvancedLoadsList"));
const SimpleLoadsList = lazy(() => import("./pages/loads/SimpleLoadsList"));
const EditLoad = lazy(() => import("./pages/loads/EditLoad"));
const DriversManagement = lazy(() => import("./pages/loads/DriversManagement"));
const CompaniesManagement = lazy(() => import("./pages/loads/CompaniesManagement"));
const LoadInvoices = lazy(() => import("./pages/loads/LoadInvoices"));
const PaymentReceipts = lazy(() => import("./pages/loads/PaymentReceipts"));
const LoadReports = lazy(() => import("./pages/loads/LoadReports"));
const DriversPaymentReport = lazy(() => import("./pages/loads/DriversPaymentReport"));
const DriverLoadsSummary = lazy(() => import("./pages/loads/DriverLoadsSummary"));
const DailyReports = lazy(() => import("./pages/loads/DailyReports"));
const LoadTypes = lazy(() => import("./pages/loads/LoadTypes"));
const SuppliersManagement = lazy(() => import("./pages/loads/SuppliersManagement"));
const DeliveryReceipts = lazy(() => import("./pages/loads/DeliveryReceipts"));
const CommissionsReport = lazy(() => import("./pages/loads/CommissionsReport"));
const CustomerStatement = lazy(() => import("./pages/loads/CustomerStatement"));
const Employees = lazy(() => import("./pages/hr/Employees"));
const EmployeeViolations = lazy(() => import("./pages/hr/EmployeeViolations"));
const Payroll = lazy(() => import("./pages/hr/Payroll"));
const Advances = lazy(() => import("./pages/hr/Advances"));
const Additions = lazy(() => import("./pages/hr/Additions"));
const HrAutoJournal = lazy(() => import("./pages/hr/HrAutoJournal"));
const ExternalPayrollSheets = lazy(() => import("./pages/hr/ExternalPayrollSheets"));
const Deductions = lazy(() => import("./pages/hr/Deductions"));
const Leaves = lazy(() => import("./pages/hr/Leaves"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const BulkEmployees = lazy(() => import("./pages/BulkEmployees"));
const BulkSpareParts = lazy(() => import("./pages/BulkSpareParts"));
const MaintenanceReports = lazy(() => import("./pages/MaintenanceReports"));
const SpareParts = lazy(() => import("./pages/SpareParts"));
const LowStockAlerts = lazy(() => import("./pages/LowStockAlerts"));
const Purchases = lazy(() => import("./pages/Purchases"));
const PurchasePOS = lazy(() => import("./pages/PurchasePOS"));
const StockMovement = lazy(() => import("./pages/StockMovement"));
const VehicleMileageReport = lazy(() => import("./pages/VehicleMileageReport"));
const PurchasePriceHistory = lazy(() => import("./pages/PurchasePriceHistory"));
const BulkVehicles = lazy(() => import("./pages/BulkVehicles"));
const EditVehicles = lazy(() => import("./pages/EditVehicles"));
const VehicleMaintenanceCosts = lazy(() => import("./pages/VehicleMaintenanceCosts"));
const VehicleCostReport = lazy(() => import("./pages/VehicleCostReport"));
const MaintenancePurchaseInvoices = lazy(() => import("./pages/MaintenancePurchaseInvoices"));
const NewMaintenanceOrder = lazy(() => import("./pages/NewMaintenanceOrder"));
const MaintenanceOrdersReport = lazy(() => import("./pages/MaintenanceOrdersReport"));
const VehicleMaintenanceReport = lazy(() => import("./pages/VehicleMaintenanceReport"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ZatcaHome = lazy(() => import("./pages/zatca/ZatcaHome"));
const ZatcaInvoices = lazy(() => import("./pages/zatca/ZatcaInvoices"));
const ZatcaSubmission = lazy(() => import("./pages/zatca/ZatcaSubmission"));
const ZatcaCompliance = lazy(() => import("./pages/zatca/ZatcaCompliance"));
const ZatcaXml = lazy(() => import("./pages/zatca/ZatcaXml"));
const ZatcaCertificates = lazy(() => import("./pages/zatca/ZatcaCertificates"));
const ZatcaSettings = lazy(() => import("./pages/zatca/ZatcaSettings"));
const ZatcaAuditLog = lazy(() => import("./pages/zatca/ZatcaAuditLog"));
const ZatcaReports = lazy(() => import("./pages/zatca/ZatcaReports"));
const ZatcaAiAssistant = lazy(() => import("./pages/zatca/ZatcaAiAssistant"));

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
                          <Suspense fallback={<LoadingCup />} >
                          <Routes>
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/employee-violations/login" element={<Auth returnTo="/employee-violations" />} />
                            <Route path="/employee-violations" element={<ProtectedRoute loginPath="/employee-violations/login"><EmployeeViolations standalone /></ProtectedRoute>} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            
                            {/* Protected Routes with Icons Bar */}
                            <Route path="/*" element={
                              <ProtectedRoute>
                                <SammanOnlyGuard>
                                <AppLayout>
                                <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/account-report" element={<AccountReport />} />
                                  <Route path="/vouchers" element={<Vouchers />} />
                                  <Route path="/accounting/vouchers" element={<Vouchers />} />
                                  <Route path="/users" element={<UsersManagement />} />
                                  <Route path="/admin-panel" element={<AdminPanel />} />
                                  <Route path="/settings-hub" element={<SettingsHub />} />
                                  <Route path="/organizations" element={<OrganizationsManagement />} />
                                  <Route path="/fleet" element={<Index />} />
                                  <Route path="/fleet/vehicles" element={<Vehicles />} />
                                  <Route path="/accounting" element={<Accounting />} />
                                  <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                                  <Route path="/accounting/journal-entries" element={<JournalEntries />} />
                                  <Route path="/accounting/journal-entries/new" element={<JournalEntries />} />
                                  <Route path="/accounting/payment-vouchers" element={<PaymentVouchers />} />
                                  <Route path="/accounting/collection-receipts" element={<CollectionReceipts />} />
                                  <Route path="/accounting/purchase-order" element={<PurchaseOrder />} />
                                  <Route path="/accounting/journal-entries-reports" element={<JournalEntriesReports />} />
                                  <Route path="/accounting/ledger" element={<LedgerNew />} />
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
<Route path="/accounting/crusher" element={<CrusherApp />} />
<Route path="/accounting/crusher-pro" element={<CrusherPro />} />
<Route path="/accounting/crusher-shipments" element={<CrusherShipments />} />
<Route path="/accounting/crusher-data" element={<CrusherData />} />
<Route path="/accounting/group-app" element={<GroupApp />} />
<Route path="/samman/new" element={<CrusherPro />} />
<Route path="/samman/shipments" element={<CrusherShipments />} />
<Route path="/samman/data" element={<CrusherData />} />
                                  <Route path="/accounting/special-invoices" element={<SpecialInvoicesApp />} />
                                  <Route path="/data" element={<DataCards />} />
                                  <Route path="/reports" element={<ReportsHub />} />

                                  <Route path="/hr/portal" element={<HrPortalApp />} />
                                  <Route path="/accounting/level4-balances" element={<Level4Balances />} />
                                  <Route path="/accounting/smart-journal" element={<SmartJournalEntries />} />
                                  <Route path="/accounting/bank-statement" element={<BankStatementImport />} />
                                  <Route path="/accounting/journal-document-entry" element={<JournalWithDocument />} />
                                  <Route path="/documents-archive" element={<DocumentsArchive />} />
                                  <Route path="/accounting/riyadh-bank-smart" element={<RiyadhBankSmartEntries />} />
                                  <Route path="/accounting/riyadh-bank-payment" element={<RiyadhBankPaymentEntries />} />
                                  <Route path="/accounting/bank-deposits" element={<BankDepositsEntries />} />
                                  <Route path="/accounting/bank-payment-voucher" element={<BankPaymentVoucher />} />
                                 <Route path="/accounting/bank-collection-receipt" element={<BankCollectionReceipt />} />
                                  <Route path="/hr" element={<HR />} />
                                  <Route path="/hr/employees" element={<Employees />} />
                                  <Route path="/hr/employee-violations" element={<EmployeeViolations />} />
                                  <Route path="/hr/payroll" element={<Payroll />} />
                                  <Route path="/hr/advances" element={<Advances />} />
                                  <Route path="/hr/additions" element={<Additions />} />
                                  <Route path="/hr/deductions" element={<Deductions />} />
                                  <Route path="/hr/auto-journal" element={<HrAutoJournal />} />
                                  <Route path="/hr/external-payroll-sheets" element={<ExternalPayrollSheets />} />
                  <Route path="/hr/leaves" element={<Leaves />} />
                  <Route path="/hr/attendance" element={<Attendance />} />
                  <Route path="/hr/bulk-employees" element={<BulkEmployees />} />
                                  <Route path="/loads" element={<Loads />} />
                                  <Route path="/loads/register" element={<LoadsRegister />} />
                                  <Route path="/loads/premium-register" element={<PremiumLoadsRegister />} />
                                  <Route path="/loads/premium-report" element={<PremiumLoadsReport />} />
                                  <Route path="/loads/company-material-prices" element={<CompanyMaterialPrices />} />
                                  <Route path="/loads/cost-settings" element={<CostSettings />} />
                                  <Route path="/loads/general-cost-report" element={<GeneralCostReport />} />
                                  <Route path="/loads/diesel" element={<DieselConsumption />} />
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
                                  <Route path="/loads/driver-loads-summary" element={<DriverLoadsSummary />} />
                                  <Route path="/loads/daily-reports" element={<DailyReports />} />
                                  <Route path="/loads/load-types" element={<LoadTypes />} />
                                  <Route path="/loads/suppliers" element={<SuppliersManagement />} />
                                  <Route path="/loads/delivery-receipts" element={<DeliveryReceipts />} />
                                  <Route path="/loads/commissions-report" element={<CommissionsReport />} />
                                  <Route path="/loads/customer-statement" element={<CustomerStatement />} />
                                  <Route path="/reports" element={<MaintenanceReports />} />
                                  <Route path="/maintenance-costs" element={<VehicleMaintenanceCosts />} />
                                  <Route path="/vehicle-cost-report" element={<VehicleCostReport />} />
                                  <Route path="/maintenance-purchase-invoices" element={<MaintenancePurchaseInvoices />} />
                                  <Route path="/new-maintenance-order" element={<NewMaintenanceOrder />} />
                                  <Route path="/maintenance-orders-report" element={<MaintenanceOrdersReport />} />
                                  <Route path="/vehicle-maintenance-report" element={<VehicleMaintenanceReport />} />
                                  <Route path="/spare-parts" element={<SpareParts />} />
                                  <Route path="/bulk-spare-parts" element={<BulkSpareParts />} />
                                  <Route path="/low-stock-alerts" element={<LowStockAlerts />} />
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
                                 <Route path="/custody/combined-statement" element={<CustodyCombinedStatement />} />
                                  <Route path="/accounting/transfer-requests" element={<TransferRequests />} />
                                  <Route path="/accounting/transfer-requests-archive" element={<TransferRequestsArchive />} />
                                  <Route path="/accounting/important-balances" element={<ImportantBalances />} />
                                  <Route path="/accounting/bank-reconciliation" element={<BankReconciliation />} />
                                  {/* ZATCA - الفوترة الإلكترونية */}
                                  <Route path="/zatca" element={<ZatcaHome />} />
                                  <Route path="/zatca/invoices" element={<ZatcaInvoices />} />
                                  <Route path="/zatca/submission" element={<ZatcaSubmission />} />
                                  <Route path="/zatca/compliance" element={<ZatcaCompliance />} />
                                  <Route path="/zatca/xml" element={<ZatcaXml />} />
                                  <Route path="/zatca/certificates" element={<ZatcaCertificates />} />
                                  <Route path="/zatca/settings" element={<ZatcaSettings />} />
                                  <Route path="/zatca/audit-log" element={<ZatcaAuditLog />} />
                                  <Route path="/zatca/reports" element={<ZatcaReports />} />
                                  <Route path="/zatca/ai-assistant" element={<ZatcaAiAssistant />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                                </AppLayout>
                                </SammanOnlyGuard>
                              </ProtectedRoute>
                            } />
                          </Routes>
                          </Suspense>
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
