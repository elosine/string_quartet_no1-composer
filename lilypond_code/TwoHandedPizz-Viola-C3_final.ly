\version "2.20.0"
\language "english"

% Two-Handed Pizzicato for Viola on C3 (open C string)
% Alternating left hand (m.s. = mano sinistra) and right hand (m.d. = mano destra)
% This technique allows rapid repeated notes by alternating plucking hands
% Famous example: Rimsky-Korsakov's Capriccio Espagnol

\paper{
  paper-width = 120
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
        \clef alto
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1

        % Custom shorter staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
                                          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                                 (line-count (ly:grob-property grob 'line-count 5))
                                                 (thickness (ly:grob-property grob 'thickness 1))
                                                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                                 (width 22)  ; staff line width in mm
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

        % Two-handed pizzicato notation
        % m.d. = mano destra (right hand) - stems up
        % m.s. = mano sinistra (left hand) - stems down
        
        % Initial pizz marking
        \once \override TextScript.font-size = #-2
        \once \override TextScript.extra-offset = #'(-1.5 . 2.5)
        
        <<
          % Voice 1: Right hand (m.d.) - stems up
          {
            \voiceOne
            \stemUp
            % m.d. marking on first note
            \once \override TextScript.font-size = #-3
            c16^\markup { \italic "pizz." }
            [
            s16
            c16
            s16
            c16
            s16
            c16
            s16
            ]
          }
          \\
          % Voice 2: Left hand (m.s.) - stems down
          {
            \voiceTwo
            \stemDown
            s16
            c16
            [
            s16
            c16
            s16
            c16
            s16
            c16
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
      line-width = 80\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}
