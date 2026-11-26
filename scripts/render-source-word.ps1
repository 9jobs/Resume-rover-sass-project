param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
$word=$null;$doc=$null;$owned=$false;$updateLinks=$null
try {
 $word=New-Object -ComObject Word.Application
 if($word.Documents.Count -ne 0){throw 'A separate empty Word instance is required.'}
 $owned=$true;$word.Visible=$false;$word.DisplayAlerts=0;$word.AutomationSecurity=3
 $updateLinks=$word.Options.UpdateLinksAtOpen;$word.Options.UpdateLinksAtOpen=$false
 $doc=$word.Documents.Open($Source,$false,$true,$false)
 $doc.ExportAsFixedFormat($Output,17,$false)
 Write-Output 'SOURCE_PREVIEW_READY'
} finally {
 if($null -ne $doc){$doc.Close(0);[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc)}
 if($null -ne $word){if($owned){if($null -ne $updateLinks){$word.Options.UpdateLinksAtOpen=$updateLinks};$word.Quit()};[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)}
}
