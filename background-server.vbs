' NBLMimic (Research Lab) - Silent Background Server Launcher
' Runs node server.js with zero console window or visual flash
On Error Resume Next

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverDir = currentDir
If Not fso.FileExists(serverDir & "\server.js") Then
    serverDir = currentDir & "\NBLMimic"
End If

If Not fso.FileExists(serverDir & "\server.js") Then
    WScript.Quit 0
End If

nodeExe = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodeExe) Then
    nodeExe = "node.exe"
End If

' Launch node server.js completely hidden (window style 0, do not wait)
WshShell.CurrentDirectory = serverDir
WshShell.Run """" & nodeExe & """ """ & serverDir & "\server.js""", 0, False

Set WshShell = Nothing
Set fso = Nothing
