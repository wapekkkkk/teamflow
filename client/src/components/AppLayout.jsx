import Sidebar from "./Sidebar";

function AppLayout({ children, rightSidebar = null }) {
  return (
    <div className={`app-layout ${rightSidebar ? "has-right-sidebar" : ""}`}>
      <Sidebar />
      <main className="layout-content">{children}</main>
      {rightSidebar ? <aside className="right-sidebar">{rightSidebar}</aside> : null}
    </div>
  );
}

export default AppLayout;