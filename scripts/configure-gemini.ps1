param([string]$Model = 'gemini-3.5-flash-lite')
$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $workspaceRoot '.env.local'
$secret = Read-Host 'Paste your Gemini API key (hidden)' -AsSecureString
$buffer = [IntPtr]::Zero
try {
    $buffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $apiValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)
    if ($apiValue -notmatch '^[A-Za-z0-9_.-]{20,200}$') { throw 'Invalid key format. No configuration was written.' }
    if ($Model -notmatch '^[a-z0-9.-]{1,100}$') { throw 'Invalid model identifier.' }
    $lines = @()
    if (Test-Path -LiteralPath $target) { $lines = @(Get-Content -LiteralPath $target | Where-Object { $_ -notmatch '^\s*(?:export\s+)?GEMINI_(API_KEY|MODEL)\s*=' }) }
    $lines += "GEMINI_API_KEY=$apiValue"
    $lines += "GEMINI_MODEL=$Model"
    [IO.File]::WriteAllLines($target, $lines, [Text.UTF8Encoding]::new($false))
    Write-Host 'Gemini configuration saved locally. Refresh the app; the backend reloads it automatically.'
} finally {
    if ($buffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer) }
    $apiValue = $null
    if ($secret) { $secret.Dispose() }
}
