\version "2.20.0"
\language "english"

\include "midi-tags.ily"
\include "midi-logger.ily"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  NotationFragment006 — Violin                                            ║
% ║  Notation Fragment System                                                ║
% ║  Pizz + Bartók pizz — mixed 16ths, sextuplet 6:4, quintuplet 5:4        ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 80\mm
  paper-height = 55\mm
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
#(define staff-line-width-mm 9)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 2.75) staff-space))
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

    \clef treble

    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    \time 4/4

    % --- Base overrides ---
    \override NoteHead.font-size = #-3.3
    \override Accidental.font-size = #-7
    \override Accidental.extra-offset = #'(0 . 0)  % move accidental closer to notehead (positive X = rightward)
    \override DynamicText.font-size = #-8.5
    \override Rest.font-size = #-4
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(6)
    \override Stem.details.lengths = #'(7)
    \override Stem.transparent = ##f

    % --- Beam overrides ---
    \override Beam.damping = #+inf.0  % forces perfectly flat/horizontal beams (no slope)

    % --- Tuplet overrides ---
    \override TupletBracket.bracket-visibility = ##t
    \override TupletBracket.direction = #UP
    \override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
    \override TupletBracket.padding = #0.5       % bracket height: lower = closer to notes
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5


    % =================================================================
    % NOTATION
    % =================================================================

    % --- Beat 1: four 16ths (C#6, E4, Eb5 Bartók, rest) ---
    \midiPizz
    cs'''16[
    -\tweak extra-offset #'(-2 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      \column { "pizz." }
    }
    \ff
    e'16
    \midiBartokPizz
    ef''16-\tweak font-size #-3 \snappizzicato
    r16]

    % --- Beat 2: sextuplet 6:4 (rest, C4, D4 Bartók, Eb5, D5, chord G4+D4+C#6) ---
    \tuplet 6/4 {
      r16[
      \midiPizz
      c'16
      \midiBartokPizz
      d'16-\tweak font-size #-3 \snappizzicato
      \midiPizz
      ef''16
      d''16
      <d' g' cs'''>16]
    }

    % --- Beat 3: quintuplet 5:4 (rest, 8th chord Eb4+Bb4+A5, Bb5, G3 Bartók) ---
    \tuplet 5/4 {
      r16[
      <ef' bf' a''>8
      bf''16
      \midiBartokPizz
      g16]-\tweak font-size #-3 \snappizzicato
    }

    % =================================================================
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/13)
    }
    \context {
      \Voice
      \consists \midiLogEngraver
    }
    indent = -0.9
    line-width = 70\mm
  }
  \midi {}
}
