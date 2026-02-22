\version "2.20.0"
\language "english"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  Z-Stem Pizzicato Tremolo — Test File                                    ║
% ║  Unmeasured tremolo indicated by Z on stem (Penderecki style)            ║
% ║  Pitch: B4, Dynamic: fff, Clef: treble                                  ║
% ╚════════════════════════════════════════════════════════════════════════════╝

\paper {
  tagline = ##f
  paper-width = 9\mm
  paper-height = 23\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}

% =====================================================================
% SCHEME FUNCTIONS
% =====================================================================

% Z dimensions — adjust these to change the Z shape
% z-half-width:  horizontal extent of Z
% z-half-height: vertical extent of Z
% z-bar-thick:   thickness of horizontal bars (broad-nib effect)
% z-diag-thin:   width of the thin diagonal stroke
#(define z-half-width 0.45)
#(define z-half-height 0.55)
#(define z-bar-thick 0.18)
#(define z-diag-thin 0.06)

% Custom stem stencil: draws normal stem + calligraphic Z at stem midpoint
% The Z is a single filled polygon simulating a broad-nib calligraphy pen:
%   - Horizontal bars are THICK with / slanted ends (nib entry/exit)
%   - Diagonal connecting stroke is THIN (nib aligned with stroke)
%
% Polygon vertices (clockwise from top-left):
%   P0..P1: left / slant of top bar (nib entry)
%   P1..P2: top edge of top bar
%   P2..P3: right edge of top bar
%   P3..P4: right edge of thin diagonal
%   P4..P5: top edge of bottom bar (diagonal arrives)
%   P5..P6: left edge of bottom bar
%   P6..P7: bottom edge of bottom bar
%   P7..P8: right / slant of bottom bar (nib exit)
%   P8..P9: left edge of thin diagonal (going back up)
%   P9..P0: bottom edge of top bar (close)
#(define (stem-with-z grob)
   (let* ((orig (ly:stem::print grob))
          (yex (ly:stencil-extent orig Y))
          (ymid (/ (+ (car yex) (cdr yex)) 2))
          (w z-half-width)
          (h z-half-height)
          (t z-bar-thick)
          (n z-diag-thin)
          (z-stencil
            (make-path-stencil
              `(moveto ,(- w) ,(- h t)
                lineto ,(+ (- w) t) ,h
                lineto ,w ,h
                lineto ,w ,(- h t)
                lineto ,(+ (- w) n) ,(+ (- h) t)
                lineto ,(- w) ,(+ (- h) t)
                lineto ,(- w) ,(- h)
                lineto ,(- w t) ,(- h)
                lineto ,w ,(+ (- h) t)
                lineto ,(- w n) ,(- h t)
                closepath)
              0.01 1 1 #t)))
     (ly:stencil-add orig
       (ly:stencil-translate-axis z-stencil ymid Y))))

% Custom shorter staff lines
#(define staff-line-width-mm 1.2)

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
    \omit TimeSignature
    \omit BarLine
    \clef treble
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    \time 1/4

    % --- Noteheads ---
    \override NoteHead.font-size = #-3.3

    % --- Accidentals ---
    \override Accidental.font-size = #-4

    % --- Dynamics ---
    \override DynamicText.font-size = #-8.5

    % --- Stems: visible, with Z overlay ---
    \override Stem.transparent = ##f
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(7)
  %  \override Stem.stencil = #stem-with-z

    % --- Notation ---
    \once \override NoteColumn.X-offset = #-0.8

    b'16\fff

  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = 0
    line-width = 37\mm
  }
  \midi {}
}
