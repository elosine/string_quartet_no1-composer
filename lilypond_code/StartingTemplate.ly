\version "2.20.0"
\language "english"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║                    STARTING TEMPLATE                                      ║
% ║                    String Quartet No.1 — Composer                         ║
% ╠════════════════════════════════════════════════════════════════════════════╣
% ║  Clean starting point for new notation. Contains only the base look-     ║
% ║  and-feel defaults used across this project. No feature-specific code.   ║
% ║                                                                          ║
% ║  For advanced features (vibrato, hairpin tweaks, col legno, etc.),       ║
% ║  see MasterTemplate.ly — the full settings repository.                   ║
% ║                                                                          ║
% ║  QUICK START:                                                            ║
% ║    1. Copy this file and rename it for your notation                     ║
% ║    2. Set the clef (line 51)                                             ║
% ║    3. Set paper-width (line 35) — see presets below                      ║
% ║    4. Set staff-line-width-mm (line 57) — see presets below              ║
% ║    5. Write your notation where indicated (line 88)                      ║
% ║    6. Compile with LilyPond                                              ║
% ║                                                                          ║
% ║  PAPER-WIDTH PRESETS:                                                    ║
% ║    9mm   — single note (Bartók pizz)                                     ║
% ║    17mm  — two notes, tight (crescendo instance)                         ║
% ║    19mm  — two notes, medium (glissando)                                 ║
% ║    23mm  — two notes, spacious (crescendo glissando template)            ║
% ║    80mm  — extended (vibrato with wavy line)                             ║
% ║                                                                          ║
% ║  STAFF-LINE-WIDTH PRESETS:                                               ║
% ║    0.8   — tiny cell       1.2  — single note   2.0  — medium-short     ║
% ║    2.4   — medium (DEFAULT)  2.8  — wide         3.0  — extra-wide      ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 23\mm       % Adjust for your notation width
  paper-height = 25\mm      % Adjust for your notation height
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}


% =====================================================================
% SCHEME FUNCTIONS
% =====================================================================

% Force tuplet brackets to be perfectly horizontal (flat).
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))

% =====================================================================
% CUSTOM STAFF LINES (Scheme)
% =====================================================================
% ; Custom-width staff lines. Change staff-line-width-mm to adjust.
% ; This replaces LilyPond's default full-width lines with short ones.
#(define staff-line-width-mm 2.4)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 2.8346) staff-space))
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

    % --- Hidden elements (standard for this project) ---
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \omit KeySignature

    % --- Clef (still needed for pitch placement even though hidden) ---
    % Options: \clef treble, \clef alto, \clef bass
    \clef treble

    % --- Staff appearance ---
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    % =================================================================
    % BASE OVERRIDES — standard look and feel
    % =================================================================

    \time 4/4

    % --- Noteheads ---
    \override NoteHead.font-size = #-3.3

    % --- Accidentals ---
    \override Accidental.font-size = #-4

    % --- Dynamics ---
    \override DynamicText.font-size = #-8.5

    % --- Rests: ~35% smaller than default ---
    \override Rest.font-size = #-4

    % --- Stems: all UP, lengths 7 ---
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(6)
    \override Stem.details.lengths = #'(7)

    % --- Stems: visible by default ---
    % Change ##f to ##t to hide stems (e.g., for long tone glissando)
    \override Stem.transparent = ##f

    % --- Beams: perfectly flat/horizontal ---
    \override Beam.damping = #+inf.0

    % --- Tuplets: flat bracket, ratio numbers (e.g., "5:4") ---
    \override TupletBracket.bracket-visibility = ##t
    \override TupletBracket.direction = #UP
    \override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
    \override TupletBracket.padding = #0.5     % bracket height: lower = closer to notes (try 0.5, 1, 1.5, 2, 3)
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5

    % --- Open string: ^\markup { \teeny "o" } (chosen symbol) ---
    % Alternatives: \flageolet, \open, ^\markup { \circle \null }


    % =================================================================
    % YOUR NOTATION HERE
    % =================================================================

    % Example: a single note
    % \once \override NoteColumn.X-offset = #-0.8
    % c'4\p

    % Example: two notes with glissando
    % \once \override NoteColumn.X-offset = #-1.5
    % a4
    % -\tweak extra-offset #'(0 . 0)
    % -\tweak bound-details.left.padding #0.4
    % -\tweak bound-details.right.padding #-0.1
    % \glissando
    % \once \override NoteColumn.X-offset = #-1
    % af4

    % Example: note with dynamic
    % \once \override NoteColumn.X-offset = #-0.8
    % a4\fff

    % Write your notation below this line:



    % =================================================================
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 50\mm
  }
  \midi {}
}
