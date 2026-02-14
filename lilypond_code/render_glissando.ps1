# Render a single glissando LilyPond file to cropped SVG
# Usage: .\render_glissando.ps1 -Filename "Gliss-alto-C4-G4.ly"
# Output: Cropped SVG saved to public/SVG_graphics/

param(
    [Parameter(Mandatory=$true)]
    [string]$Filename
)

$projectRoot = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer"
$inputDir = Join-Path $projectRoot "lilypond_code"
$outputDir = Join-Path $projectRoot "public\SVG_graphics"
$lilypondPath = "lilypond"  # Assumes lilypond is in PATH
$inkscapePath = "C:\Program Files\Inkscape\bin\inkscape.exe"

# Validate input file exists
$lyPath = Join-Path $inputDir $Filename
if (-not (Test-Path $lyPath)) {
    Write-Host "Error: LilyPond file not found: $lyPath"
    exit 1
}

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($Filename)
$tempSvg = Join-Path $inputDir "$baseName.svg"
$outputSvg = Join-Path $outputDir "$baseName.svg"

Write-Host "Rendering: $Filename"

# Step 1: Render LilyPond to SVG (in lilypond_code directory)
Write-Host "  Running LilyPond..."
& $lilypondPath --svg -dbackend=svg -o "$inputDir\$baseName" $lyPath 2>$null

# LilyPond may output as [baseName].svg or [baseName]-1.svg
$renderedSvg = $tempSvg
if (-not (Test-Path $renderedSvg)) {
    $renderedSvg = Join-Path $inputDir "$baseName-1.svg"
}

if (-not (Test-Path $renderedSvg)) {
    Write-Host "  Error: LilyPond failed to render SVG"
    exit 1
}

Write-Host "  LilyPond output: $renderedSvg"

# Step 2: Crop with Inkscape and save to output directory
Write-Host "  Cropping with Inkscape..."
$croppedTemp = Join-Path $inputDir "$baseName-cropped.svg"

& $inkscapePath $renderedSvg --actions="select-all;fit-canvas-to-selection;export-filename:$croppedTemp;export-plain-svg;export-do" 2>$null

if (Test-Path $croppedTemp) {
    # Move cropped file to output directory
    Move-Item $croppedTemp -Destination $outputSvg -Force
    
    # Clean up the uncropped SVG from lilypond_code
    Remove-Item $renderedSvg -Force
    
    Write-Host "  Success: $outputSvg"
    Write-Host "OUTPUT:$outputSvg"  # Machine-readable output for server parsing
    exit 0
} else {
    Write-Host "  Error: Inkscape cropping failed"
    # Clean up
    if (Test-Path $renderedSvg) { Remove-Item $renderedSvg -Force }
    exit 1
}
