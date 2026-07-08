import { PageContainer } from "@/components/layout/PageContainer";
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import ProDataTable from "@/components/shared/ProDataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/api.client";
import { format } from "date-fns";

export function ApprovalCenter() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const handleReview = (row) => {
    if (row.action_url) {
      const searchParams = new URLSearchParams(row.action_params).toString();
      navigate(`${row.action_url}${searchParams ? `?${searchParams}` : ''}`);
    }
  };

  const fetchRequests = useCallback(async (params) => {
    try {
      const apiParams = { ...params };
      if (statusFilter && statusFilter !== "all") {
        apiParams.status = statusFilter;
      }
      const res = await apiClient.get('/api/admin/approval-center/requests', apiParams);
      if (res.success) {
        return {
          data: res.data || [],
          meta: res.meta || {}
        };
      }
      return { data: [], meta: {} };
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      return { data: [], meta: {} };
    }
  }, [statusFilter]);

  const topFilters = useMemo(() => [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: "All Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" }
      ]
    }
  ], [statusFilter]);

  const columns = useMemo(() => [
    {
      id: "module",
      header: "Module",
      accessorKey: "module",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.module}</span>
        </div>
      ),
    },
    {
      id: "reference_no",
      header: "Reference No",
      accessorKey: "reference_no",
      cell: (row) => (
        <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {row.reference_no}
        </span>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      cell: (row) => (
        <span className="text-sm text-slate-700">{row.description}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: "requested_at",
      header: "Requested Date",
      accessorKey: "requested_at",
      cell: (row) => {
        const dateStr = row.requested_at;
        return (
          <span className="text-sm text-slate-500 whitespace-nowrap">
            {dateStr ? format(new Date(dateStr), "dd MMM yyyy, HH:mm") : "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleReview(row)}
          className="gap-2 h-8"
        >
          <ExternalLink className="h-4 w-4" />
          Review
        </Button>
      ),
    }
  ], []);

  return (
    <>
      <main className="flex-1 flex flex-col overflow-auto p-6">
        <div className="w-full flex-1 flex flex-col">
          <ProDataTable
            key={statusFilter}
            columns={columns}
            fetchData={fetchRequests}
            topFilters={topFilters}
            globalSearchPlaceholder="Search requests..."
          />
        </div>
      </main>
    </>
  );
}

export default ApprovalCenter;
