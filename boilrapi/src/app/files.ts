import { Route } from "../types";
import { Type } from "@sinclair/typebox";
import { upload } from "../utils/upload";
import { FileUploadResponse } from "../utils/upload";
import fs from "fs";
import path from "path";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const fileRoutes: Route[] = [
  {
    method: "post",
    path: "/files",
    auth: {
      required: true,
    },
    input: {
      body: Type.Object({
        file: Type.Any(), // File upload type
      }),
    },
    handler: async ({ req }) => {
      // Handle single file upload
      const file = req.file;
      if (!file) {
        throw new Error("No file uploaded");
      }

      const response: FileUploadResponse = {
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };

      return { file: response };
    },
    middleware: [upload.single("file")],
  },
  {
    method: "get",
    path: "/files/:filename",
    auth: {
      required: true,
    },
    input: {
      params: Type.Object({
        filename: Type.String(),
      }),
    },
    handler: async ({ params, res }) => {
      const filename = params.filename as string;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Return null since we're streaming the response
      return null;
    },
  },
  {
    method: "delete",
    path: "/files/:filename",
    auth: {
      required: true,
    },
    input: {
      params: Type.Object({
        filename: Type.String(),
      }),
    },
    handler: async ({ params }) => {
      const filename = params.filename as string;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      // Delete the file
      fs.unlinkSync(filePath);

      return { success: true };
    },
  },
];
