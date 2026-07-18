"use client";

import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectStore } from "@/lib/stores/project.store";

export function StepAssets() {
  const { assets, setAsset, addAsset, removeAsset } = useProjectStore();
  const handleFileChange = (index: number, file: UploadedFile | null) => {
    if (!file) {
      setAsset(index, { name: "", fileUrl: "", fileType: "", fileSize: "" });
      return;
    }
    setAsset(index, {
      name: file.name,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: String(file.fileSize),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Project Assets (Optional)</h2>
        <Button type="button" variant="outline" onClick={addAsset}>
          Add Asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assets added yet. You can skip this step.
        </p>
      ) : (
        <div className="space-y-6">
          {assets.map((asset, index) => (
            <div key={`asset-${index}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Asset {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAsset(index)}
                >
                  Remove
                </Button>
              </div>

              <FileUpload
                folder="assets"
                value={
                  asset.fileUrl
                    ? {
                        name: asset.name,
                        fileUrl: asset.fileUrl,
                        fileType: asset.fileType,
                        fileSize: Number(asset.fileSize) || 0,
                      }
                    : null
                }
                onChange={(file) => handleFileChange(index, file)}
              />

              {asset.fileUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <Field>
                    <Label>Name</Label>
                    <Input
                      value={asset.name}
                      onChange={(e) =>
                        setAsset(index, { name: e.target.value })
                      }
                      placeholder="Asset name"
                    />
                  </Field>

                  <Field>
                    <Label>Tags</Label>
                    <Input
                      value={asset.tags}
                      onChange={(e) =>
                        setAsset(index, { tags: e.target.value })
                      }
                      placeholder="design, logo, v1"
                    />
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
