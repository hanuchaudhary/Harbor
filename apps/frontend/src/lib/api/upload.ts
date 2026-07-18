import { http } from "./http";

export class UploadApi {
  async presigned(key: string, contentType: string) {
    const { data } = await http.post<{
      presignedUrl: string;
      fileUrl: string;
    }>("/api/upload/presigned", { key, contentType });
    return data;
  }

  async uploadToS3(file: File, folder: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "";
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ""}`;
    const { presignedUrl, fileUrl } = await this.presigned(key, file.type);
    await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return fileUrl;
  }
}

export const uploadApi = new UploadApi();
