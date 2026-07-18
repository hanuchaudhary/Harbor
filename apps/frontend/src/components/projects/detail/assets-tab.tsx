"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http as axios } from "@/lib/api/http";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  Asset,
  AssetCard,
  AssetSheet,
} from "@/components/projects/asset-viewer";
import { FileUpload } from "@/components/ui/file-upload";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectQueries } from "@/lib/query/query.func";

interface AssetsTabProps {
  projectSlug: string;
  isEditable: boolean;
  assets: Array<{
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    folder: string | null;
    tags: string[];
    updatedAt: string;
  }>;
}

export function AssetsTab({ projectSlug, isEditable, assets }: AssetsTabProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    fileUrl: "",
    fileType: "",
    fileSize: 0,
    tags: [] as string[],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    assetId: string | null;
    assetName: string;
  }>({ open: false, assetId: null, assetName: "" });

  const queryClient = useQueryClient();

  const saveAssetMutation = useMutation({
    mutationFn: async (asset: {
      name: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      tags: string[];
    }) => {
      return axios.post(`/api/projects/${projectSlug}/assets`, {
        name: asset.name,
        fileUrl: asset.fileUrl,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        tags: asset.tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success("Asset uploaded");
      setIsAdding(false);
      setNewAsset({
        name: "",
        fileUrl: "",
        fileType: "",
        fileSize: 0,
        tags: [],
      });
    },
    onError: () => {
      toast.error("Failed to save asset");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      return axios.delete(
        `/api/projects/${projectSlug}/assets?assetId=${assetId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success("Asset deleted");
    },
    onError: () => {
      toast.error("Failed to delete asset");
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
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus className="w-4 h-4" />
              {isAdding ? "Cancel" : "Add Asset"}
            </Button>
          </div>
        )}
        {isAdding && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File</Label>
              <FileUpload
                folder="assets"
                onChange={(file) => {
                  if (file) {
                    setNewAsset((prev) => ({
                      ...prev,
                      fileUrl: file.fileUrl,
                      fileType: file.fileType,
                      fileSize: file.fileSize,
                      name: prev.name || file.name,
                    }));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newAsset.name}
                onChange={(e) =>
                  setNewAsset((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Asset name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={newAsset.tags.join(", ")}
                onChange={(e) =>
                  setNewAsset((prev) => ({
                    ...prev,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="design, mockup, final"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewAsset({
                    name: "",
                    fileUrl: "",
                    fileType: "",
                    fileSize: 0,
                    tags: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => saveAssetMutation.mutate(newAsset)}
                disabled={
                  !newAsset.name.trim() ||
                  !newAsset.fileUrl ||
                  saveAssetMutation.isPending
                }
              >
                {saveAssetMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        )}
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="relative group">
                <AssetCard
                  asset={asset}
                  onClick={() => setSelectedAsset(asset)}
                />
                {!isEditable && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm rounded p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          open: true,
                          assetId: asset.id,
                          assetName: asset.name,
                        });
                      }}
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

      {selectedAsset && (
        <AssetSheet
          asset={selectedAsset}
          open={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open &&
          setDeleteConfirm({ open: false, assetId: null, assetName: "" })
        }
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteConfirm.assetName}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (deleteConfirm.assetId) {
            deleteAssetMutation.mutate(deleteConfirm.assetId);
          }
          setDeleteConfirm({ open: false, assetId: null, assetName: "" });
        }}
        variant="destructive"
      />
    </>
  );
}
