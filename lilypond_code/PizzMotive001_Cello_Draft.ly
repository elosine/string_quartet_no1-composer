\version "2.20.0"
\language "english"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  PizzMotive001 — Cello                                                   ║
% ║  Draft version (edit in IDE, copy to Render for Frescobaldi)             ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 70\mm
  paper-height = 40\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}


% =====================================================================
% SCHEME FUNCTIONS
% =====================================================================

% Force tuplet brackets to be perfectly horizontal (flat).
% Takes the auto-calculated positions and sets both ends to the max.
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))

% =====================================================================
% CUSTOM STAFF LINES (Scheme)
% =====================================================================
#(define staff-line-width-mm 10)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 2.8) staff-space))
            (half-height (* (/ (- line-count 1) 2) staff-space)))
       (apply ly:stencil-add
              (map (lambda (i)
                     (ly:make-stencil
                      (list 'draw-line line-thickness
                            0 (* i staff-space)
                            width-staff-spaces (* i staff-space))
                      (cons 0 width-staff-spaces)
                      (cons (- half-height) half-height)))
                   (iota line-count (- (/ (- line-count 1) 2))))))))


% =====================================================================
% SCORE
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \omit KeySignature

    \clef bass

    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    \time 4/4

    % --- Base overrides ---
    \override NoteHead.font-size = #-3.3
    \override Accidental.font-size = #-4
    \override DynamicText.font-size = #-8.5
    \override Rest.font-size = #-4
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(6)
    \override Stem.details.lengths = #'(6)
    \override Stem.transparent = ##f

    % --- Beam overrides ---
    \override Beam.damping = #+inf.0  % forces perfectly flat/horizontal beams (no slope)

    % --- Tuplet overrides ---
    \override TupletBracket.bracket-visibility = ##t
    \override TupletBracket.direction = #UP
    \override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
    \override TupletBracket.padding = #0.5       % bracket height: lower = closer to notes (try 1, 1.5, 2, 3)
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5

    % =================================================================
    % NOTATION
    % =================================================================

    % --- Quintuplet: 5 sixteenths in the space of 4 ---
    \tuplet 5/4 {
      r16
      fs'16-.
      -\tweak extra-offset #'(-2 . 0.8)
      ^\markup {
        \override #'(font-name . "Crimson Pro Light Italic")
        \fontsize #-4
        "pizz."
      }
      \ff
      a16-.
      af,16-.
      r16
    }

    % --- Sextuplet: 6 sixteenths in the space of 4 ---
    \once \override TupletBracket.positions = #'(11.5 . 11.5)  % individual bracket height (adjust number: lower = closer to notes)
    \tuplet 6/4 {
      r16
      g'8.-\tweak extra-offset #'(0 . 0.95) --
      r16
      c,16
      -\tweak extra-offset #'(0 . -9)
      ^\markup { \teeny "o" }\laissezVibrer
    }

    % --- Quintuplet: 5 eighths in the space of 4 ---
    \tuplet 5/4 {
      r8
      <f' b fs>8
      <d' af e>8
      r16 <bf fs b,>16\sfz
      r8
    }

    % =================================================================
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/13)  % tighter spacing (try 1/8 tighter, 1/20 wider, 1/28 widest)
    }
    indent = -0.9
    line-width = 59\mm
  }
  \midi {}
}
