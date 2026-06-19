import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";

export function App() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <main className="boot-screen">
        <div className="spinner" />
      </main>
    );
  }

  return user ? <DashboardPage /> : <LoginPage />;
}
