import React from "react";
import { Navigate } from "react-router-dom";
import AdminReach from "./AdminReach";
import { useReportsEnabled } from "../reports/useReportsEnabled";

/**
 * `/admin/reach`: Reports replaces it once the backend has reports switched
 * on, so an old bookmark lands on the new page. Until then Reach renders as it
 * always has. Nothing renders while the check is in flight, so the page
 * doesn't flash Reach before redirecting.
 */
const AdminReachGate: React.FC = () => {
  const { enabled, settled } = useReportsEnabled();
  if (enabled) return <Navigate to="/admin/reports" replace />;
  if (!settled) return null;
  return <AdminReach />;
};

export default AdminReachGate;
