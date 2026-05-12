import Link from "next/link";
import { BookOpen, MessageSquare, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Kb } from "./types";

type KbCardProps = {
  kb: Kb;
  onEdit: (kb: Kb) => void;
  onDelete: (kb: Kb) => void;
};

export function KbCard({ kb, onEdit, onDelete }: KbCardProps) {
  return (
    <div className="group border-border bg-card hover:border-foreground/30 hover:bg-accent/30 relative cursor-pointer rounded-[10px] border p-5 transition-colors">
      <div className="bg-muted mb-4 flex h-9 w-9 items-center justify-center rounded-[8px]">
        <BookOpen size={16} strokeWidth={1.8} className="text-muted-foreground" />
      </div>
      <h3 className="text-foreground mb-1 truncate pr-14 text-[13.5px] leading-snug font-semibold">
        {kb.name}
      </h3>
      <p className="text-muted-foreground text-[11.5px]">
        {kb.documentCount} 篇文档 ·{" "}
        {new Date(kb.createdAt).toLocaleDateString()}
      </p>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          href={`/dashboard/kb/${kb.id}/chat`}
          onClick={(event) => event.stopPropagation()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-[26px] w-[26px] items-center justify-center rounded-[6px] transition-colors"
          title="开始问答"
        >
          <MessageSquare size={13} strokeWidth={1.8} />
        </Link>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onEdit(kb);
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-[26px] w-[26px] items-center justify-center rounded-[6px] transition-colors"
          title="编辑名称"
        >
          <Pencil size={13} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onDelete(kb);
          }}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-[26px] w-[26px] items-center justify-center rounded-[6px] transition-colors"
          title="删除"
        >
          <Trash2 size={13} strokeWidth={1.8} />
        </button>
      </div>

      <Link
        href={`/dashboard/kb/${kb.id}`}
        className="absolute inset-0 rounded-[10px]"
      />
    </div>
  );
}

type DeleteKbDialogProps = {
  kb: Kb | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

export function DeleteKbDialog({
  kb,
  onClose,
  onConfirm,
  deleting,
}: DeleteKbDialogProps) {
  return (
    <Dialog open={!!kb} onOpenChange={(visible) => !visible && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Delete the selected knowledge base and all related documents.
          </DialogDescription>
          <DialogTitle className="text-foreground text-[14px] font-semibold">
            删除知识库
          </DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            确定要删除{" "}
            <span className="text-foreground font-semibold">{kb?.name}</span>{" "}
            吗？ 该知识库下所有文档和向量索引都会同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-[12.5px] font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90 h-8 rounded-[8px] px-4 text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditKbDialogProps = {
  kb: Kb | null;
  editName: string;
  onChangeName: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  updating: boolean;
};

export function EditKbDialog({
  kb,
  editName,
  onChangeName,
  onConfirm,
  onCancel,
  updating,
}: EditKbDialogProps) {
  return (
    <Dialog open={!!kb} onOpenChange={(visible) => !visible && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Rename the selected knowledge base.
          </DialogDescription>
          <DialogTitle className="text-foreground text-[14px] font-semibold">
            编辑知识库名称
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="输入新的知识库名称（至少 2 个字符）"
            value={editName}
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onConfirm()}
            className="h-9 text-[13px]"
            autoFocus
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-[12.5px] font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={editName.trim().length < 2 || updating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 rounded-[8px] px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {updating ? "保存中..." : "保存"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CreateKbDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onChangeName: (name: string) => void;
  onCreate: () => void;
  creating: boolean;
};

export function CreateKbDialog({
  open,
  onOpenChange,
  name,
  onChangeName,
  onCreate,
  creating,
}: CreateKbDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Create a new knowledge base.
          </DialogDescription>
          <DialogTitle className="text-foreground text-[14px] font-semibold">
            新建知识库
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="输入知识库名称（至少 2 个字符）"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onCreate()}
            className="h-9 text-[13px]"
            autoFocus
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-[12.5px] font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={name.trim().length < 2 || creating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 rounded-[8px] px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "创建中..." : "创建"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
