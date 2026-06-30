; Custom NSIS install steps for SellPoint
; Re-creates the desktop and Start Menu shortcuts so they use the
; bundled SellPoint icon (icon.ico shipped in resources), instead of
; the default icon embedded in the executable.
!macro customInstall
  CreateShortCut "$DESKTOP\SellPoint.lnk" "$INSTDIR\SellPoint.exe" "" "$INSTDIR\resources\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\SellPoint.lnk" "$INSTDIR\SellPoint.exe" "" "$INSTDIR\resources\icon.ico" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\SellPoint.lnk"
  Delete "$SMPROGRAMS\SellPoint.lnk"
!macroend
