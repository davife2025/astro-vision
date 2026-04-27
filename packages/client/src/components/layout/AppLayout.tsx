import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Telescope,
  Compass,
  BookOpen,
  Users,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/", icon: Telescope, label: "Observation", description: "Analyze images" },
  { to: "/explore", icon: Compass, label: "Explore", description: "Galaxy feed" },
  { to: "/observatory", icon: BookOpen, label: "Observatory", description: "Your observations" },
  { to: "/community", icon: Users, label: "Community", description: "Discussions" },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden star-field">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:relative z-50 flex flex-col h-full border-r border-white/[0.06] bg-void-950/90 backdrop-blur-2xl transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nebula-500 to-cosmic-600 flex items-center justify-center shrink-0">
            <Telescope className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-semibold text-sm tracking-tight text-white truncate">
                AstroVision
              </h1>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                Research Platform
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-nebula-600/15 text-nebula-300 border border-nebula-500/20"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                )
              }
            >
              <item.icon
                className={clsx(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  location.pathname === item.to || (item.to === "/" && location.pathname === "/")
                    ? "text-nebula-400"
                    : "text-white/40 group-hover:text-white/60"
                )}
              />
              {!collapsed && (
                <div className="overflow-hidden">
                  <span className="text-sm font-medium block truncate">{item.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-white/[0.06] space-y-1 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all w-full"
          >
            <ChevronLeft
              className={clsx(
                "w-[18px] h-[18px] transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — mobile menu + page context */}
        <header className="flex items-center gap-4 px-6 h-14 border-b border-white/[0.06] bg-void-950/60 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-white/50 hover:text-white/80 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-aurora-400 animate-pulse-slow" />
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
              {NAV_ITEMS.find(
                (n) =>
                  n.to === location.pathname ||
                  (n.to === "/" && location.pathname === "/")
              )?.label || "AstroVision"}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="text-[11px] font-mono text-white/30">
              v1.0.0
            </div>
            <button className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-all">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
