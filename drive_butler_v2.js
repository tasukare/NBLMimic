/**
 * NBLMimic Robot Butler (Version 2.0)
 * Google Apps Script backend for multi-user storage
 * Folder structure: NBLMimic_Database/user/<username>/
 */

const ROOT_FOLDER_NAME = "NBLMimic_Database";
const USER_PARENT_FOLDER_NAME = "user";
const USER_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB in bytes

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
    quotaFormatted: "50 GB"
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

// Handle GET requests: load user notes & storage info
function doGet(e) {
  try {
    const username = (e && e.parameter && e.parameter.username) ? e.parameter.username : "guest";
    const userFolder = getOrCreateUserFolder(username);
    const storage = calculateFolderStorage(userFolder);
    
    const files = userFolder.getFiles();
    const notes = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName === "profile.json") continue; // keep profile internal
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
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      username: username,
      storageUsedBytes: storage.totalBytes,
      storageLimitBytes: USER_STORAGE_LIMIT_BYTES,
      fileCount: storage.fileCount,
      notes: notes
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests: sign in, save note, upload source
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const username = data.username || "guest";
    const action = data.action || "saveNote";
    const userFolder = getOrCreateUserFolder(username);
    
    if (action === "signIn" || action === "register") {
      const profileFiles = userFolder.getFilesByName("profile.json");
      let profile = {};
      let profileFileObj = null;
      if (profileFiles.hasNext()) {
        profileFileObj = profileFiles.next();
        try {
          profile = JSON.parse(profileFileObj.getBlob().getDataAsString());
        } catch (err) {}
      }

      // Check if registration conflicts with an existing password-protected user
      if (action === "register" && profile.passwordHash && data.passwordHash) {
        if (profile.passwordHash !== data.passwordHash) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            code: "USERNAME_TAKEN",
            message: "Username @" + username + " is already registered in Google Drive. Please sign in or choose another username."
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // Check if sign-in password matches
      if (action === "signIn" && profile.passwordHash && data.passwordHash) {
        if (profile.passwordHash !== data.passwordHash) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            code: "INCORRECT_PASSWORD",
            message: "Incorrect password for user @" + username + " in Google Drive."
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // If user provided a password and profile didn't have one yet, record it
      if (data.passwordHash && !profile.passwordHash) {
        profile.passwordHash = data.passwordHash;
        profile.email = data.email || profile.email;
        profile.displayName = data.displayName || profile.displayName;
        if (profileFileObj) {
          profileFileObj.setContent(JSON.stringify(profile, null, 2));
        } else {
          userFolder.createFile("profile.json", JSON.stringify(profile, null, 2), MimeType.PLAIN_TEXT);
        }
      }

      // User registered or signed in!
      const storage = calculateFolderStorage(userFolder);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "User signed in and folder verified: NBLMimic_Database/user/" + username,
        username: username,
        storageUsedBytes: storage.totalBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteFile") {
      if (data.fileId) {
        try {
          DriveApp.getFileById(data.fileId).setTrashed(true);
        } catch (e) {}
      } else if (data.fileName) {
        const files = userFolder.getFilesByName(data.fileName);
        while (files.hasNext()) {
          try { files.next().setTrashed(true); } catch(e) {}
        }
      }
      const storage = calculateFolderStorage(userFolder);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "File deleted from Drive",
        storageUsedBytes: storage.totalBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "renameFile") {
      if (data.fileId) {
        try {
          const file = DriveApp.getFileById(data.fileId);
          const newName = (data.newTitle || "Renamed").replace(/[/\\?%*:|"<>]/g, "_") + ".json";
          file.setName(newName);
        } catch (e) {}
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "File renamed in Drive"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Save note or document in user folder
    const fileName = (data.title || "Note_" + Date.now()).replace(/[/\\?%*:|"<>]/g, "_") + ".json";
    
    // Check if file already exists with same name to update it
    const existingFiles = userFolder.getFilesByName(fileName);
    let targetFile;
    if (existingFiles.hasNext()) {
      targetFile = existingFiles.next();
      targetFile.setContent(JSON.stringify(data, null, 2));
    } else {
      targetFile = userFolder.createFile(fileName, JSON.stringify(data, null, 2), MimeType.PLAIN_TEXT);
    }
    
    const storage = calculateFolderStorage(userFolder);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: targetFile.getId(),
      fileName: fileName,
      storageUsedBytes: storage.totalBytes,
      storageLimitBytes: USER_STORAGE_LIMIT_BYTES
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
