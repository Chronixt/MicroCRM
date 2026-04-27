param(
  [Parameter(Mandatory = $true)]
  [string]$BackupJsonPath,
  [string]$OutCsvPath = ""
)

if (-not (Test-Path -LiteralPath $BackupJsonPath)) {
  throw "Backup file not found: $BackupJsonPath"
}

$raw = Get-Content -Raw -LiteralPath $BackupJsonPath
$json = $raw | ConvertFrom-Json

$customers = @($json.customers)
$images = @($json.images)

$customerById = @{}
foreach ($c in $customers) {
  $customerById[[int]$c.id] = $c
}

function Get-Md5Hex([string]$text) {
  $md5 = [System.Security.Cryptography.MD5]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hashBytes = $md5.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLower()
  } finally {
    $md5.Dispose()
  }
}

$rows = @()
foreach ($img in $images) {
  $cid = [int]$img.customerId
  if (-not $customerById.ContainsKey($cid)) { continue }

  $c = $customerById[$cid]
  $firstName = [string]$c.firstName
  if ([string]::IsNullOrWhiteSpace($firstName)) { continue }

  $dataUrl = [string]$img.dataUrl
  if ([string]::IsNullOrWhiteSpace($dataUrl)) { continue }

  $rows += [pscustomobject]@{
    first_name_key = $firstName.Trim().ToLower()
    first_name = $firstName
    customer_id = $cid
    image_id = $img.id
    image_hash = Get-Md5Hex $dataUrl
  }
}

$dupeGroups = $rows |
  Group-Object first_name_key, image_hash |
  Where-Object { (@($_.Group.customer_id | Select-Object -Unique)).Count -gt 1 }

$results = $dupeGroups | ForEach-Object {
  $g = $_.Group
  $custIds = @($g.customer_id | Select-Object -Unique | Sort-Object)
  [pscustomobject]@{
    first_name = $g[0].first_name
    image_hash = $g[0].image_hash
    customer_count = $custIds.Count
    customer_ids = ($custIds -join ',')
    image_row_count = $g.Count
  }
} | Sort-Object -Property @{Expression = 'customer_count'; Descending = $true}, @{Expression = 'first_name'; Descending = $false}

Write-Host "Customers: $($customers.Count)"
Write-Host "Images: $($images.Count)"
Write-Host "Duplicate groups (first_name + identical image base64): $($results.Count)"

if ($results.Count -gt 0) {
  $results | Format-Table -AutoSize
}

if (-not [string]::IsNullOrWhiteSpace($OutCsvPath)) {
  $results | Export-Csv -NoTypeInformation -LiteralPath $OutCsvPath -Encoding UTF8
  Write-Host "CSV written: $OutCsvPath"
}
