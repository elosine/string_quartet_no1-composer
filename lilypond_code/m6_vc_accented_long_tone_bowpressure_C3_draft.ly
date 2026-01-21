\version "2.24.4"

% =====================================================================
% PAPER SECTION
% =====================================================================
\paper {
  paper-width = 130\mm
  paper-height = 500\mm
  top-margin = 5\mm
  bottom-margin = 10\mm
  left-margin = 1\mm
  right-margin = 1\mm
  system-system-spacing =
  #'((basic-distance . 15)
     (minimum-distance . 8)
     (padding . 2)
     (stretchability . 60))
}

% =====================================================================
% CUSTOM DEFINITIONS
% =====================================================================
% PRESSURE WEDGE - Creates a filled triangular wedge shape for bow pressure notation
% This replaces the default TextSpanner line with a custom polygon (filled wedge)
%
% HOW IT WORKS:
% - TextSpanner normally draws a line/bracket between \startTextSpan and \stopTextSpan
% - We override its 'stencil' (visual appearance) with a custom Scheme function
% - The function draws a filled polygon (4-sided trapezoid that tapers to a point)
%
% THE POLYGON MATH:
% - x-ext: Gets the horizontal extent (start/end X positions) of where the spanner would draw
% - w: The total width of the spanner in staff spaces
% - st (start thickness): 2.5 staff spaces - the THICK end of the wedge (left side)
% - et (end thickness): 0.1 staff spaces - the THIN end of the wedge (right side)
% - points: List of X,Y coordinates forming the polygon vertices:
%     (0, st/2)      = top-left corner (at x=0, y=1.25 above center)
%     (w, et/2)      = top-right corner (at x=width, y=0.05 above center)
%     (w, -et/2)     = bottom-right corner (at x=width, y=0.05 below center)
%     (0, -st/2)     = bottom-left corner (at x=0, y=1.25 below center)
% - This creates a wedge that is thick on the left and tapers to nearly a point on the right
%
% VISUAL RESULT: A filled black wedge indicating decreasing bow pressure over time
%                (thick to thin, left to right)
%
pressureWedge = {
  \once \override TextSpanner.stencil =
  #(lambda (grob)
     (let* ((x-ext (ly:stencil-extent (ly:line-spanner::print grob) X))
            (w (interval-length x-ext))
            ;; === WEDGE SIZE ADJUSTMENTS ===
            ;; st = START THICKNESS (thick end) - increase for taller, decrease for shorter
            (st 2.5)
            ;; et = END THICKNESS (thin end) - keep small for pointed tip, increase for blunter
            (et 0.1)
            ;; LENGTH SCALE: 1.0 = auto-fit, 0.8 = 80%, 1.2 = 120% length
            (length-scale 1.0)
            (scaled-w (* w length-scale))
            (points (list 0 (/ st 2) scaled-w (/ et 2) scaled-w (/ et -2) 0 (/ st -2)))
            (wedge (ly:make-stencil (list 'polygon points 0.0 #t) (cons 0 scaled-w) (cons -1 1))))
       wedge))
  \once \override TextSpanner.bound-details.left.padding = #0
  \once \override TextSpanner.bound-details.right.padding = #0
  \once \override TextSpanner.padding = #3
  % POSITIONING: extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
  \once \override TextSpanner.extra-offset = #'(0 . -2)
}

% =====================================================================
% SCORE BLOCK
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef bass

    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    % USER CHANGE: Custom shorter staff lines using Scheme stencil
    % Draws staff lines at 22mm width while keeping line-width at 30mm for notation spacing
    % Adjust the 22 value below for longer/shorter staff lines
    \override StaffSymbol.stencil = #(lambda (grob)
                                       (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                              (line-count (ly:grob-property grob 'line-count 5))
                                              (thickness (ly:grob-property grob 'thickness 1))
                                              (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                              ;Adjust Staff Line  Width Here /////////
                                              (width 3)  ; staff line width in mm
                                              ;///////////////////////////////////////
                                              (width-staff-spaces (/ (* width 2.8346) staff-space))  ; convert mm to staff spaces
                                              (half-height (* (/ (- line-count 1) 2) staff-space)))
                                         (apply ly:stencil-add
                                                (map (lambda (i)
                                                       (ly:make-stencil
                                                        (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                                                        (cons 0 width-staff-spaces)
                                                        (cons (- half-height) half-height)))
                                                     (iota line-count (- (/ (- line-count 1) 2)))))))
  }
  {
    % --- INITIAL SETTINGS ---
    \override Score.BarNumber.break-visibility = ##(#f #f #f)
    \time 4/4
    \override TupletBracket.bracket-visibility = ##t
    \override TupletNumber.stencil = ##f
    \override NoteHead.font-size = #-2
    \override DynamicText.font-size = #-6
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(5.5)
    \override Accidental.font-size = #-4
    \override Stem.transparent = ##t
    \override Hairpin.minimum-length = #0.1
    \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
    \override Hairpin.bound-details.left.padding = #0
    \override Glissando.style = #'zigzag
    \override Glissando.bound-details.left.padding = #0.5

    % --- THE MUSIC ---
    \once \override NoteColumn.X-offset = #-1.6

    % Apply the custom wedge stencil to the next TextSpanner (see definition above)
    \pressureWedge
    g2
    % SFORZANDO POSITIONING: extra-offset #'(X . Y) - adjust to move the sfz dynamic
    _\tweak extra-offset #'(0 . 2)
    _\sfz
    % HAIRPIN POSITIONING: extra-offset #'(X . Y) - adjust to move the decrescendo
    % HAIRPIN LENGTH: shorten-pair #'(left . right) - negative values LENGTHEN, positive SHORTEN
    -\tweak shorten-pair #'(0 . 2.4)
    -\tweak extra-offset #'(-0.5 . 2) \>
    % TEXT SPANNER: \startTextSpan begins a horizontal spanner until \stopTextSpan
    % Normally draws a line, but pressureWedge overrides it to draw our wedge shape
    % MARCATO POSITIONING: extra-offset #'(X . Y) - adjust to move the accent mark
    \startTextSpan -\tweak extra-offset #'(0 . 2) _\marcato
    % MAX PRESSURE TEXT POSITIONING: outside-staff-priority ##f disables collision avoidance
    % extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(0 . 3)
    ^\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6 "max. pressure" }


    % \stopTextSpan ends the spanner here - the wedge extends from g2 to this point
    s4\! \stopTextSpan
    % ORD TEXT POSITIONING: outside-staff-priority ##f disables collision avoidance
    % extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(0 . 3)
    ^\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6 "ord." }

    s4\!
  }

  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
      \override Beam.breakable = ##t
      \override Glissando.breakable = ##t
      \override TextSpanner.breakable = ##t
    }
    indent = 0
    line-width = 35\mm
  }
}