\version "2.20.0"
\language "english"

\include "midi-tags.ily"
\include "midi-logger.ily"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  NotationFragment005 — Violin                                            ║
% ║  Notation Fragment System                                                ║
% ║  b.b. chords (X noteheads) + Bartók pizz + Z-stem tremolo               ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 90\mm
  paper-height = 60\mm
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
% X NOTEHEAD CONFIGURATION
% =====================================================================
% Independent size control for X noteheads (change without affecting regular noteheads)
% Adjust this one number to resize all X noteheads globally:
#(define x-notehead-size -4.5)   % try: -2 (larger), -3.3 (matches base), -4 (smaller), -5 (very small)

% --- Option 1: Built-in cross — standard LilyPond X (ACTIVE) ---
xHeadOnce = {
  \once \override NoteHead.style = #'cross
  \once \override NoteHead.font-size = #x-notehead-size
}
xHead = {
  \override NoteHead.style = #'cross
  \override NoteHead.font-size = #x-notehead-size
}
xHeadRevert = {
  \revert NoteHead.style
  \revert NoteHead.font-size
}

% --- Option 2: xcircle — X inside a circle (comment out Option 1, uncomment this) ---
% xHeadOnce = {
%   \once \override NoteHead.style = #'xcircle
%   \once \override NoteHead.font-size = #x-notehead-size
% }
% xHead = {
%   \override NoteHead.style = #'xcircle
%   \override NoteHead.font-size = #x-notehead-size
% }
% xHeadRevert = {
%   \revert NoteHead.style
%   \revert NoteHead.font-size
% }

%--- Option 3: Custom markup — bold multiplication sign × (comment out Option 1, uncomment this) ---
% #(define x-markup (markup #:bold #:fontsize x-notehead-size "×"))
% xHeadOnce = {
%   \once \override NoteHead.stencil = #ly:text-interface::print
%   \once \override NoteHead.text = #x-markup
% }
% xHead = {
%   \override NoteHead.stencil = #ly:text-interface::print
%   \override NoteHead.text = #x-markup
% }
% xHeadRevert = {
%   \revert NoteHead.stencil
%   \revert NoteHead.text
% }

% --- Option 4: Custom markup — sans-serif bold × (rounder, heavier weight) ---
% #(define x-markup-sans (markup #:override '(font-name . "Arial Bold") #:fontsize x-notehead-size "×"))
% xHeadOnce = {
%   \once \override NoteHead.stencil = #ly:text-interface::print
%   \once \override NoteHead.text = #x-markup-sans
% }
% xHead = {
%   \override NoteHead.stencil = #ly:text-interface::print
%   \override NoteHead.text = #x-markup-sans
% }
% xHeadRevert = {
%   \revert NoteHead.stencil
%   \revert NoteHead.text
% }

% --- Option 5: slash — diagonal slash notehead (percussive, less common) ---
% xHeadOnce = {
%   \once \override NoteHead.style = #'slash
%   \once \override NoteHead.font-size = #x-notehead-size
% }
% xHead = {
%   \override NoteHead.style = #'slash
%   \override NoteHead.font-size = #x-notehead-size
% }
% xHeadRevert = {
%   \revert NoteHead.style
%   \revert NoteHead.font-size
% }


% =====================================================================
% Z-STEM CALLIGRAPHIC BARS
% =====================================================================
#(define z-bar-width 1.1)
#(define z-bar-height 0.4)
#(define z-y-offset 3.5)
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
    \override Stem.details.beamed-lengths = #'(5.5)
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

    % --- Beat 1: b.b. chord (X noteheads) + arpeggio strum ---
    \midiPizz
    \midiBB
    \xHeadOnce
    <g d' a' e''>8\arpeggio
    -\tweak extra-offset #'(-2 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      \column { "pizz."}
    }
    -\tweak extra-offset #'(-1.4 . -6.5)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      \column { "b.b." }
    }
    \fff

    % --- 16th: Bartók pizz B♭5 ---
    \midiBartokPizz
    bf''16-\tweak font-size #-3 \snappizzicato

    % --- 16th: D string b.b. (X notehead), tied to quintuplet ---
    % One-sided bracket: "b.b." text on left, horizontal line, perpendicular drop on right
    \once \override TextSpanner.direction = #UP
    \once \override TextSpanner.extra-offset = #'(0.5 . -0.3)  % (X . Y) — positive X = right, positive Y = up
    \once \override TextSpanner.style = #'line
    \once \override TextSpanner.thickness = #1
    \once \override TextSpanner.bound-details.left.text =
      \markup {
        \override #'(font-name . "Crimson Pro Light Italic")
        \fontsize #-4
        "b.b."
      }
    \once \override TextSpanner.bound-details.left.padding = #0
    \once \override TextSpanner.bound-details.left.attach-dir = #LEFT
    \once \override TextSpanner.bound-details.right.text =
      \markup { \draw-line #'(0 . -1) }
    \once \override TextSpanner.bound-details.right.padding = #0
    \once \override TextSpanner.bound-details.right.attach-dir = #RIGHT
    \midiBB
    \xHeadOnce
    d'16~\startTextSpan

    % --- Quintuplet: 5 sixteenths in the space of 4 ---
     \once \override TupletBracket.after-line-breaking =
      #(lambda (grob) (ly:grob-set-property! grob 'positions (cons 7.5 7.5)))
    \xHead
    \tuplet 5/4 {
      d'16                % tied from previous (D string b.b.)
      e''16               % E string b.b.
      e''16               % E string b.b.
      e''16\stopTextSpan    % E string b.b. (bracket ends here)
      \xHeadRevert
      \midiBartokPizz
      \once \override NoteHead.font-size = #x-notehead-size
      g16~-\tweak font-size #-3 \snappizzicato    % Bartók pizz G3, tied to triplet
    }

    % --- Triplet: G3 (tied) + two b.b. X chords ---
    \once \override TupletBracket.after-line-breaking =
      #(lambda (grob) (ly:grob-set-property! grob 'positions (cons 8.5 8.5)))
    \tuplet 3/2 {
      \once \override NoteHead.font-size = #x-notehead-size
      g8                  % tied from quintuplet
      \midiBB
      \xHeadOnce

    -\tweak extra-offset #'(-1.4 . -6.8)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      \column { "b.b." }
    }
      <g d' a' e''>8 \arpeggio     % b.b. chord (no strum)
      \xHeadOnce

    -\tweak extra-offset #'(-1.4 . -6.5)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      \column { "b.b." }
    }
      <g d' a' e''>8  \arpeggio     % b.b. chord (no strum)
    }

    % --- Z-stem chord + hidden MIDI 6:4 (polyphonic: display + hidden MIDI) ---
    <<
      {

        % Display voice: Z-stem b.b. chord with fermata + hairpin
        \xHeadOnce
        \once \override Stem.stencil = #stem-with-z
        \once \override Stem.details.lengths = #'(6.2)
        \once \override Hairpin.height = #0.6
        \once \override NoteColumn.X-offset = #-0.2
        <g d' a' e''>4
          -\tweak font-size #-6
          ^\fermata
          ^\markup {
            \override #'(font-name . "Crimson Pro Light Italic")
            \fontsize #-4
            "b.b."
          }
          -\tweak extra-offset #'(0.5 . 0.5)
          -\tweak shorten-pair #'(0 . 6)
          \<
        s4\!
      }
      \new Voice {
        % Hidden MIDI voice: 6:4 strummed chords
        \override NoteColumn.ignore-collision = ##t
        \override NoteHead.transparent = ##t
        \override NoteHead.no-ledgers = ##t
        \override Stem.transparent = ##t
        \override Beam.transparent = ##t
        \override Dots.transparent = ##t
        \override TupletBracket.transparent = ##t
        \override TupletNumber.transparent = ##t
        \midiBB
        \tuplet 6/4 {
          <g d' a' e''>16 <g d' a' e''>16 <g d' a' e''>16
          <g d' a' e''>16 <g d' a' e''>16 <g d' a' e''>16
        }
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
      %\consists "Horizontal_bracket_engraver"  % replaced by TextSpanner
    }
    indent = -0.9
    line-width = 75\mm
  }
  \midi {}
}
