# Copy the 16 new treble pitch SVGs to alto and bass folders with transposed names
# Based on the transposition logic worked out earlier

$trebleDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\treble"
$altoDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\alto"
$bassDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\public\pitchesSVGs\bass"

# The 16 new files we created
$newFiles = @('BS3', 'BS4', 'BS5', 'BTQS3', 'BTQS4', 'BTQS5', 'ES4', 'ES5', 'ES6', 'EQS6', 'ETQS4', 'ETQS5', 'ETQS6', 'FF3', 'FQF3', 'FTQF3')

# Transposition mappings
# Alto: Letter mapping (treble -> alto)
$altoLetterMap = @{
    'C' = 'D'; 'D' = 'E'; 'E' = 'F'; 'F' = 'G'; 'G' = 'A'; 'A' = 'B'; 'B' = 'C'
}

# Bass: Letter mapping (treble -> bass)
$bassLetterMap = @{
    'C' = 'E'; 'D' = 'F'; 'E' = 'G'; 'F' = 'A'; 'G' = 'B'; 'A' = 'C'; 'B' = 'D'
}

function Get-AltoName {
    param([string]$trebleName)
    
    # Parse: letter, accidental, octave
    # Examples: BS3, BTQS4, EQS6, FF3
    if ($trebleName -match '^([A-G])(.*)(\d)$') {
        $letter = $matches[1]
        $accidental = $matches[2]
        $octave = [int]$matches[3]
        
        $altoLetter = $altoLetterMap[$letter]
        
        # Octave rule: treble_octave - 1, except B->C keeps same octave
        if ($letter -eq 'B') {
            $altoOctave = $octave  # B->C, no -1
        } else {
            $altoOctave = $octave - 1
        }
        
        return "$altoLetter$accidental$altoOctave"
    }
    return $null
}

function Get-BassName {
    param([string]$trebleName)
    
    # Parse: letter, accidental, octave
    if ($trebleName -match '^([A-G])(.*)(\d)$') {
        $letter = $matches[1]
        $accidental = $matches[2]
        $octave = [int]$matches[3]
        
        $bassLetter = $bassLetterMap[$letter]
        
        # Octave rule: treble_octave - 2, except A->C and B->D use treble_octave - 1
        if ($letter -eq 'A' -or $letter -eq 'B') {
            $bassOctave = $octave - 1
        } else {
            $bassOctave = $octave - 2
        }
        
        return "$bassLetter$accidental$bassOctave"
    }
    return $null
}

Write-Host "Copying 16 new pitch SVGs to alto and bass folders..."
Write-Host ""

foreach ($trebleName in $newFiles) {
    $srcFile = Join-Path $trebleDir "$trebleName-cropped.svg"
    
    if (Test-Path $srcFile) {
        # Alto
        $altoName = Get-AltoName $trebleName
        if ($altoName) {
            $altoDest = Join-Path $altoDir "$altoName-cropped.svg"
            Copy-Item $srcFile -Destination $altoDest -Force
            Write-Host "Alto:  $trebleName -> $altoName"
        }
        
        # Bass
        $bassName = Get-BassName $trebleName
        if ($bassName) {
            $bassDest = Join-Path $bassDir "$bassName-cropped.svg"
            Copy-Item $srcFile -Destination $bassDest -Force
            Write-Host "Bass:  $trebleName -> $bassName"
        }
    } else {
        Write-Host "ERROR: Source file not found: $srcFile"
    }
}

Write-Host ""
Write-Host "Done!"
