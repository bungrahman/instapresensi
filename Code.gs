/**
 * instapresensi - Attendance Management System
 * Backend Script for Google Apps Script
 * 
 * Architecture:
 * - "Employees" sheet = Master database (personal data, registered once)
 * - "Attendance_Log" sheet = Activity log (every clock-in/clock-out)
 * - "Settings" sheet = App configuration
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('instapresensi | Attendance System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Initialize the Spreadsheet with required sheets and headers.
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Employees Sheet
  let empSheet = ss.getSheetByName('Employees');
  if (!empSheet) {
    empSheet = ss.insertSheet('Employees');
  }
  empSheet.getRange(1, 1, 1, 7).setValues([[
    'Employee_ID', 'Registered_Date', 'Name', 'Department', 'NIK', 
    'Phone', 'Photo_Link'
  ]]).setFontWeight('bold').setBackground('#d9ead3');
  
  // 2. Attendance Log Sheet
  let logSheet = ss.getSheetByName('Attendance_Log');
  if (!logSheet) {
    logSheet = ss.insertSheet('Attendance_Log');
  }
  logSheet.getRange(1, 1, 1, 10).setValues([[
    'Log_ID', 'Employee_ID', 'Name', 
    'ClockIn_Time', 'ClockIn_Location', 'ClockOut_Time', 'ClockOut_Location', 
    'Status', 'ClockIn_Photo', 'ClockOut_Photo'
  ]]).setFontWeight('bold').setBackground('#cfe2f3');
  
  // 3. Settings Sheet
  let settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
    settingsSheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]).setFontWeight('bold');
    settingsSheet.appendRow(['NOTIFICATION_URLS', '']);
    settingsSheet.appendRow(['DRIVE_FOLDER_ID', '']);
    settingsSheet.appendRow(['COMPANY_NAME', 'instapresensi']);
    settingsSheet.appendRow(['DEPARTMENTS', 'IT, HR, Finance, Marketing, Operations, Other']);
  }
  
  return "Initialization Complete! Sheets: Employees, Attendance_Log, Settings.";
}

/**
 * Handle NEW Employee Registration
 */
function saveEmployee(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let empSheet = ss.getSheetByName('Employees');
    if (!empSheet) { initSheet(); empSheet = ss.getSheetByName('Employees'); }
    
    const settings = getSettings();
    const timestamp = new Date();
    const formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    
    let photoLink = "";
    if (data.photo) {
      photoLink = uploadToDrive(data.photo, data.name + "_Profile_" + Date.now(), settings.DRIVE_FOLDER_ID);
    }
    
    const empId = "EMP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Format phone number (auto 62)
    let phoneNum = data.phone || "";
    phoneNum = phoneNum.replace(/\D/g, ''); // remove non-digits
    if (phoneNum.startsWith('0')) {
      phoneNum = '62' + phoneNum.substring(1);
    } else if (phoneNum.startsWith('62')) {
      // keep as is
    } else if (phoneNum.length > 0) {
      phoneNum = '62' + phoneNum; // fallback
    }
    
    empSheet.appendRow([
      empId,
      formattedTime,
      data.name,
      data.department || "",
      data.nik,
      phoneNum,
      photoLink
    ]);
    
    // Webhook Notification
    if (settings.NOTIFICATION_URLS) {
      const urls = settings.NOTIFICATION_URLS.split(',').map(u => u.trim()).filter(u => u);
      const hookPayload = {
        event: "employee_registration",
        employeeId: empId,
        name: data.name,
        department: data.department,
        phone: phoneNum,
        time: formattedTime,
        photoUrl: photoLink
      };
      sendNotifications(hookPayload, urls);
    }
    
    return { success: true, id: empId, photo: photoLink };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Handle Employee Clock-In
 */
function handleClockIn(payload) {
  const empId = payload.empId;
  const photoBase64 = payload.photo;
  const location = payload.location || "Unknown";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let empSheet = ss.getSheetByName('Employees');
    let logSheet = ss.getSheetByName('Attendance_Log');
    
    if (!empSheet || !logSheet) {
      initSheet();
      empSheet = ss.getSheetByName('Employees');
      logSheet = ss.getSheetByName('Attendance_Log');
    }
    
    // 1. Check if employee exists
    const empData = empSheet.getDataRange().getValues();
    let empInfo = null;
    
    for (let i = 1; i < empData.length; i++) {
      // Check ID or NIK match
      if (empData[i][0] === empId || empData[i][4] === empId) {
        empInfo = empData[i];
        break;
      }
    }
    
    if (!empInfo) {
      return { success: false, error: "Data karyawan tidak ditemukan. Pastikan ID atau NIK benar." };
    }
    
    const actualEmpId = empInfo[0]; // Real Employee_ID from DB
    
    // 2. Check Attendance_Log for active Check-in (prevent double check-in on the same day if Active)
    const logData = logSheet.getDataRange().getValues();
    for (let i = logData.length - 1; i >= 1; i--) {
      if (logData[i][1] === actualEmpId && logData[i][7] === 'Active') {
        return { success: false, error: "Karyawan " + empInfo[2] + " sudah Clock-In dan belum Clock-Out!" };
      }
    }
    
    // 3. Upload Photo
    const settings = getSettings();
    let photoLink = "";
    if (photoBase64) {
      photoLink = uploadToDrive(photoBase64, actualEmpId + "_IN_" + Date.now(), settings.DRIVE_FOLDER_ID);
    }
    
    // 4. Create new Log entry
    const timestamp = new Date();
    const formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    const logId = "ATT-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    logSheet.appendRow([
      logId,
      actualEmpId,
      empInfo[2],      // Name
      formattedTime,   // ClockIn_Time
      location,        // ClockIn_Location
      '',              // ClockOut_Time
      '',              // ClockOut_Location
      'Active',        // Status
      photoLink,       // ClockIn_Photo
      ''               // ClockOut_Photo
    ]);
    
    // 5. Send Webhook Notifications
    if (settings.NOTIFICATION_URLS) {
      const urls = settings.NOTIFICATION_URLS.split(',').map(u => u.trim()).filter(u => u);
      const hookPayload = {
        event: "clock_in",
        employeeId: actualEmpId,
        name: empInfo[2],
        department: empInfo[3],
        time: formattedTime,
        location: location,
        photoUrl: photoLink
      };
      sendNotifications(hookPayload, urls);
    }
    
    return { success: true, name: empInfo[2], empId: actualEmpId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Handle Employee Clock-Out
 */
function handleClockOut(payload) {
  const empId = payload.empId;
  const photoBase64 = payload.photo;
  const location = payload.location || "Unknown";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let empSheet = ss.getSheetByName('Employees');
    let logSheet = ss.getSheetByName('Attendance_Log');
    
    if (!logSheet) { initSheet(); logSheet = ss.getSheetByName('Attendance_Log'); empSheet = ss.getSheetByName('Employees'); }
    
    // Find Real EmpID if NIK is provided
    let actualEmpId = empId;
    const empData = empSheet.getDataRange().getValues();
    for (let i = 1; i < empData.length; i++) {
        if (empData[i][0] === empId || empData[i][4] === empId) {
            actualEmpId = empData[i][0];
            break;
        }
    }

    const logData = logSheet.getDataRange().getValues();
    
    // Find latest Active log
    for (let i = logData.length - 1; i >= 1; i--) {
      if (logData[i][1] === actualEmpId && logData[i][7] === 'Active') {
        const timestamp = new Date();
        const formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
        logSheet.getRange(i + 1, 6).setValue(formattedTime); // ClockOut_Time
        logSheet.getRange(i + 1, 7).setValue(location);      // ClockOut_Location
        logSheet.getRange(i + 1, 8).setValue('Completed');   // Status
        
        const settings = getSettings();
        let photoLink = "";
        if (photoBase64) {
          photoLink = uploadToDrive(photoBase64, actualEmpId + "_OUT_" + Date.now(), settings.DRIVE_FOLDER_ID);
          logSheet.getRange(i + 1, 10).setValue(photoLink); // ClockOut_Photo
        }
        
        const empName = logData[i][2];

        // Webhook
        if (settings.NOTIFICATION_URLS) {
            const urls = settings.NOTIFICATION_URLS.split(',').map(u => u.trim()).filter(u => u);
            const hookPayload = {
              event: "clock_out",
              employeeId: actualEmpId,
              name: empName,
              time: formattedTime,
              location: location,
              photoUrl: photoLink
            };
            sendNotifications(hookPayload, urls);
        }

        return { success: true, name: empName };
      }
    }
    
    return { success: false, error: "Akses ditolak: Anda belum Clock-In atau sudah melakukan Clock-Out sebelumnya." };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Upload Photo to Google Drive
 */
function uploadToDrive(base64, name, folderId) {
  let folder;
  try {
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      const folders = DriveApp.getFoldersByName('Instapresensi_Photos');
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Instapresensi_Photos');
    }
  } catch(e) {
    const folders = DriveApp.getFoldersByName('Instapresensi_Photos');
    folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Instapresensi_Photos');
  }
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), 'image/jpeg', name + ".jpg");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

/**
 * Send JSON Notification to REST APIs
 */
function sendNotifications(payloadObj, urls) {
  const payload = JSON.stringify(payloadObj);
  const options = {
    method: "post",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };
  urls.forEach(url => {
    try { UrlFetchApp.fetch(url, options); } catch (e) {}
  });
}

/**
 * Settings Management
 */
function getSettings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Settings');
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < data.length; i++) {
      settings[data[i][0]] = data[i][1];
    }
    return settings;
  } catch (e) { return {}; }
}

function updateSettings(newSettings) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Settings');
    if (!sheet) { initSheet(); sheet = ss.getSheetByName('Settings'); }
    const dataMap = sheet.getDataRange().getValues();
    for (let key in newSettings) {
      let found = false;
      for (let i = 1; i < dataMap.length; i++) {
        if (dataMap[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(newSettings[key]);
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow([key, newSettings[key]]);
    }
    return { success: true };
  } catch (error) { return { success: false, error: error.toString() }; }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
