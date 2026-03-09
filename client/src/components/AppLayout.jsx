import Sidebar from "./Sidebar";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="layout-content">{children}</main>
    </div>
  );
}

export default AppLayout;