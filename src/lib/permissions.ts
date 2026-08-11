import mongoose from "mongoose";
import { Folder } from "@/models/Folder";
import { FolderShare, FolderRole } from "@/models/FolderShare";

export type AccessLevel = "owner" | FolderRole | null;

export async function getFolderAccess(
  folderId: string,
  userId: string
): Promise<{ folder: InstanceType<typeof Folder> | null; access: AccessLevel }> {
  if (!mongoose.isValidObjectId(folderId)) {
    return { folder: null, access: null };
  }

  const folder = await Folder.findById(folderId);
  if (!folder) return { folder: null, access: null };

  if (folder.ownerId.toString() === userId) {
    return { folder, access: "owner" };
  }

  if (folder.isPrivate) {
    return { folder, access: null };
  }

  const share = await FolderShare.findOne({
    folderId: folder._id,
    userId,
  });

  if (!share) return { folder, access: null };
  return { folder, access: share.role };
}

export function canView(access: AccessLevel) {
  return access === "owner" || access === "collaborator" || access === "viewer";
}

export function canEdit(access: AccessLevel) {
  return access === "owner" || access === "collaborator";
}

export function canManageShares(access: AccessLevel) {
  return access === "owner";
}
