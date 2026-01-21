\version "2.24.4"

% =====================================================================
% PAPER SECTION
% =====================================================================
\paper {
  paper-width = 130\mm
  paper-height = 500\mm
  top-margin = 5\mm
  bottom-margin = 10\mm
  left-margin = 1\mm
  right-margin = 1\mm
  system-system-spacing =
  #'((basic-distance . 15)
     (minimum-distance . 8)
     (padding . 2)
     (stretchability . 60))
}

% =====================================================================
% CUSTOM DEFINITIONS
% =====================================================================
% Block notehead for col legno battuto cluster
blockHead = {
  \override NoteHead.stencil = #ly:text-interface::print
  \override NoteHead.text = \markup {
    \filled-box #'(-0.6 . 0.6) #'(-1.5 . 1.5) #0
  }
}

% =====================================================================
% SCORE BLOCK
% =====================================================================
\score {
  \new RhythmicStaff \with {
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \override StaffSymbol.line-count = #1
    \override StaffSymbol.thickness = #1
  }
  {
    % --- INITIAL SETTINGS ---
    \override Score.BarNumber.break-visibility = ##(#f #f #f)
    \time 4/4
    \override DynamicText.font-size = #-6
    \override Stem.transparent = ##t
    \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)

    % --- THE MUSIC ---
    \blockHead
    g4\fff^\markup {
      \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6
      \center-column {
        "c.l. batt."
        "launch at all strings"
      }
    }

    s2.

    \undo \omit Staff.BarLine
    \bar "|."
  }

  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
      \override Beam.breakable = ##t
      \override Glissando.breakable = ##t
      \override TextSpanner.breakable = ##t
    }
    indent = 0
    line-width = 20\mm
  }
}
