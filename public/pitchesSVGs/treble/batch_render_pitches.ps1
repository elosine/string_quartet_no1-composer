# Batch render LilyPond files to cropped SVGs
# Usage: Run this script from the treble folder, or modify $inputDir

$inputDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\lilypond_code\pitches\treble"
$lilypondPath = "lilypond"  # Assumes lilypond is in PATH; otherwise use full path like "C:\Program Files\LilyPond\usr\bin\lilypond.exe"
$inkscapePath = "C:\Program Files\Inkscape\bin\inkscape.exe"

# Get all .ly files
$lyFiles = Get-ChildItem -Path $inputDir -Filter "*.ly"

Write-Host "Found $($lyFiles.Count) LilyPond files to process..."

foreach ($file in $lyFiles) {
    $baseName = $file.BaseName
    $lyPath = $file.FullName
    $svgOutput = Join-Path $inputDir "$baseName.svg"
    $croppedOutput = Join-Path $inputDir "$baseName-cropped.svg"
    
    Write-Host "Processing: $baseName"
    
    # Step 1: Render LilyPond to SVG
    # LilyPond outputs [filename].svg (or [filename]-1.svg for multi-page)
    Write-Host "  Rendering LilyPond..."
    & $lilypondPath --svg -dbackend=svg -o "$inputDir\$baseName" $lyPath 2>$null
    
    # LilyPond may output as [baseName].svg or [baseName]-1.svg
    $renderedSvg = Join-Path $inputDir "$baseName.svg"
    if (-not (Test-Path $renderedSvg)) {
        $renderedSvg = Join-Path $inputDir "$baseName-1.svg"
    }
    
    if (Test-Path $renderedSvg) {
        # Step 2: Use Inkscape to crop to content and save as plain SVG
        Write-Host "  Cropping with Inkscape..."
        
        # Inkscape command: fit page to selection/drawing, export as plain SVG
        & $inkscapePath $renderedSvg --actions="select-all;fit-canvas-to-selection;export-filename:$croppedOutput;export-plain-svg;export-do" 2>$null
        
        # Replace original with cropped version
        if (Test-Path $croppedOutput) {
            Remove-Item $renderedSvg -Force
            Rename-Item $croppedOutput -NewName "$baseName.svg"
            Write-Host "  Done: $baseName.svg"
        } else {
            Write-Host "  Warning: Cropping failed for $baseName"
        }
    } else {
        Write-Host "  Error: LilyPond failed to render $baseName"
    }
}

Write-Host "`nBatch processing complete!"
