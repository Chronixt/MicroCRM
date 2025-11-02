$data = Get-Content 'chikas-daily-backup-2025-11-02.json' -Raw | ConvertFrom-Json
$missingIds = $data.customers | Where-Object { -not $_.id -or $_.id -eq $null }

Write-Host "Total customers in backup: $($data.customers.Count)"
Write-Host "Customers missing IDs: $($missingIds.Count)"
Write-Host ""

if ($missingIds.Count -gt 0) {
    Write-Host "=== Customers WITHOUT IDs ==="
    $i = 1
    foreach ($customer in $missingIds) {
        $name = "$($customer.firstName) $($customer.lastName)".Trim()
        if (-not $name) { $name = "(No name)" }
        $contact = if ($customer.contactNumber) { $customer.contactNumber } else { "N/A" }
        $created = if ($customer.createdAt) { $customer.createdAt } else { "N/A" }
        Write-Host "$i. $name - Contact: $contact - Created: $created"
        $i++
    }
    
    Write-Host ""
    Write-Host "=== First few customers WITH IDs (for comparison) ==="
    $withIds = $data.customers | Where-Object { $_.id -ne $null } | Select-Object -First 5
    foreach ($customer in $withIds) {
        $name = "$($customer.firstName) $($customer.lastName)".Trim()
        Write-Host "  ID: $($customer.id) - $name"
    }
}

