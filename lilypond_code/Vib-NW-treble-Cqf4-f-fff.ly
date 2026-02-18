\version "2.20.0"
\language "english"

% ======= Dynamic Vibrato Wavy Line (SVG-Compatible) =======
% Adapted from Mark Witmer's vibrato.ly for LilyPond 2.20+ SVG output.
% Uses make-path-stencil (renders in SVG backend) instead of embedded-ps.
%
% Usage: \vibrato #'(startAmp ... endAmp) #wavelength #lineThickness #widthFraction
%   amplitudes : list of amplitude values, linearly interpolated across the span
%                e.g., #'(3.0 0.0)  = wide vibrato -> non-vibrato
%                e.g., #'(0.0 4.0)  = non-vibrato -> very wide
%                e.g., #'(2.0 4.0 0.0) = medium -> wide -> none
%   wavelength : width of one full wave cycle in staff spaces (e.g., 1.0)
%   thickness  : line thickness (e.g., 0.15)
%   widthFrac  : fraction of available span to use (e.g., 0.85 = 85%)
%
% Requires \startTrillSpan / \stopTrillSpan on the notes.
% Hide the "tr" symbol with: \override TrillSpanner.bound-details.left.text = ##f
% ================================================================

#(define (build-vibrato-stencil grob amplitudes wavelength thick width-frac)
  (let* ((ext (ly:grob-property grob 'X-extent))
         (x0 (car ext))
         (x1 (cdr ext))
         (raw-width (- x1 x0))
         (width (* raw-width width-frac)))
    (if (or (inf? x0) (inf? x1) (<= width 0))
        empty-stencil
        (let* ((half-wl (/ wavelength 2.0))
               (num-halves (max 1 (inexact->exact (round (/ width half-wl)))))
               (hw (/ width num-halves))
               (na (length amplitudes))
               (cmds
                (let loop ((i 0) (x 0.0) (acc '(moveto 0 0)))
                  (if (>= i num-halves)
                      acc
                      (let* ((t (if (<= num-halves 1) 0.5
                                    (min 1.0 (/ (exact->inexact i)
                                                (max 1 (- num-halves 1))))))
                             (amp
                              (if (= na 1)
                                  (list-ref amplitudes 0)
                                  (let* ((fpos (* t (- na 1)))
                                         (fi (min (- na 2)
                                                  (inexact->exact (floor fpos))))
                                         (ff (- fpos fi)))
                                    (+ (list-ref amplitudes fi)
                                       (* ff (- (list-ref amplitudes (+ fi 1))
                                                (list-ref amplitudes fi)))))))
                             (dir (if (even? i) 1.0 -1.0))
                             (cp-y (* dir amp 1.333))
                             (cx1 (+ x (* hw 0.333)))
                             (cx2 (+ x (* hw 0.667)))
                             (xe  (+ x hw)))
                        (loop (+ i 1) xe
                              (append acc
                                      (list 'curveto cx1 cp-y
                                            cx2 cp-y xe 0.0))))))))
          (make-path-stencil cmds thick 1 1 #f)))))

vibrato =
#(define-music-function (amplitudes wavelength thickness width-frac)
   (list? number? number? number?)
   #{
     \once \override TrillSpanner.after-line-breaking =
       #(lambda (grob)
          (ly:grob-set-property! grob 'stencil
            (build-vibrato-stencil grob amplitudes wavelength thickness width-frac)))
   #})

\paper{
  tagline = ##f
  paper-width = 80\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  paper-height = 40\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \clef treble
    \omit Clef
    \omit KeySignature
    \override StaffSymbol.thickness = #1
    %Custom Staff Lines
    \override StaffSymbol.stencil =
    #( lambda (grob)
       (let*
        ((staff-space (ly:staff-symbol-staff-space grob))
         (line-count (ly:grob-property grob 'line-count 5))
         (thickness (ly:grob-property grob 'thickness 1))
         (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
         ;Adjust Staff Line  Width Here /////////
         (width 2.8) ;staff line width in mm
         (width-staff-spaces (/ (* width 2.8346) staff-space))
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
    \time 4/4 %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
    \override NoteHead.font-size = #-2
    \override DynamicText.font-size = #-9
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6)
    \override Accidental.font-size = -5
    \override Stem.transparent = ##t
   
    % NOTATION HERE /////////////////////////////////////////////////////

    % Hairpin
    \override Hairpin.height = #0.5  % hairpin height
    \override DynamicLineSpanner.staff-padding = #1.2

    % Vibrato wavy line setup
    % Hide the "tr" symbol - we only want the wavy line
    \override TrillSpanner.bound-details.left.text = ##f
    \override TrillSpanner.Y-offset = #3.5  % Vibrato line Y position (adjust as needed)

    % Vibrato: non-vibrato (0.0) -> wide (3.0)  [NARROW TO WIDE]
    % Adjust amplitudes, wavelength, thickness, and width-fraction to taste:
    %   #'(0.0 3.0) = none -> wide    |  #'(0.0 1.0 3.0) = none -> narrow -> wide
    %   #1.0 = wavelength             |  #0.15 = line thickness
    %   #0.65 = use 65% of available width (adjust to fit hairpin)
    \vibrato #'(0.0 3.0) #1.0 #0.15 #0.65
    
     % Non-Vib Text (positioned at left start of vibrato)
        -\tweak extra-offset #'(-0.3 . -2)  % X,Y offset in staff spaces (adjust X to align with vibrato start)
        ^\markup {
          \override #'(font-name . "Crimson Pro Light Italic")
          \fontsize #-9
          "Non-Vib."
        }

    %Note 1
    \once \override NoteColumn.X-offset = #-1.4 %Note Column 1 adjustment

    cqf'2
    \startTrillSpan
   
    % Glissando
    -\tweak extra-offset #'(0 . 0.0) %gliss position
    -\tweak bound-details.left.padding #0.2   % Gap from left note
    -\tweak bound-details.right.padding #-0.1  % Gap from right note
    \glissando
    
    %Dymanic
    -\tweak extra-offset #'(0 . 0)  % X,Y offset in staff spaces
    \f
    
    % Hairpin (crescendo)
    -\tweak extra-offset #'(-0.5 . 0)  % X,Y offset in staff spaces
    -\tweak shorten-pair #'(0 . 7)    % (left . right) - positive=shorter
    \<
        
    % Spacer
    s2\stopTrillSpan\! % \stopTrillSpan ends vibrato line, \! ends hairpin
    
     %Dymanic
    -\tweak extra-offset #'(-8 . 0)  % X,Y offset in staff spaces
    \fff
    
   
    
    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 55\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  }
  \midi{}
}
