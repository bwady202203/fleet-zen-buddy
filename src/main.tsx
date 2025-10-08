import { createRoot } from "react-dom/client";
import { EmployeeTransactionsProvider } from "./contexts/EmployeeTransactionsContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <EmployeeTransactionsProvider>
    <PermissionsProvider>
      <App />
    </PermissionsProvider>
  </EmployeeTransactionsProvider>
);
