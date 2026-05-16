"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { listGenerations, deleteGeneration } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 9;

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["generations", page],
    queryFn: () => listGenerations(page, PAGE_SIZE),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGeneration,
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="size-6 text-primary" />
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} generation${data.total !== 1 ? "s" : ""}` : "Your content library"}
          </p>
        </div>
        <Link href="/generate">
          <Button variant="gradient" size="sm" className="gap-1.5">
            <Plus className="size-4" />
            New
          </Button>
        </Link>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">Failed to load generations.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["generations"] })}>
            Retry
          </Button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <LayoutDashboard className="size-7 text-primary/60" />
          </div>
          <p className="font-medium">No generations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by generating your first piece of content
          </p>
          <Link href="/generate" className="mt-4">
            <Button variant="gradient" size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Generate now
            </Button>
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((generation) => (
              <DashboardCard
                key={generation.id}
                generation={generation}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="gap-1.5"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="gap-1.5"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
