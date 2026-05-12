"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Loader2, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/dashboard-shell";
import { PageContent } from "@/components/layout/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreateKbDialog,
  DeleteKbDialog,
  EditKbDialog,
  KbCard,
} from "./components";
import { useKbList } from "./hooks";

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    kbs,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    open,
    setOpen,
    name,
    setName,
    handleCreate,
    handleDelete,
    deleteKb,
    setDeleteKb,
    confirmDelete,
    editKb,
    editName,
    setEditName,
    handleEdit,
    confirmEdit,
    cancelEdit,
    loadMore,
    creating,
    deleting,
    updating,
  } = useKbList();

  useEffect(() => {
    const target = bottomRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  return (
    <div ref={containerRef} className="bg-background h-full overflow-y-auto">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[{ label: "控制台" }]}
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="border-input bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground flex h-8 items-center gap-1.5 rounded-[8px] border px-3.5 text-[12.5px] font-medium transition-colors"
          >
            <Plus size={12} strokeWidth={2.5} />
            新建知识库
          </button>
        }
      />

      <PageContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-[18px] font-semibold tracking-tight">
              我的知识库
            </h1>
            {loadingMore ? (
              <span className="text-muted-foreground text-[11px]">正在加载中</span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-[12.5px]">
            共 {total} 个知识库
          </p>
          {error ? (
            <p className="text-destructive mt-2 text-[12px]">{error}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="border-border bg-card rounded-[10px] border p-5"
              >
                <Skeleton className="mb-4 h-9 w-9 rounded-[8px]" />
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && total === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <BookOpen size={28} strokeWidth={1.3} className="text-muted-foreground" />
            <p className="text-muted-foreground text-[13px]">
              还没有知识库，点击“新建知识库”开始。
            </p>
          </div>
        ) : null}

        {!loading && total > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
              {kbs.map((kb) => (
                <KbCard
                  key={kb.id}
                  kb={kb}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed transition-colors"
              >
                <Plus size={20} strokeWidth={1.5} />
                <span className="text-[12.5px] font-medium">新建知识库</span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pb-4">
              <div ref={bottomRef} className="h-1 w-full" />

              {loadingMore ? (
                <div className="border-border bg-background text-muted-foreground inline-flex h-9 items-center gap-2 rounded-[10px] border px-4 text-[12px]">
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  正在加载更多知识库
                </div>
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="border-input text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground h-9 rounded-[10px] border px-4 text-[12px] font-medium transition-colors"
                >
                  加载更多
                </button>
              ) : (
                <p className="text-muted-foreground text-[12px]">已经到底了</p>
              )}
            </div>
          </>
        ) : null}
      </PageContent>

      <DeleteKbDialog
        kb={deleteKb}
        onClose={() => setDeleteKb(null)}
        onConfirm={() => void confirmDelete()}
        deleting={deleting}
      />

      <EditKbDialog
        kb={editKb}
        editName={editName}
        onChangeName={setEditName}
        onConfirm={confirmEdit}
        onCancel={cancelEdit}
        updating={updating}
      />

      <CreateKbDialog
        open={open}
        onOpenChange={setOpen}
        name={name}
        onChangeName={setName}
        onCreate={handleCreate}
        creating={creating}
      />
    </div>
  );
}
