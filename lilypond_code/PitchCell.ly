\version "2.24.4"
\language "english"
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
% SCORE BLOCK
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef treble
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

    % Harmonics: diamond-shaped noteheads, clustered as chord with independent X offsets
    % X-OFFSET ADJUSTMENT: Change the #N value for each note to move it horizontally
    %   - Positive values move RIGHT, negative values move LEFT
    %   - Values are in staff spaces (~1.75mm each)
    %   - Example: #0 = no offset, #2 = 2 spaces right, #-1 = 1 space left
   % \override NoteHead.style = #'harmonic
    % PARTIAL NUMBER LABELS: Attached to each note using \tweak self-alignment-X
    % Adjust extra-offset #'(X . Y) to fine-tune position relative to notehead
    <
    % G5 = 4th partial
    \tweak NoteColumn.X-offset #0 g''
    % F6 quarter-flat = 7th partial
    \tweak NoteColumn.X-offset #2 feh'''
    % D5 = 3rd partial
    \tweak NoteColumn.X-offset #4 d''
    % A6 = 9th partial
    \tweak NoteColumn.X-offset #6 a'''
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
      #'((moveto 0 2.7)
         (lineto 3.7 2.7)
         (lineto 3.7 10)
         (lineto 0 10)
         (closepath))
    }
    % PARTIAL NUMBER LABELS: Positioned using extra-offset to appear next to each notehead
    % G5 label (4th partial)
   %  -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(1.4 . -0.2)
%     ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "4th" }
    % F6 label (7th partial)
  %   -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(1.4 . 2)
%     ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "7th" }
    % D5 label (3rd partial)
   %  -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(1.4 . -2.9)
%     ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "3rd" }
    % A6 label (9th partial)
   %  -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(1.4 . 1.6)
%     ^\markup { \override #'(font-name . "Crimson Pro") \fontsize #-10 "9th" }
    % TEXT 1 POSITIONING: Use _ for below staff, negative Y moves further down
   %  -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(-2 . -2.75)
%     _\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-8 "ord. c.l. batt. →" }
%     \revert NoteHead.style

  


   
    % TEXT 2 POSITIONING: Use _ for below staff, negative Y moves further down
    % extra-offset #'(X . Y) - positive X = right, positive Y = up (staff spaces)
%     -\tweak outside-staff-priority ##f
%     -\tweak extra-offset #'(-2.25 . -2.75)
%     _\markup { \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-8 "molto premuto (jeté)" }
% 
%     s4\!
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
