\version "2.24.0"

#(ly:set-option 'crop #t)

\paper {
  indent = 0\mm
  line-width = 20\mm
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

\new Staff {
  % Invisible alto clef
  \override Staff.Clef.stencil = ##f
  \clef alto
  
  % Note head 80% (font-size -1.5), accidental 65% (font-size -3)
  \once \override Stem.stencil = ##f
  \once \override NoteHead.font-size = #-1.5
  \once \override Accidental.font-size = #-3
  
  % Dynamics further reduced (another 30%)
  \once \override DynamicText.font-size = #-6
  
  % Crescendo: double width, same height, Y position at ledger line
  \once \override Hairpin.minimum-length = #8
  \once \override Hairpin.Y-offset = #-5
  \once \override Hairpin.height = #0.3
  
  dis2\ppp\<
  ^\markup { \fontsize #-4 \italic "senza vib." }
  s4\!
  \bar ""
}
