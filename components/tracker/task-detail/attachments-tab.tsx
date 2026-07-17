import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentQueries, TaskQueries } from "@/lib/query/query.func";
import { useState } from "react";
import { FileUpload, UploadedFile } from "@/components/ui/file-upload";
import { toast } from "sonner";
import { IconExternalLink, IconTrash } from "@tabler/icons-react";
import { formatDate } from "@/lib/utils";
import { AssetFileIcon, getFileCategory } from "@/components/projects/lib";
import { TaskAttachment } from "@/types/types";

interface AttachmentsTabProps {
  taskId: string;
}

export function AttachmentsTab({ taskId }: AttachmentsTabProps) {
  const { data: attachments = [] } = useQuery({
    queryKey: AttachmentQueries.keys.byTask(taskId),
    queryFn: () => AttachmentQueries.fetchByTask(taskId),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (file: UploadedFile) =>
      AttachmentQueries.create(taskId, {
        name: file.name,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: file.fileSize,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: AttachmentQueries.keys.byTask(taskId),
      });
      toast.success("Attachment added");
    },
    onError: () => toast.error("Failed to add attachment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      AttachmentQueries.delete(taskId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: AttachmentQueries.keys.byTask(taskId),
      });
      toast.success("Attachment removed");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Failed to remove attachment");
      setDeletingId(null);
    },
  });

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-3">
      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      {attachments.map((a: any) => (
        <AttachmentItem
          key={a.id}
          attachment={a}
          onDelete={() => handleDelete(a.id)}
          isDeleting={deletingId === a.id && deleteMutation.isPending}
        />
      ))}

      <FileUpload
        folder={`tasks/${taskId}/attachments`}
        onChange={(file) => file && addMutation.mutate(file)}
        disabled={addMutation.isPending}
      />
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function AttachmentItem({
  attachment,
  onDelete,
  isDeleting,
}: {
  attachment: TaskAttachment;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const cat = getFileCategory(attachment.fileType);

  return (
    <div className="border overflow-hidden">
      {cat === "image" && (
        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={attachment.fileUrl}
            alt={attachment.name}
            className="w-full max-h-40 object-cover"
          />
        </a>
      )}

      {cat === "video" && (
        <video
          src={attachment.fileUrl}
          controls
          className="w-full max-h-40 bg-black"
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <AssetFileIcon fileType={attachment.fileType} className="h-4 w-4" />

        <div className="flex-1 min-w-0">
          <a
            href={attachment.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium truncate block hover:underline"
          >
            {attachment.name}
          </a>
          <p className="text-xs text-muted-foreground">
            {formatBytes(attachment.fileSize)} ·{" "}
            {formatDate(attachment.createdAt)}
          </p>
        </div>

        <a
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
        >
          <IconExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
