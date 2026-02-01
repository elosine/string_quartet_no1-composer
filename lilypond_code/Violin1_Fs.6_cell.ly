\version "2.24.4"
\language "english"
% =====================================================================
% PAPER SECTION
% =====================================================================
\paper {
  % Remove footer/tagline
  tagline = ##f
  
  % Explicit paper size calculated from rectangle:
  % Rectangle: 3.7 x 10.5 staff spaces = ~7mm x ~19mm
  % Plus 1mm margins each side
  paper-width = 9\mm
  paper-height = 21\mm
  
  % Margins
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
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

    \override StaffSymbol.stencil = #(lambda (grob)
                                       (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                              (line-count (ly:grob-property grob 'line-count 5))
                                              (thickness (ly:grob-property grob 'thickness 1))
                                              (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                              ;Adjust Staff Line  Width Here /////////
                                              (width 1.1)  ; staff line width in mm
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
    \once \override NoteColumn.X-offset = #-1
    
    < % Open Chord
    
    \tweak NoteHead.extra-offset #'(0 . 0) fs'''
  
    >4  % Close chord (<) with quarter note duration (4)
    
    % BOX AROUND ENTIRE CHORD: Draws a rectangle encompassing all noteheads
    % =====================================================================
    % RECTANGLE EDGE ADJUSTMENTS:
    %   \translate #'(X . Y) shifts the ENTIRE box:
    %     - X: positive = right, negative = left (currently -0.6)
    %     - Y: positive = up, negative = down (currently -5)
    % =====================================================================
    -\tweak outside-staff-priority ##f
    -\tweak extra-offset #'(-0.5 . 0)
    ^\markup {
      % Zero dimensions so rectangle doesn't affect layout
      \with-dimensions #'(0 . 0) #'(0 . 0)
      \translate #'(-0.6 . -5)
      \override #'(thickness . 0.8)
      \path #0.15
      #'(
          (moveto -0.2 -1) ;moveto A B - Bottom change B&D
          (lineto 3.5 -1) ;lineto C D - Right C&E
          (lineto 3.5 9.5) ;lineto E F - Top change F&H
          (lineto -0.2 9.5) ;lineto G H - Left change A&G
          (closepath)
          )
    }
 
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
