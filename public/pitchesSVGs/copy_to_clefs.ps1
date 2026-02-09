# Copy treble pitch SVGs to alto and bass folders with correct pitch names
# Clef transposition using letter + octave logic (not semitone offset)

$trebleDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\treble"
$altoDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\alto"
$bassDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\bass"

# Letter transposition maps (same visual staff position)
# Alto: C->D, D->E, E->F, F->G, G->A, A->B, B->C
$trebleToAltoLetter = @{
    "C" = "D"; "D" = "E"; "E" = "F"; "F" = "G"; "G" = "A"; "A" = "B"; "B" = "C"
}

# Bass: C->E, D->F, E->G, F->A, G->B, A->C, B->D
$trebleToBassLetter = @{
    "C" = "E"; "D" = "F"; "E" = "G"; "F" = "A"; "G" = "B"; "A" = "C"; "B" = "D"
}

# Function to transpose a pitch name
function Get-TransposedPitch {
    param(
        [string]$treblePitch,
        [hashtable]$letterMap,
        [string]$clefType  # "alto" or "bass"
    )
    
    # Parse the pitch: letter, accidental, octave
    # Examples: D4, DQS4, DS4, DTQS4, DF4, DQF4, DTQF4
    if ($treblePitch -match "^([A-G])(.*)(\d)$") {
        $letter = $matches[1]
        $accidental = $matches[2]  # QS, S, TQS, QF, F, TQF, or empty
        $octave = [int]$matches[3]
        
        # Get new letter
        $newLetter = $letterMap[$letter]
        
        # Calculate new octave based on clef type
        if ($clefType -eq "alto") {
            # Alto: octave - 1, EXCEPT B->C keeps same octave
            if ($letter -eq "B") {
                $newOctave = $octave  # B->C, no octave change
            } else {
                $newOctave = $octave - 1
            }
        } else {
            # Bass: octave - 2, EXCEPT A->C and B->D use octave - 1
            if ($letter -eq "A" -or $letter -eq "B") {
                $newOctave = $octave - 1
            } else {
                $newOctave = $octave - 2
            }
        }
        
        return "$newLetter$accidental$newOctave"
    }
    
    return $null
}

# Get all cropped SVGs in treble folder
$trebleFiles = Get-ChildItem -Path $trebleDir -Filter "*-cropped.svg"

Write-Host "Processing $($trebleFiles.Count) files..."

foreach ($file in $trebleFiles) {
    # Parse pitch name from filename (e.g., "D4-cropped.svg" -> "D4")
    $treblePitch = $file.BaseName -replace "-cropped", ""
    
    # Calculate alto pitch
    $altoPitch = Get-TransposedPitch -treblePitch $treblePitch -letterMap $trebleToAltoLetter -clefType "alto"
    if ($altoPitch) {
        $altoFile = Join-Path $altoDir "$altoPitch-cropped.svg"
        Copy-Item -Path $file.FullName -Destination $altoFile
        Write-Host "  $treblePitch -> Alto: $altoPitch"
    } else {
        Write-Host "  WARNING: Could not parse pitch from $($file.Name)"
    }
    
    # Calculate bass pitch
    $bassPitch = Get-TransposedPitch -treblePitch $treblePitch -letterMap $trebleToBassLetter -clefType "bass"
    if ($bassPitch) {
        $bassFile = Join-Path $bassDir "$bassPitch-cropped.svg"
        Copy-Item -Path $file.FullName -Destination $bassFile
        Write-Host "  $treblePitch -> Bass: $bassPitch"
    } else {
        Write-Host "  WARNING: Could not parse pitch from $($file.Name)"
    }
}

Write-Host "`nDone!"
Write-Host "Alto files: $((Get-ChildItem $altoDir -Filter '*.svg').Count)"
Write-Host "Bass files: $((Get-ChildItem $bassDir -Filter '*.svg').Count)"
