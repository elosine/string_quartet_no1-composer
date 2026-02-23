\version "2.20.0"
\language "english"

\include "midi-tags.ily"
\include "midi-logger.ily"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  NotationFragment004 — Violin                                            ║
% ║  Notation Fragment System                                                ║
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
            (width-staff-spaces (/ (* width 2.6) staff-space))
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
    \override Accidental.extra-offset = #'(0.32 . 0)  % move accidental closer to notehead (positive X = rightward)
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
    \override TupletBracket.padding = #0.5       % bracket height: lower = closer to notes (try 1, 1.5, 2, 3)
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5

    % =================================================================
    % NOTATION
    % =================================================================

    % --- Beat 1: regular 16th notes ---
    \midiBartokPizz
    c'''16-\tweak font-size #-3 \snappizzicato
    -\tweak extra-offset #'(-2 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      "pizz."
    }
    \ff
    \midiPizzOpen
    \midiSfz
    d'8\sfz
    -\tweak extra-offset #'(0 . -5)
    ^\markup { \teeny "o" }\laissezVibrer
    \midiVelReset
    \midiBartokPizz
    d''16~-\tweak font-size #-3 \snappizzicato

    % --- 11:8 tuplet (11 in the space of 8 32nd notes = 1 beat) ---
    \once \override TupletNumber.text = #(tuplet-number::append-note-wrapper
      (tuplet-number::non-default-tuplet-fraction-text 11 8)
      (ly:make-duration 5 0))
    \once \override TupletBracket.after-line-breaking =
      #(lambda (grob) (ly:grob-set-property! grob 'positions (cons 9 9)))
    \tuplet 11/8 {
      d''16
      \midiPizz
      \midiGlissUp
      ds''16\glissando
      e''16\glissando
      f''16
     -\tweak extra-offset #'(0 . -0.3)    % same staff line: F5→F#5
      -\tweak bound-details.left.padding #0.15   % per-instance left gap
     -\tweak bound-details.right.padding #-0.6  % per-instance right gap
      \glissando
      gf''16
        -\tweak bound-details.left.padding #0   % per-instance left gap
     -\tweak bound-details.right.padding #-0.6  % per-instance right gap
      \glissando
      \midiGlissReset
      g''32
    }

    % --- Quarter note with molto vibrato ---
    \midiMoltoVibPizz
    c'4
    -\tweak extra-offset #'(0 . -0.8)
    _\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      "m.v."
    }
    \midiPizz  % revert to base mode

    % =================================================================
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/20)  % tighter spacing (try 1/8 tighter, 1/20 wider, 1/28 widest)
      \override Glissando.breakable = ##t
      \override Glissando.minimum-length = #3
      \override Glissando.bound-details.left.padding = #0.15
      \override Glissando.bound-details.right.padding = #0.05
    }
    \context {
      \Voice
      \consists \midiLogEngraver
    }
    indent = -0.9
    line-width = 59\mm
  }
  \midi {}
}
