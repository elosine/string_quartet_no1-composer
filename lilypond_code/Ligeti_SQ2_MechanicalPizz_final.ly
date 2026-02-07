\version "2.20.0"
\language "english"

% Ligeti String Quartet No. 2 - Movement III: "Come un meccanismo di precisione"
% Mechanical pizzicato with rapid repeated notes creating "granulated continuum"
% All four instruments play pizzicato throughout, creating machine-like texture
% Notation shows interlocking repeated notes at different rhythmic subdivisions

\paper{
  paper-width = 180
  paper-height = 500

  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1

  system-system-spacing =
  #'((basic-distance . 15)
                            (minimum-distance . 8)
                            (padding . 2)
                            (stretchability . 60))
}

\book {
  \header {
    tagline = ##f
  }
  \score {
    <<
      \override Score.BarNumber.break-visibility = ##(#f #f #f)

      \new Staff \with {
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1

        % Custom staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
                                          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                                 (line-count (ly:grob-property grob 'line-count 5))
                                                 (thickness (ly:grob-property grob 'thickness 1))
                                                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                                 (width 50)
                                                 (width-staff-spaces (/ (* width 2.8346) staff-space))
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
        \time 4/4
        \override TupletBracket.bracket-visibility = ##t
        \override TupletNumber.visibility = ##t
        \override TupletNumber.font-size = #-3
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(4)
        \override Stem.details.lengths = #'(5)
        \override Accidental.font-size = -4
        \override TextScript.font-size = #-2

        % Ligeti mechanical pizzicato - rapid repeated notes
        % "Come un meccanismo di precisione" = Like a precision mechanism
        
        \once \override TextScript.extra-offset = #'(-2 . 3)
        
        % Interlocking rhythmic patterns creating granulated texture
        % Different subdivisions overlap to create mechanical effect
        
        e''16^\markup { \italic "pizz. secco" }
        e''16 e''16 e''16
        \tuplet 5/4 { e''16 e''16 e''16 e''16 e''16 }
        \tuplet 6/4 { e''16 e''16 e''16 e''16 e''16 e''16 }
        \tuplet 7/8 { e''16 e''16 e''16 e''16 e''16 e''16 e''16 }

      }

    >>

    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/32)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }

      indent = 0
      line-width = 140\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}
