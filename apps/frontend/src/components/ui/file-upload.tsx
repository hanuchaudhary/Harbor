"use client";

import { useCallback, useRef, useState } from "react";
import {
  IconFile,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconMusic,
  IconZip,
  IconX,
  IconUpload,
  IconExternalLink,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { http as axios } from "@/lib/api/http";

import { cn } from "@/lib/utils";

export interface UploadedFile {
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface FileUploadProps {
  value?: UploadedFile | null;
  onChange: (value: UploadedFile | null) => void;
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FilePreview({
  file,
  onRemove,
  disabled,
}: {
  file: UploadedFile;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const isImage = file.fileType.startsWith("image/");
  const isVideo = file.fileType.startsWith("video/");
  const isAudio = file.fileType.startsWith("audio/");
  const isPdf = file.fileType === "application/pdf";
  const isDoc =
    file.fileType.includes("word") || file.fileType.includes("document");
  const isZip =
    file.fileType.includes("zip") || file.fileType.includes("compressed");

  return (
    <div className="relative group border overflow-hidden bg-muted/30">
      {isImage && (
        <div className="relative">
          <img
            src={file.fileUrl}
            alt={file.name}
            className="w-full max-h-48 object-contain bg-checkerboard"
          />
        </div>
      )}

      {isVideo && (
        <video
          src={file.fileUrl}
          controls
          className="w-full max-h-48 bg-black"
        />
      )}

      {!isImage && !isVideo && (
        <div className="flex items-center gap-3 p-3">
          <div className="shrink-0 text-muted-foreground">
            {isPdf && <IconFileTypePdf className="h-8 w-8 text-red-500" />}
            {isDoc && <IconFileTypeDoc className="h-8 w-8 text-blue-500" />}
            {isAudio && <IconMusic className="h-8 w-8" />}
            {isZip && <IconZip className="h-8 w-8" />}
            {!isPdf && !isDoc && !isAudio && !isZip && (
              <IconFile className="h-8 w-8" />
            )}
          </div>
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-sm hover:underline flex items-center gap-1 truncate"
          >
            <span className="truncate">{file.name}</span>
            <IconExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}

      <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-t bg-background/60 text-xs text-muted-foreground">
        {isImage || isVideo ? (
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:underline flex items-center gap-1"
          >
            <span className="truncate">{file.name}</span>
            <IconExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span className="truncate">{formatBytes(file.fileSize)}</span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto shrink-0 rounded hover:bg-muted p-0.5 transition-colors"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function FileUpload({
  value,
  onChange,
  folder,
  accept,
  maxSizeMB = 50,
  className,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File exceeds ${maxSizeMB} MB limit`);
        return;
      }

      setProgress(0);

      try {
        const ext = file.name.split(".").pop() ?? "";
        const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ""}`;

        const { data } = await axios.post<{
          presignedUrl: string;
          fileUrl: string;
        }>("/api/upload/presigned", { key, contentType: file.type });

        const res = await axios.put(data.presignedUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        });

        // console.log("res.data: ", res.data);

        onChange({
          name: file.name,
          fileUrl: data.fileUrl,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      } finally {
        setProgress(null);
      }
    },
    [folder, maxSizeMB, onChange],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      upload(files[0]);
    },
    [upload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  if (value) {
    return (
      <FilePreview
        file={value}
        onRemove={() => onChange(null)}
        disabled={disabled}
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || progress !== null}
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled || progress !== null}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "w-full flex flex-col items-center justify-center gap-2 border py-6 px-4 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground hover:bg-muted/30",
          (disabled || progress !== null) && "pointer-events-none opacity-60",
        )}
      >
        {progress !== null ? (
          <div className="w-full space-y-2">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : (
          <>
            <IconUpload className="h-7 w-7 text-muted-foreground stroke-1" />
            <div>
              <p className="text-sm font-medium">
                Drop file here or{" "}
                <span className="text-primary underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Max {maxSizeMB} MB
              </p>
            </div>
          </>
        )}
      </button>
    </div>
  );
}

interface MultiFileUploadProps {
  values: UploadedFile[];
  onAdd: (file: UploadedFile) => void;
  onRemove: (index: number) => void;
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
}

export function MultiFileUpload({
  values,
  onAdd,
  onRemove,
  folder,
  accept,
  maxSizeMB,
  className,
  disabled,
}: MultiFileUploadProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {values.map((file, i) => (
        <FilePreview
          key={`${file.fileUrl}-${i}`}
          file={file}
          onRemove={() => onRemove(i)}
          disabled={disabled}
        />
      ))}
      <FileUpload
        folder={folder}
        accept={accept}
        maxSizeMB={maxSizeMB}
        onChange={(f) => f && onAdd(f)}
        disabled={disabled}
      />
    </div>
  );
}
