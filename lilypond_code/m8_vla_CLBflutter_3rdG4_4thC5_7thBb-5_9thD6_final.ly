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
            (st 0.1)
            ;; et = END THICKNESS (thin end) - keep small for pointed tip, increase for blunter
            (et 1.5)
            ;; LENGTH SCALE: 1.0 = auto-fit, 0.8 = 80%, 1.2 = 120% length
            (length-scale 0.8)
            (scaled-w (* w length-scale))
            (points (list 0 (/ st 2) scaled-w (/ et 2) scaled-w (/ et -2) 0 (/ st -2)))
            (wedge (ly:make-stencil (list 'polygon points 0.0 #t) (cons 0 scaled-w) (cons -1 1))))
       wedge))
  \once \override TextSpanner.bound-details.left.padding = #0
  \once \override TextSpanner.bound-details.right.padding = #0
  \once \override TextSpanner.padding = #3
  % POSITIONING: extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
  % Negative Y moves BELOW the staff
  \once \override TextSpanner.extra-offset = #'(-1.8 . -13)
}

% =====================================================================
% SCORE BLOCK
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef alto

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
                                              (width 2)  ; staff line width in mm
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
    % Harmonics: diamond-shaped noteheads, clustered as chord with independent X offsets
    % X-OFFSET ADJUSTMENT: Change the #N value for each note to move it horizontally
    %   - Positive values move RIGHT, negative values move LEFT
    %   - Values are in staff spaces (~1.75mm each)
    %   - Example: #0 = no offset, #2 = 2 spaces right, #-1 = 1 space left
    \override NoteHead.style = #'harmonic
    % PARTIAL NUMBER LABELS: Attached to each note using \tweak self-alignment-X
    % Adjust extra-offset #'(X . Y) to fine-tune position relative to notehead
    <
    % C5 = 4th partial
    \tweak NoteColumn.X-offset #0 c''
    % Bb5 quarter-flat = 7th partial
    \tweak NoteColumn.X-offset #2 beh''
    % G4 = 3rd partial
    \tweak NoteColumn.X-offset #4 g'
    % D6 = 9th partial
    \tweak NoteColumn.X-offset #6 d'''
    >4\startTextSpan
    % BOX AROUND ENTIRE CHORD: Draws a rectangle encompassing all noteheads
    % Adjust width (first number) and height (second number) as needed
    % extra-offset positions the box: X moves right, Y moves up
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-0.5 . 0)
    ^\markup {
      \with-dimensions #'(0 . 0) #'(0 . 0)
      \translate #'(-0.6 . -5)
      \override #'(thickness . 0.8)
      \path #0.15
      #'((moveto 0 3.7)
         (lineto 3.7 3.7)
         (lineto 3.7 11)
         (lineto 0 11)
         (closepath))
    }
    % PARTIAL NUMBER LABELS: Positioned using extra-offset to appear next to each notehead
    % G5 label (4th partial)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(1.4 . -0.3)
    ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "4th" }
    % F6 label (7th partial)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(1.4 . 3)
    ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "7th" }
    % G4 label (3rd partial)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(1.4 . -0.7)
    ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "3rd" }
    % A6 label (9th partial)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(1.4 . 2.6)
    ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "9th" }
    % TEXT 1 POSITIONING: Use _ for below staff, negative Y moves further down
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-2 . -2.1)
    _\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-8 "ord. c.l. batt. →" }
    \revert NoteHead.style

    % FEATHERED BEAM FIGURE AS MARKUP: Small ornamental accelerando indicator
    % Drawn as a path markup for precise control over size and position
    % Adjust extra-offset #'(X . Y) to position, and path coordinates to resize
    % The figure shows 5 X noteheads with 3 feathered beams (accelerando)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(0.2 . -6.6)
    ^\markup {
      \with-dimensions #'(0 . 0) #'(0 . 0)
      \override #'(thickness . 0.4)
      \combine
      % Stems (5 vertical lines, starting from X notehead position up to beams)
      \path #0.08
        #'((moveto 0 -0.2) (lineto 0 1.5)
           (moveto 0.4 -0.2) (lineto 0.4 1.5)
           (moveto 0.9 -0.2) (lineto 0.9 1.5)
           (moveto 1.5 -0.2) (lineto 1.5 1.5)
           (moveto 2.2 -0.2) (lineto 2.2 1.5))
      \combine
      % X noteheads (5 small X marks at BOTTOM of stems)
      % LEFT edge of each X aligns with stem (stem touches left of X)
      % Stem positions: 0, 0.4, 0.9, 1.5, 2.2 — X starts at stem and extends right
      \path #0.08
        #'((moveto 0 -0.22) (lineto 0.24 0.02) (moveto 0 0.02) (lineto 0.24 -0.22)
           (moveto 0.4 -0.22) (lineto 0.64 0.02) (moveto 0.4 0.02) (lineto 0.64 -0.22)
           (moveto 0.9 -0.22) (lineto 1.14 0.02) (moveto 0.9 0.02) (lineto 1.14 -0.22)
           (moveto 1.5 -0.22) (lineto 1.74 0.02) (moveto 1.5 0.02) (lineto 1.74 -0.22)
           (moveto 2.2 -0.22) (lineto 2.44 0.02) (moveto 2.2 0.02) (lineto 2.44 -0.22))
      % Feathered beams (3 lines - top straight, others fan out for accelerando)
      % X noteheads are left-justified with stems (X marks centered on stem X positions)
      \path #0.17
        #'((moveto 0 1.5) (lineto 2.2 1.5)
           (moveto 0 1.3) (lineto 2.2 1.1)
           (moveto 0 1.1) (lineto 2.2 0.7))
    }


    % \stopTextSpan ends the spanner here - the wedge extends from g2 to this point
    s4\! \stopTextSpan
    % TEXT 2 POSITIONING: Use _ for below staff, negative Y moves further down
    % extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-2.25 . -2.1)
    _\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-8 "molto premuto (jeté)" }

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
    line-width = 37\mm
  }
}
