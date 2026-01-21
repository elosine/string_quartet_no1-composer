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
pressureWedge = {
  \once \override TextSpanner.stencil =
    #(lambda (grob)
       (let* ((x-ext (ly:stencil-extent (ly:line-spanner::print grob) X))
              (w (interval-length x-ext))
              (st 2.5)
              (et 0.1)
              (points (list 0 (/ st 2) w (/ et 2) w (/ et -2) 0 (/ st -2)))
              (wedge (ly:make-stencil (list 'polygon points 0.0 #t) (cons 0 w) (cons -1 1))))
         wedge))
  \once \override TextSpanner.bound-details.left.padding = #0
  \once \override TextSpanner.bound-details.right.padding = #0
  \once \override TextSpanner.padding = #3
}

% =====================================================================
% SCORE BLOCK
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef alto
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
  }
  {
    % --- INITIAL SETTINGS ---
    \override Score.BarNumber.break-visibility = ##(#f #f #f)
    \time 4/4
    \override TupletBracket.bracket-visibility = ##t
    \override TupletNumber.stencil = ##f
    \override NoteHead.font-size = #-2
    \override DynamicText.font-size = #-6
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(5.5)
    \override Accidental.font-size = #-4
    \override Stem.transparent = ##t
    \override Hairpin.minimum-length = #0.1
    \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
    \override Hairpin.bound-details.left.padding = #0
    \override Glissando.style = #'zigzag
    \override Glissando.bound-details.left.padding = #0.5

    % --- THE MUSIC ---
    \pressureWedge
    g2\sfz\>\startTextSpan-\marcato
    ^\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6 "max. pressure" }

    
    s4\! \stopTextSpan
    ^\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6 "ord." }

    s4\!
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
    line-width = 40\mm
  }
}