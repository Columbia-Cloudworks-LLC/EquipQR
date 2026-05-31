import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./google-drive-destination-browser.ts";

const { mapSharedDriveToBrowseItem, mapFolderToBrowseItem } = __testables;

Deno.test("mapSharedDriveToBrowseItem marks shared drives as navigable but not selectable", () => {
  assertEquals(
    mapSharedDriveToBrowseItem({ id: "drive-1", name: "Ops Shared Drive" }),
    {
      id: "drive-1",
      name: "Ops Shared Drive",
      kind: "shared_drive",
      driveId: "drive-1",
      selectable: false,
      parentId: null,
    },
  );
});

Deno.test("mapFolderToBrowseItem returns selectable folders with drive context", () => {
  assertEquals(
    mapFolderToBrowseItem(
      {
        id: "folder-1",
        name: "EquipQR Exports",
        mimeType: "application/vnd.google-apps.folder",
        driveId: "drive-1",
        capabilities: { canAddChildren: true },
      },
      "drive-1",
      "drive-1",
    ),
    {
      id: "folder-1",
      name: "EquipQR Exports",
      kind: "folder",
      driveId: "drive-1",
      selectable: true,
      parentId: "drive-1",
    },
  );
});

Deno.test("mapFolderToBrowseItem ignores trashed and non-folder items", () => {
  assertEquals(
    mapFolderToBrowseItem(
      {
        id: "file-1",
        name: "Report.pdf",
        mimeType: "application/pdf",
        trashed: false,
      },
      "root",
      null,
    ),
    null,
  );

  assertEquals(
    mapFolderToBrowseItem(
      {
        id: "folder-trashed",
        name: "Old Folder",
        mimeType: "application/vnd.google-apps.folder",
        trashed: true,
      },
      "root",
      null,
    ),
    null,
  );
});
