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

    ff''4

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
