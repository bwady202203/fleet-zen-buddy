import { createRoot } from "react-dom/client";
import { EmployeeTransactionsProvider } from "./contexts/EmployeeTransactionsContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <EmployeeTransactionsProvider>
      <PermissionsProvider>
        <App />
      </PermissionsProvider>
    </EmployeeTransactionsProvider>
  </AuthProvider>
);
