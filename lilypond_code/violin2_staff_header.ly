\version "2.24.0"

#(ly:set-option 'crop #t)

\paper {
  indent = 12\mm
  line-width = 35\mm
  ragged-right = ##t
  left-margin = 0
  right-margin = 0
  top-margin = 0
  bottom-margin = 0
  print-page-number = ##f
  page-breaking = #ly:one-line-breaking
}

\header {
  tagline = ##f
}

\layout {
  \context {
    \Score
    \remove "Bar_number_engraver"
    \override BarLine.stencil = ##f
  }
  \context {
    \Staff
    \override StaffSymbol.thickness = #0.5
    \remove "Time_signature_engraver"
  }
}

\new StaffGroup \with {
  \override SystemStartBracket.padding = #0.3
  \override SystemStartBracket.collapse-height = #1
} <<
  \new Staff \with {
  } {
    \once \override Staff.Clef.font-size = #-4
    \once \override Staff.Clef.X-extent = #'(0 . 1.2)
    \once \override Staff.Clef.Y-extent = #'(-1.5 . 1.5)
    \clef treble
    s16
    \bar ""
  }
>>
