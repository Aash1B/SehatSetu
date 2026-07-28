$historyPath = "$env:APPDATA\Code\User\History"
$entriesFiles = Get-ChildItem -Path $historyPath -Filter "entries.json" -Recurse -ErrorAction SilentlyContinue

foreach ($file in $entriesFiles) {
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        $resource = $content.resource
        if ($resource -match "SehatSetu/frontend/src/App.tsx") {
            Write-Output "App.tsx Found in: $($file.Directory.FullName)"
            $content.entries | Sort-Object timestamp -Descending | Select-Object -First 5 | ForEach-Object {
                Write-Output "  $($_.id) - $($_.timestamp)"
            }
        }
        if ($resource -match "SehatSetu/frontend/src/index.css") {
            Write-Output "index.css Found in: $($file.Directory.FullName)"
            $content.entries | Sort-Object timestamp -Descending | Select-Object -First 5 | ForEach-Object {
                Write-Output "  $($_.id) - $($_.timestamp)"
            }
        }
    } catch {}
}
