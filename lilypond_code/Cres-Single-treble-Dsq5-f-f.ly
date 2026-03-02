\version "2.20.0"
\language "english"

% ============================================
% CRESCENDO-DECRESCENDO SINGLE PITCH TEMPLATE
% ============================================
% Variables to customize per instance:
%   - CLEF: treble, alto, bass
%   - PITCH: e.g., a4, cs5, bf3
%   - DYNAMIC_1: first dynamic (e.g., \ppp, \f, \mf)
%   - DYNAMIC_2: second dynamic (e.g., \f, \ppp, \mp)
%   - HAIRPIN: \< (crescendo) or \> (decrescendo)
% ============================================

\paper{
  tagline = ##f
  paper-width = 14\mm
  paper-height = 25\mm
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
    \clef treble
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    %Custom Staff Lines
    \override StaffSymbol.stencil =
    #( lambda (grob)
       (let*
        ((staff-space (ly:staff-symbol-staff-space grob))
         (line-count (ly:grob-property grob 'line-count 5))
         (thickness (ly:grob-property grob 'thickness 1))
         (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
         ;Adjust Staff Line  Width Here /////////
         (width 2) ;staff line width in mm
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
    \time 4/4
    \override NoteHead.font-size = #-2
    \override NoteHead.style = #'default
    \override DynamicText.font-size = #-8.5
    \override Accidental.font-size = -5
    \override Stem.transparent = ##t

    % NOTATION HERE /////////////////////////////////////////////////////

    % Hairpin
    \override Hairpin.height = #0.65  % hairpin height
    \override Hairpin.Y-offset = #-0.3  % Move hairpin y

    % Single pitch note (half note head, no stem)
    \once \override NoteColumn.X-offset = #-1.5

    % === PITCH ===
    dtqs''2

    % === DYNAMIC_1 ===
    -\tweak extra-offset #'(0 . -0.2)  % X,Y offset in staff spaces
    \f

    % Non-Vib Text
    -\tweak extra-offset #'(0 . 0)  % X,Y offset in staff spaces
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "Non-Vib"
    }
    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 50\mm
  }
  \midi{}
}
