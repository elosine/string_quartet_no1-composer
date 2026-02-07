\version "2.20.0"
\language "english"

% Two-Handed Pizzicato for Cello on C2 (open C string)
% Alternating left hand (m.s. = mano sinistra) and right hand (m.d. = mano destra)
% Standard notation uses m.s. and m.d. markings above/below notes
% Famous example: Rimsky-Korsakov's Capriccio Espagnol

\paper{
  paper-width = 140
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
        \clef bass
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1

        % Custom shorter staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
                                          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                                 (line-count (ly:grob-property grob 'line-count 5))
                                                 (thickness (ly:grob-property grob 'thickness 1))
                                                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                                 (width 35)  ; staff line width in mm
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
        \override TupletBracket.bracket-visibility = ##f
        \override TupletNumber.visibility = ##f
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5.5)
        \override Stem.details.lengths = #'(6)
        \override Accidental.font-size = -4
        \override TextScript.font-size = #-3

        % Two-handed pizzicato with m.s./m.d. markings
        % m.d. = mano destra (right hand) - typically index finger
        % m.s. = mano sinistra (left hand) - typically 4th finger on open string
        
        % Initial pizz marking
        \once \override TextScript.extra-offset = #'(-2 . 3)
        
        <<
          % Voice 1: Right hand (m.d.) - stems up
          {
            \voiceOne
            \stemUp
            c,16^\markup { \italic "pizz." }
            -\markup { \tiny \italic "m.d." }
            [
            s16
            c,16-\markup { \tiny \italic "m.d." }
            s16
            c,16-\markup { \tiny \italic "m.d." }
            s16
            c,16-\markup { \tiny \italic "m.d." }
            s16
            ]
          }
          \\
          % Voice 2: Left hand (m.s.) - stems down
          {
            \voiceTwo
            \stemDown
            s16
            c,16_\markup { \tiny \italic "m.s." }
            [
            s16
            c,16_\markup { \tiny \italic "m.s." }
            s16
            c,16_\markup { \tiny \italic "m.s." }
            s16
            c,16_\markup { \tiny \italic "m.s." }
            ]
          }
        >>
        
        \stemNeutral

      }

    >>

    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/28)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }

      indent = 0
      line-width = 100\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}
