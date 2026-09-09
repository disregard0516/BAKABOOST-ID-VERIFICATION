"use client";

import type {
  ElementType,
  ReactNode,
} from "react";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  logoutAdminSession,
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
  ] = useState(false);


  /*
   * This effect only synchronizes with browser APIs.
   * It does NOT synchronously update React state.
   */
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ): void {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileOpen]);


  function navigate(
    href: string,
  ): void {
    setMobileOpen(false);

    if (pathname === href) {
      return;
    }

    router.push(href);
  }

  async function handleAdminLogout():
    Promise<void> {
    setMobileOpen(false);

    try {
      await logoutAdminSession();
    } finally {
      /*
      * Cloudflare Access owns this endpoint, not Next.js.
      * A full browser navigation is required so Cloudflare
      * can terminate the Access session at the edge.
      */

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href =
        "/cdn-cgi/access/logout";
    }
  }
  
  const overviewActive =
    pathname === "/admin";

  const createRequestActive =
    pathname.startsWith(
      "/admin/verification-requests/new",
    );

  const queueActive =
    pathname ===
      "/admin/verification-queue" ||
    (
      pathname.startsWith(
        "/admin/verification-requests/",
      ) &&
      !createRequestActive
    );


  return (
    <div
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-black
        text-white
      "
    >
      {/* Background decoration */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -left-64
            -top-64
            h-[620px]
            w-[620px]
            rounded-full
            bg-violet-500/[0.07]
            blur-[140px]
          "
        />

        <div
          className="
            absolute
            -right-64
            top-[20%]
            h-[520px]
            w-[520px]
            rounded-full
            bg-indigo-500/[0.05]
            blur-[150px]
          "
        />

        <div
          className="
            absolute
            bottom-[-280px]
            left-[35%]
            h-[500px]
            w-[500px]
            rounded-full
            bg-violet-400/[0.025]
            blur-[150px]
          "
        />
      </div>


      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside
        className="
          fixed
          inset-y-0
          left-0
          z-50
          hidden
          w-[288px]
          flex-col
          border-r
          border-white/[0.06]
          bg-black
          shadow-[20px_0_80px_rgba(0,0,0,0.15)]
          backdrop-blur-2xl
          lg:flex
        "
      >
        {/* Brand */}

        <div
          className="
            flex
            h-[90px]
            shrink-0
            items-center
            border-b
            border-white/[0.06]
            px-5
          "
        >
          <button
            type="button"
            onClick={() => {
              navigate("/admin");
            }}
            className="
              group
              flex
              items-center
              gap-3
              rounded-2xl
              text-left
              outline-none
              transition
              duration-200
              focus-visible:ring-2
              focus-visible:ring-violet-500/40
            "
          >
            <div
              className="
                relative
                flex
                h-[48px]
                w-[48px]
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-[14px]
                border
                border-violet-300/10
                bg-violet-600
                text-white
                shadow-[0_12px_34px_rgba(109,78,230,0.28)]
                transition
                duration-300
                group-hover:-translate-y-0.5
                group-hover:scale-[1.03]
              "
            >
              <Fingerprint
                className="h-9 w-6"
                strokeWidth={2}
                aria-hidden="true"
              />

              <span
                aria-hidden="true"
                className="
                  absolute
                  inset-x-2
                  top-0
                  h-px
                  bg-white/40
                "
              />
            </div>


            <div className="min-w-0">
              <div
                className="
                  truncate
                  text-[15px]
                  font-extrabold
                  tracking-[-0.025em]
                  text-white
                "
              >
                BAKABOOST
              </div>

              <div
                className="
                  mt-0.5
                  truncate
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.15em]
                  text-slate-600
                "
              >
                Verification administration
              </div>
            </div>
          </button>
        </div>


        {/* Navigation */}

        <nav
          className="
            flex
            min-h-0
            flex-1
            flex-col
            px-3
            py-5
          "
          aria-label="Administrator navigation"
        >
          <NavSectionLabel>
            Verification
          </NavSectionLabel>

          <AdminNavItem
            icon={LayoutDashboard}
            label="Overview"
            description="Workspace summary"
            active={overviewActive}
            onClick={() => {
              navigate("/admin");
            }}
          />

          <AdminNavItem
            icon={FileCheck2}
            label="Verification Queue"
            description="Review submitted cases"
            active={queueActive}
            onClick={() => {
              navigate(
                "/admin/verification-queue",
              );
            }}
          />

          <AdminNavItem
            icon={Plus}
            label="Create Request"
            description="Issue a private link"
            active={createRequestActive}
            onClick={() => {
              navigate(
                "/admin/verification-requests/new",
              );
            }}
          />


          <div
            className="
              mx-2
              my-5
              h-px
              bg-white/[0.055]
            "
          />


          <NavSectionLabel>
            Administration
          </NavSectionLabel>

          <AdminNavItem
            icon={Users}
            label="Team & Access"
            description="Team management"
            active={pathname === "/admin/team"}
            onClick={() => {
              navigate(
                "/admin/team",
              );
            }}
          />

          <AdminNavItem
            icon={Activity}
            label="Audit Activity"
            description="Security activity"
            active={pathname === "/admin/audit"}
            onClick={() => {
              navigate(
                "/admin/audit",
              );
            }}
          />

          <AdminNavItem
            icon={Settings}
            label="Settings"
            description="Workspace settings"
            active={pathname === "/admin/settings"}
            onClick={() => {
              navigate(
                "/admin/settings",
              );
            }}
          />


          {/* Session */}

          <div className="mt-auto pt-5">
            <div
              className="
                mb-3
                rounded-[18px]
                border
                border-white/[0.06]
                bg-white/[0.025]
                p-3.5
                shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3.5
                "
              >
                <div
                  className="
                    relative
                    flex
                    h-[52px]
                    w-[52px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-[13px]
                    border
                    border-violet-400/10
                    bg-violet-500/10
                    text-[9px]
                    font-extrabold
                    tracking-[0.04em]
                    text-violet-300
                  "
                >
                  AD

                  <span
                    aria-hidden="true"
                    className="
                      absolute
                      -bottom-0.5
                      -right-0.5
                      h-2.5
                      w-2.5
                      rounded-full
                      border-2
                      border-[#0d1420]
                      bg-emerald-500
                    "
                  />
                </div>


                <div className="min-w-0 flex-1">
                  <div
                    className="
                      truncate
                      text-[12px]
                      font-bold
                      text-slate-300
                    "
                  >
                    Administrator
                  </div>

                  <div
                    className="
                      mt-1
                      flex
                      items-center
                      gap-1.5
                      text-[9px]
                      font-medium
                      text-slate-600
                    "
                  >
                    <ShieldCheck
                      className="h-3 w-3"
                      aria-hidden="true"
                    />

                    Protected session
                  </div>
                </div>


                <BadgeCheck
                  className="
                    h-4
                    w-4
                    shrink-0
                    text-emerald-500
                  "
                  aria-hidden="true"
                />
              </div>
            </div>


            <button
              type="button"
              onClick={() => {
                void handleAdminLogout();
              }}
              className="
                group
                flex
                min-h-[48px]
                w-full
                items-center
                gap-3
                rounded-[13px]
                px-3
                py-2.5
                text-[15px]
                font-semibold
                text-slate-500
                outline-none
                transition
                duration-200
                hover:bg-white/[0.045]
                hover:text-slate-200
                focus-visible:ring-2
                focus-visible:ring-violet-500/30
              "
            >
              <LockKeyhole
                className="
                  h-4
                  w-4
                  transition
                  duration-200
                  group-hover:scale-105
                "
                aria-hidden="true"
              />

              <span>
                End admin session
              </span>

              <ArrowRight
                className="
                  ml-auto
                  h-3.5
                  w-3.5
                  opacity-40
                  transition
                  duration-200
                  group-hover:translate-x-0.5
                  group-hover:opacity-100
                "
                aria-hidden="true"
              />
            </button>
          </div>
        </nav>
      </aside>


      {/* =====================================================
          MOBILE DRAWER
      ====================================================== */}

      {mobileOpen ? (
        <div
          className="
            fixed
            inset-0
            z-[100]
            lg:hidden
          "
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setMobileOpen(false);
            }}
            className="
              absolute
              inset-0
              bg-black/75
              backdrop-blur-sm
              transition-opacity
              duration-200
            "
          />


          <aside
            className="
              relative
              z-10
              flex
              h-full
              w-[300px]
              max-w-[86vw]
              flex-col
              border-r
              border-white/[0.07]
              bg-black
              p-4
              shadow-[30px_0_100px_rgba(0,0,0,0.45)]
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
                  navigate("/admin");
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
                    h-[52px]
                    w-[52px]
                    items-center
                    justify-center
                    rounded-[13px]
                    bg-violet-600
                    text-white
                    shadow-[0_10px_30px_rgba(95,72,230,0.25)]
                  "
                >
                  <Fingerprint
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>


                <div>
                  <div
                    className="
                      text-lg
                      font-extrabold
                      tracking-[-0.02em]
                      text-white
                    "
                  >
                    BAKABOOST
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-slate-600
                    "
                  >
                    Admin workspace
                  </div>
                </div>
              </button>


              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => {
                  setMobileOpen(false);
                }}
                className="
                  flex
                  h-[52px]
                  w-[52px]
                  items-center
                  justify-center
                  rounded-[12px]
                  border
                  border-white/[0.06]
                  bg-white/[0.025]
                  text-slate-500
                  transition
                  duration-200
                  hover:bg-white/[0.06]
                  hover:text-white
                "
              >
                <X
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </div>


            <div
              className="
                mt-8
                min-h-0
                flex-1
                overflow-y-auto
                pr-1
              "
            >
              <div className="space-y-1.5">
                <MobileAdminLink
                  icon={LayoutDashboard}
                  label="Overview"
                  active={overviewActive}
                  onClick={() => {
                    navigate("/admin");
                  }}
                />

                <MobileAdminLink
                  icon={FileCheck2}
                  label="Verification Queue"
                  active={queueActive}
                  onClick={() => {
                    navigate(
                      "/admin/verification-queue",
                    );
                  }}
                />

                <MobileAdminLink
                  icon={Plus}
                  label="Create Request"
                  active={createRequestActive}
                  onClick={() => {
                    navigate(
                      "/admin/verification-requests/new",
                    );
                  }}
                />
              </div>

              <div
                className="
                  mx-2
                  my-5
                  h-px
                  bg-white/[0.055]
                "
              />

              <div className="space-y-1.5">
                <MobileAdminLink
                  icon={Users}
                  label="Team & Access"
                  active={
                    pathname === "/admin/team"
                  }
                  onClick={() => {
                    navigate(
                      "/admin/team",
                    );
                  }}
                />

                <MobileAdminLink
                  icon={Activity}
                  label="Audit Activity"
                  active={
                    pathname === "/admin/audit"
                  }
                  onClick={() => {
                    navigate(
                      "/admin/audit",
                    );
                  }}
                />

                <MobileAdminLink
                  icon={Settings}
                  label="Settings"
                  active={
                    pathname === "/admin/settings"
                  }
                  onClick={() => {
                    navigate(
                      "/admin/settings",
                    );
                  }}
                />
              </div>
            </div>


            <div
              className="
                mt-auto
                border-t
                border-white/[0.06]
                pt-4
              "
            >
              <div
                className="
                  mb-3
                  flex
                  items-center
                  gap-3
                  rounded-[15px]
                  border
                  border-white/[0.055]
                  bg-white/[0.025]
                  p-3.5
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-[11px]
                    bg-violet-500/10
                    text-[12px]
                    font-bold
                    text-violet-300
                  "
                >
                  AD
                </div>

                <div>
                  <div
                    className="
                      text-[12px]
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
                      text-[12px]
                      text-emerald-500
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-emerald-500
                      "
                    />

                    Authenticated
                  </div>
                </div>
              </div>


              <button
                type="button"
                onClick={() => {
                  void handleAdminLogout();
                }}
                className="
                  flex
                  min-h-11
                  w-full
                  items-center
                  gap-3
                  rounded-[13px]
                  px-3
                  py-3
                  text-[15px]
                  font-semibold
                  text-slate-500
                  transition
                  duration-200
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                <LockKeyhole
                  className="h-4 w-4"
                  aria-hidden="true"
                />

                End admin session
              </button>
            </div>
          </aside>
        </div>
      ) : null}


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div
        className="
          relative
          z-10
          min-h-screen
          lg:pl-[288px]
        "
      >
        {/* Header */}

        <header
          className="
            sticky
            top-0
            z-40
            flex
            h-[90px]
            items-center
            justify-between
            border-b
            border-white/[0.055]
            bg-black/95
            px-5
            backdrop-blur-2xl
            sm:px-6
            xl:px-8
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
                setMobileOpen(true);
              }}
              className="
                mr-3
                flex
                h-[52px]
                w-[52px]
                shrink-0
                items-center
                justify-center
                rounded-[12px]
                border
                border-white/[0.07]
                bg-white/[0.025]
                text-slate-400
                transition
                duration-200
                hover:border-white/[0.12]
                hover:bg-white/[0.055]
                hover:text-white
                lg:hidden
              "
            >
              <Menu
                className="h-4 w-4"
                aria-hidden="true"
              />
            </button>


            <div className="min-w-0">
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.13em]
                  text-slate-600
                "
              >
                <Sparkles
                  className="
                    h-3
                    w-3
                    text-violet-400
                  "
                  aria-hidden="true"
                />

                BAKABOOST administration
              </div>

              <div
                className="
                  mt-1
                  truncate
                  text-[15px]
                  font-bold
                  tracking-[-0.02em]
                  text-slate-100
                  sm:text-xl
                "
              >
                {getWorkspaceTitle(pathname)}
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
              aria-label="Open verification queue"
              onClick={() => {
                navigate(
                  "/admin/verification-queue",
                );
              }}
              className="
                group
                flex
                h-[52px]
                w-[52px]
                items-center
                justify-center
                rounded-[12px]
                border
                border-white/[0.07]
                bg-white/[0.025]
                text-slate-500
                transition
                duration-200
                hover:-translate-y-px
                hover:border-white/[0.11]
                hover:bg-white/[0.055]
                hover:text-white
              "
            >
              <Search
                className="
                  h-4
                  w-4
                  transition
                  duration-200
                  group-hover:scale-105
                "
                aria-hidden="true"
              />
            </button>


            <div
              className="
                ml-1
                hidden
                items-center
                gap-3
                rounded-[14px]
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
                  relative
                  flex
                  h-[52px]
                  w-[52px]
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-violet-500/10
                  text-[8px]
                  font-extrabold
                  text-violet-300
                "
              >
                AD

                <span
                  aria-hidden="true"
                  className="
                    absolute
                    -bottom-px
                    -right-px
                    h-2
                    w-2
                    rounded-full
                    border-2
                    border-[#0d1520]
                    bg-emerald-500
                  "
                />
              </div>


              <div>
                <div
                  className="
                    text-[11px]
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
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-emerald-500
                  "
                >
                  <ShieldCheck
                    className="
                      h-2.5
                      w-2.5
                    "
                    aria-hidden="true"
                  />

                  Secure session
                </div>
              </div>
            </div>
          </div>
        </header>


        {/* Page */}

        <main
          className="
            relative
            mx-auto
            w-full
            max-w-[1600px]
            p-4
            transition-opacity
            duration-300
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


function getWorkspaceTitle(
  pathname: string,
): string {
  if (
    pathname.startsWith(
      "/admin/verification-requests/new",
    )
  ) {
    return "Create Verification Request";
  }

  if (
    pathname ===
      "/admin/verification-queue" ||
    pathname.startsWith(
      "/admin/verification-requests/",
    )
  ) {
    return "Manual Verification Review";
  }

  return "Verification Operations";
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
        pb-3
        text-[7px]
        font-extrabold
        uppercase
        tracking-[0.16em]
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
  description,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: ElementType;
  label: string;
  description?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const stateClasses =
    disabled
      ? `
          cursor-not-allowed
          border-transparent
          opacity-40
        `
      : active
        ? `
            border-violet-400/[0.08]
            bg-violet-500/[0.10]
            text-violet-100
            shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
          `
        : `
            border-transparent
            text-slate-500
            hover:translate-x-0.5
            hover:border-white/[0.04]
            hover:bg-white/[0.035]
            hover:text-slate-200
          `;


  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        group
        relative
        mb-1
        flex
        min-h-[58px]
        w-full
        items-center
        gap-3.5
        overflow-hidden
        rounded-[14px]
        border
        px-3.5
        py-3
        text-left
        outline-none
        transition
        duration-200
        focus-visible:ring-2
        focus-visible:ring-violet-500/30
        ${stateClasses}
      `}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="
            absolute
            left-0
            top-1/2
            h-6
            w-0.5
            -translate-y-1/2
            rounded-r-full
            bg-violet-400
          "
        />
      ) : null}


      <div
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-[11px]
          transition
          duration-200
          ${
            active
              ? `
                  bg-violet-500/15
                  text-violet-300
                `
              : `
                  bg-white/[0.02]
                  text-slate-600
                  group-hover:bg-white/[0.04]
                  group-hover:text-slate-300
                `
          }
        `}
      >
        <Icon
          className="h-[17px] w-[17px]"
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </div>


      <div className="min-w-0 flex-1">
        <div
          className={`
            truncate
            text-[12px]
            font-bold
            ${
              active
                ? "text-violet-100"
                : "text-inherit"
            }
          `}
        >
          {label}
        </div>

        {description ? (
          <div
            className="
              mt-0.5
              truncate
              text-[9px]
              font-medium
              text-slate-500
            "
          >
            {description}
          </div>
        ) : null}
      </div>


      {disabled ? (
        <span
          className="
            rounded-full
            border
            border-white/[0.05]
            bg-white/[0.015]
            px-1.5
            py-0.5
            text-[6px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-slate-700
          "
        >
          Later
        </span>
      ) : (
        <ArrowRight
          className={`
            h-3
            w-3
            shrink-0
            transition
            duration-200
            ${
              active
                ? `
                    text-violet-400
                    opacity-100
                  `
                : `
                    -translate-x-1
                    text-slate-600
                    opacity-0
                    group-hover:translate-x-0
                    group-hover:opacity-100
                  `
            }
          `}
          aria-hidden="true"
        />
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
      onClick={onClick}
      className={`
        group
        flex
        min-h-[48px]
        w-full
        items-center
        gap-3
        rounded-[13px]
        border
        px-3
        py-3
        text-left
        text-[15px]
        font-semibold
        transition
        duration-200
        ${
          active
            ? `
                border-violet-400/[0.12]
                bg-violet-500/[0.13]
                text-violet-200
              `
            : `
                border-transparent
                text-slate-500
                hover:border-white/[0.05]
                hover:bg-white/[0.04]
                hover:text-white
              `
        }
      `}
    >
      <div
        className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-[11px]
          ${
            active
              ? `
                  bg-violet-500/15
                  text-violet-300
                `
              : `
                  bg-white/[0.025]
                  text-slate-600
                `
          }
        `}
      >
        <Icon
          className="h-4 w-4"
          aria-hidden="true"
        />
      </div>

      <span className="flex-1">
        {label}
      </span>

      <ArrowRight
        className={`
          h-3.5
          w-3.5
          transition
          duration-200
          ${
            active
              ? `
                  text-violet-400
                  opacity-100
                `
              : `
                  -translate-x-1
                  text-slate-600
                  opacity-0
                  group-hover:translate-x-0
                  group-hover:opacity-100
                `
          }
        `}
        aria-hidden="true"
      />
    </button>
  );
}