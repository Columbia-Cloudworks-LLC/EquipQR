import { assertEquals } from "jsr:@std/assert@1";
import {
  createGoogleDocInFolder,
  batchUpdateGoogleDoc,
  deleteGoogleDriveFile,
  getGoogleDriveFileMetadata,
} from "./google-docs-api.ts";

Deno.test("createGoogleDocInFolder is a function", () => {
  assertEquals(typeof createGoogleDocInFolder, "function");
});

Deno.test("batchUpdateGoogleDoc is a function", () => {
  assertEquals(typeof batchUpdateGoogleDoc, "function");
});

Deno.test("deleteGoogleDriveFile is a function", () => {
  assertEquals(typeof deleteGoogleDriveFile, "function");
});

Deno.test("getGoogleDriveFileMetadata is a function", () => {
  assertEquals(typeof getGoogleDriveFileMetadata, "function");
});
