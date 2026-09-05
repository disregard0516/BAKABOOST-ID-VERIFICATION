    import type {
    ReactNode,
    } from "react";

    import {
    AdminAccessGate,
    } from "@/components/admin/admin-access-gate";


    interface AdminLayoutProps {
    children: ReactNode;
    }


    export default function AdminLayout({
    children,
    }: AdminLayoutProps) {
    return (
        <AdminAccessGate>
        {children}
        </AdminAccessGate>
    );
    }