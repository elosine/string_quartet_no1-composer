\version "2.20.0"
\language "english"

% ============================================
% GLISSANDO NOTATION TEMPLATE
% ============================================
% Variables to customize per instance:
%   - CLEF: treble, cClef (alto), bass
%   - START_PITCH: e.g., a4, cs5, bf3
%   - END_PITCH: e.g., af4, d5, g3
%   - GLISS_Y_OFFSET: 0 (default) or 0.3 (when both notes on same staff line)
% ============================================

\paper{
  tagline = ##f
  paper-width = 19\mm
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
    % === CLEF VARIABLE ===
    % Options: \clef treble, \clef bass, \clef bass
    \clef bass
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    % Custom Staff Lines (fixed width)
    \override StaffSymbol.stencil =
    #(lambda (grob)
       (let*
        ((staff-space (ly:staff-symbol-staff-space grob))
         (line-count (ly:grob-property grob 'line-count 5))
         (thickness (ly:grob-property grob 'thickness 1))
         (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
         (width 2.4)
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
    \time 2/4
    \override NoteHead.font-size = #-2
    \override Accidental.font-size = -6
    \override Stem.transparent = ##t
    \override DynamicText.font-size = #-7
    
    % === START PITCH ===
    \once \override NoteColumn.X-offset = #-0.7
    % === DYNAMIC MARKING ===
    cs'4\f
    
    % === GLISSANDO LINE ===
    % GLISS_Y_OFFSET: Use 0.3 when both notes on same staff line, else 0
    -\tweak extra-offset #'(0 . 0.3)
    -\tweak bound-details.left.padding #0.2
    -\tweak bound-details.right.padding #-0.1
    \glissando
    
    % === END PITCH ===
    \once \override Accidental.extra-offset = #'(0.3 . 0)
    \once \override NoteColumn.X-offset = #-1.8
    c'4
  }
  
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 18\mm
  }
}
