\version "2.20.0"
\language "english"

% ============================================
% CRESCENDO-DECRESCENDO GLISSANDO TEMPLATE
% ============================================
% Variables to customize per instance:
%   - CLEF: treble, alto, bass
%   - START_PITCH: e.g., as4, cs5, bf3
%   - END_PITCH: e.g., a4, d5, g3
%   - DYNAMIC_1: first dynamic (e.g., \ppp, \f, \mf)
%   - DYNAMIC_2: second dynamic (e.g., \f, \ppp, \mp)
%   - HAIRPIN: \< (crescendo) or \> (decrescendo)
%   - GLISS_Y_OFFSET: 0 (default) or 0.3 (same staff line)
% ============================================

% Tremolo slash positioning variables
#(define tremolo-center 5.6)  % V: move all 3 slashes up/down the stem
#(define tremolo-gap 0.9)     % W: spacing between adjacent slashes

\paper{
  tagline = ##f
  paper-width = 40\mm
  paper-height = 80\mm
  top-margin = 6\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    % === CLEF VARIABLE ===
    \clef alto
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.staff-space = #0.65
    \override StaffSymbol.ledger-line-thickness = #'(1.0 . 0.0)
    %Custom Staff Lines
    \override StaffSymbol.stencil =
    #( lambda (grob)
       (let*
        ((staff-space (ly:staff-symbol-staff-space grob))
         (line-count (ly:grob-property grob 'line-count 5))
         (thickness (ly:grob-property grob 'thickness 1))
         (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
         ;Adjust Staff Line  Width Here /////////
         (width 2.4) ;staff line width in mm
         (width-staff-spaces (/ (* width 1.25) staff-space))
         (half-height (* (/ (- line-count 1) 2) staff-space)))
        (apply ly:stencil-add
               (map
                (lambda (i)
                  (ly:make-stencil
                   (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                   (cons 0 width-staff-spaces)
                   (cons (- half-height) half-height)))
                (iota line-count (- (/ (- line-count 1) 2)))))))
  }
  {
    \time 4/4
    \override NoteHead.font-size = #-7
    \override DynamicText.font-size = #-8.5
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6)
    \override Accidental.font-size = -5
    \override Stem.transparent = ##t

    % NOTATION HERE /////////////////////////////////////////////////////



    %Note 1
    \once \override NoteColumn.X-offset = #-0.8 %Note Column 1 adjustment

    % === START PITCH ===
    e4

    % Glissando
    % === GLISS_Y_OFFSET ===
    -\tweak extra-offset #'(0 . 0) %gliss position
    -\tweak bound-details.left.padding #0.2   % Gap from left note
    -\tweak bound-details.right.padding #0.1  % Gap from right note
    \glissando





    % Diamond enclosure (col legno harmonic flutter)
    % Calligraphic weight: bottom-left + top-right edges THICK, others THIN
    % Diamond vertices: Left(-2.0, 0) Top(0, 1.5) Right(2.0, 0) Bottom(0, -1.5)
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(0 . 0)  % X,Y adjust diamond position
    ^\markup {
      \with-dimensions #'(0 . 0) #'(0 . 0)
      \translate #'(1 . -2.95)  % center diamond over both noteheads
      \override #'(line-cap-style . butt)
      \combine
        \combine
          \combine
            % Top-left edge (THIN): Left → Top
            % Q = shift right (+ = more inward), R = shift down (- = more inward)
            \translate #'(0.06 . -0.05) % (Q . R)
            \path #0.12
            #'((moveto -2 0) (lineto 0 2.2)) % (A B) (C D)
            % Top-right edge (THICK): Top → Right
            \path #0.43
            #'((moveto 0 2.2) (lineto 2 0)) % (E F) (G H)
          \combine
            % Bottom-right edge (THIN): Right → Bottom
            % S = shift left (- = more inward), T = shift up (+ = more inward)
            \translate #'(-0.06 . 0.05) % (S . T)
            \path #0.12
            #'((moveto 2 0) (lineto 0 -2.2)) % (I J) (K L)
            % Bottom-left edge (THICK): Bottom → Left
            \path #0.43
            #'((moveto 0 -2.2) (lineto -2 0)) % (M N) (O P)
        % Stem + tremolo slashes
        % U = stem top Y (increase = taller stem)
        \combine
          \combine
            \combine
              % Stem line
              \translate #'(0.12 . 0)
              \path #0.12
              #'((moveto 0 2.2) (lineto 0 7.5)) % stem: C_y to U
              % Tremolo slashes (3x filled parallelogram from SVG)
              % V = tremolo-center, W = tremolo-gap
              % Slash 1 (Y = V - W)
              \translate #(cons 0.12 (- tremolo-center tremolo-gap))
              \override #'(filled . #t)
              \path #0.08
              #'((moveto -0.45 -0.24) (lineto -0.45 0) (lineto 0.45 0.24) (lineto 0.45 0) (closepath))
            % Slash 2 (Y = V)
            \translate #(cons 0.12 tremolo-center)
            \override #'(filled . #t)
            \path #0.08
            #'((moveto -0.45 -0.24) (lineto -0.45 0) (lineto 0.45 0.24) (lineto 0.45 0) (closepath))
          % Slash 3 (Y = V + W)
          \translate #(cons 0.12 (+ tremolo-center tremolo-gap))
          \override #'(filled . #t)
          \path #0.08
          #'((moveto -0.45 -0.24) (lineto -0.45 0) (lineto 0.45 0.24) (lineto 0.45 0) (closepath))
    }

    % Note 2
    \once \override Accidental.extra-offset = #'(0.5 . 0)  % Move sharp closer to note (positive=right)
    \once \override NoteColumn.X-offset = #-3.8 %notecolumn 2
    % === END PITCH ===
    g4

   
 
    
    % Spacer
    s2\!
    
    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 50\mm
  }
  \midi{}
}
