# Crop the 16 new pitch SVGs using Inkscape
$inputDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\lilypond_code\pitches\treble"
$inkscapePath = "C:\Program Files\Inkscape\bin\inkscape.exe"

$newFiles = @('BS3', 'BS4', 'BS5', 'BTQS3', 'BTQS4', 'BTQS5', 'ES4', 'ES5', 'ES6', 'EQS6', 'ETQS4', 'ETQS5', 'ETQS6', 'FF3', 'FQF3', 'FTQF3')

foreach ($baseName in $newFiles) {
    $svgPath = Join-Path $inputDir "$baseName.svg"
    $croppedOutput = Join-Path $inputDir "$baseName-cropped.svg"
    
    if (Test-Path $svgPath) {
        Write-Host "Cropping: $baseName"
        & $inkscapePath $svgPath --actions="select-all;fit-canvas-to-selection;export-filename:$croppedOutput;export-plain-svg;export-do" 2>$null
        
        if (Test-Path $croppedOutput) {
            Write-Host "  Done: $baseName-cropped.svg"
        } else {
            Write-Host "  Warning: Cropping failed for $baseName"
        }
    } else {
        Write-Host "  Error: SVG not found for $baseName"
    }
}

Write-Host "`nCropping complete!"

# Now copy to public/pitchesSVGs/treble
$destDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\treble"

Write-Host "`nCopying cropped files to $destDir..."

foreach ($baseName in $newFiles) {
    $croppedPath = Join-Path $inputDir "$baseName-cropped.svg"
    if (Test-Path $croppedPath) {
        Copy-Item $croppedPath -Destination $destDir -Force
        Write-Host "  Copied: $baseName-cropped.svg"
    }
}

Write-Host "`nAll done!"
