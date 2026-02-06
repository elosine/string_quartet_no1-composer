\version "2.20.0"
\language "english"
\paper{
  tagline = ##f
  paper-width = 17\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  paper-height = 25\mm
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
         (width 2.9) ;staff line width in mm
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
    \time 3/4 %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
    \override NoteHead.font-size = #-2
    \override DynamicText.font-size = #-8.5
    \override Stem.details.beamed-lengths = #'(5.5)
    \override Stem.details.lengths = #'(6)
    \override Accidental.font-size = -5
    \override Stem.transparent = ##t

    % NOTATION HERE /////////////////////////////////////////////////////

    % Hairpin
    \override Hairpin.height = #0.7  % hairpin height
    \override Hairpin.Y-offset = #-0.3  % Move hairpin y

    %Note 1
    \once \override NoteColumn.X-offset = #-0.5 %Note Column 1 adjustment

    fs'4

    % Glissando
    -\tweak extra-offset #'(0 . 0.0) %gliss position
    -\tweak bound-details.left.padding #0.2   % Gap from left note
    -\tweak bound-details.right.padding #-0.1  % Gap from right note
    \glissando

    %Dymanic
    -\tweak extra-offset #'(0 . -0.2)  % X,Y offset in staff spaces
    \ppp

    % Hairpin
    -\tweak extra-offset #'(-0.8 . 0)  % X,Y offset in staff spaces
    -\tweak shorten-pair #'(0 . 4.5)    % (left . right) - positive=shorter
    \<

    % Non-Vib Text
    -\tweak extra-offset #'(0 . -2.5)  % X,Y offset in staff spaces
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "Non-Vib"
    }





    % Spacer
    s2\!
     % Secco Text
    -\tweak extra-offset #'(0.8 . 1.45)
    _\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "secco"
    }

    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout{
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = -0.9
    line-width = 50\mm %adjust paper-width,line-width @bottom, and \time 4/4 to get proper display width
  }
  \midi{}
}