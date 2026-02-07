\version "2.20.0"
\language "english"

% Klaus K. Hübler / Aaron Cassidy Style - Action Notation with Separate Staves
% "Decoupled" or "Prescriptive" notation for string instrument
% Upper staff = LEFT HAND (fingering actions)
% Lower staff = RIGHT HAND (bow/pluck actions)
% Each hand has independent rhythmic information
% The resulting sound emerges from the interaction of both hands

\paper{
  paper-width = 220
  paper-height = 500

  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1

  system-system-spacing =
  #'((basic-distance . 8)
                            (minimum-distance . 6)
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

      % === LEFT HAND STAFF (Fingering Actions) ===
      \new Staff \with {
        instrumentName = \markup { \tiny \italic "L.H." }
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #5
      }
      {
        \time 4/4
        \override TupletBracket.bracket-visibility = ##t
        \override TupletNumber.visibility = ##t
        \override TupletNumber.font-size = #-3
        \override NoteHead.font-size = #-2
        \override Stem.details.beamed-lengths = #'(4)
        \override Stem.details.lengths = #'(5)
        \override TextScript.font-size = #-3

        % Left hand: finger positions and actions
        % Diamond noteheads = harmonic touch
        % + = left hand pizzicato
        % Regular = stopped note
        
        \once \override TextScript.extra-offset = #'(-3 . 3)
        
        % Finger action 1: rapid position changes
        e''16^\markup { \italic "L.H. (fingering)" }
        [
        \once \override NoteHead.style = #'harmonic
        g''16
        a''16-+
        \once \override NoteHead.style = #'harmonic
        b''16
        ]
        
        % Finger action 2: glissando gesture
        c'''8
        \glissando
        e''8
        
        % Finger action 3: tremolo fingering
        \tuplet 5/4 {
          f''16
          \once \override NoteHead.style = #'harmonic
          g''16
          a''16-+
          b''16
          \once \override NoteHead.style = #'harmonic
          c'''16
        }
        
        % Finger action 4: held position
        d'''4
        ~
        d'''8
        r8
      }

      % === RIGHT HAND STAFF (Bow/Pluck Actions) ===
      \new Staff \with {
        instrumentName = \markup { \tiny \italic "R.H." }
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #1
      }
      {
        \time 4/4
        \override TupletBracket.bracket-visibility = ##t
        \override TupletNumber.visibility = ##t
        \override TupletNumber.font-size = #-3
        \override NoteHead.font-size = #-2
        \override Stem.details.beamed-lengths = #'(4)
        \override Stem.details.lengths = #'(5)
        \override TextScript.font-size = #-3
        \override Accidental.font-size = -4

        % Right hand: bow/pluck actions (independent rhythm)
        % X notehead = col legno battuto
        % Triangle = pizzicato
        % Regular = arco
        % Arrows indicate bow direction
        
        \once \override TextScript.extra-offset = #'(-3 . 2)
        
        % Bow action 1: irregular attacks
        \tuplet 3/2 {
          b'8^\markup { \italic "R.H. (bow/pluck)" }
          \once \override NoteHead.style = #'cross
          b'8
          b'8
        }
        
        % Bow action 2: sustained with pressure changes
        b'4
        ~
        b'8
        [
        \once \override NoteHead.style = #'cross
        b'8
        ]
        
        % Bow action 3: rapid alternation
        \tuplet 7/8 {
          b'16
          \once \override NoteHead.style = #'cross
          b'16
          b'16
          \once \override NoteHead.style = #'cross
          b'16
          b'16
          \once \override NoteHead.style = #'cross
          b'16
          b'16
        }
        
        % Bow action 4: pizzicato burst
        b'16-+
        b'16-+
        b'16-+
        r16
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

      indent = 15\mm
      line-width = 180\mm
      #(layout-set-staff-size 18)
    }

    \midi{}

  }
}
