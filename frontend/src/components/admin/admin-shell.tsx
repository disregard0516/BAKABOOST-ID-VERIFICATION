"use client";

import type {
  ElementType,
  ReactNode,
} from "react";

import {
  Activity,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  clearAdminToken,
} from "@/lib/admin-api";


interface AdminShellProps {
  children: ReactNode;
}


export function AdminShell({
  children,
}: AdminShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(false);


  function navigate(
    href: string,
  ): void {
    setMobileOpen(false);

    router.push(
      href,
    );
  }


  function logout(): void {
    clearAdminToken();

    router.replace(
      "/admin/login",
    );
  }


  const overviewActive =
    pathname ===
    "/admin";

  const queueActive =
    pathname ===
      "/admin/verification-queue" ||
    (
      pathname.startsWith(
        "/admin/verification-requests/",
      ) &&
      !pathname.startsWith(
        "/admin/verification-requests/new",
      )
    );

  const createRequestActive =
    pathname.startsWith(
      "/admin/verification-requests/new",
    );


  return (
    <div
      className="
        admin-surface
        min-h-screen
        bg-[#090f18]
        text-white
      "
    >
      <aside
        className="
          fixed
          inset-y-0
          left-0
          z-40
          hidden
          w-[260px]
          border-r
          border-white/[0.06]
          bg-[#09111b]/95
          backdrop-blur-xl
          lg:block
        "
      >
        <div
          className="
            flex
            h-[76px]
            items-center
            border-b
            border-white/[0.06]
            px-5
          "
        >
          <button
            type="button"
            onClick={() => {
              navigate(
                "/admin",
              );
            }}
            className="
              group
              flex
              items-center
              gap-3
              text-left
            "
          >
            <div
              className="
                flex
                size-10
                items-center
                justify-center
                rounded-[14px]
                bg-[linear-gradient(145deg,#7967ff,#5544df)]
                shadow-[0_12px_32px_rgba(92,73,226,0.28)]
                transition
                group-hover:scale-[1.03]
              "
            >
              <ShieldCheck
                className="size-5"
                aria-hidden="true"
              />
            </div>

            <div>
              <div
                className="
                  text-sm
                  font-bold
                  tracking-[-0.025em]
                  text-white
                "
              >
                Verification Ops
              </div>

              <div
                className="
                  mt-0.5
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.13em]
                  text-slate-600
                "
              >
                Secure review console
              </div>
            </div>
          </button>
        </div>


        <nav
          className="
            flex
            h-[calc(100%-76px)]
            flex-col
            px-3
            py-5
          "
          aria-label="Administrator navigation"
        >
          <NavSectionLabel>
            Operations
          </NavSectionLabel>

          <AdminNavItem
            icon={
              LayoutDashboard
            }
            label="Overview"
            active={
              overviewActive
            }
            onClick={() => {
              navigate(
                "/admin",
              );
            }}
          />

          <AdminNavItem
            icon={
              FileCheck2
            }
            label="Verification Queue"
            active={
              queueActive
            }
            onClick={() => {
              navigate(
                "/admin/verification-queue",
              );
            }}
          />

          <AdminNavItem
            icon={
              Plus
            }
            label="Create Request"
            active={
              createRequestActive
            }
            onClick={() => {
              navigate(
                "/admin/verification-requests/new",
              );
            }}
          />


          <div
            className="
              my-4
              h-px
              bg-white/[0.06]
            "
          />


          <NavSectionLabel>
            Administration
          </NavSectionLabel>

          <AdminNavItem
            icon={
              Users
            }
            label="Reviewers"
            disabled
          />

          <AdminNavItem
            icon={
              Activity
            }
            label="Audit Activity"
            disabled
          />

          <AdminNavItem
            icon={
              Settings
            }
            label="Settings"
            disabled
          />


          <div
            className="
              mt-auto
              pt-5
            "
          >
            <div
              className="
                mb-3
                rounded-[16px]
                border
                border-white/[0.06]
                bg-white/[0.025]
                p-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2.5
                "
              >
                <div
                  className="
                    flex
                    size-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-[11px]
                    bg-violet-500/10
                    text-[9px]
                    font-bold
                    text-violet-300
                  "
                >
                  AD
                </div>

                <div className="min-w-0">
                  <div
                    className="
                      truncate
                      text-[10px]
                      font-semibold
                      text-slate-300
                    "
                  >
                    Administrator
                  </div>

                  <div
                    className="
                      mt-0.5
                      flex
                      items-center
                      gap-1.5
                      text-[8px]
                      text-slate-600
                    "
                  >
                    <span
                      className="
                        size-1.5
                        rounded-full
                        bg-emerald-500
                      "
                    />

                    Protected session
                  </div>
                </div>
              </div>
            </div>


            <button
              type="button"
              onClick={
                logout
              }
              className="
                flex
                min-h-11
                w-full
                items-center
                gap-3
                rounded-xl
                px-3
                py-2.5
                text-xs
                font-semibold
                text-slate-500
                transition
                hover:bg-white/[0.05]
                hover:text-white
              "
            >
              <LogOut
                className="size-4"
                aria-hidden="true"
              />

              End admin session
            </button>
          </div>
        </nav>
      </aside>


      {mobileOpen && (
        <div
          className="
            fixed
            inset-0
            z-[80]
            lg:hidden
          "
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setMobileOpen(
                false,
              );
            }}
            className="
              absolute
              inset-0
              bg-black/75
              backdrop-blur-sm
            "
          />

          <aside
            className="
              relative
              z-10
              flex
              h-full
              w-[292px]
              flex-col
              border-r
              border-white/[0.07]
              bg-[#09111b]
              p-4
              shadow-[25px_0_80px_rgba(0,0,0,0.4)]
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <button
                type="button"
                onClick={() => {
                  navigate(
                    "/admin",
                  );
                }}
                className="
                  flex
                  items-center
                  gap-3
                  text-left
                "
              >
                <div
                  className="
                    flex
                    size-9
                    items-center
                    justify-center
                    rounded-[12px]
                    bg-violet-500
                    text-white
                  "
                >
                  <ShieldCheck
                    className="size-4"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <div
                    className="
                      text-xs
                      font-bold
                      text-white
                    "
                  >
                    Verification Ops
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.1em]
                      text-slate-600
                    "
                  >
                    Admin console
                  </div>
                </div>
              </button>


              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => {
                  setMobileOpen(
                    false,
                  );
                }}
                className="
                  flex
                  size-10
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-500
                  transition
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                <X
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>


            <div
              className="
                mt-7
                space-y-1
              "
            >
              <MobileAdminLink
                icon={
                  LayoutDashboard
                }
                label="Overview"
                active={
                  overviewActive
                }
                onClick={() => {
                  navigate(
                    "/admin",
                  );
                }}
              />

              <MobileAdminLink
                icon={
                  FileCheck2
                }
                label="Verification Queue"
                active={
                  queueActive
                }
                onClick={() => {
                  navigate(
                    "/admin/verification-queue",
                  );
                }}
              />

              <MobileAdminLink
                icon={
                  Plus
                }
                label="Create Request"
                active={
                  createRequestActive
                }
                onClick={() => {
                  navigate(
                    "/admin/verification-requests/new",
                  );
                }}
              />
            </div>


            <div
              className="
                mt-auto
                border-t
                border-white/[0.06]
                pt-4
              "
            >
              <button
                type="button"
                onClick={
                  logout
                }
                className="
                  flex
                  min-h-11
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-3
                  text-xs
                  font-semibold
                  text-slate-500
                  transition
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                <LogOut
                  className="size-4"
                  aria-hidden="true"
                />

                End admin session
              </button>
            </div>
          </aside>
        </div>
      )}


      <div
        className="
          min-h-screen
          lg:pl-[260px]
        "
      >
        <header
          className="
            sticky
            top-0
            z-30
            flex
            h-[76px]
            items-center
            justify-between
            border-b
            border-white/[0.06]
            bg-[#0d1520]/85
            px-4
            backdrop-blur-xl
            sm:px-7
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
            "
          >
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => {
                setMobileOpen(
                  true,
                );
              }}
              className="
                mr-3
                flex
                size-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/[0.07]
                bg-white/[0.03]
                text-slate-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
                lg:hidden
              "
            >
              <Menu
                className="size-4"
                aria-hidden="true"
              />
            </button>


            <div className="min-w-0">
              <div
                className="
                  truncate
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                  text-slate-600
                "
              >
                Administrator workspace
              </div>

              <div
                className="
                  mt-0.5
                  truncate
                  text-xs
                  font-bold
                  text-slate-200
                  sm:text-sm
                "
              >
                Manual Verification Review
              </div>
            </div>
          </div>


          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            <button
              type="button"
              aria-label="Open verification search"
              onClick={() => {
                navigate(
                  "/admin/verification-queue",
                );
              }}
              className="
                flex
                size-10
                items-center
                justify-center
                rounded-xl
                border
                border-white/[0.07]
                bg-white/[0.03]
                text-slate-400
                transition
                hover:bg-white/[0.07]
                hover:text-white
              "
            >
              <Search
                className="size-4"
                aria-hidden="true"
              />
            </button>


            <div
              className="
                ml-1
                hidden
                items-center
                gap-3
                rounded-[13px]
                border
                border-white/[0.06]
                bg-white/[0.025]
                py-1.5
                pl-2
                pr-3
                sm:flex
              "
            >
              <div
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-violet-500/15
                  text-[9px]
                  font-bold
                  text-violet-300
                "
              >
                AD
              </div>

              <div>
                <div
                  className="
                    text-[9px]
                    font-semibold
                    text-slate-300
                  "
                >
                  Administrator
                </div>

                <div
                  className="
                    mt-0.5
                    flex
                    items-center
                    gap-1.5
                    text-[7px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-emerald-500
                  "
                >
                  <span
                    className="
                      size-1
                      rounded-full
                      bg-emerald-500
                    "
                  />

                  Authenticated
                </div>
              </div>
            </div>
          </div>
        </header>


        <main
          className="
            mx-auto
            max-w-[1600px]
            p-4
            sm:p-6
            xl:p-8
          "
        >
          {children}
        </main>
      </div>
    </div>
  );
}


function NavSectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="
        px-3
        pb-2
        text-[8px]
        font-bold
        uppercase
        tracking-[0.12em]
        text-slate-700
      "
    >
      {children}
    </div>
  );
}


function AdminNavItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={`
        mb-1
        flex
        min-h-11
        w-full
        items-center
        gap-3
        rounded-xl
        px-3
        py-2.5
        text-left
        text-xs
        font-semibold
        transition
        ${
          disabled
            ? `
                cursor-not-allowed
                text-slate-800
              `
            : active
              ? `
                  bg-violet-500/10
                  text-violet-200
                  shadow-[inset_0_0_0_1px_rgba(139,113,255,0.08)]
                `
              : `
                  text-slate-500
                  hover:bg-white/[0.04]
                  hover:text-slate-200
                `
        }
      `}
    >
      <Icon
        className="size-4"
        aria-hidden="true"
      />

      <span className="flex-1">
        {label}
      </span>

      {disabled && (
        <span
          className="
            rounded-full
            border
            border-white/[0.05]
            px-1.5
            py-0.5
            text-[6px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-slate-800
          "
        >
          Later
        </span>
      )}
    </button>
  );
}


function MobileAdminLink({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        min-h-11
        w-full
        items-center
        gap-3
        rounded-xl
        px-3
        py-3
        text-left
        text-xs
        font-semibold
        transition
        ${
          active
            ? `
                bg-violet-500/10
                text-violet-200
              `
            : `
                text-slate-400
                hover:bg-white/[0.05]
                hover:text-white
              `
        }
      `}
    >
      <Icon
        className="size-4"
        aria-hidden="true"
      />

      {label}
    </button>
  );
}