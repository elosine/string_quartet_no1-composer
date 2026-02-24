\version "2.20.0"
\language "english"

% ============================================
% PIZZICATO TREMOLO GLISSANDO TEMPLATE
% ============================================
% Variables to customize per instance:
%   - CLEF: treble, alto, bass
%   - START_PITCH: e.g., as, cs', bf
%   - END_PITCH: e.g., a, d', g
%   - START_DYNAMIC: first dynamic (e.g., \pp, \f, \mf)
%   - END_DYNAMIC: second dynamic (e.g., \f, \ppp, \mp)
%   - HAIRPIN: \< (crescendo) or \> (decrescendo)
%   - GLISS_Y_OFFSET: 0 (default) or 0.3 (same staff line)
%
% Based on: Cres-Gliss-treble-As3-A3-ppp-f.ly (glissando structure)
%           PizzTrem-alto-DQS3-fff-cres.ly (Z-stem note columns)
% Registry: See docs/LILYPOND_SETTINGS_REGISTRY.md §9, §30, §33
% ============================================


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 27\mm
  paper-height = 50\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}


% =====================================================================
% Z-STEM CALLIGRAPHIC BARS (Registry §30)
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
% CUSTOM STAFF LINES (Registry §11, §26)
% =====================================================================
#(define staff-line-width-mm 3.0)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 2.3) staff-space))
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
    % === CLEF VARIABLE ===
    \clef alto
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    \time 2/4

    % --- Noteheads (Registry §1) ---
    \override NoteHead.font-size = #-3.3

    % --- Accidentals (Registry §4) ---
    \override Accidental.font-size = #-4
    \override Accidental.extra-offset = #'(0 . 0)  % move accidental closer to notehead (positive X = rightward)

    % --- Dynamics (Registry §5) ---
    \override DynamicText.font-size = #-8.5
    \override DynamicLineSpanner.staff-padding = #1.2

    % --- Stems: visible, with Z overlay (Registry §30) ---
    \override Stem.transparent = ##f
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6.2)
    \override Stem.stencil = #stem-with-z

    % --- Hairpin (Registry §6, §30) ---
    \override Hairpin.height = #0.4

    % --- Note 1 ---
    \once \override NoteColumn.X-offset = #-0.8

    % === START PITCH ===
    g''4

    % Glissando (Registry §9)
    % === GLISS_Y_OFFSET ===
    -\tweak extra-offset #'(0 . 0)  %gliss position — 0.3 if same staff line, 0 otherwise
    -\tweak bound-details.left.padding #0.4
    -\tweak bound-details.right.padding #-0.1
    \glissando

    % pizz. text (left note only) (Registry §30)
    -\tweak extra-offset #'(0 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "pizz."
    }

    % === START DYNAMIC ===
    -\tweak extra-offset #'(-0.7 . -0.1)
    \ppp

    % === HAIRPIN ===
    -\tweak extra-offset #'(-1.3 . -0.1)
    -\tweak shorten-pair #'(0 . -1.8)
    \<

    % --- Note 2 ---
    \once \override Accidental.extra-offset = #'(0.3 . 0)
    \once \override NoteColumn.X-offset = #-1

    % === END PITCH ===
    btqf'4
    % === END DYNAMIC ===
    -\tweak extra-offset #'(0.1 . 0)
    \fff

    % Spacer to end hairpin
   % s2\!

  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/8)
      % Glissando global settings (Registry §9)
      \override Glissando.breakable = ##t
      \override Glissando.minimum-length = #3
      \override Glissando.bound-details.left.padding = #0.15
      \override Glissando.bound-details.right.padding = #0.05
    }
    indent = -0.9
    line-width = 50\mm
  }
  \midi {}
}
