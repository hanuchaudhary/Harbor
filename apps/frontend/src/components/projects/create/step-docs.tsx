"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useProjectStore } from "@/lib/stores/project.store";

export function StepDocs() {
  const { docs, setDoc, addDoc, removeDoc } = useProjectStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Project Docs (Optional)</h2>
        <Button type="button" variant="outline" onClick={addDoc}>
          Add Doc
        </Button>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No docs added yet. You can skip this step.
        </p>
      ) : (
        <div className="space-y-4">
          {docs.map((doc, index) => (
            <div key={`doc-${index}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Doc {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDoc(index)}
                >
                  Remove
                </Button>
              </div>

              <Field>
                <Label>Title</Label>
                <Input
                  value={doc.title}
                  onChange={(e) => setDoc(index, { title: e.target.value })}
                  placeholder="Documentation title"
                />
              </Field>

              <Field>
                <Label>Content</Label>
                <RichTextEditor
                  content={doc.content}
                  onChange={(content) => setDoc(index, { content })}
                />
              </Field>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
