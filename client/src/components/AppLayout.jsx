import { useState, cloneElement } from "react";
import Sidebar from "./Sidebar";

function AppLayout({
  children,
  rightSidebar = null,
  defaultRightSidebarCollapsed = false,
}) {
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(
    defaultRightSidebarCollapsed
  );

  return (
    <div
      className={`app-layout ${rightSidebar ? "has-right-sidebar" : ""} ${
        isRightSidebarCollapsed ? "right-sidebar-collapsed" : ""
      }`}
    >
      <Sidebar />
      <main className="layout-content">{children}</main>

      {rightSidebar ? (
        <aside
          className={`right-sidebar ${
            isRightSidebarCollapsed ? "collapsed" : ""
          }`}
        >
          {cloneElement(rightSidebar, {
            collapsed: isRightSidebarCollapsed,
            onToggleCollapse: () =>
              setIsRightSidebarCollapsed((prev) => !prev),
          })}
        </aside>
      ) : null}
    </div>
  );
}

export default AppLayout;