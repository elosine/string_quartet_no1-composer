\version "2.20.0"
\language "english"
\paper{
  paper-width = 100
  paper-height = 500
  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1
  system-system-spacing =
  %this controls space between lines default = 12
  #'(
      (basic-distance . 15)
      (minimum-distance . 8)
      (padding . 2)
      (stretchability . 60)
      )
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
        \override StaffSymbol.stencil = #(lambda (grob)
          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                 (line-count (ly:grob-property grob 'line-count 5))
                 (thickness (ly:grob-property grob 'thickness 1))
                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                 ;Adjust Staff Line  Width Here /////////
                 (width 3.3);staff line width in mm
                 ;///////////////////////////////////////
                 (width-staff-spaces (/ (* width 2.8346) staff-space));convert mm to staff spaces
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
        \override TupletNumber.visibility = ##f
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5.5)
        \override Stem.details.lengths = #'(5.5)
        \override Accidental.font-size = -4
        \override Stem.transparent = ##t
        \override Hairpin.minimum-length = #0.1
        \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
        \override Hairpin.bound-details.left.padding = #0
        \override Hairpin.extra-offset = #'(-0.7 . 0)
        \once \override NoteColumn.X-offset = #-0.8
        % NOTATION HERE /////////////////////////////////////////////////////
      }
    >>
    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/28)
        %\override SpacingSpanner.uniform-stretching = ##t
        %  \override SpacingSpanner.strict-note-spacing = ##t
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
        % \override NoteHead.no-ledgers = ##t
      }
      indent = 0
      line-width = 28\mm
      #(layout-set-staff-size 20)
    }
    \midi{}
  }
}