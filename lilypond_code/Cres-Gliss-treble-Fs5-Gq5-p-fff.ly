\version "2.20.0"
\language "english"

% ============================================
% CRESCENDO-DECRESCENDO GLISSANDO TEMPLATE
% ============================================
% Variables to customize per instance:
%   - CLEF: treble, alto, bass
%   - START_PITCH: e.g., as4, cs5, bf3
%   - END_PITCH: e.g., a4, d5, g3
%   - DYNAMIC_1: first dynamic (e.g., \ppp, \f, \mf)
%   - DYNAMIC_2: second dynamic (e.g., \f, \ppp, \mp)
%   - HAIRPIN: \< (crescendo) or \> (decrescendo)
%   - GLISS_Y_OFFSET: 0 (default) or 0.3 (same staff line)
% ============================================

\paper{
  tagline = ##f
  paper-width = 23\mm
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
         (width 2.4) ;staff line width in mm
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
    \override DynamicText.font-size = #-8.5
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6)
    \override Accidental.font-size = -5
    \override Stem.transparent = ##t

    % NOTATION HERE /////////////////////////////////////////////////////

    % Hairpin
    \override Hairpin.height = #0.65  % hairpin height
    \override DynamicLineSpanner.staff-padding = #1.2

    %Note 1
    \once \override NoteColumn.X-offset = #-1.5 %Note Column 1 adjustment

    % === START PITCH ===
    fs''4

    % Glissando
    % === GLISS_Y_OFFSET ===
    -\tweak extra-offset #'(0 . 0) %gliss position
    -\tweak bound-details.left.padding #0.4   % Gap from left note
    -\tweak bound-details.right.padding #-0.1  % Gap from right note
    \glissando

    % === DYNAMIC_1 ===
    -\tweak extra-offset #'(0 . -0.2)  % X,Y offset in staff spaces
    \p

    % === HAIRPIN ===
    -\tweak extra-offset #'(-0.8 . 0)  % X,Y offset in staff spaces
    -\tweak shorten-pair #'(0 . -1.8)    % (left . right) - positive=shorter
    \<

    % Non-Vib Text
    -\tweak extra-offset #'(0 . 0)  % X,Y offset in staff spaces
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "Non-Vib"
    }

    % Note 2
    \once \override Accidental.extra-offset = #'(0.3 . 0)  % Move sharp closer to note (positive=right)
    \once \override NoteColumn.X-offset = #-1 %notecolumn 2
    % === END PITCH ===
    gqs''4

    % === DYNAMIC_2 ===
    -\tweak extra-offset #'(0.6 . -0.2)  % X,Y offset in staff spaces
    \fff

    % Secco Text
    -\tweak extra-offset #'(1.9 . 1.4)
    _\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "secco"
    }
    
    % Spacer
    s2\!
    
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
