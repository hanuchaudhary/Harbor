import {
  IconFile,
  IconFileTypeDoc,
  IconFileTypePdf,
  IconFileTypeXls,
  IconFileTypeZip,
  IconMovie,
  IconMusic,
} from "@tabler/icons-react";

export function getFileCategory(fileType: string) {
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("video/")) return "video";
  if (fileType.startsWith("audio/")) return "audio";
  if (fileType === "application/pdf") return "pdf";
  if (fileType.includes("word") || fileType.includes("document")) return "doc";
  if (
    fileType.includes("sheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv")
  )
    return "sheet";
  if (fileType.includes("zip") || fileType.includes("compressed")) return "zip";
  return "file";
}

export function AssetFileIcon({
  fileType,
  className,
}: {
  fileType: string;
  className?: string;
}) {
  const cat = getFileCategory(fileType);
  const cls = className ?? "h-10 w-10";
  if (cat === "pdf")
    return <IconFileTypePdf className={`${cls} text-red-500 stroke-1`} />;
  if (cat === "doc")
    return <IconFileTypeDoc className={`${cls} text-blue-500 stroke-1`} />;
  if (cat === "sheet")
    return <IconFileTypeXls className={`${cls} text-green-600 stroke-1`} />;
  if (cat === "zip")
    return <IconFileTypeZip className={`${cls} text-yellow-500 stroke-1`} />;
  if (cat === "audio")
    return <IconMusic className={`${cls} text-purple-500 stroke-1`} />;
  if (cat === "video")
    return <IconMovie className={`${cls} text-muted-foreground stroke-1`} />;
  return <IconFile className={`${cls} text-muted-foreground stroke-1`} />;
}
