"use client";

import {
  IconDownload,
  IconExternalLink,
  IconMusic,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AssetFileIcon, getFileCategory } from "./lib";

export type Asset = {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  folder: string | null;
  tags: string[];
  updatedAt: string;
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;



export function AssetCard({
  asset,
  onClick,
}: {
  asset: Asset;
  onClick: () => void;
}) {
  const cat = getFileCategory(asset.fileType);

  return (
    <button
      type="button"
      onClick={onClick}
      className="border overflow-hidden flex flex-col text-left w-full hover:bg-muted/20 transition-colors group"
    >
      <div className="w-full h-36 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {cat === "image" && (
          <img
            src={asset.fileUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        )}
        {cat === "video" && (
          <video
            src={asset.fileUrl}
            className="w-full h-full object-cover"
            muted
          />
        )}
        {cat !== "image" && cat !== "video" && (
          <AssetFileIcon fileType={asset.fileType} />
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{asset.name}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {asset.fileType} · {formatBytes(asset.fileSize)}
          </p>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {asset.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function AssetSheetBody({ asset }: { asset: Asset }) {
  const cat = getFileCategory(asset.fileType);
  return (
    <div className="space-y-4">
      {cat === "image" && (
        <div className="border overflow-hidden bg-muted/20">
          <img
            src={asset.fileUrl}
            alt={asset.name}
            className="w-full max-h-[60vh] object-contain"
          />
        </div>
      )}

      {cat === "video" && (
        <video
          src={asset.fileUrl}
          controls
          className="w-full max-h-[60vh] bg-black"
        />
      )}

      {cat === "audio" && (
        <div className="flex items-center justify-center py-10 bg-muted/20 border">
          <div className="space-y-4 text-center">
            <IconMusic className="h-14 w-14 mx-auto text-purple-500" />
            <audio src={asset.fileUrl} controls className="mx-auto" />
          </div>
        </div>
      )}

      {cat === "pdf" && (
        <iframe
          src={asset.fileUrl}
          className="w-full h-[60vh] border"
          title={asset.name}
        />
      )}

      {cat !== "image" &&
        cat !== "video" &&
        cat !== "audio" &&
        cat !== "pdf" && (
          <div className="flex flex-col items-center justify-center py-12 border bg-muted/20 gap-4">
            <AssetFileIcon fileType={asset.fileType} className="h-16 w-16" />
            <p className="text-sm text-muted-foreground">
              Preview not available for this file type.
            </p>
          </div>
        )}

      <div className="border divide-y text-sm">
        {[
          { label: "File type", value: asset.fileType },
          { label: "Size", value: formatBytes(asset.fileSize) },
          { label: "Updated", value: formatDate(asset.updatedAt) },
          ...(asset.folder ? [{ label: "Folder", value: asset.folder }] : []),
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-xs">{value}</span>
          </div>
        ))}
      </div>

      {asset.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {asset.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssetSheet({
  asset,
  open,
  onClose,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="w-full max-h-[92%] overflow-y-auto max-w-4xl mx-auto border-x px-8 py-8"
      >
        <SheetHeader className="mb-5 p-0">
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="text-lg font-semibold leading-tight truncate">
              {asset?.name}
            </SheetTitle>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={asset?.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <IconExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </Button>
              </a>
              <a href={asset?.fileUrl} download={asset?.name}>
                <Button>
                  <IconDownload className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              </a>
            </div>
          </div>
        </SheetHeader>
        {asset && <AssetSheetBody asset={asset} />}
      </SheetContent>
    </Sheet>
  );
}
