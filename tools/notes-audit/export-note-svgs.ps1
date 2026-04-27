param(
  [string]$CsvPath = ".\Supabase Snippet Extract Embedded SVG Fields From Notes and Versions.csv",
  [string]$OutDir = ".\notes_svg_dump"
)

if (-not (Test-Path -LiteralPath $CsvPath)) {
  throw "CSV not found: $CsvPath"
}

$rows = Import-Csv -LiteralPath $CsvPath
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$index = @()

function Decode-Svg([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }

  $s = $raw.Trim()

  if ($s -match '^data:image/svg\+xml') {
    $payload = $s -replace '^data:image/svg\+xml(;charset=[^,]+)?(;base64)?,', ''
    if ($s -match ';base64,') {
      return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
    }
    return [Uri]::UnescapeDataString($payload)
  }

  return $s
}

$written = 0
$skipped = 0

foreach ($r in $rows) {
  $svg = Decode-Svg ([string]$r.svg_raw)
  if ([string]::IsNullOrWhiteSpace($svg) -or ($svg -notmatch '<svg')) {
    $skipped++
    continue
  }

  $source = ([string]$r.source_table).Trim()
  $rowId = ([string]$r.row_id).Trim()
  $custId = ([string]$r.customer_id).Trim()
  $date = ([string]$r.date).Trim()
  $created = ([string]$r.created_at).Trim()
  $edited = ([string]$r.edited_date).Trim()

  $safeSource = ($source -replace '[^\w\-]','_')
  $safeRowId = ($rowId -replace '[^\w\-]','_')
  $safeCust = ($custId -replace '[^\w\-]','_')

  $fileName = "{0}_{1}_cust-{2}.svg" -f $safeSource, $safeRowId, $safeCust
  $filePath = Join-Path $OutDir $fileName

  Set-Content -LiteralPath $filePath -Value $svg -Encoding UTF8
  $written++

  $index += [pscustomobject]@{
    file         = $fileName
    source_table = $source
    row_id       = $rowId
    customer_id  = $custId
    date         = $date
    created_at   = $created
    edited_date  = $edited
  }
}

$indexPath = Join-Path $OutDir "index.csv"
$index | Export-Csv -NoTypeInformation -LiteralPath $indexPath -Encoding UTF8

Write-Host "Done."
Write-Host "Written SVG files: $written"
Write-Host "Skipped rows: $skipped"
Write-Host "Index: $indexPath"
