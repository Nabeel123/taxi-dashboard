"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  PieChartIcon,
  TableIcon,
  TaskIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  /** Optional alternative active matcher (e.g. nested routes). */
  matchPrefix?: string;
  subItems?: { name: string; path: string }[];
};

interface MenuGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: MenuGroup[] = [
  {
    id: "ops",
    label: "Operations",
    items: [
      { name: "Dashboard", icon: <GridIcon />, path: "/" },
      { name: "Bookings", icon: <TableIcon />, path: "/bookings", matchPrefix: "/bookings" },
      { name: "Calendar", icon: <CalenderIcon />, path: "/calendar" },
      { name: "Drivers", icon: <TaskIcon />, path: "/drivers" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { name: "Analytics", icon: <PieChartIcon />, path: "/analytics" },
      { name: "Customers", icon: <GroupIcon />, path: "/customers" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { name: "Account", icon: <UserCircleIcon />, path: "/account" },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (!item.path) return false;
  if (item.path === "/") return pathname === "/";
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  }
  return pathname === item.path;
}

function isSubpathActive(subPath: string, pathname: string): boolean {
  return pathname === subPath || pathname.startsWith(`${subPath}/`);
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  /**
   * Submenu open state. Initialized lazily from the current pathname so we never call
   * setState inside an effect (the React 19 lint rule forbids cascading renders), and
   * we only mutate it on explicit user toggles.
   */
  const [openSubmenu, setOpenSubmenu] = useState<{ groupId: string; index: number } | null>(() => {
    for (const group of NAV_GROUPS) {
      const idx = group.items.findIndex((nav) =>
        nav.subItems?.some((s) => isSubpathActive(s.path, pathname)),
      );
      if (idx !== -1) return { groupId: group.id, index: idx };
    }
    return null;
  });

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* Measure the open submenu's natural height so we can animate it open/closed. */
  useEffect(() => {
    if (!openSubmenu) return;
    const key = `${openSubmenu.groupId}-${openSubmenu.index}`;
    const el = subMenuRefs.current[key];
    if (!el) return;
    const next = el.scrollHeight;
    setSubMenuHeight((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
  }, [openSubmenu]);

  const handleSubmenuToggle = useCallback((groupId: string, index: number) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.groupId === groupId && prev.index === index) return null;
      return { groupId, index };
    });
  }, []);

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-7 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30"
          >
            <TaxiGlyph />
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="flex flex-col">
              <span className="text-base font-semibold leading-tight text-gray-900 dark:text-white/90">
                Arlanda Taxi
              </span>
              <span className="text-xs leading-tight text-gray-500 dark:text-gray-400">Dispatch dashboard</span>
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.id}>
                <h2
                  className={`mb-3 flex text-xs font-medium uppercase leading-[20px] tracking-wider text-gray-400 ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? group.label : <HorizontaLDots />}
                </h2>
                <ul className="flex flex-col gap-1">
                  {group.items.map((nav, index) => {
                    const isOpen = openSubmenu?.groupId === group.id && openSubmenu?.index === index;
                    const submenuKey = `${group.id}-${index}`;
                    return (
                      <li key={nav.name}>
                        {nav.subItems ? (
                          <button
                            type="button"
                            onClick={() => handleSubmenuToggle(group.id, index)}
                            className={`menu-item group ${
                              isOpen ? "menu-item-active" : "menu-item-inactive"
                            } cursor-pointer ${
                              !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                            }`}
                            aria-expanded={isOpen}
                          >
                            <span className={isOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                              {nav.icon}
                            </span>
                            {(isExpanded || isHovered || isMobileOpen) && (
                              <span className="menu-item-text">{nav.name}</span>
                            )}
                            {(isExpanded || isHovered || isMobileOpen) && (
                              <ChevronDownIcon
                                className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-brand-500" : ""
                                }`}
                              />
                            )}
                          </button>
                        ) : (
                          nav.path && (
                            <Link
                              href={nav.path}
                              className={`menu-item group ${
                                isItemActive(nav, pathname) ? "menu-item-active" : "menu-item-inactive"
                              }`}
                              aria-current={isItemActive(nav, pathname) ? "page" : undefined}
                            >
                              <span
                                className={
                                  isItemActive(nav, pathname)
                                    ? "menu-item-icon-active"
                                    : "menu-item-icon-inactive"
                                }
                              >
                                {nav.icon}
                              </span>
                              {(isExpanded || isHovered || isMobileOpen) && (
                                <span className="menu-item-text">{nav.name}</span>
                              )}
                            </Link>
                          )
                        )}

                        {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                          <div
                            ref={(el) => {
                              subMenuRefs.current[submenuKey] = el;
                            }}
                            className="overflow-hidden transition-all duration-300"
                            style={{ height: isOpen ? `${subMenuHeight[submenuKey] ?? 0}px` : "0px" }}
                          >
                            <ul className="ml-9 mt-1 space-y-1">
                              {nav.subItems.map((subItem) => (
                                <li key={subItem.name}>
                                  <Link
                                    href={subItem.path}
                                    className={`menu-dropdown-item ${
                                      isSubpathActive(subItem.path, pathname)
                                        ? "menu-dropdown-item-active"
                                        : "menu-dropdown-item-inactive"
                                    }`}
                                  >
                                    {subItem.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        {(isExpanded || isHovered || isMobileOpen) && <SidebarWidget />}
      </div>
    </aside>
  );
};

function TaxiGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <rect x="3" y="11" width="18" height="6" rx="2" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
      <path d="M9 5V3h6v2" />
    </svg>
  );
}

export default AppSidebar;
