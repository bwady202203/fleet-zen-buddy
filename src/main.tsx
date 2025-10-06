import { createRoot } from "react-dom/client";
import { EmployeeTransactionsProvider } from "./contexts/EmployeeTransactionsContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <EmployeeTransactionsProvider>
    <App />
  </EmployeeTransactionsProvider>
);
