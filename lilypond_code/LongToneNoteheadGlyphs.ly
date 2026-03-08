\version "2.20.0"
\language "english"

% ============================================
% LONG TONE NOTEHEAD GLYPH EXTRACTION
% ============================================
% Half note (no stem) with each accidental variant
% For extracting SVG components
% ============================================

\paper {
  tagline = ##f
  paper-width = 160\mm
  paper-height = 20\mm
  top-margin = 5\mm
  bottom-margin = 5\mm
  left-margin = 3\mm
  right-margin = 3\mm
}

\score {
  \new Staff \with {
    \omit StaffSymbol
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \omit KeySignature
  }
  {
    \override NoteHead.font-size = #-3.3
    \override NoteHead.style = #'default
    \override Accidental.font-size = #-7
    \override Accidental.extra-offset = #'(0.3 . 0)
    \override Stem.transparent = ##t

    % 1. No accidental (plain half notehead)
    b'2

    s4

    % 2. Quarter flat (half flat)
    bqf'!2

    s4

    % 3. Flat
    bf'!2

    s4

    % 4. Three-quarter flat
    btqf'!2

    s4

    % 5. Natural
    b'!2

    s4

    % 6. Quarter sharp
    bqs'!2

    s4

    % 7. Sharp
    bs'!2

    s4

    % 8. Three-quarter sharp
    btqs'!2
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/8)
    }
    indent = 0
    line-width = 150\mm
  }
}
