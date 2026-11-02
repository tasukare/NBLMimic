/**
 * NBLMimic Robot Butler (Version 2.1 Hardened)
 * Google Apps Script backend for multi-user storage
 * Folder structure: NBLMimic_Database/user/<username>/
 * Hardened against BOLA/IDOR, Account Takeover, and Storage Exhaustion (VULN-11 - VULN-16)
 */

const ROOT_FOLDER_NAME = "NBLMimic_Database";
const USER_PARENT_FOLDER_NAME = "user";
const USER_STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB Max
const MAX_NOTE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per note

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: Get or create root database folder
function getRootDatabaseFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

// Helper: Get or create "user" parent folder inside NBLMimic_Database
function getUserParentFolder() {
  const root = getRootDatabaseFolder();
  const userFolders = root.getFoldersByName(USER_PARENT_FOLDER_NAME);
  if (userFolders.hasNext()) return userFolders.next();
  return root.createFolder(USER_PARENT_FOLDER_NAME);
}

// Helper: Get or create individual user folder: NBLMimic_Database/user/<username>/
function getOrCreateUserFolder(username) {
  const cleanUsername = String(username || "guest").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const parent = getUserParentFolder();
  const userFolders = parent.getFoldersByName(cleanUsername);
  if (userFolders.hasNext()) {
    return userFolders.next();
  }
  const newFolder = parent.createFolder(cleanUsername);
  // Initialize user profile
  const profileData = {
    username: cleanUsername,
    createdAt: new Date().toISOString(),
    quotaBytes: USER_STORAGE_LIMIT_BYTES,
    quotaFormatted: "15 GB"
  };
  newFolder.createFile("profile.json", JSON.stringify(profileData, null, 2), MimeType.PLAIN_TEXT);
  return newFolder;
}

// Helper: Calculate total storage used in a user folder
function calculateFolderStorage(folder) {
  let totalBytes = 0;
  let fileCount = 0;
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    totalBytes += file.getSize();
    fileCount++;
  }
  return { totalBytes, fileCount };
}

// Helper: Retrieve and parse profile.json
function getProfile(userFolder) {
  const profileFiles = userFolder.getFilesByName("profile.json");
  if (!profileFiles.hasNext()) return { profile: null, fileObj: null };
  const fileObj = profileFiles.next();
  try {
    const profile = JSON.parse(fileObj.getBlob().getDataAsString());
    return { profile, fileObj };
  } catch (e) {
    return { profile: null, fileObj };
  }
}

// Helper: Verify password hash authentication
function verifyAuth(userFolder, providedHash) {
  const { profile } = getProfile(userFolder);
  if (!profile || !profile.passwordHash) {
    // Unprotected user account
    return { authorized: true, profile };
  }
  if (!providedHash || String(providedHash).trim() !== String(profile.passwordHash).trim()) {
    return { authorized: false, profile };
  }
  return { authorized: true, profile };
}

// Helper: Verify file ownership before delete or rename (Anti-IDOR)
function getVerifiedUserFile(userFolder, fileId) {
  if (!fileId) throw new Error("Missing file ID");
  const file = DriveApp.getFileById(fileId);
  const parents = file.getParents();
  let belongsToUser = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === userFolder.getId()) {
      belongsToUser = true;
      break;
    }
  }
  if (!belongsToUser) {
    throw new Error("Access Denied: Object does not reside within user folder.");
  }
  return file;
}

// Handle GET requests: load user notes & storage info (Guarded - Fixes VULN-11)
function doGet(e) {
  try {
    const username = (e && e.parameter && e.parameter.username) ? e.parameter.username : "guest";
    const passwordHash = (e && e.parameter && e.parameter.passwordHash) ? e.parameter.passwordHash : "";
    const userFolder = getOrCreateUserFolder(username);

    // Authentication Guard
    const auth = verifyAuth(userFolder, passwordHash);
    if (!auth.authorized) {
      return jsonResponse({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Invalid or missing credentials for user @" + username
      });
    }

    const storage = calculateFolderStorage(userFolder);
    const files = userFolder.getFiles();
    const notes = [];

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName === "profile.json" || fileName.startsWith(".")) continue;
      try {
        notes.push({
          id: file.getId(),
          name: fileName,
          content: file.getBlob().getDataAsString(),
          sizeBytes: file.getSize(),
          updatedAt: file.getLastUpdated()
        });
      } catch (err) {}
    }

    return jsonResponse({
      status: "success",
      username: username,
      storageUsedBytes: storage.totalBytes,
      storageLimitBytes: USER_STORAGE_LIMIT_BYTES,
      fileCount: storage.fileCount,
      notes: notes
    });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

// Handle POST requests: sign in, save note, upload source (Guarded - Fixes VULN-12..16)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Missing request body" });
    }

    const data = JSON.parse(e.postData.contents);
    const username = data.username || "guest";
    const action = data.action || "saveNote";
    const userFolder = getOrCreateUserFolder(username);
    const { profile, fileObj: profileFileObj } = getProfile(userFolder);

    // ── Authentication & Registration Handler ──
    if (action === "register") {
      if (profile && profile.passwordHash) {
        return jsonResponse({
          status: "error",
          code: "USERNAME_TAKEN",
          message: "Username @" + username + " is already registered. Please sign in."
        });
      }
      if (!data.passwordHash || !String(data.passwordHash).trim()) {
        return jsonResponse({ status: "error", message: "Password hash is required for registration." });
      }
      const newProfile = {
        username: username,
        passwordHash: data.passwordHash,
        email: data.email || "",
        displayName: data.displayName || username,
        createdAt: new Date().toISOString()
      };
      if (profileFileObj) {
        profileFileObj.setContent(JSON.stringify(newProfile, null, 2));
      } else {
        userFolder.createFile("profile.json", JSON.stringify(newProfile, null, 2), MimeType.PLAIN_TEXT);
      }
      return jsonResponse({ status: "success", message: "User registered successfully", username: username });
    }

    if (action === "signIn") {
      if (!profile || !profile.passwordHash) {
        return jsonResponse({ status: "success", message: "Guest authenticated", username: username });
      }
      if (!data.passwordHash || data.passwordHash !== profile.passwordHash) {
        return jsonResponse({
          status: "error",
          code: "INCORRECT_PASSWORD",
          message: "Incorrect password for user @" + username
        });
      }
      return jsonResponse({ status: "success", message: "User signed in", username: username });
    }

    // ── Enforce Authentication on All Mutating Data Actions ──
    const auth = verifyAuth(userFolder, data.passwordHash);
    if (!auth.authorized) {
      return jsonResponse({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Unauthorized: Invalid or missing credentials for @" + username
      });
    }

    // ── Action: deleteFile (Guarded against Global IDOR - Fixes VULN-12) ──
    if (action === "deleteFile") {
      if (data.fileId) {
        const file = getVerifiedUserFile(userFolder, data.fileId);
        if (file.getName() === "profile.json") {
          return jsonResponse({ status: "error", message: "Cannot delete system profile." });
        }
        file.setTrashed(true);
      } else if (data.fileName) {
        if (data.fileName === "profile.json") {
          return jsonResponse({ status: "error", message: "Cannot delete system profile." });
        }
        const files = userFolder.getFilesByName(data.fileName);
        while (files.hasNext()) {
          files.next().setTrashed(true);
        }
      }
      const storage = calculateFolderStorage(userFolder);
      return jsonResponse({
        status: "success",
        message: "File safely trashed.",
        storageUsedBytes: storage.totalBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES
      });
    }

    // ── Action: renameFile (Guarded against Global IDOR & Profile Collision - Fixes VULN-13) ──
    if (action === "renameFile") {
      const file = getVerifiedUserFile(userFolder, data.fileId);
      if (file.getName() === "profile.json") {
        return jsonResponse({ status: "error", message: "Cannot rename system profile." });
      }
      const cleanTitle = (data.newTitle || "Renamed").trim().replace(/[/\\?%*:|"<>]/g, "_");
      if (cleanTitle.toLowerCase() === "profile") {
        return jsonResponse({ status: "error", message: "Cannot rename note to reserved system name 'profile'." });
      }
      file.setName(cleanTitle + ".json");
      return jsonResponse({ status: "success", message: "File renamed." });
    }

    // ── Action: saveNote (Guarded against Overwrites & Quota Depletion - Fixes VULN-15, 16) ──
    if (action === "saveNote") {
      const rawTitle = (data.title || "Note_" + Date.now()).trim();
      const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, "_");
      if (cleanTitle.toLowerCase() === "profile") {
        return jsonResponse({
          status: "error",
          message: "Reserved filename: Note title cannot be named 'profile'."
        });
      }

      const contentString = JSON.stringify(data, null, 2);
      const payloadSizeBytes = contentString.length;

      if (payloadSizeBytes > MAX_NOTE_SIZE_BYTES) {
        return jsonResponse({
          status: "error",
          code: "NOTE_TOO_LARGE",
          message: "Note exceeds 10 MB payload limit."
        });
      }

      const storage = calculateFolderStorage(userFolder);
      if (storage.totalBytes + payloadSizeBytes > USER_STORAGE_LIMIT_BYTES) {
        return jsonResponse({
          status: "error",
          code: "STORAGE_QUOTA_EXCEEDED",
          message: "User storage quota exceeded."
        });
      }

      const fileName = cleanTitle + ".json";
      const existingFiles = userFolder.getFilesByName(fileName);
      let targetFile;
      if (existingFiles.hasNext()) {
        targetFile = existingFiles.next();
        targetFile.setContent(contentString);
      } else {
        targetFile = userFolder.createFile(fileName, contentString, MimeType.PLAIN_TEXT);
      }

      return jsonResponse({
        status: "success",
        fileId: targetFile.getId(),
        fileName: fileName,
        storageUsedBytes: storage.totalBytes + payloadSizeBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES
      });
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}
