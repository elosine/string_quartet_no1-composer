\version "2.20.0"
\language "english"

\include "midi-tags.ily"
\include "midi-logger.ily"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  NotationFragment003 — Violin                                            ║
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
% Z-STEM CALLIGRAPHIC BARS
% =====================================================================
#(define z-bar-width 1.1)
#(define z-bar-height 0.4)
#(define z-y-offset 0.85)
#(define z-bar-vpos 1.4)
#(define z-nib-ratio 0.6)
#(define z-diag-thick 0.09)
#(define z-diag-nudge 0.06)

#(define (stem-with-z grob)
   (let* ((orig (ly:stem::print grob))
          (yex (ly:stencil-extent orig Y))
          (ymid (/ (+ (car yex) (cdr yex)) 2))
          (W z-bar-width)
          (H z-bar-height)
          (h z-bar-vpos)
          (yo z-y-offset)
          (s (* H z-nib-ratio))
          (half (/ W 2))
          (s2 (/ s 2))
          (dt z-diag-thick)
          (dn (- z-diag-nudge))
          (top-y (+ (- h) yo))
          (bot-y (+ h yo))
          (bars-stencil
            (make-path-stencil
              `(moveto ,(- s2 half) ,(+ top-y H)
                lineto ,(- (+ half s2)) ,top-y
                lineto ,(- half s2) ,top-y
                lineto ,(+ half s2) ,(+ top-y H)
                closepath
                moveto ,(- (+ half s2)) ,(- bot-y H)
                lineto ,(- s2 half) ,bot-y
                lineto ,(+ half s2) ,bot-y
                lineto ,(- half s2) ,(- bot-y H)
                closepath)
              0.01 1 1 #t))
          (diag-stencil
            (make-path-stencil
              `(moveto ,(- (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (+ half s2 dn) (/ dt 2)) ,bot-y
                lineto ,(- (+ half s2 dn) (/ dt 2)) ,bot-y
                closepath)
              0.01 1 1 #t)))
     (ly:stencil-add orig
       (ly:stencil-translate-axis diag-stencil ymid Y)
       (ly:stencil-translate-axis bars-stencil ymid Y))))

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
            (width-staff-spaces (/ (* width 2.05) staff-space))
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
    \once \override TupletBracket.positions = #'(9 . 9)
    \tuplet 5/4 {
      \midiPizz
      af16-.
      -\tweak extra-offset #'(-2 . 0.8)
      ^\markup {
        \override #'(font-name . "Crimson Pro Light Italic")
        \fontsize #-4
        "pizz."
      }
      \ff
      c''16-.
      cs'''16-.
      g'16-.
      r16
    }

    % --- Sextuplet: 6 sixteenths in the space of 4 ---
    \once \override TupletBracket.positions = #'(11.5 . 11.5)
    \tuplet 6/4 {
      e'16-.
      d''16-.
      cs'''16-.
      r16
      \midiPizzOpen
      g8--
      -\tweak extra-offset #'(0 . -9)
      ^\markup { \teeny "o" }\laissezVibrer
      \midiPizz
    }

    % --- Pizz tremolo: display = Z-stem D6 + hairpin + fermata; MIDI = hidden septuplet ---
    <<
      {
        % Display: single D6 with Z-stem, crescendo hairpin, fermata
        \once \override Stem.stencil = #stem-with-z
        \once \override Stem.details.lengths = #'(6.2)
        \once \override Hairpin.height = #0.4
        \once \override NoteColumn.X-offset = #1
        d'''4
        -\tweak font-size #-6        % fermata size (adjust: -6 smaller, -2 bigger, 0 default)
        ^\fermata
        -\tweak extra-offset #'(0.5 . -0.1)
        -\tweak shorten-pair #'(0 . 8)
        \<
        s4\!
      }
      \new Voice {
        % MIDI playback: hidden septuplet (7 sixteenths in the space of 4)
        \override NoteColumn.ignore-collision = ##t
        \override NoteHead.transparent = ##t
        \override NoteHead.no-ledgers = ##t
        \override Stem.transparent = ##t
        \override Beam.transparent = ##t
        \override Dots.transparent = ##t
        \override TupletBracket.transparent = ##t
        \override TupletNumber.transparent = ##t
        \tuplet 7/4 { d'''16 d'''16 d'''16 d'''16 d'''16 d'''16 d'''16 }
        s4
      }
    >>

    % =================================================================
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/13)  % tighter spacing (try 1/8 tighter, 1/20 wider, 1/28 widest)
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
