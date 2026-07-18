import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http as axios } from "@/lib/api/http";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import FolderIcon from "@/components/ui/folder-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectQueries } from "@/lib/query/query.func";

interface DocsTabProps {
  projectSlug: string;
  isEditable: boolean;
  docs: Array<{
    id: string;
    title: string;
    content: string;
    updatedAt: string;
  }>;
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

export function DocsTab({ projectSlug, isEditable, docs }: DocsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<
    DocsTabProps["docs"][number] | null
  >(null);
  const [editingDoc, setEditingDoc] = useState<{
    id?: string;
    title: string;
    content: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    docId: string | null;
    docTitle: string;
  }>({ open: false, docId: null, docTitle: "" });

  const queryClient = useQueryClient();

  const saveDocMutation = useMutation({
    mutationFn: async (doc: {
      id?: string;
      title: string;
      content: string;
    }) => {
      if (doc.id) {
        return axios.patch(`/api/projects/${projectSlug}/docs`, {
          docId: doc.id,
          title: doc.title,
          content: doc.content,
        });
      } else {
        return axios.post(`/api/projects/${projectSlug}/docs`, {
          title: doc.title,
          content: doc.content,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success(editingDoc?.id ? "Doc updated" : "Doc created");
      setEditingDoc(null);
    },
    onError: () => {
      toast.error("Failed to save doc");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return axios.delete(`/api/projects/${projectSlug}/docs?docId=${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success("Doc deleted");
    },
    onError: () => {
      toast.error("Failed to delete doc");
    },
  });

  return (
    <>
      <div className="space-y-3">
        {!isEditable && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingDoc({ title: "", content: "" })}
            >
              <Plus className="w-4 h-4" />
              Add Doc
            </Button>
          </div>
        )}
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No docs yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="w-full text-center hover:bg-muted/30 flex items-end justify-between px-3 py-2 gap-2 group border"
              >
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div>
                    <FolderIcon />
                  </div>
                  <div className="min-w-0 flex-1 px-3">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </button>
                {!isEditable && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingDoc(doc)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteConfirm({
                          open: true,
                          docId: doc.id,
                          docTitle: doc.title,
                        })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={!!selectedDoc}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="w-full max-h-[90%] overflow-y-auto max-w-6xl mx-auto border-x font-montreal-regular px-8 py-10"
        >
          <SheetHeader className="mb-4 p-0">
            <SheetTitle>
              <h1 className="text-xl font-montreal-semibold">
                {selectedDoc?.title}
              </h1>
            </SheetTitle>
            {selectedDoc && (
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(selectedDoc.updatedAt)}
              </p>
            )}
          </SheetHeader>
          {selectedDoc?.content ? (
            <div
              className="prose dark:prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedDoc.content }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">No content</p>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
      >
        <SheetContent
          side="bottom"
          className="w-full max-h-[90%] overflow-y-auto max-w-6xl mx-auto border-x font-montreal-regular px-8 py-10"
        >
          <div className="mb-4 p-0 flex items-center justify-between">
            <h1 className="text-xl">
              {editingDoc?.id ? "Edit Doc" : "Create Doc"}
            </h1>
            <div className="flex justify-end gap-3 bg-black">
              <Button variant="outline" onClick={() => setEditingDoc(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editingDoc && saveDocMutation.mutate(editingDoc)}
                disabled={
                  !editingDoc?.title.trim() || saveDocMutation.isPending
                }
              >
                {saveDocMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editingDoc?.title || ""}
                onChange={(e) =>
                  setEditingDoc(
                    editingDoc
                      ? { ...editingDoc, title: e.target.value }
                      : null,
                  )
                }
                placeholder="Documentation title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                content={editingDoc?.content || ""}
                onChange={(content) =>
                  setEditingDoc(editingDoc ? { ...editingDoc, content } : null)
                }
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, docId: null, docTitle: "" })
        }
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteConfirm.docTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (deleteConfirm.docId) {
            deleteDocMutation.mutate(deleteConfirm.docId);
          }
          setDeleteConfirm({ open: false, docId: null, docTitle: "" });
        }}
        variant="destructive"
      />
    </>
  );
}
