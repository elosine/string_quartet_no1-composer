# Generate flat pitch LilyPond files (quarter-flat, flat, three-quarter-flat)
# These complement the existing sharp files

$outputDir = "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer\lilypond_code\pitches\treble"

# LilyPond template
$template = @'
\version "2.20.0"
\language "english"
\paper{
  tagline = ##f
  paper-width = 11\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  paper-height = 20\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef treble
    
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.ledger-line-thickness = #'(1 . 0)
    %Custom Staff Lines
    \override StaffSymbol.stencil =
    #( lambda (grob)
       (let*
        ((staff-space (ly:staff-symbol-staff-space grob))
         (line-count (ly:grob-property grob 'line-count 5))
         (thickness (ly:grob-property grob 'thickness 1))
         (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
         ;Adjust Staff Line  Width Here /////////
         (width 0.8) ;staff line width in mm
         (width-staff-spaces (/ (* width 2.8346) staff-space))
         (half-height (* (/ (- line-count 1) 2) staff-space)))
        (apply ly:stencil-add
               (map
                (lambda (i)
                  (ly:make-stencil
                   (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                   (cons 0 width-staff-spaces)
                   (cons (- half-height) half-height)))
                (iota line-count (- (/ (- line-count 1) 2)))))))
  }
  {
    \time 1/4 %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
    \override NoteHead.font-size = #-2
    \override DynamicText.font-size = #-8.5
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6)
    \override Accidental.font-size = -6
    \override Stem.transparent = ##t
    \once \override NoteColumn.X-offset = #-1.5

    PITCH_PLACEHOLDER

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 11\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  }
  \midi{}
}
'@

# Define all pitches that need flat variants
# Format: [lilypondPitch, fileName]
# LilyPond: qf = quarter-flat, f = flat (but 'f' is also the note F, so we use 'es' for flat in some cases)
# Actually in LilyPond English: flat = f, quarter-flat = qf, three-quarter-flat = tqf

# Notes and their octave markers in LilyPond
# Octave 3: no mark (f, g, a, b)
# Octave 4: ' (c', d', e', f', g', a', b')
# Octave 5: '' (c'', d'', etc.)
# Octave 6: ''' (c''', d''', etc.)

$pitches = @(
    # Octave 3 flats (F3 range - but F-flat would be E, so we start with notes that make sense)
    # G-flat 3
    @{lily="gf4"; file="GF3"},
    @{lily="gqf4"; file="GQF3"},
    @{lily="gtqf4"; file="GTQF3"},
    # A-flat 3
    @{lily="af4"; file="AF3"},
    @{lily="aqf4"; file="AQF3"},
    @{lily="atqf4"; file="ATQF3"},
    # B-flat 3
    @{lily="bf4"; file="BF3"},
    @{lily="bqf4"; file="BQF3"},
    @{lily="btqf4"; file="BTQF3"},
    
    # Octave 4 flats
    # C-flat 4 (= B3, but we still create the file for the accidental)
    @{lily="cf'4"; file="CF4"},
    @{lily="cqf'4"; file="CQF4"},
    @{lily="ctqf'4"; file="CTQF4"},
    # D-flat 4
    @{lily="df'4"; file="DF4"},
    @{lily="dqf'4"; file="DQF4"},
    @{lily="dtqf'4"; file="DTQF4"},
    # E-flat 4
    @{lily="ef'4"; file="EF4"},
    @{lily="eqf'4"; file="EQF4"},
    @{lily="etqf'4"; file="ETQF4"},
    # F-flat 4 (= E4)
    @{lily="ff'4"; file="FF4"},
    @{lily="fqf'4"; file="FQF4"},
    @{lily="ftqf'4"; file="FTQF4"},
    # G-flat 4
    @{lily="gf'4"; file="GF4"},
    @{lily="gqf'4"; file="GQF4"},
    @{lily="gtqf'4"; file="GTQF4"},
    # A-flat 4
    @{lily="af'4"; file="AF4"},
    @{lily="aqf'4"; file="AQF4"},
    @{lily="atqf'4"; file="ATQF4"},
    # B-flat 4
    @{lily="bf'4"; file="BF4"},
    @{lily="bqf'4"; file="BQF4"},
    @{lily="btqf'4"; file="BTQF4"},
    
    # Octave 5 flats
    @{lily="cf''4"; file="CF5"},
    @{lily="cqf''4"; file="CQF5"},
    @{lily="ctqf''4"; file="CTQF5"},
    @{lily="df''4"; file="DF5"},
    @{lily="dqf''4"; file="DQF5"},
    @{lily="dtqf''4"; file="DTQF5"},
    @{lily="ef''4"; file="EF5"},
    @{lily="eqf''4"; file="EQF5"},
    @{lily="etqf''4"; file="ETQF5"},
    @{lily="ff''4"; file="FF5"},
    @{lily="fqf''4"; file="FQF5"},
    @{lily="ftqf''4"; file="FTQF5"},
    @{lily="gf''4"; file="GF5"},
    @{lily="gqf''4"; file="GQF5"},
    @{lily="gtqf''4"; file="GTQF5"},
    @{lily="af''4"; file="AF5"},
    @{lily="aqf''4"; file="AQF5"},
    @{lily="atqf''4"; file="ATQF5"},
    @{lily="bf''4"; file="BF5"},
    @{lily="bqf''4"; file="BQF5"},
    @{lily="btqf''4"; file="BTQF5"},
    
    # Octave 6 flats (up to E6)
    @{lily="cf'''4"; file="CF6"},
    @{lily="cqf'''4"; file="CQF6"},
    @{lily="ctqf'''4"; file="CTQF6"},
    @{lily="df'''4"; file="DF6"},
    @{lily="dqf'''4"; file="DQF6"},
    @{lily="dtqf'''4"; file="DTQF6"},
    @{lily="ef'''4"; file="EF6"},
    @{lily="eqf'''4"; file="EQF6"},
    @{lily="etqf'''4"; file="ETQF6"}
)

Write-Host "Generating $($pitches.Count) flat pitch files..."

foreach ($pitch in $pitches) {
    $content = $template -replace "PITCH_PLACEHOLDER", $pitch.lily
    $filePath = Join-Path $outputDir "$($pitch.file).ly"
    Set-Content -Path $filePath -Value $content -Encoding UTF8
    Write-Host "  Created: $($pitch.file).ly"
}

Write-Host "`nDone! Created $($pitches.Count) flat pitch files."
