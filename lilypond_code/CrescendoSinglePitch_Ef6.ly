\version "2.20.0"
\language "english"

% ============================================
% CRESCENDO-DECRESCENDO SINGLE PITCH TEMPLATE
% ============================================
% Pitch variation: Eb6 — 3 ledger lines above treble, flat
% ============================================

\paper{
  tagline = ##f
  paper-width = 22\mm
  paper-height = 32\mm
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
         (width-staff-spaces (/ (* width 2.4) staff-space))
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
    \override NoteHead.font-size = #-3.3
    \override NoteHead.style = #'default
    \override DynamicText.font-size = #-8.5
    \override Accidental.font-size = #-7
    \override Accidental.extra-offset = #'(0 . 0)
    \override Stem.transparent = ##t

    % NOTATION HERE /////////////////////////////////////////////////////

    % Hairpin
    \override Hairpin.height = #0.55  % hairpin height
    \override Hairpin.Y-offset = #-0.3  % Move hairpin y

    % Single pitch note (half note head, no stem)
    \once \override NoteColumn.X-offset = #-0.9

    % === PITCH ===
    ef'''2

    % === DYNAMIC_1 ===
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(0 . -0.2)  % X,Y offset in staff spaces
    \pppp

    % === HAIRPIN ===
    -\tweak extra-offset #'(-0.8 . 0)  % X,Y offset in staff spaces
    -\tweak shorten-pair #'(0 . 7.3)    % (left . right) - positive=shorter
    \<

    % Non-Vib Text
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-0.1 . 0)  % X,Y offset in staff spaces
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-7
      "Non-Vib"
    }

    % Spacer for hairpin end
    s2

    % === DYNAMIC_2 ===
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-8.8 . -0.2)  % X,Y offset in staff spaces
    \ffff

    % Secco Text
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-7.5 . -2)
    _\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "secco"
    }

    \!
    
    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/13)
    }
    indent = -0.9
    line-width = 50\mm
  }
  \midi{}
}
