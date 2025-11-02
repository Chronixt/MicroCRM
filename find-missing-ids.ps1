$jsonContent = Get-Content 'chikas-daily-backup-2025-11-02.json' -Raw
$data = $jsonContent | ConvertFrom-Json

$missingIds = $data.customers | Where-Object { 
    -not $_.id -or $_.id -eq $null -or $_.id -eq ''
}

Write-Host ""
Write-Host "=== Customers Missing IDs ===" -ForegroundColor Yellow
Write-Host "Total customers: $($data.customers.Count)" -ForegroundColor Cyan
Write-Host "Customers missing IDs: $($missingIds.Count)" -ForegroundColor $(if ($missingIds.Count -gt 0) { 'Red' } else { 'Green' })

if ($missingIds.Count -gt 0) {
    Write-Host ""
    Write-Host "Details:" -ForegroundColor Yellow
    $missingIds | ForEach-Object -Begin { $i = 1 } -Process {
        $name = "$($_.firstName) $($_.lastName)".Trim()
        if ([string]::IsNullOrWhiteSpace($name)) {
            $name = "(No name)"
        }
        Write-Host "$i. $name" -ForegroundColor White
        Write-Host "   Contact: $($_.contactNumber)" -ForegroundColor Gray
        Write-Host "   Created: $($_.createdAt)" -ForegroundColor Gray
        Write-Host "   Updated: $($_.updatedAt)" -ForegroundColor Gray
        if ($_.socialMediaName) {
            Write-Host "   Social Media: $($_.socialMediaName)" -ForegroundColor Gray
        }
        Write-Host ""
        $i++
    }
} else {
    Write-Host ""
    Write-Host "✓ All customers have IDs!" -ForegroundColor Green
}

