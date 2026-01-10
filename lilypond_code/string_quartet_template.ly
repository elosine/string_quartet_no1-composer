\version "2.24.0"

% String Quartet Staff Template
% Based on traditional engraving style with thin bracket connecting all staves
% Instrument names centered, appropriate clefs for each instrument

\paper {
  indent = 15\mm
  short-indent = 8\mm
  line-width = 160\mm
  ragged-right = ##f
  left-margin = 5\mm
  right-margin = 5\mm
  top-margin = 3\mm
  bottom-margin = 3\mm
  print-page-number = ##f
  system-system-spacing.basic-distance = #12
  staff-staff-spacing.basic-distance = #10
  staff-staff-spacing.minimum-distance = #8
}

\header {
  tagline = ##f
}

\layout {
  \context {
    \Score
    \override SystemStartBar.thickness = #0.5
    \override SystemStartBracket.thickness = #0.5
    \override SystemStartBracket.padding = #0.3
    \remove "Bar_number_engraver"
  }
  
  \context {
    \Staff
    \override StaffSymbol.thickness = #0.5
    \override InstrumentName.font-size = #-1
  }
  
  \context {
    \StaffGroup
    systemStartDelimiterHierarchy = #'(SystemStartBracket (SystemStartBar a b c d))
  }
}

% Define each instrument part
violinOne = \new Staff \with {
  instrumentName = "Violin I"
  shortInstrumentName = "Vln. I"
  midiInstrument = "violin"
} {
  \clef treble
  \time 4/4
  % Placeholder music - replace with actual content
  c''4 d'' e'' f'' |
  g''2 a''2 |
  b''4 c'''4 b''4 a''4 |
  g''1 |
}

violinTwo = \new Staff \with {
  instrumentName = "Violin II"
  shortInstrumentName = "Vln. II"
  midiInstrument = "violin"
} {
  \clef treble
  \time 4/4
  % Placeholder music - replace with actual content
  e'4 f' g' a' |
  b'2 c''2 |
  d''4 e''4 d''4 c''4 |
  b'1 |
}

viola = \new Staff \with {
  instrumentName = "Viola"
  shortInstrumentName = "Vla."
  midiInstrument = "viola"
} {
  \clef alto
  \time 4/4
  % Placeholder music - replace with actual content
  c'4 d' e' f' |
  g'2 a'2 |
  b'4 c''4 b'4 a'4 |
  g'1 |
}

cello = \new Staff \with {
  instrumentName = "Cello"
  shortInstrumentName = "Vc."
  midiInstrument = "cello"
} {
  \clef bass
  \time 4/4
  % Placeholder music - replace with actual content
  c4 d e f |
  g2 a2 |
  b4 c'4 b4 a4 |
  g1 |
}

% Combine into String Quartet score
\score {
  \new StaffGroup <<
    \violinOne
    \violinTwo
    \viola
    \cello
  >>
  
  \layout { }
  \midi { \tempo 4 = 120 }
}
