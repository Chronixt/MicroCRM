param(
  [string]$IndexCsvPath = ".\notes_svg_dump\index.csv",
  [string]$OutHtmlPath = ".\notes_svg_dump\gallery.html",
  [string]$PageTitle = "Notes SVG Gallery",
  [int]$PageSize = 100
)

if (-not (Test-Path -LiteralPath $IndexCsvPath)) {
  throw "Index CSV not found: $IndexCsvPath"
}
if ($PageSize -lt 1) {
  throw "PageSize must be >= 1"
}

$rows = Import-Csv -LiteralPath $IndexCsvPath

function Escape-Html([string]$s) {
  if ($null -eq $s) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($s)
}

function Get-PagePath([string]$dir, [string]$base, [string]$ext, [int]$pageNum) {
  if ($pageNum -eq 1) {
    return Join-Path $dir ($base + $ext)
  }
  return Join-Path $dir ("{0}-p{1}{2}" -f $base, $pageNum, $ext)
}

function Get-PageHref([string]$base, [string]$ext, [int]$pageNum) {
  if ($pageNum -eq 1) {
    return ($base + $ext)
  }
  return ("{0}-p{1}{2}" -f $base, $pageNum, $ext)
}

$outDir = Split-Path -Path $OutHtmlPath -Parent
if ([string]::IsNullOrWhiteSpace($outDir)) { $outDir = "." }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($OutHtmlPath)
$ext = [System.IO.Path]::GetExtension($OutHtmlPath)
if ([string]::IsNullOrWhiteSpace($ext)) { $ext = ".html" }

$totalRows = $rows.Count
$totalPages = [Math]::Ceiling($totalRows / [double]$PageSize)
if ($totalPages -lt 1) { $totalPages = 1 }

for ($page = 1; $page -le $totalPages; $page++) {
  $start = ($page - 1) * $PageSize
  $end = [Math]::Min($start + $PageSize - 1, $totalRows - 1)

  $pageRows = @()
  if ($totalRows -gt 0) {
    $pageRows = $rows[$start..$end]
  }

  $cards = foreach ($r in $pageRows) {
    $file = Escape-Html ([string]$r.file)
    $source = Escape-Html ([string]$r.source_table)
    $rowId = Escape-Html ([string]$r.row_id)
    $custId = Escape-Html ([string]$r.customer_id)
    $date = Escape-Html ([string]$r.date)
    $created = Escape-Html ([string]$r.created_at)
    $edited = Escape-Html ([string]$r.edited_date)

@"
    <article class="card" data-source="$source" data-customer="$custId" data-row="$rowId">
      <div class="svg-wrap">
        <img loading="lazy" src="./$file" alt="$file" />
      </div>
      <div class="meta">
        <div><strong>File:</strong> $file</div>
        <div><strong>Source:</strong> $source</div>
        <div><strong>Row ID:</strong> $rowId</div>
        <div><strong>Customer:</strong> $custId</div>
        <div><strong>Date:</strong> $date</div>
        <div><strong>Created:</strong> $created</div>
        <div><strong>Edited:</strong> $edited</div>
      </div>
    </article>
"@
  }

  $cardsHtml = ($cards -join "`r`n")
  $sourcesOnPage = @($pageRows | ForEach-Object { [string]$_.source_table } | Sort-Object -Unique)

  $pageLinks = for ($p = 1; $p -le $totalPages; $p++) {
    $href = Get-PageHref -base $baseName -ext $ext -pageNum $p
    if ($p -eq $page) {
      "<span class='current'>Page $p</span>"
    } else {
      "<a href='$href'>Page $p</a>"
    }
  }
  $pagerHtml = ($pageLinks -join " ")

  $prevLink = ""
  $nextLink = ""
  if ($page -gt 1) {
    $prevHref = Get-PageHref -base $baseName -ext $ext -pageNum ($page - 1)
    $prevLink = "<a href='$prevHref' class='btn'>Prev</a>"
  }
  if ($page -lt $totalPages) {
    $nextHref = Get-PageHref -base $baseName -ext $ext -pageNum ($page + 1)
    $nextLink = "<a href='$nextHref' class='btn'>Next</a>"
  }

  $optHtml = "<option value=''>All sources</option>"
  foreach ($s in $sourcesOnPage) {
    $es = Escape-Html $s
    $optHtml += "<option value='$es'>$es</option>"
  }

  $pageStartHuman = if ($totalRows -gt 0) { $start + 1 } else { 0 }
  $pageEndHuman = if ($totalRows -gt 0) { $end + 1 } else { 0 }

  $safeTitle = [System.Net.WebUtility]::HtmlEncode($PageTitle)

  $html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$safeTitle</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0b0b;
      --panel: #161616;
      --text: #f2f2f2;
      --muted: #a9a9a9;
      --border: #2f2f2f;
      --accent: #42d392;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at top right, #1c1c1c, var(--bg) 45%);
      color: var(--text);
      font: 14px/1.4 "Segoe UI", system-ui, sans-serif;
    }
    .top {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(11, 11, 11, 0.92);
      backdrop-filter: blur(6px);
      border-bottom: 1px solid var(--border);
      padding: 12px;
    }
    .controls {
      display: grid;
      grid-template-columns: 1fr 220px auto;
      gap: 10px;
      max-width: 1400px;
      margin: 0 auto;
    }
    input, select {
      width: 100%;
      border: 1px solid var(--border);
      background: #111;
      color: var(--text);
      border-radius: 8px;
      padding: 8px 10px;
    }
    .count {
      align-self: center;
      color: var(--muted);
      white-space: nowrap;
    }
    .pager-wrap {
      max-width: 1400px;
      margin: 8px auto 0;
      color: var(--muted);
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .pages a, .btn {
      color: var(--text);
      border: 1px solid var(--border);
      padding: 4px 8px;
      border-radius: 8px;
      text-decoration: none;
      background: #141414;
    }
    .pages .current {
      color: var(--accent);
      font-weight: 600;
      padding: 4px 8px;
      border: 1px solid var(--accent);
      border-radius: 8px;
    }
    .grid {
      max-width: 1400px;
      margin: 14px auto;
      padding: 0 12px 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--panel);
      display: flex;
      flex-direction: column;
      min-height: 340px;
    }
    .svg-wrap {
      min-height: 190px;
      max-height: 260px;
      background: #000;
      display: grid;
      place-items: center;
      padding: 8px;
      border-bottom: 1px solid var(--border);
    }
    .svg-wrap img {
      max-width: 100%;
      max-height: 240px;
      background: #000;
    }
    .meta {
      padding: 10px;
      color: var(--muted);
      font-size: 12px;
      display: grid;
      gap: 4px;
      word-break: break-word;
    }
    .meta strong { color: var(--accent); font-weight: 600; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header class="top">
    <div class="controls">
      <input id="q" placeholder="Filter this page by file, customer id, source, row id, date..." />
      <select id="source">
        $optHtml
      </select>
      <div class="count" id="count"></div>
    </div>
    <div class="pager-wrap">
      <span>Showing rows $pageStartHuman-$pageEndHuman of $totalRows</span>
      $prevLink
      $nextLink
      <span class="pages">$pagerHtml</span>
    </div>
  </header>

  <main class="grid" id="grid">
$cardsHtml
  </main>

  <script>
    (function () {
      const q = document.getElementById('q');
      const source = document.getElementById('source');
      const count = document.getElementById('count');
      const cards = Array.from(document.querySelectorAll('.card'));

      function apply() {
        const text = (q.value || '').trim().toLowerCase();
        const src = source.value;
        let visible = 0;

        for (const card of cards) {
          const matchesSource = !src || card.dataset.source === src;
          const matchesText = !text || card.textContent.toLowerCase().includes(text);
          const show = matchesSource && matchesText;
          card.classList.toggle('hidden', !show);
          if (show) visible++;
        }
        count.textContent = visible + ' / ' + cards.length + ' shown (page $page of $totalPages)';
      }

      q.addEventListener('input', apply);
      source.addEventListener('change', apply);
      apply();
    })();
  </script>
</body>
</html>
"@

  $pagePath = Get-PagePath -dir $outDir -base $baseName -ext $ext -pageNum $page
  Set-Content -LiteralPath $pagePath -Value $html -Encoding UTF8
}

Write-Host ("Gallery created with pagination: {0} pages, {1} per page" -f $totalPages, $PageSize)
Write-Host ("Open: {0}" -f (Get-PagePath -dir $outDir -base $baseName -ext $ext -pageNum 1))
