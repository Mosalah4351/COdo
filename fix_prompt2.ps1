$content = Get-Content "D:\COdo\packages\tui\src\component\prompt\index.tsx" -Raw

# Remove the extra closing </box> that was for the flexDirection="row" wrapper
# The pattern is: </box> followed by <box width="100%" flexDirection="row" justifyContent="space-between">
$old = '            </box>
          </box>
        </box>
        <box width="100%" flexDirection="row" justifyContent="space-between">'

$new = '            </box>
          </box>
        <box width="100%" flexDirection="row" justifyContent="space-between">'

$content = $content -replace [Regex]::Escape($old), $new

Set-Content "D:\COdo\packages\tui\src\component\prompt\index.tsx" -Value $content -Encoding UTF8
Write-Host "Second replacement done"